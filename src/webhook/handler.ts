import type { IncomingMessage, ServerResponse } from "node:http";
import { verifySignature } from "../utils/hmac.js";

export interface WebhookPayload {
  task_id: number;
  session_id: string;
  status: "completed" | "failed";
  video_url?: string;
  html_url?: string;
  cover_url?: string;
  duration?: number;
  error?: string;
  im_handle?: string;
  im_channel?: string;
}

export interface WebhookHandlerDeps {
  webhookSecret: string;
  onCompleted: (payload: WebhookPayload) => Promise<void>;
  onFailed: (payload: WebhookPayload) => Promise<void>;
  logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
}

export function createWebhookHandler(deps: WebhookHandlerDeps) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      res.end("Method Not Allowed");
      return;
    }

    const MAX_BODY = 1024 * 1024; // 1 MB
    const chunks: Buffer[] = [];
    let totalLength = 0;
    for await (const chunk of req) {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      totalLength += buf.length;
      if (totalLength > MAX_BODY) {
        res.statusCode = 413;
        res.end("Payload Too Large");
        return;
      }
      chunks.push(buf);
    }
    const body = Buffer.concat(chunks);

    const signature = (req.headers["x-webhook-signature"] as string) ?? "";
    if (deps.webhookSecret && !verifySignature(body, signature, deps.webhookSecret)) {
      deps.logger.error("[VibeKnow Webhook] signature verification failed");
      res.statusCode = 401;
      res.end("Unauthorized");
      return;
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(body.toString()) as WebhookPayload;
    } catch {
      res.statusCode = 400;
      res.end("Invalid JSON");
      return;
    }

    deps.logger.info(
      `[VibeKnow Webhook] received: task_id=${payload.task_id}, status=${payload.status}`,
    );

    try {
      if (payload.status === "completed") {
        await deps.onCompleted(payload);
      } else if (payload.status === "failed") {
        await deps.onFailed(payload);
      } else {
        deps.logger.info(
          `[VibeKnow Webhook] ignoring unhandled status: ${payload.status}`,
        );
      }
    } catch (err) {
      deps.logger.error("[VibeKnow Webhook] handler error:", err);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  };
}
