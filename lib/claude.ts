import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPT,
  CALIFORNIA_LAW_CONTEXT,
  TITLE_GENERATION_PROMPT,
  ACTION_PLAN_MARKER,
} from "./prompts";
import type { ActionPlan, ActionStep } from "./types";
import { generateId } from "./utils";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ─── Streaming ────────────────────────────────────────────────────────────────

/**
 * Call Claude with streaming and return a ReadableStream of SSE-formatted chunks.
 * Each chunk is `data: {"token":"..."}\n\n`; the final chunk is `data: [DONE]\n\n`.
 */
export async function streamChatResponse(
  messages: ClaudeMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const client = getClaudeClient();
  const encoder = new TextEncoder();

  const combinedSystem = `${SYSTEM_PROMPT}\n\n${CALIFORNIA_LAW_CONTEXT}`;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: combinedSystem,
          messages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });
}

// ─── Title generation ─────────────────────────────────────────────────────────

/**
 * Generate a short conversation title from the first several messages.
 * Falls back to a timestamped title on any failure or unexpected output.
 */
export async function generateConversationTitle(
  messages: ClaudeMessage[]
): Promise<string> {
  const fallback = () =>
    `HR Situation - ${new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;

  try {
    const client = getClaudeClient();

    // Only use the first 6 messages to keep the title prompt focused
    const sample = messages.slice(0, 6);
    const transcript = sample
      .map((m) => `${m.role === "user" ? "Manager" : "Skylar"}: ${m.content}`)
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 50,
      system: TITLE_GENERATION_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the conversation:\n\n${transcript}`,
        },
      ],
    });

    const raw =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : "";

    // Reject obviously bad output (empty, too long, contains newlines)
    if (!raw || raw.length > 80 || raw.includes("\n")) {
      return fallback();
    }

    return raw;
  } catch {
    return fallback();
  }
}

// ─── Action plan extraction ───────────────────────────────────────────────────

export function extractActionPlan(content: string): ActionPlan | undefined {
  if (!content.includes(ACTION_PLAN_MARKER)) return undefined;

  const planSection = content.split(ACTION_PLAN_MARKER)[1];
  if (!planSection) return undefined;

  const lines = planSection.trim().split("\n").filter(Boolean);
  const steps: ActionStep[] = [];

  for (const line of lines) {
    const match = line.match(/^\d+\.\s+(.+)/);
    if (match) {
      const stepText = match[1].trim();
      const colonIdx = stepText.indexOf(":");
      const rawTitle =
        colonIdx > -1 ? stepText.slice(0, colonIdx).trim() : stepText;
      const rawDesc =
        colonIdx > -1 ? stepText.slice(colonIdx + 1).trim() : "";

      const stripMd = (s: string) =>
        s.replace(/\*\*/g, "").replace(/`/g, "").trim();

      steps.push({
        id: generateId(),
        title: stripMd(rawTitle),
        description: stripMd(rawDesc),
        completed: false,
      });
    }
  }

  if (steps.length === 0) return undefined;

  return {
    steps,
    summary: `${steps.length} action items identified`,
    priority: "medium",
  };
}
