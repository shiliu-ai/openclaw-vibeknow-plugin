import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { textResult } from "../utils/tool-response.js";

export function createUploadTool(client: FiglensClient) {
  return {
    name: "upload_knowledge",
    label: "上传知识库",
    description:
      "上传文件或网页 URL 到知识库，返回 knowledge_id。" +
      "支持 PDF、Word、PPT、TXT 等文档格式，也支持网页 URL 自动爬取。" +
      "生成视频前必须先调用此工具获取 knowledge_id。",
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
