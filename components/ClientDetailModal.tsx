"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  X,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronRight,
  MinusCircle,
} from "lucide-react";
import type { Conversation, PilotClientSummary, SituationType } from "@/lib/types";
import { getClientConversations } from "@/lib/firebase";
import { formatRelativeTime, truncateText, cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientDetailModalProps {
  client: PilotClientSummary;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SITUATION_LABELS: Record<SituationType, string> = {
  attendance: "Attendance",
  performance: "Performance",
  policy: "Policy",
  leave: "Leave",
  other: "Other",
};

const SITUATION_BADGE: Record<SituationType, string> = {
  attendance: "bg-blue-50 text-blue-700 border-blue-200",
  performance: "bg-violet-50 text-violet-700 border-violet-200",
  policy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  leave: "bg-amber-50 text-amber-700 border-amber-200",
  other: "bg-slate-50 text-slate-600 border-slate-200",
};

function confidenceColor(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 6) return "bg-blue-500";
  if (score >= 4) return "bg-amber-500";
  return "bg-red-400";
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ClientDetailModal({
  client,
  isOpen,
  onClose,
}: ClientDetailModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [visible, setVisible] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      const t = setTimeout(() => {
        setVisible(false);
        setSelectedConversation(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Focus the close button when modal opens
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  // Escape key closes the modal (or backs out of transcript)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedConversation) setSelectedConversation(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, selectedConversation, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Fetch conversations when modal opens
  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const convs = await getClientConversations(client.clientId);
      setConversations(convs);
    } catch {
      setError("Failed to load conversations. Please close and try again.");
    } finally {
      setLoading(false);
    }
  }, [client.clientId]);

  useEffect(() => {
    if (isOpen) loadConversations();
  }, [isOpen, loadConversations]);

  if (!visible && !isOpen) return null;

  const isEntering = isOpen && visible;

  return (
    <div
      ref={backdropRef}
      className={cn(
        "fixed inset-0 z-50 flex transition-opacity duration-200",
        "items-end sm:items-center sm:justify-center sm:p-4",
        isEntering ? "opacity-100" : "opacity-0"
      )}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`${client.name} details`}
    >
      <div
        className={cn(
          "relative bg-white shadow-2xl w-full flex flex-col transition-all duration-200",
          // Mobile: full-width bottom-sheet sliding up
          "rounded-t-2xl max-h-[90vh]",
          // Desktop: centered card
          "sm:rounded-2xl sm:max-w-4xl sm:max-h-[85vh]",
          isEntering
            ? "opacity-100 translate-y-0 sm:scale-100"
            : "opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
        )}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        {selectedConversation ? (
          <TranscriptView
            conversation={selectedConversation}
            onBack={() => setSelectedConversation(null)}
            onClose={onClose}
            closeButtonRef={closeButtonRef}
          />
        ) : (
          <ConversationListView
            client={client}
            conversations={conversations}
            loading={loading}
            error={error}
            onSelectConversation={setSelectedConversation}
            onRetry={loadConversations}
            onClose={onClose}
            closeButtonRef={closeButtonRef}
          />
        )}
      </div>
    </div>
  );
}

// ─── Conversation list view ───────────────────────────────────────────────────

function ConversationListView({
  client,
  conversations,
  loading,
  error,
  onSelectConversation,
  onRetry,
  onClose,
  closeButtonRef,
}: {
  client: PilotClientSummary;
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  onSelectConversation: (c: Conversation) => void;
  onRetry: () => void;
  onClose: () => void;
  closeButtonRef: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-slate-100 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
          <p className="text-sm text-secondary mt-0.5">
            Pilot client · last active {formatRelativeTime(new Date(client.lastActive))}
          </p>
        </div>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="p-2 text-secondary hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
        <SummaryCard label="Conversations" value={client.conversationCount.toString()} />
        <SummaryCard
          label="Acted independently"
          value={client.actedCount > 0 ? `${client.actedPercentage}%` : "—"}
          sub={client.actedCount > 0 ? `${client.actedCount} of ${client.conversationCount}` : undefined}
          highlight={client.actedPercentage >= 70 ? "green" : client.actedCount > 0 ? "amber" : undefined}
        />
        <SummaryCard
          label="Avg. confidence"
          value={client.averageConfidence > 0 ? `${client.averageConfidence.toFixed(1)}/10` : "—"}
          highlight={
            client.averageConfidence >= 7
              ? "green"
              : client.averageConfidence >= 5
              ? "amber"
              : undefined
          }
        />
        <SummaryCard
          label="Status"
          value={
            { active: "Active", "low-usage": "Low usage", "no-usage": "No usage" }[client.status]
          }
          highlight={
            client.status === "active" ? "green" : client.status === "low-usage" ? "amber" : undefined
          }
        />
      </div>

      {/* Conversation table */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="m-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            <button
              onClick={onRetry}
              className="ml-auto font-medium underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-secondary">
            <MessageSquare className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-sm">No conversations yet for this client.</p>
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr className="text-left text-xs text-secondary">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Situation</th>
                  <th className="px-4 py-3 font-medium">Acted?</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium sr-only">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {conversations.map((conv) => (
                  <ConversationRow
                    key={conv.id}
                    conversation={conv}
                    onView={() => onSelectConversation(conv)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Single conversation row ──────────────────────────────────────────────────

function ConversationRow({
  conversation: conv,
  onView,
}: {
  conversation: Conversation;
  onView: () => void;
}) {
  const fb = conv.userFeedback;

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-3.5">
        <p className="font-medium text-slate-800 text-xs">
          {format(new Date(conv.startedAt), "MMM d, yyyy")}
        </p>
        <p className="text-secondary text-xs mt-0.5">
          {format(new Date(conv.startedAt), "h:mm a")}
        </p>
      </td>

      <td className="px-4 py-3.5">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
            SITUATION_BADGE[conv.situationType]
          )}
        >
          {SITUATION_LABELS[conv.situationType]}
        </span>
      </td>

      <td className="px-4 py-3.5">
        {fb === null ? (
          <span className="text-secondary text-xs">No feedback</span>
        ) : fb.actedOnGuidance === true ? (
          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Yes
          </span>
        ) : fb.actedOnGuidance === false ? (
          <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
            <XCircle className="w-3.5 h-3.5" /> No
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-secondary text-xs">
            <MinusCircle className="w-3.5 h-3.5" /> Undecided
          </span>
        )}
      </td>

      <td className="px-4 py-3.5">
        {fb?.confidence != null ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn("w-2 h-2 rounded-full", confidenceColor(fb.confidence))}
            />
            <span className="text-slate-700 text-xs">{fb.confidence}/10</span>
          </span>
        ) : (
          <span className="text-secondary text-xs">—</span>
        )}
      </td>

      <td className="px-4 py-3.5 max-w-[160px]">
        {fb?.notes ? (
          <span
            className="text-secondary text-xs cursor-help"
            title={fb.notes}
          >
            {truncateText(fb.notes, 40)}
          </span>
        ) : (
          <span className="text-secondary text-xs">—</span>
        )}
      </td>

      <td className="px-4 py-3.5">
        <button
          onClick={onView}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark hover:underline transition-colors"
          aria-label={`View transcript for ${conv.title}`}
        >
          View
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Transcript view ──────────────────────────────────────────────────────────

function TranscriptView({
  conversation,
  onBack,
  onClose,
  closeButtonRef,
}: {
  conversation: Conversation;
  onBack: () => void;
  onClose: () => void;
  closeButtonRef: React.RefObject<HTMLButtonElement>;
}) {
  const fb = conversation.userFeedback;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-slate-800 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
          aria-label="Back to conversation list"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {conversation.title}
          </p>
          <p className="text-xs text-secondary">
            {format(new Date(conversation.startedAt), "MMMM d, yyyy 'at' h:mm a")} ·{" "}
            {conversation.messages.length} messages
          </p>
        </div>

        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="p-2 text-secondary hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-slate-50">
        {conversation.messages.length === 0 ? (
          <p className="text-center text-secondary text-sm py-8">No messages in this conversation.</p>
        ) : (
          conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
                <div
                  className={cn(
                    "max-w-[90%] sm:max-w-[75%] rounded-xl px-4 py-3 text-sm shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p
                  className={cn(
                    "text-xs mt-1.5",
                    msg.role === "user" ? "text-blue-200 text-right" : "text-secondary"
                  )}
                >
                  {format(new Date(msg.timestamp), "h:mm a")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Feedback section */}
      <div className="border-t border-slate-100 px-6 py-4 shrink-0 bg-white">
        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">
          Feedback
        </p>
        {fb === null ? (
          <p className="text-sm text-secondary italic">No feedback submitted for this conversation.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-secondary mb-0.5">Acted on guidance</p>
              {fb.actedOnGuidance === true ? (
                <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                </span>
              ) : fb.actedOnGuidance === false ? (
                <span className="inline-flex items-center gap-1 text-red-500 font-medium text-xs">
                  <XCircle className="w-3.5 h-3.5" /> No
                </span>
              ) : (
                <span className="text-secondary text-xs">Not decided</span>
              )}
            </div>

            <div>
              <p className="text-xs text-secondary mb-0.5">Confidence</p>
              {fb.confidence != null ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", confidenceColor(fb.confidence))} />
                  <span className="font-medium text-slate-800 text-xs">{fb.confidence}/10</span>
                </span>
              ) : (
                <span className="text-secondary text-xs">—</span>
              )}
            </div>

            <div>
              <p className="text-xs text-secondary mb-0.5">Contacted Skylar</p>
              <span className="text-slate-800 text-xs">
                {fb.contactedSkylar === true ? "Yes" : fb.contactedSkylar === false ? "No" : "—"}
              </span>
            </div>

            <div>
              <p className="text-xs text-secondary mb-0.5">Submitted</p>
              <span className="text-slate-800 text-xs">
                {formatRelativeTime(new Date(fb.submittedAt))}
              </span>
            </div>

            {fb.notes && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-xs text-secondary mb-0.5">Notes</p>
                <p className="text-slate-700 text-xs italic">&ldquo;{fb.notes}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Summary card (used in header stats) ─────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "green" | "amber";
}) {
  const highlightColor = {
    green: "text-green-600",
    amber: "text-amber-600",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-center">
      <p
        className={cn(
          "text-lg font-bold",
          highlight ? highlightColor[highlight] : "text-slate-900"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}
