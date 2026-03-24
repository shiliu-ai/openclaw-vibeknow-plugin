import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { formatDurationSec } from "../utils/format.js";
import { textResult, type PluginToolContext } from "../utils/tool-response.js";

const STATUS_LABELS: Record<number, string> = {
  0: "生成中",
  1: "已完成",
  3: "生成失败",
};

const MAX_DISPLAY_COUNT = 10;

export function createListToolFactory(client: FiglensClient) {
  return (toolCtx: PluginToolContext) => {
    const im_handle = toolCtx.requesterSenderId;
    const im_channel = toolCtx.messageChannel;

    return {
      name: "list_videos",
      label: "列出视频",
      description: "【VibeKnow】列出当前用户已生成的所有视频作品，包含状态和时长信息。",
      parameters: Type.Object({}),
      async execute(
        _toolCallId: string,
        _params: Record<string, never>,
      ) {
        if (!im_handle || !im_channel) {
          return textResult("无法识别当前用户身份，请稍后再试。");
        }

        const works = await client.listWorks(im_handle, im_channel);

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
  };
}
