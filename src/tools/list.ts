import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { formatDurationSec } from "../utils/format.js";
import { textResult, IMIdentityParams } from "../utils/tool-response.js";

const STATUS_LABELS: Record<number, string> = {
  0: "生成中",
  1: "已完成",
  3: "生成失败",
};

const MAX_DISPLAY_COUNT = 10;

export function createListTool(client: FiglensClient) {
  return {
    name: "list_videos",
    label: "列出视频",
    description: "列出当前用户已生成的所有视频作品，包含状态和时长信息。",
    parameters: Type.Object({
      ...IMIdentityParams,
    }),
    async execute(
      _toolCallId: string,
      params: { im_handle: string; im_channel: string },
    ) {
      const works = await client.listWorks(
        params.im_handle,
        params.im_channel,
      );

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
}
