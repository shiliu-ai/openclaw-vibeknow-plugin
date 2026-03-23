import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/figlens-client.js";
import { textResponse, IMIdentityParams } from "../utils/tool-response.js";

export interface GenerateContext {
  client: FiglensClient;
  callbackUrl: string;
}

export function createGenerateTool(ctx: GenerateContext) {
  return {
    name: "generate_video",
    description:
      "根据知识库资料生成一段知识短视频。需要先用 upload_knowledge 上传资料获取 knowledge_id。" +
      "视频生成需要 5-10 分钟，任务提交后会立即返回，完成后自动通知用户。",
    parameters: Type.Object({
      knowledge_id: Type.String({
        description: "知识库 ID，通过 upload_knowledge 工具获取",
      }),
      query: Type.String({
        description: "视频主题、风格要求或想要讲述的核心内容",
      }),
      ...IMIdentityParams,
      voice_id: Type.Optional(
        Type.String({ description: "指定语音 ID，不传则使用默认语音" }),
      ),
    }),
    async execute(
      _id: string,
      params: {
        knowledge_id: string;
        query: string;
        im_handle: string;
        im_channel: string;
        voice_id?: string;
      },
    ) {
      const result = await ctx.client.generate({
        knowledge_id: params.knowledge_id,
        query: params.query,
        callback_url: ctx.callbackUrl,
        im_handle: params.im_handle,
        im_channel: params.im_channel,
        voice_id: params.voice_id,
      });

      return textResponse(
        `视频生成任务已启动（任务 ID: ${result.task_id}）。\n` +
          `预计需要 5-10 分钟，完成后会主动通知你。\n` +
          `你可以继续和我聊天，不需要等待。`,
      );
    },
  };
}
