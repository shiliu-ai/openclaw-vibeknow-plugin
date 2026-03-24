import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { textResult, IMIdentityParams } from "../utils/tool-response.js";

export interface CreateVideoContext {
  client: FiglensClient;
  callbackUrl: string;
}

/**
 * 一步到位的「URL → 视频」便捷工具，合并 upload + generate。
 * 直接工具（非 factory），im_handle / im_channel 作为参数由 LLM 从会话上下文提取。
 */
export function createVideoFromUrlTool(ctx: CreateVideoContext) {
  return {
    name: "create_video_from_url",
    label: "从链接生成视频",
    description:
      "一键从网页链接生成知识短视频。传入 URL 后自动爬取内容并生成视频。" +
      "用户说「帮我用这个链接生成视频」时直接调用此工具。",
    parameters: Type.Object({
      url: Type.String({ description: "要生成视频的网页链接" }),
      ...IMIdentityParams,
      query: Type.Optional(
        Type.String({
          description: "视频主题或风格要求。用户没特别说明时可不传。",
        }),
      ),
      voice_id: Type.Optional(
        Type.String({ description: "指定语音 ID，不传则使用默认语音" }),
      ),
    }),
    async execute(
      _toolCallId: string,
      params: {
        url: string;
        im_handle: string;
        im_channel: string;
        query?: string;
        voice_id?: string;
      },
    ) {
      const uploadResult = await ctx.client.uploadUrl(params.url);

      const result = await ctx.client.generate({
        knowledge_id: uploadResult.knowledge_id,
        query: params.query || "根据该链接内容生成知识视频",
        callback_url: ctx.callbackUrl,
        im_handle: params.im_handle,
        im_channel: params.im_channel,
        voice_id: params.voice_id,
      });

      return textResult(
        `视频生成任务已启动（任务 ID: ${result.task_id}）。\n` +
          `预计需要 5-10 分钟，完成后会主动通知你。`,
      );
    },
  };
}
