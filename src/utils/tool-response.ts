/** Build an AgentToolResult with a single text content block. */
export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }], details: undefined };
}

/**
 * Minimal subset of OpenClawPluginToolContext used by our tool factories.
 * The full type is not exported from the SDK public API.
 */
export interface PluginToolContext {
  messageChannel?: string;
  requesterSenderId?: string;
}
