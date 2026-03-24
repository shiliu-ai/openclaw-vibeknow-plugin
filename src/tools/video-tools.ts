/**
 * Factory-pattern tools that need PluginToolContext (sender identity).
 *
 * Each export returns a factory function `(ctx) => toolObject` — the exact
 * same pattern used by the official feishu extension (feishu_doc, feishu_drive, etc.).
 *
 * Registration in index.ts:
 *   api.registerTool(createVideoFromUrlFactory(deps), { name: "create_video_from_url" });
 */

import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { textResult, type PluginToolContext } from "../utils/tool-response.js";
import { formatDurationSec } from "../utils/format.js";

// ── Shared types ──

interface VideoToolDeps {
  client: FiglensClient;
  callbackUrl: string;
}

// ── Stage / status labels ──

const STAGE_LABELS: Record<string, string> = {
  init: "初始化",
  knowledge_summary: "知识摘要",
  script: "讲稿生成",
  design: "视觉设计",
  rendering: "视频渲染",
  completed: "已完成",
  failed: "生成失败",
  processing: "处理中",
};

const STATUS_LABELS: Record<number, string> = {
  0: "生成中",
  1: "已完成",
  3: "生成失败",
};

const MAX_DISPLAY_COUNT = 10;

// ── create_video_from_url (直接工具版，不用 factory，用于对照实验) ──

export function createVideoFromUrlDirect(deps: VideoToolDeps) {
  // eslint-disable-next-line no-console
  console.error("[VibeKnow:direct] create_video_from_url tool created (non-factory)");
  return {
    name: "create_video_from_url",
    label: "从链接生成视频",
    description:
      "【VibeKnow】一键从网页链接生成知识短视频。" +
      "用户说「用vibeknow根据链接生成视频」「帮我把这个链接做成视频」时，直接调用此工具，只需传入 URL。",
    parameters: Type.Object({
      url: Type.String({ description: "要生成视频的网页链接" }),
      query: Type.Optional(
        Type.String({
          description: "视频主题或风格要求。用户没特别说明时不传，系统自动生成。",
        }),
      ),
      voice_id: Type.Optional(
        Type.String({ description: "指定语音 ID，不传则使用默认语音" }),
      ),
    }),
    async execute(
      _toolCallId: string,
      params: { url: string; query?: string; voice_id?: string },
    ) {
      // 对照实验：直接工具没有 im identity，先返回固定消息看工具能否被找到
      return textResult(
        "✅ create_video_from_url 工具被成功调用了！（对照实验：暂未执行实际逻辑）\n" +
          `收到的 URL: ${params.url}`,
      );
    },
  };
}

// ── create_video_from_url (factory 版，保留对照) ──

export function createVideoFromUrlFactory(deps: VideoToolDeps) {
  return (ctx: PluginToolContext) => {
    // eslint-disable-next-line no-console
    console.error(`[VibeKnow:factory] create_video_from_url called, ctx keys: ${ctx ? Object.keys(ctx).join(",") : "NULL"}, channel=${ctx?.messageChannel}, sender=${ctx?.requesterSenderId}`);
    const im_handle = ctx?.requesterSenderId;
    const im_channel = ctx?.messageChannel;

    return {
      name: "create_video_from_url",
      label: "从链接生成视频",
      description:
        "【VibeKnow】一键从网页链接生成知识短视频。" +
        "用户说「用vibeknow根据链接生成视频」「帮我把这个链接做成视频」时，直接调用此工具，只需传入 URL。",
      parameters: Type.Object({
        url: Type.String({ description: "要生成视频的网页链接" }),
        query: Type.Optional(
          Type.String({
            description: "视频主题或风格要求。用户没特别说明时不传，系统自动生成。",
          }),
        ),
        voice_id: Type.Optional(
          Type.String({ description: "指定语音 ID，不传则使用默认语音" }),
        ),
      }),
      async execute(
        _toolCallId: string,
        params: { url: string; query?: string; voice_id?: string },
      ) {
        if (!im_handle || !im_channel) {
          return textResult("无法识别当前用户身份，请稍后再试。");
        }
        const uploadResult = await deps.client.uploadUrl(params.url);
        const result = await deps.client.generate({
          knowledge_id: uploadResult.knowledge_id,
          query: params.query || "根据该链接内容生成知识视频",
          callback_url: deps.callbackUrl,
          im_handle,
          im_channel,
          voice_id: params.voice_id,
        });
        return textResult(
          `视频生成任务已启动（任务 ID: ${result.task_id}）。\n` +
            `预计需要 5-10 分钟，完成后会主动通知你。`,
        );
      },
    };
  };
}

