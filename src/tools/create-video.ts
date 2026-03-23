import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { textResult, type PluginToolContext } from "../utils/tool-response.js";

export interface CreateVideoContext {
  client: FiglensClient;
  callbackUrl: string;
}

/**
 * Factory: 一步到位的「URL → 视频」工具，合并 upload + generate。
 * im_handle / im_channel 从 OpenClaw runtime context 自动注入，LLM 不需要传。
 */
export function createCreateVideoToolFactory(ctx: CreateVideoContext) {
  return (toolCtx: PluginToolContext) => {
    const im_handle = toolCtx.requesterSenderId;
    const im_channel = toolCtx.messageChannel;

    return {
      name: "create_video_from_url",
      label: "从链接生成视频",
      description:
        "一键从网页链接生成知识短视频。" +
        "传入 URL 后系统自动爬取内容、解析知识、生成视频。" +
        "这是用户说「帮我用这个链接生成视频」时应该调用的工具。",
      parameters: Type.Object({
        url: Type.String({
          description: "要生成视频的网页链接",
        }),
        query: Type.Optional(
          Type.String({
            description:
              "视频主题或风格要求。用户没特别说明时不传，系统自动生成。",
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
          query?: string;
          voice_id?: string;
        },
      ) {
        if (!im_handle || !im_channel) {
          return textResult("无法识别当前用户身份，请稍后再试。");
        }

        const uploadResult = await ctx.client.uploadUrl(params.url);

        const result = await ctx.client.generate({
          knowledge_id: uploadResult.knowledge_id,
          query: params.query || "根据该链接内容生成知识视频",
          callback_url: ctx.callbackUrl,
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
