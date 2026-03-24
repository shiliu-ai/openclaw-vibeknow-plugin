import type {
  OpenClawPluginApi,
  PluginRuntime,
  PluginLogger,
} from "openclaw/plugin-sdk";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk";

import { FiglensClient } from "./api/client.js";
import { createUploadTool } from "./tools/upload.js";
import { createVideoFromUrlTool } from "./tools/create-video.js";
import { createGenerateTool } from "./tools/generate.js";
import { createStatusTool } from "./tools/status.js";
import { createListTool } from "./tools/list.js";
import { createUrlTool } from "./tools/url.js";
import { createWebhookHandler } from "./webhook/handler.js";
import type { WebhookPayload } from "./webhook/handler.js";
import { formatDurationSec } from "./utils/format.js";

const WEBHOOK_PATH = "/vibeknow/callback";

const VIBEKNOW_AGENT_GUIDANCE = `## VibeKnow Video Tools — ALREADY REGISTERED

"vibeknow" / "VibeKnow" / "视频生成" in user messages means: use the tools below. Do NOT call sessions_spawn, do NOT try to run vibeknow as a command or runtime.

ROUTING (act on the FIRST match, one tool call, no clarifying questions):
1. User gives a URL + wants a video → call \`create_video_from_url\` with that URL. Done.
2. User gives a document/file + wants a video → call \`upload_knowledge\`, then \`generate_video\`.
3. "进度" / "status" / "怎么样了" → call \`check_video_status\` with the task_id.
4. "我的视频" / "list" / "列表" → call \`list_videos\`.
5. "链接" / "share" for a finished video → call \`get_video_url\`.

For im_handle and im_channel: extract from the current conversation sender metadata (sender id and channel name like "telegram", "discord", etc.).

NEVER ask "do you want me to use vibeknow?" — if the user mentioned vibeknow or video generation, just call the tool.`;

const runtimeStore = createPluginRuntimeStore<PluginRuntime>(
  "vibeknow plugin runtime not initialized",
);

export default {
  id: "vibeknow",
  name: "VibeKnow Video Generator",
  description: "AI-powered knowledge video generation via IM chat",

  register(api: OpenClawPluginApi) {
    const config = api.pluginConfig as
      | {
          figlensBaseUrl?: string;
          apiKey?: string;
          webhookSecret?: string;
          callbackBaseUrl?: string;
        }
      | undefined;

    if (!config?.figlensBaseUrl || !config?.apiKey) {
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

    const rawBase = config.callbackBaseUrl ?? "http://127.0.0.1:3000";
    const callbackUrl = rawBase.replace(/\/+$/, "") + WEBHOOK_PATH;

    runtimeStore.setRuntime(api.runtime);

    // ── 注册工具（全部直接对象，不用 factory） ──

    api.registerTool(createVideoFromUrlTool({ client, callbackUrl }));
    api.registerTool(createUploadTool(client));
    api.registerTool(createGenerateTool({ client, callbackUrl }));
    api.registerTool(createStatusTool(client));
    api.registerTool(createListTool(client));
    api.registerTool(createUrlTool(client));

    // ── 注入工具使用指引（prependSystemContext，缓存友好） ──

    api.on("before_prompt_build", () => ({
      prependSystemContext: VIBEKNOW_AGENT_GUIDANCE,
    }));

    // ── 注册 Webhook HTTP 路由 ──

    const deliverMessage = createDeliverMessage(runtimeStore, api.logger);

    api.registerHttpRoute({
      path: WEBHOOK_PATH,
      auth: "plugin",
      handler: createWebhookHandler({
        webhookSecret: config.webhookSecret ?? "",
        logger: api.logger,

        async onCompleted(payload: WebhookPayload) {
          const lines = ["🎉 你的知识视频已生成完成！"];
          if (payload.duration) {
            lines.push(`视频时长: ${formatDurationSec(payload.duration)}`);
          }
          if (payload.cover_url) {
            lines.push(`封面预览: ${payload.cover_url}`);
          }
          if (payload.share_url) {
            lines.push(`观看链接: ${payload.share_url}`);
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

        async onQueryOptimized(payload: WebhookPayload) {
          if (!payload.optimized_query) return;
          const text =
            `已为你优化视频提示词：\n\n${payload.optimized_query}\n\n正在开始生成视频，预计 3-5 分钟...`;
          await deliverMessage(payload, text);
        },

        async onProcessing(payload: WebhookPayload) {
          if (!payload.message) return;
          await deliverMessage(payload, payload.message);
        },
      }),
    });

    api.logger.info(
      `[VibeKnow] Plugin registered (6 tools). Figlens: ${config.figlensBaseUrl}, Callback: ${callbackUrl}`,
    );
  },
};

/**
 * 通过 runtime.channel 的平台原生 send 函数直接推送消息。
 * 这些函数是纯 API 调用，不依赖 gateway 请求上下文。
 */
function createDeliverMessage(
  store: typeof runtimeStore,
  logger: PluginLogger,
) {
  return async (payload: WebhookPayload, text: string) => {
    const runtime = store.tryGetRuntime();
    if (!runtime) {
      logger.error("[VibeKnow] runtime not available for outbound delivery");
      return;
    }

    if (!payload.im_channel || !payload.im_handle) {
      logger.error(
        "[VibeKnow] missing im_channel/im_handle in webhook payload",
      );
      return;
    }

    const cfg = runtime.config.loadConfig();
    const to = payload.im_handle;
    const channel = payload.im_channel;

    try {
      switch (channel) {
        case "telegram":
          await runtime.channel.telegram.sendMessageTelegram(to, text, { cfg });
          break;
        case "whatsapp":
          await runtime.channel.whatsapp.sendMessageWhatsApp(to, text, { verbose: false, cfg });
          break;
        case "discord":
          await runtime.channel.discord.sendMessageDiscord(to, text, { cfg });
          break;
        case "slack":
          await runtime.channel.slack.sendMessageSlack(to, text, { cfg });
          break;
        case "signal":
          await runtime.channel.signal.sendMessageSignal(to, text, { cfg });
          break;
        case "imessage":
          await runtime.channel.imessage.sendMessageIMessage(to, text, { config: cfg });
          break;
        case "line":
          await runtime.channel.line.pushMessageLine(to, text, { cfg });
          break;
        default:
          logger.error(
            `[VibeKnow] unsupported im_channel: ${channel}`,
          );
          return;
      }
      logger.info(
        `[VibeKnow] message delivered: channel=${channel}, to=${to}, task_id=${payload.task_id}`,
      );
    } catch (err) {
      logger.error(
        `[VibeKnow] outbound delivery failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };
}
