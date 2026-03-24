"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  completed?: boolean;
}

export interface ActionPlanDisplayProps {
  steps: ChecklistStep[];
  onToggle?: (stepId: string, completed: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActionPlanDisplay({ steps, onToggle }: ActionPlanDisplayProps) {
  // Seed from persisted step.completed if provided; default to false
  const [completed, setCompleted] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(steps.map((s) => [s.id, s.completed ?? false]))
  );

  function toggle(id: string) {
    setCompleted((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      onToggle?.(id, next[id]!);
      return next;
    });
  }

  const completedCount = Object.values(completed).filter(Boolean).length;
  const allDone = completedCount === steps.length && steps.length > 0;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden mt-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white">
        <ClipboardCheck className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-semibold">Completion Checklist</span>
        <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
          {completedCount}/{steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-blue-100">
        <div
          className="h-1 bg-blue-500 transition-all duration-500"
          style={{
            width: steps.length > 0 ? `${(completedCount / steps.length) * 100}%` : "0%",
          }}
        />
      </div>

      {/* Steps */}
      <div className="divide-y divide-blue-100">
        {steps.map((step, idx) => {
          const isDone = !!completed[step.id];
          return (
            <button
              key={step.id}
              onClick={() => toggle(step.id)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                isDone
                  ? "bg-blue-50/60"
                  : "bg-white hover:bg-blue-50 active:bg-blue-100"
              )}
            >
              {/* Check icon */}
              <div className="flex-shrink-0 mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                    Step {idx + 1}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-sm font-semibold leading-snug",
                    isDone
                      ? "line-through text-gray-400"
                      : "text-gray-800"
                  )}
                >
                  {step.title}
                </p>
                {step.description && (
                  <p
                    className={cn(
                      "text-xs mt-0.5 leading-relaxed",
                      isDone ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className={cn(
          "px-4 py-2.5 text-xs font-medium text-center transition-colors",
          allDone
            ? "bg-green-50 text-green-700"
            : "bg-blue-50 text-blue-500"
        )}
      >
        {allDone
          ? "✓ All steps completed — great work!"
          : "Tap each step to mark it complete"}
      </div>
    </div>
  );
}
