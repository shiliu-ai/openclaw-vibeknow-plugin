import { Type } from "@sinclair/typebox";
import type { FiglensClient } from "../api/client.js";
import { textResult, IMIdentityParams } from "../utils/tool-response.js";

const STAGE_LABELS: Record<string, string> = {
  init: "初始化",
  knowledge_summary: "知识摘要",
  script: "讲稿生成",
  design: "视觉设计",
  rendering: "视频渲染",
  completed: "已完成",
  failed: "生成失败",
  processing: "处理中",
};

export function createStatusTool(client: FiglensClient) {
  return {
    name: "check_video_status",
    label: "查询视频状态",
    description: "查询视频生成任务的当前进度和状态。",
    parameters: Type.Object({
      task_id: Type.Number({ description: "视频生成任务 ID" }),
      ...IMIdentityParams,
    }),
    async execute(
      _toolCallId: string,
      params: { task_id: number; im_handle: string; im_channel: string },
    ) {
      const result = await client.getStatus(
        params.task_id,
        params.im_handle,
        params.im_channel,
      );
      const stageLabel = STAGE_LABELS[result.stage] ?? result.stage;

      if (result.status === "completed") {
        let text = `任务 ${result.task_id} 已完成！\n当前阶段: ${stageLabel}`;
        if (result.duration) {
          text += `\n视频时长: ${Math.round(result.duration / 1000)}秒`;
        }
        if (result.share_url) {
          text += `\n观看链接: ${result.share_url}`;
        }
        return textResult(text);
      }

      if (result.status === "failed") {
        return textResult(
          `任务 ${result.task_id} 生成失败: ${result.error ?? "未知错误"}`,
        );
      }

      return textResult(
        `任务 ${result.task_id} 正在生成中...\n当前阶段: ${stageLabel}`,
      );
    },
  };
}
