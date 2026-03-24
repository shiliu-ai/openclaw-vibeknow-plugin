import { Type } from "@sinclair/typebox";

/** Build an AgentToolResult with a single text content block. */
export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }], details: undefined };
}

export const IMIdentityParams = {
  im_handle: Type.String({
    description:
      "当前消息发送者的 IM 用户标识，如 Telegram user ID、Discord user ID 等。从当前会话的 sender 元数据中获取。",
  }),
  im_channel: Type.String({
    description:
      "当前消息所在的 IM 渠道名称，如 telegram、discord、slack、whatsapp、signal、imessage、line。从当前会话的 channel 元数据中获取。",
  }),
};
