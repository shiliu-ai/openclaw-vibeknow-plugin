import { Type } from "@sinclair/typebox";

export function textResponse(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export const IMIdentityParams = {
  im_handle: Type.String({
    description: "当前用户的 IM 标识（从消息上下文中获取）",
  }),
  im_channel: Type.String({
    description: "当前 IM 渠道标识（从消息上下文中获取）",
  }),
};
