"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, HelpCircle, X } from "lucide-react";
import type { UserFeedback } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Answer = "yes" | "no" | "not-yet" | null;

export interface FeedbackPromptProps {
  conversationId: string;
  onClose: () => void;
  onSubmit: (feedback: UserFeedback) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ConfidenceLabel({ value }: { value: number }) {
  if (value <= 2) return <span className="text-red-500">Not confident</span>;
  if (value <= 4) return <span className="text-orange-500">Somewhat uncertain</span>;
  if (value <= 6) return <span className="text-yellow-600">Moderately confident</span>;
  if (value <= 8) return <span className="text-lime-600">Confident</span>;
  return <span className="text-green-600">Very confident</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedbackPrompt({
  onClose,
  onSubmit,
}: FeedbackPromptProps) {
  const [answered, setAnswered] = useState<Answer>(null);
  const [confidence, setConfidence] = useState(7);
  const [contactSkylar, setContactSkylar] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-close 2 seconds after successful submission
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(onClose, 2000);
    return () => clearTimeout(t);
  }, [submitted, onClose]);

  function buildFeedback(): UserFeedback {
    return {
      actedOnGuidance: answered === "yes" ? true : answered === "no" ? false : null,
      confidence: answered === "yes" ? confidence : null,
      contactedSkylar: answered === "no" ? contactSkylar : null,
      notes: notes.trim() || null,
      submittedAt: new Date(),
    };
  }

  function handleSubmit() {
    setSubmitting(true);
    const feedback = buildFeedback();
    onSubmit(feedback);
    setSubmitted(true);
    setSubmitting(false);
  }

  // ── Submitted state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="rounded-xl border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-5 shadow-lg flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Thank you for your feedback!</p>
          <p className="text-sm text-green-600 mt-0.5">Your input helps us improve Skylar.</p>
        </div>
      </div>
    );
  }

  // ── Main question ────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-green-700 flex-shrink-0" />
          <p className="font-semibold text-lg text-gray-800">
            Did you act on this guidance?
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-green-100 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step 1: primary answer */}
      {answered === null && (
        <div className="flex flex-col sm:flex-row gap-2">
          <ActionButton
            color="green"
            onClick={() => setAnswered("yes")}
          >
            Yes, I acted on it
          </ActionButton>
          <ActionButton
            color="orange"
            onClick={() => setAnswered("no")}
          >
            No, I still need help
          </ActionButton>
          <ActionButton
            color="gray"
            onClick={() => setAnswered("not-yet")}
          >
            Not yet decided
          </ActionButton>
        </div>
      )}

      {/* Step 2a: Yes → confidence slider */}
      {answered === "yes" && (
        <div className="space-y-5">
          <AnsweredBadge label="Yes, I acted on it" color="green" onReset={() => setAnswered(null)} />

          <div>
            <p className="text-base font-medium text-gray-800 mb-3">
              Great! How confident did you feel?
            </p>
            <div className="space-y-2">
              <input
                type="range"
                min={1}
                max={10}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-400 select-none">
                <span>1 — Not confident</span>
                <span className="font-semibold text-sm text-gray-700">
                  {confidence} — <ConfidenceLabel value={confidence} />
                </span>
                <span>10 — Very confident</span>
              </div>
            </div>
          </div>

          <NotesInput value={notes} onChange={setNotes} placeholder="Any additional notes? (optional)" />
          <SubmitButton onClick={handleSubmit} loading={submitting} />
        </div>
      )}

      {/* Step 2b: No → contact question */}
      {answered === "no" && (
        <div className="space-y-5">
          <AnsweredBadge label="No, I still need help" color="orange" onReset={() => setAnswered(null)} />

          <div>
            <p className="text-base font-medium text-gray-800 mb-3">
              No problem! Would you like to contact Skylar directly?
            </p>
            {contactSkylar === null && (
              <div className="flex flex-col sm:flex-row gap-2">
                <ActionButton color="green" onClick={() => setContactSkylar(true)}>
                  Yes, contact Skylar
                </ActionButton>
                <ActionButton color="gray" onClick={() => setContactSkylar(false)}>
                  No, I&apos;ll handle it
                </ActionButton>
              </div>
            )}
            {contactSkylar === true && (
              <div className="rounded-lg bg-white border border-green-200 px-4 py-3 text-sm text-gray-700">
                Reach us at{" "}
                <a
                  href="mailto:support@skylarhr.ai"
                  className="font-semibold text-green-700 hover:underline"
                >
                  support@skylarhr.ai
                </a>{" "}
                and we&apos;ll follow up within one business day.
              </div>
            )}
            {contactSkylar === false && (
              <p className="text-sm text-gray-500">Got it — good luck handling it!</p>
            )}
          </div>

          <NotesInput value={notes} onChange={setNotes} placeholder="What made you hesitate? (optional)" />
          <SubmitButton onClick={handleSubmit} loading={submitting} />
        </div>
      )}

      {/* Step 2c: Not yet decided */}
      {answered === "not-yet" && (
        <div className="space-y-5">
          <AnsweredBadge label="Not yet decided" color="gray" onReset={() => setAnswered(null)} />

          <p className="text-sm text-gray-600">
            That&apos;s okay — come back when you&apos;re ready and we&apos;ll still have your action plan here.
          </p>

          <NotesInput value={notes} onChange={setNotes} placeholder="Any thoughts so far? (optional)" />

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Remind me later
            </button>
            <SubmitButton onClick={handleSubmit} loading={submitting} className="flex-1" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionButton({
  color,
  onClick,
  children,
}: {
  color: "green" | "orange" | "gray";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const styles = {
    green: "bg-green-600 hover:bg-green-700 active:bg-green-800",
    orange: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700",
    gray: "bg-gray-400 hover:bg-gray-500 active:bg-gray-600",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors shadow-sm",
        styles[color]
      )}
    >
      {children}
    </button>
  );
}

function AnsweredBadge({
  label,
  color,
  onReset,
}: {
  label: string;
  color: "green" | "orange" | "gray";
  onReset: () => void;
}) {
  const styles = {
    green: "bg-green-100 text-green-700 border-green-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border",
          styles[color]
        )}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {label}
      </span>
      <button
        onClick={onReset}
        className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
      >
        change
      </button>
    </div>
  );
}

function NotesInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full resize-none rounded-lg border border-green-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition-all"
    />
  );
}

function SubmitButton({
  onClick,
  loading,
  className,
}: {
  onClick: () => void;
  loading: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50",
        className
      )}
    >
      {loading ? "Submitting…" : "Submit Feedback"}
    </button>
  );
}
