import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

import { FiglensClient } from "./api/figlens-client.js";
import { createUploadTool } from "./tools/upload.js";
import { createGenerateTool } from "./tools/generate.js";
import { createStatusTool } from "./tools/status.js";
import { createListTool } from "./tools/list.js";
import { createUrlTool } from "./tools/url.js";
import { createWebhookHandler } from "./webhook/handler.js";
import type { WebhookPayload } from "./webhook/handler.js";
import { formatDurationSec } from "./utils/format.js";

const WEBHOOK_PATH = "/vibeknow/callback";

const runtimeStore = createPluginRuntimeStore<PluginRuntime>(
  "vibeknow plugin runtime not initialized",
);

export default definePluginEntry({
  id: "vibeknow",
  name: "VibeKnow Video Generator",
  description: "AI-powered knowledge video generation via IM chat",

  register(api) {
    const config = api.pluginConfig as {
      figlensBaseUrl?: string;
      apiKey?: string;
      webhookSecret?: string;
      callbackBaseUrl?: string;
    };

    if (!config.figlensBaseUrl || !config.apiKey) {
      api.logger.warn(
        "[VibeKnow] Plugin not configured. Set figlensBaseUrl and apiKey in plugin config.",
      );
      return;
    }

    if (!config.webhookSecret) {
      api.logger.warn(
        "[VibeKnow] webhookSecret not configured. Webhook signature verification is disabled.",
      );
    }

    const client = new FiglensClient({
      baseUrl: config.figlensBaseUrl,
      apiKey: config.apiKey,
    });

    const gatewayPort = api.config.gateway?.port ?? 3000;
    const gatewayHost = api.config.gateway?.host ?? "127.0.0.1";
    const callbackUrl =
      config.callbackBaseUrl ??
      `http://${gatewayHost}:${gatewayPort}${WEBHOOK_PATH}`;

    // ── 注册工具 ──

    api.registerTool(createUploadTool(client));
    api.registerTool(createGenerateTool({ client, callbackUrl }));
    api.registerTool(createStatusTool(client));
    api.registerTool(createListTool(client));
    api.registerTool(createUrlTool(client));

    // ── 注册 Webhook HTTP 路由 ──

    const deliverMessage = createDeliverMessage(runtimeStore, api.logger);

    api.registerHttpRoute({
      path: WEBHOOK_PATH,
      handler: createWebhookHandler({
        webhookSecret: config.webhookSecret ?? "",
        logger: api.logger,

        async onCompleted(payload: WebhookPayload) {
          const lines = ["你的知识视频已生成完成！"];
          if (payload.duration) {
            lines.push(`视频时长: ${formatDurationSec(payload.duration)}`);
          }
          if (payload.html_url) {
            lines.push(`预览链接: ${payload.html_url}`);
          }
          if (payload.video_url) {
            lines.push(`视频链接: ${payload.video_url}`);
          }
          lines.push("", "如需导出高清 MP4 或修改视频，请告诉我。");

          await deliverMessage(payload, lines.join("\n"));
        },

        async onFailed(payload: WebhookPayload) {
          const text =
            `视频生成失败: ${payload.error ?? "未知错误"}\n` +
            `任务 ID: ${payload.task_id}\n\n` +
            `你可以检查资料后重新提交，或者告诉我具体的报错信息。`;

          await deliverMessage(payload, text);
        },
      }),
    });

    api.logger.info(
      `[VibeKnow] Plugin registered. Figlens: ${config.figlensBaseUrl}, Callback: ${callbackUrl}`,
    );
  },

  setRuntime: runtimeStore.setRuntime,
});

function createDeliverMessage(
  store: typeof runtimeStore,
  logger: { error: (...a: unknown[]) => void },
) {
  return async (payload: WebhookPayload, text: string) => {
    const runtime = store.tryGetRuntime();
    if (!runtime) {
      logger.error("[VibeKnow] runtime not available for outbound delivery");
      return;
    }

    if (!payload.im_channel || !payload.im_handle) {
      logger.error("[VibeKnow] missing im_channel/im_handle in webhook payload");
      return;
    }

    try {
      const cfg = await runtime.config.loadConfig();
      await runtime.outbound.deliverOutboundPayloads({
        cfg,
        channel: payload.im_channel,
        to: payload.im_handle,
        payloads: [{ text }],
      });
    } catch (err) {
      logger.error("[VibeKnow] outbound delivery failed:", err);
    }
  };
}
