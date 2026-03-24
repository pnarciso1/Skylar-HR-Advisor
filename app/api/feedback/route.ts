import { NextRequest, NextResponse } from "next/server";
import { saveConversationFeedback } from "@/lib/firebase";
import type { UserFeedback } from "@/lib/types";

interface FeedbackBody {
  conversationId: string;
  feedback: {
    actedOnGuidance: boolean | null;
    confidence: number | null;
    contactedSkylar: boolean | null;
    notes: string | null;
  };
}

export async function POST(req: NextRequest) {
  // ── Parse ────────────────────────────────────────────────────────────────────
  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { conversationId, feedback } = body;

  // ── Validate ─────────────────────────────────────────────────────────────────
  if (!conversationId || typeof conversationId !== "string" || !conversationId.trim()) {
    return NextResponse.json(
      { error: "conversationId must be a non-empty string" },
      { status: 400 }
    );
  }

  if (
    feedback.actedOnGuidance !== null &&
    typeof feedback.actedOnGuidance !== "boolean"
  ) {
    return NextResponse.json(
      { error: "actedOnGuidance must be boolean or null" },
      { status: 400 }
    );
  }

  if (
    feedback.confidence !== null &&
    (typeof feedback.confidence !== "number" ||
      feedback.confidence < 1 ||
      feedback.confidence > 10 ||
      !Number.isInteger(feedback.confidence))
  ) {
    return NextResponse.json(
      { error: "confidence must be an integer between 1 and 10, or null" },
      { status: 400 }
    );
  }

  // ── Build typed feedback object ───────────────────────────────────────────────
  const userFeedback: UserFeedback = {
    actedOnGuidance: feedback.actedOnGuidance,
    confidence: feedback.confidence,
    contactedSkylar: feedback.contactedSkylar ?? null,
    notes: feedback.notes ?? null,
    submittedAt: new Date(),
  };

  // ── Persist ──────────────────────────────────────────────────────────────────
  try {
    await saveConversationFeedback(conversationId, userFeedback);
    console.log(`[/api/feedback] Saved feedback for conversation ${conversationId}`);
  } catch (err) {
    console.error("[/api/feedback] Firestore save failed:", err);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "Feedback saved" });
}
