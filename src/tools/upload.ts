import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { textResult } from "../utils/tool-response.js";

export function createUploadTool(client: FiglensClient) {
  // eslint-disable-next-line no-console
  console.error("[VibeKnow:direct] upload_knowledge tool created");
  return {
    name: "upload_knowledge",
    label: "上传知识库",
    description:
      "【VibeKnow】上传文档或网页到知识库，返回 knowledge_id。" +
      "仅在需要单独上传文档时使用。用户给 URL 想直接生成视频时请改用 create_video_from_url。",
    parameters: Type.Object({
      url: Type.Optional(
        Type.String({
          description: "网页 URL，系统会自动爬取内容。与 file 二选一。",
        }),
      ),
    }),
    async execute(
      _toolCallId: string,
      params: { url?: string },
    ) {
      if (params.url) {
        const result = await client.uploadUrl(params.url);
        return textResult(
          `知识库资料已解析完成，knowledge_id: ${result.knowledge_id}`,
        );
      }
      return textResult("请提供一个网页 URL，或者直接发送文件给我。");
    },
  };
}
