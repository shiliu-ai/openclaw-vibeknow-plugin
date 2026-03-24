import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { textResult, type PluginToolContext } from "../utils/tool-response.js";

export interface GenerateContext {
  client: FiglensClient;
  callbackUrl: string;
}

export function createGenerateToolFactory(ctx: GenerateContext) {
  return (toolCtx: PluginToolContext) => {
    const im_handle = toolCtx.requesterSenderId;
    const im_channel = toolCtx.messageChannel;

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
        params: {
          knowledge_id: string;
          query: string;
          voice_id?: string;
        },
      ) {
        if (!im_handle || !im_channel) {
          return textResult("无法识别当前用户身份，请稍后再试。");
        }

        const result = await ctx.client.generate({
          knowledge_id: params.knowledge_id,
          query: params.query,
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
