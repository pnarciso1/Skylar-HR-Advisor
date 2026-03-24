"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { formatMessageTime, cn, generateId } from "@/lib/utils";
import { ACTION_PLAN_MARKER } from "@/lib/prompts";
import type { Message } from "@/lib/types";
import ActionPlanDisplay, { type ChecklistStep } from "./ActionPlanDisplay";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  isActionPlan?: boolean;
  onChecklistToggle?: (messageId: string, stepId: string, completed: boolean) => void;
}

// ─── Checklist parser ─────────────────────────────────────────────────────────

/**
 * Parses the numbered list under "✅ COMPLETION CHECKLIST" into ChecklistStep[].
 * Handles both "Title: description" and plain "Title" formats.
 */
function parseChecklist(raw: string): ChecklistStep[] {
  const steps: ChecklistStep[] = [];

  for (const line of raw.split("\n")) {
    const match = line.trim().match(/^\d+\.\s+(.+)/);
    if (!match) continue;

    const full = match[1].trim();
    const colonIdx = full.indexOf(":");
    const rawTitle = colonIdx > -1 ? full.slice(0, colonIdx).trim() : full;
    const rawDesc = colonIdx > -1 ? full.slice(colonIdx + 1).trim() : "";

    const stripMd = (s: string) => s.replace(/\*\*/g, "").replace(/`/g, "").trim();
    steps.push({ id: generateId(), title: stripMd(rawTitle), description: stripMd(rawDesc) });
  }

  return steps;
}

/**
 * Splits a message at the ACTION_PLAN_MARKER.
 * Returns { prose, checklist } where checklist may be null.
 */
function splitContent(content: string): {
  prose: string;
  checklist: ChecklistStep[] | null;
} {
  const markerIdx = content.indexOf(ACTION_PLAN_MARKER);
  if (markerIdx === -1) return { prose: content, checklist: null };

  const prose = content.slice(0, markerIdx).trimEnd();
  const checklistRaw = content.slice(markerIdx + ACTION_PLAN_MARKER.length);
  const steps = parseChecklist(checklistRaw);

  return { prose, checklist: steps.length > 0 ? steps : null };
}

// ─── Markdown renderer config ─────────────────────────────────────────────────

const markdownComponents: Components = {
  // Paragraphs
  p: ({ children }) => (
    <p className="my-1.5 leading-relaxed">{children}</p>
  ),
  // Bold
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  // Unordered lists
  ul: ({ children }) => (
    <ul className="my-1.5 ml-4 space-y-0.5 list-disc">{children}</ul>
  ),
  // Ordered lists
  ol: ({ children }) => (
    <ol className="my-1.5 ml-4 space-y-0.5 list-decimal">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  // Headings
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-gray-900 mt-3 mb-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-gray-900 mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-gray-800 mt-2 mb-0.5">{children}</h3>
  ),
  // Inline code
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block bg-gray-100 rounded-md px-3 py-2 text-xs font-mono text-gray-800 my-2 overflow-x-auto whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono text-gray-800">
        {children}
      </code>
    );
  },
  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-200 pl-3 my-2 text-gray-600 italic">
      {children}
    </blockquote>
  ),
  // Horizontal rule (━━━ renders as <hr>)
  hr: () => <hr className="my-3 border-gray-200" />,
  // Tables (remark-gfm)
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-200 px-2 py-1">{children}</td>
  ),
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function MessageBubble({
  message,
  isStreaming = false,
  isActionPlan = false,
  onChecklistToggle,
}: MessageBubbleProps) {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isUser = message.role === "user";

  // Prefer structured ActionPlan steps (stable IDs + persisted completion).
  // Fall back to parsing raw content for older/streaming messages.
  const hasChecklist =
    isActionPlan || message.content.includes(ACTION_PLAN_MARKER);

  const { prose, checklist } = (() => {
    if (!hasChecklist) return { prose: message.content, checklist: null };

    if (message.actionPlan?.steps.length) {
      const { prose: p } = splitContent(message.content);
      const steps: ChecklistStep[] = message.actionPlan.steps.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        completed: s.completed,
      }));
      return { prose: p, checklist: steps };
    }

    return splitContent(message.content);
  })();

  return (
    <div
      className={cn(
        "flex items-end gap-2.5 mb-4 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* ── Avatar ── */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center",
          "text-xs font-bold shadow-sm flex-shrink-0",
          isUser ? "bg-gray-200 text-gray-600" : "bg-blue-600 text-white"
        )}
      >
        {isUser ? "Y" : "S"}
      </div>

      {/* ── Bubble + timestamp wrapper ── */}
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-blue-600 text-white shadow-sm rounded-lg rounded-br-none"
              : "bg-white text-gray-800 border border-gray-200 shadow-md rounded-lg rounded-bl-none",
            isStreaming && "after:content-['▋'] after:animate-pulse after:ml-0.5 after:text-blue-400"
          )}
        >
          {isUser ? (
            /* User: plain text, preserve line breaks */
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            /* Assistant: markdown prose */
            <div className="text-sm text-gray-800">
              {prose && (
                <div className="prose-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {prose}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action plan checklist (outside the bubble, below it) */}
        {!isUser && checklist && checklist.length > 0 && (
          <div className="w-full">
            <ActionPlanDisplay
              steps={checklist}
              onToggle={
                onChecklistToggle
                  ? (stepId, completed) =>
                      onChecklistToggle(message.id, stepId, completed)
                  : undefined
              }
            />
          </div>
        )}

        {/* Timestamp — visible on hover */}
        <span
          className={cn(
            "text-xs text-gray-400 mt-1 px-1 transition-opacity duration-150",
            isUser ? "text-right" : "text-left",
            showTimestamp && !isStreaming ? "opacity-100" : "opacity-0"
          )}
        >
          {formatMessageTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
