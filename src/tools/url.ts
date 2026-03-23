import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { textResult } from "../utils/tool-response.js";

export function createUrlTool(client: FiglensClient) {
  return {
    name: "get_video_url",
    label: "获取视频链接",
    description: "根据 work_id 获取视频作品的分享观看链接。",
    parameters: Type.Object({
      work_id: Type.Number({ description: "作品 ID" }),
    }),
    async execute(_toolCallId: string, params: { work_id: number }) {
      const result = await client.getWorkUrl(params.work_id);

      if (result.share_url) {
        return textResult(`观看链接: ${result.share_url}`);
      }

      return textResult("该作品暂无可用链接，可能还在生成中。");
    },
  };
}
