"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Send, Menu, Loader2 } from "lucide-react";
import type { Message, Conversation, ChatRequest, UserFeedback } from "@/lib/types";
import { generateId, truncateText } from "@/lib/utils";
import {
  getClientFromStorage,
  getConversationsFromStorage,
  createNewConversation,
  saveConversationLocally,
  deleteConversationLocally,
  syncConversationToFirestore,
} from "@/lib/clientStorage";
import { markActionPlanDelivered } from "@/lib/firebase";
import { ACTION_PLAN_MARKER } from "@/lib/prompts";
import { extractActionPlan } from "@/lib/claude";
import ConversationSidebar from "./ConversationSidebar";
import MessageBubble from "./MessageBubble";
import FeedbackPrompt from "./FeedbackPrompt";

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = "skylar_active_conv_id";

const STARTER_PROMPTS = [
  "An employee has been late 4 times this month. What should I do?",
  "How do I put someone on a Performance Improvement Plan?",
  "An employee just requested FMLA leave. What are my obligations?",
  "How do I document a verbal warning correctly?",
];

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-white text-xs font-bold">S</span>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatInterface() {
  const router = useRouter();

  // Client
  const [clientId, setClientId] = useState<string | null>(null);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);

  // UI state
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── On mount: verify client, load conversations ──────────────────────────
  useEffect(() => {
    const client = getClientFromStorage();
    if (!client) {
      router.replace("/");
      return;
    }
    setClientId(client.clientId);

    const stored = getConversationsFromStorage();
    setConversations(stored);

    // Restore active conversation from sessionStorage, or use first/new
    const savedId = sessionStorage.getItem(SESSION_KEY);
    const restored = savedId ? stored.find((c) => c.id === savedId) : null;

    if (restored) {
      setActiveConversation(restored);
      setShowFeedback(
        restored.actionPlanDelivered && restored.userFeedback === null
      );
    } else if (stored.length > 0) {
      setActiveConversation(stored[0]!);
    } else {
      const fresh = createNewConversation(client.clientId);
      setConversations([fresh]);
      setActiveConversation(fresh);
    }
  }, [router]);

  // ── Persist active conversation id to sessionStorage ─────────────────────
  useEffect(() => {
    if (activeConversation?.id) {
      sessionStorage.setItem(SESSION_KEY, activeConversation.id);
    }
  }, [activeConversation?.id]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, streamingContent, isStreaming]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function updateConversation(updated: Conversation) {
    setActiveConversation(updated);
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    saveConversationLocally(updated);
  }

  function addMessage(conv: Conversation, message: Message): Conversation {
    const isFirstUser =
      conv.messages.length === 0 && message.role === "user";
    const updated: Conversation = {
      ...conv,
      messages: [...conv.messages, message],
      lastMessageAt: message.timestamp,
      title: isFirstUser ? truncateText(message.content, 50) : conv.title,
      actionPlanDelivered:
        conv.actionPlanDelivered ||
        (message.role === "assistant" &&
          message.content.includes(ACTION_PLAN_MARKER)),
      actionPlanDeliveredAt:
        !conv.actionPlanDelivered &&
        message.role === "assistant" &&
        message.content.includes(ACTION_PLAN_MARKER)
          ? message.timestamp
          : conv.actionPlanDeliveredAt,
    };
    saveConversationLocally(updated);
    return updated;
  }

  async function generateTitle(conv: Conversation) {
    if (conv.title !== "New Conversation") return;
    const msgCount = conv.messages.length;
    if (msgCount < 6) return; // wait for 3 full exchanges (6 messages)

    try {
      const res = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conv.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const { title } = (await res.json()) as { title: string };
      if (title && title !== "New Conversation") {
        const updated: Conversation = { ...conv, title };
        updateConversation(updated);
      }
    } catch {
      // Non-fatal — title stays as default
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleNewConversation() {
    const client = getClientFromStorage();
    const conv = createNewConversation(client?.clientId ?? clientId ?? "local");
    setConversations((prev) => [conv, ...prev]);
    setActiveConversation(conv);
    setShowFeedback(false);
    setStreamingContent("");
    setIsSidebarOpen(false);
  }

  function handleSelectConversation(id: string) {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    setActiveConversation(conv);
    setShowFeedback(conv.actionPlanDelivered && conv.userFeedback === null);
    setStreamingContent("");
    setIsSidebarOpen(false);
  }

  function handleDeleteConversation(id: string) {
    deleteConversationLocally(id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);

    if (activeConversation?.id === id) {
      if (updated.length > 0) {
        setActiveConversation(updated[0]!);
      } else {
        const client = getClientFromStorage();
        const fresh = createNewConversation(
          client?.clientId ?? clientId ?? "local"
        );
        setConversations([fresh]);
        setActiveConversation(fresh);
      }
      setShowFeedback(false);
    }
  }

  function handleChecklistToggle(
    messageId: string,
    stepId: string,
    completed: boolean
  ) {
    if (!activeConversation) return;

    const updatedMessages = activeConversation.messages.map((msg) => {
      if (msg.id !== messageId || !msg.actionPlan) return msg;
      return {
        ...msg,
        actionPlan: {
          ...msg.actionPlan,
          steps: msg.actionPlan.steps.map((s) =>
            s.id === stepId ? { ...s, completed } : s
          ),
        },
      };
    });

    const updated: Conversation = {
      ...activeConversation,
      messages: updatedMessages,
    };
    updateConversation(updated);
    void syncConversationToFirestore(updated).catch(() => undefined);
  }

  function handleFeedbackSubmit(feedback: UserFeedback) {
    if (!activeConversation) return;

    // Persist locally immediately
    const updated: Conversation = { ...activeConversation, userFeedback: feedback };
    updateConversation(updated);

    // Persist to Firestore via API route (fire-and-forget)
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversation.id,
        feedback: {
          actedOnGuidance: feedback.actedOnGuidance,
          confidence: feedback.confidence,
          contactedSkylar: feedback.contactedSkylar,
          notes: feedback.notes,
        },
      }),
    }).catch((err) => {
      console.error("[ChatInterface] feedback API error:", err);
    });
  }

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    let conv = activeConversation;
    if (!conv) {
      conv = createNewConversation(clientId ?? "local");
      setConversations((prev) => [conv!, ...prev]);
    }

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    conv = addMessage(conv, userMsg);
    setActiveConversation(conv);
    setConversations((prev) =>
      prev.some((c) => c.id === conv!.id)
        ? prev.map((c) => (c.id === conv!.id ? conv! : c))
        : [conv!, ...prev]
    );

    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsStreaming(true);
    setStreamingContent("");
    setShowFeedback(false);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const body: ChatRequest = {
        messages: conv.messages.map((m) => ({ role: m.role, content: m.content })),
        conversationId: conv.id,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // A single read() can contain multiple SSE lines
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();

          if (payload === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(payload) as
              | { text: string }
              | { error: string };

            if ("error" in parsed) throw new Error(parsed.error);
            accumulated += parsed.text;
            setStreamingContent(accumulated);
          } catch (parseErr) {
            // Rethrow actual API errors; ignore malformed SSE chunks
            if (parseErr instanceof Error && parseErr.message !== "Unexpected token") {
              throw parseErr;
            }
          }
        }
      }

      if (!accumulated) {
        throw new Error("No response received from Skylar. Please try again.");
      }

      // Commit the streamed message
      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: accumulated,
        timestamp: new Date(),
        // Attach parsed action plan so checklist step IDs are stable across renders
        actionPlan: extractActionPlan(accumulated) ?? undefined,
      };

      conv = addMessage(conv, assistantMsg);
      updateConversation(conv);
      setStreamingContent("");

      // Always sync to Firestore after every assistant message
      void syncConversationToFirestore(conv).catch(() => undefined);

      // Action plan detected — mark delivery and show feedback after delay
      if (accumulated.includes(ACTION_PLAN_MARKER)) {
        void markActionPlanDelivered(conv.id).catch(() => undefined);
        setTimeout(() => setShowFeedback(true), 2000);
      }

      // Generate title after 3rd full exchange (6 messages)
      void generateTitle(conv);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      console.error("[ChatInterface] sendMessage error:", err);

      const errMsg: Message = {
        id: generateId(),
        role: "assistant",
        content:
          err instanceof Error && !err.message.startsWith("AbortError")
            ? `Sorry, something went wrong: ${err.message}`
            : "I'm sorry, I ran into an error. Please try again.",
        timestamp: new Date(),
      };
      conv = addMessage(conv!, errMsg);
      updateConversation(conv);
      setStreamingContent("");
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isStreaming, activeConversation, clientId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-grow textarea
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const messages = activeConversation?.messages ?? [];
  const convTitle =
    activeConversation?.title && activeConversation.title !== "New Conversation"
      ? activeConversation.title
      : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversation?.id ?? null}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main panel */}
      <div className="flex flex-col flex-1 min-w-0 h-full">

        {/* ── Header ── */}
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {logoError ? (
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
            ) : (
              <div className="h-7 overflow-hidden rounded-md">
                <Image
                  src="/SkylarLogo.jpg"
                  alt="Skylar"
                  width={90}
                  height={28}
                  className="object-contain h-7 w-auto"
                  onError={() => setLogoError(true)}
                />
              </div>
            )}
            <span className="hidden sm:inline text-sm font-medium text-gray-500">
              HR Assistant
            </span>
          </div>

          {/* Conversation title (center) */}
          {convTitle && (
            <div className="flex-1 text-center">
              <span className="text-sm font-medium text-gray-700 truncate max-w-xs inline-block">
                {convTitle}
              </span>
            </div>
          )}
          {!convTitle && <div className="flex-1" />}
        </header>

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          {messages.length === 0 && !isStreaming ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center px-4 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <span className="text-white text-2xl font-bold">S</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Hi, I&apos;m Skylar
              </h2>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Your HR advisor for California employers. Ask me about employee
                issues, performance management, leave, compliance, and more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="text-left text-sm px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-all shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onChecklistToggle={handleChecklistToggle}
                />
              ))}

              {/* Streaming bubble */}
              {isStreaming && streamingContent && (
                <MessageBubble
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streamingContent,
                    timestamp: new Date(),
                  }}
                  isStreaming
                />
              )}

              {/* Typing indicator (before first token arrives) */}
              {isStreaming && !streamingContent && <TypingIndicator />}

              {/* Feedback prompt */}
              {showFeedback && activeConversation && !isStreaming && (
                <div className="mt-4">
                  <FeedbackPrompt
                    conversationId={activeConversation.id}
                    onClose={() => setShowFeedback(false)}
                    onSubmit={handleFeedbackSubmit}
                  />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input area ── */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Skylar an HR question…"
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-gray-50 disabled:opacity-50"
              style={{ maxHeight: "160px" }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Skylar provides general HR guidance — not legal advice
          </p>
        </div>
      </div>
    </div>
  );
}
