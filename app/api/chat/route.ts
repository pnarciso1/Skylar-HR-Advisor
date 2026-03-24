import { NextRequest } from "next/server";
import { streamChatResponse } from "@/lib/claude";
import type { ChatRequest } from "@/lib/types";

// Required for streaming in Next.js 14 App Router
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

export async function POST(req: NextRequest) {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch (err) {
    console.error("[/api/chat] Invalid JSON body:", err);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { conversationId, messages } = body;

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "Messages are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Stream ────────────────────────────────────────────────────────────────
  console.log(
    `[/api/chat] Starting stream — conversationId=${conversationId ?? "none"}, messages=${messages.length}`
  );

  let readable: ReadableStream<Uint8Array>;
  try {
    readable = await streamChatResponse(messages);
  } catch (err) {
    console.error("[/api/chat] Failed to initialise stream:", err);
    return new Response(
      JSON.stringify({ error: "Failed to connect to AI service" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(readable, { status: 200, headers: SSE_HEADERS });
}
