import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/figlens-client.js";
import { textResponse } from "../utils/tool-response.js";

export function createUrlTool(client: FiglensClient) {
  return {
    name: "get_video_url",
    description: "获取视频作品的预览和下载链接。",
    parameters: Type.Object({
      work_id: Type.Number({ description: "作品 ID" }),
    }),
    async execute(_id: string, params: { work_id: number }) {
      const result = await client.getWorkUrl(params.work_id);

      const lines: string[] = [];
      if (result.html_url) lines.push(`预览链接: ${result.html_url}`);
      if (result.video_url) lines.push(`视频链接: ${result.video_url}`);

      if (lines.length === 0) {
        return textResponse("该作品暂无可用链接，可能还在生成中。");
      }

      return textResponse(lines.join("\n"));
    },
  };
}
