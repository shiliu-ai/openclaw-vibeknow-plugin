import type { IncomingMessage, ServerResponse } from "node:http";
import { verifySignature } from "../utils/hmac.js";

export interface WebhookPayload {
  task_id: number;
  session_id: string;
  status: "completed" | "failed" | "query_optimized" | "processing";
  share_url?: string;
  cover_url?: string;
  duration?: number;
  error?: string;
  optimized_query?: string;
  message?: string;
  im_handle?: string;
  im_channel?: string;
}

export interface WebhookHandlerDeps {
  webhookSecret: string;
  onCompleted: (payload: WebhookPayload) => Promise<void>;
  onFailed: (payload: WebhookPayload) => Promise<void>;
  onQueryOptimized?: (payload: WebhookPayload) => Promise<void>;
  onProcessing?: (payload: WebhookPayload) => Promise<void>;
  logger: { info: (message: string) => void; error: (message: string) => void };
}

export function createWebhookHandler(deps: WebhookHandlerDeps) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      res.end("Method Not Allowed");
      return true;
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
        return true;
      }
      chunks.push(buf);
    }
    const body = Buffer.concat(chunks);

    // Verify signature only when webhookSecret is configured
    if (deps.webhookSecret) {
      const signature = (req.headers["x-webhook-signature"] as string) ?? "";
      if (!verifySignature(body, signature, deps.webhookSecret)) {
        deps.logger.error("[VibeKnow Webhook] signature verification failed");
        res.statusCode = 401;
        res.end("Unauthorized");
        return true;
      }
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(body.toString()) as WebhookPayload;
    } catch {
      res.statusCode = 400;
      res.end("Invalid JSON");
      return true;
    }

    deps.logger.info(
      `[VibeKnow Webhook] received: task_id=${payload.task_id}, status=${payload.status}`,
    );

    // ACK immediately, then deliver asynchronously
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));

    try {
      if (payload.status === "completed") {
        await deps.onCompleted(payload);
      } else if (payload.status === "failed") {
        await deps.onFailed(payload);
      } else if (payload.status === "query_optimized" && deps.onQueryOptimized) {
        await deps.onQueryOptimized(payload);
      } else if (payload.status === "processing" && deps.onProcessing) {
        await deps.onProcessing(payload);
      } else {
        deps.logger.info(
          `[VibeKnow Webhook] ignoring unhandled status: ${payload.status}`,
        );
      }
    } catch (err) {
      deps.logger.error(
        `[VibeKnow Webhook] handler error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return true;
  };
}
