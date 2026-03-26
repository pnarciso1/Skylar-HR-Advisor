"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, X, MessageSquare } from "lucide-react";
import type { Conversation, SituationType } from "@/lib/types";
import { formatRelativeTime, formatConversationDate, cn } from "@/lib/utils";
import { getClientFromStorage } from "@/lib/clientStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

// ─── Situation type badges ────────────────────────────────────────────────────

const SITUATION_BADGE: Record<
  SituationType,
  { label: string; className: string }
> = {
  attendance: {
    label: "Attendance",
    className: "bg-blue-100 text-blue-700",
  },
  performance: {
    label: "Performance",
    className: "bg-orange-100 text-orange-700",
  },
  policy: {
    label: "Policy",
    className: "bg-red-100 text-red-700",
  },
  leave: {
    label: "Leave",
    className: "bg-green-100 text-green-700",
  },
  other: {
    label: "Other",
    className: "bg-gray-100 text-gray-600",
  },
};

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Trap focus inside dialog
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 text-center mb-1">
          Delete this conversation?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Single conversation card ─────────────────────────────────────────────────

function ConversationCard({
  conversation,
  isActive,
  onSelect,
  onDeleteRequest,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
}) {
  const badge = SITUATION_BADGE[conversation.situationType];

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group relative flex flex-col gap-1 px-3 py-3 cursor-pointer transition-all",
        "border-l-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isActive
          ? "bg-blue-50 border-l-blue-600"
          : "border-l-transparent hover:bg-gray-50"
      )}
    >
      {/* Title */}
      <p
        className={cn(
          "text-sm font-semibold leading-snug line-clamp-2 pr-6",
          isActive ? "text-blue-900" : "text-gray-800"
        )}
      >
        {conversation.title}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-full font-medium",
            badge.className
          )}
        >
          {badge.label}
        </span>
        <span className="text-xs text-gray-400">
          {formatRelativeTime(conversation.lastMessageAt)}
        </span>
      </div>

      {/* Delete button — visible on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteRequest();
        }}
        aria-label="Delete conversation"
        className={cn(
          "absolute top-2.5 right-2.5 p-1.5 rounded-lg transition-all",
          "opacity-0 group-hover:opacity-100 focus:opacity-100",
          "hover:bg-red-50 hover:text-red-500 text-gray-400"
        )}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function ConversationSkeleton() {
  return (
    <div className="px-3 py-3 animate-pulse">
      <div className="h-3.5 bg-gray-200 rounded w-4/5 mb-2" />
      <div className="flex items-center gap-2">
        <div className="h-3 bg-gray-100 rounded-full w-16" />
        <div className="h-3 bg-gray-100 rounded w-12" />
      </div>
    </div>
  );
}

function SidebarContent({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClose,
  showCloseButton,
  loading,
}: ConversationSidebarProps & { showCloseButton: boolean }) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("My Workspace");

  // Read localStorage only after hydration to avoid server/client HTML mismatch
  useEffect(() => {
    const info = getClientFromStorage();
    if (info?.identifier) setCompanyName(info.identifier);
  }, []);

  // Sort newest first
  const sorted = [...conversations].sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
  );

  // Group by date label
  const groups: { label: string; items: Conversation[] }[] = [];
  for (const conv of sorted) {
    const label = formatConversationDate(conv.lastMessageAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.items.push(conv);
    } else {
      groups.push({ label, items: [conv] });
    }
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    onDeleteConversation(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <>
      {/* Delete confirmation */}
      {pendingDeleteId && (
        <DeleteDialog
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-sm font-semibold text-gray-700 truncate max-w-[180px]"
              title={companyName}
            >
              {companyName}
            </p>
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Close sidebar"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        {/* Conversation list */}
        <nav aria-label="Conversation history" className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="pt-2" role="status" aria-label="Loading conversations">
              {[1, 2, 3].map((i) => (
                <ConversationSkeleton key={i} />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3" aria-hidden="true">
                <MessageSquare className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">
                No conversations yet.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Start your first HR question!
              </p>
            </div>
          ) : (
            <ul role="list" className="py-1">
              {groups.map(({ label, items }) => (
                <li key={label} role="listitem">
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                  <ul role="list">
                    {items.map((conv) => (
                      <li key={conv.id} role="listitem">
                        <ConversationCard
                          conversation={conv}
                          isActive={conv.id === activeConversationId}
                          onSelect={() => {
                            onSelectConversation(conv.id);
                            onClose();
                          }}
                          onDeleteRequest={() => setPendingDeleteId(conv.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </div>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ConversationSidebar(props: ConversationSidebarProps) {
  const { isOpen, onClose } = props;

  // Lock body scroll when mobile overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* ── Desktop sidebar (always visible ≥768px) ── */}
      <aside className="hidden md:flex flex-col w-[280px] flex-shrink-0 h-full bg-white border-r border-gray-200 shadow-sm" aria-label="Conversation history">
        <SidebarContent {...props} showCloseButton={false} />
      </aside>

      {/* ── Mobile overlay ── */}
      {/* Backdrop */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-xl",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Conversation history"
      >
        <SidebarContent {...props} showCloseButton={true} />
      </aside>
    </>
  );
}
