import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { textResult } from "../utils/tool-response.js";

export function createUploadTool(client: FiglensClient) {
  return {
    name: "upload_knowledge",
    label: "上传知识库",
    description:
      "上传文档或网页到知识库，返回 knowledge_id。" +
      "注意：如果用户只给了 URL 想生成视频，优先用 create_video_from_url 一步完成。" +
      "此工具仅在需要单独上传文档时使用。",
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