// ── generate_video ──

export function generateVideoFactory(deps: VideoToolDeps) {
  return (ctx: PluginToolContext) => {
    // eslint-disable-next-line no-console
    console.error(`[VibeKnow:factory] generate_video called`);
    const im_handle = ctx?.requesterSenderId;
    const im_channel = ctx?.messageChannel;

    return {
      name: "generate_video",
      label: "生成视频",
      description:
        "【VibeKnow】根据已有的 knowledge_id 生成视频。" +
        "仅在已通过 upload_knowledge 获得 knowledge_id 时使用。" +
        "用户直接给 URL 时请改用 create_video_from_url。",
      parameters: Type.Object({
        knowledge_id: Type.String({
          description: "知识库 ID，通过 upload_knowledge 工具获取",
        }),
        query: Type.String({
          description: "视频主题、风格要求或想要讲述的核心内容",
        }),
        voice_id: Type.Optional(
          Type.String({ description: "指定语音 ID，不传则使用默认语音" }),
        ),
      }),
      async execute(
        _toolCallId: string,
        params: { knowledge_id: string; query: string; voice_id?: string },
      ) {
        if (!im_handle || !im_channel) {
          return textResult("无法识别当前用户身份，请稍后再试。");
        }
        const result = await deps.client.generate({
          knowledge_id: params.knowledge_id,
          query: params.query,
          callback_url: deps.callbackUrl,
          im_handle,
          im_channel,
          voice_id: params.voice_id,
        });
        return textResult(
          `视频生成任务已启动（任务 ID: ${result.task_id}）。\n` +
            `预计需要 5-10 分钟，完成后会主动通知你。`,
        );
      },
    };
  };
}

// ── check_video_status ──

export function checkVideoStatusFactory(client: FiglensClient) {
  return (ctx: PluginToolContext) => {
    // eslint-disable-next-line no-console
    console.error(`[VibeKnow:factory] check_video_status called`);
    const im_handle = ctx?.requesterSenderId;
    const im_channel = ctx?.messageChannel;

    return {
      name: "check_video_status",
      label: "查询视频状态",
      description: "【VibeKnow】根据 task_id 查询视频生成任务的当前阶段和进度。",
      parameters: Type.Object({
        task_id: Type.Number({ description: "视频生成任务 ID" }),
      }),
      async execute(_toolCallId: string, params: { task_id: number }) {
        if (!im_handle || !im_channel) {
          return textResult("无法识别当前用户身份，请稍后再试。");
        }
        const result = await client.getStatus(params.task_id, im_handle, im_channel);
        const stageLabel = STAGE_LABELS[result.stage] ?? result.stage;

        if (result.status === "completed") {
          let text = `任务 ${result.task_id} 已完成！\n当前阶段: ${stageLabel}`;
          if (result.duration) {
            text += `\n视频时长: ${Math.round(result.duration / 1000)}秒`;
          }
          if (result.share_url) {
            text += `\n观看链接: ${result.share_url}`;
          }
          return textResult(text);
        }
        if (result.status === "failed") {
          return textResult(
            `任务 ${result.task_id} 生成失败: ${result.error ?? "未知错误"}`,
          );
        }
        return textResult(
          `任务 ${result.task_id} 正在生成中...\n当前阶段: ${stageLabel}`,
        );
      },
    };
  };
}

// ── list_videos ──

export function listVideosFactory(client: FiglensClient) {
  return (ctx: PluginToolContext) => {
    // eslint-disable-next-line no-console
    console.error(`[VibeKnow:factory] list_videos called`);
    const im_handle = ctx?.requesterSenderId;
    const im_channel = ctx?.messageChannel;

    return {
      name: "list_videos",
      label: "列出视频",
      description: "【VibeKnow】列出当前用户已生成的所有视频作品，包含状态和时长信息。",
      parameters: Type.Object({}),
      async execute() {
        if (!im_handle || !im_channel) {
          return textResult("无法识别当前用户身份，请稍后再试。");
        }
        const works = await client.listWorks(im_handle, im_channel);
        if (works.length === 0) {
          return textResult("你还没有生成过视频作品。");
        }
        const lines = works.slice(0, MAX_DISPLAY_COUNT).map((w, i) => {
          const status = STATUS_LABELS[w.status] ?? "未知";
          const duration = w.duration ? formatDurationSec(w.duration) : "-";
          return `${i + 1}. [ID:${w.id}] ${w.title} | ${status} | 时长:${duration} | ${w.created_at}`;
        });
        return textResult(
          `你的视频作品（共 ${works.length} 个）:\n\n${lines.join("\n")}`,
        );
      },
    };
  };
}
