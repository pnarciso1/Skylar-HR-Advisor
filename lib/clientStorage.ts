"use client";

import type { Conversation, Message } from "./types";
import { generateId } from "./utils";
import {
  upsertConversation,
  deleteConversation as firestoreDeleteConversation,
} from "./firebase";

// ─── Storage key and limits ───────────────────────────────────────────────────

const STORAGE_KEY = "skylar_client_data";
const MAX_CONVERSATIONS = 50;

// ─── LocalStorage root shape ──────────────────────────────────────────────────

interface ClientStorageData {
  clientId: string;
  identifier: string;
  conversations: Conversation[];
}

// ─── Serialised shape stored in JSON ─────────────────────────────────────────
// Dates are stored as ISO strings and rehydrated on read.

type SerializedConversation = Omit<
  Conversation,
  "startedAt" | "lastMessageAt" | "actionPlanDeliveredAt" | "userFeedback" | "messages"
> & {
  startedAt: string;
  lastMessageAt: string;
  actionPlanDeliveredAt: string | null;
  userFeedback: (Omit<NonNullable<Conversation["userFeedback"]>, "submittedAt"> & {
    submittedAt: string;
  }) | null;
  messages: (Omit<Message, "timestamp"> & { timestamp: string })[];
};

interface SerializedClientStorageData {
  clientId: string;
  identifier: string;
  conversations: SerializedConversation[];
}

// ─── Guards ───────────────────────────────────────────────────────────────────

function isAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__skylar_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function isValidStorageData(value: unknown): value is SerializedClientStorageData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["clientId"] === "string" &&
    typeof v["identifier"] === "string" &&
    Array.isArray(v["conversations"])
  );
}

// ─── Date rehydration ─────────────────────────────────────────────────────────

function rehydrateConversation(raw: SerializedConversation): Conversation {
  return {
    ...raw,
    startedAt: new Date(raw.startedAt),
    lastMessageAt: new Date(raw.lastMessageAt),
    actionPlanDeliveredAt: raw.actionPlanDeliveredAt
      ? new Date(raw.actionPlanDeliveredAt)
      : null,
    userFeedback: raw.userFeedback
      ? { ...raw.userFeedback, submittedAt: new Date(raw.userFeedback.submittedAt) }
      : null,
    messages: raw.messages.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })),
  };
}

// ─── Raw read / write ─────────────────────────────────────────────────────────

function readRaw(): SerializedClientStorageData | null {
  if (!isAvailable()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidStorageData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeRaw(data: SerializedClientStorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Quota exceeded — evict the oldest conversations and retry once
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      data.conversations = data.conversations.slice(0, Math.floor(MAX_CONVERSATIONS / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // If it still fails, give up silently — the app can continue without persistence
      }
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Initialises the localStorage store for a client session. */
export function initClientStorage(clientId: string, identifier: string): void {
  if (!isAvailable()) return;
  const existing = readRaw();
  if (existing?.clientId === clientId) {
    // Already initialised for this client — update identifier in case it changed
    writeRaw({ ...existing, identifier });
    return;
  }
  // Different client or fresh start — write a clean slate
  writeRaw({ clientId, identifier, conversations: [] });
}

/** Returns { clientId, identifier } from localStorage, or null if not found. */
export function getClientFromStorage(): {
  clientId: string;
  identifier: string;
} | null {
  const data = readRaw();
  if (!data) return null;
  return { clientId: data.clientId, identifier: data.identifier };
}

/** Saves or updates a conversation in localStorage, sorted newest-first. */
export function saveConversationLocally(conversation: Conversation): void {
  const data = readRaw();
  if (!data) return;

  const conversations = data.conversations.filter((c) => c.id !== conversation.id);
  // Insert at front so newest always comes first
  conversations.unshift(conversation as unknown as SerializedConversation);

  // Trim to cap
  if (conversations.length > MAX_CONVERSATIONS) {
    conversations.splice(MAX_CONVERSATIONS);
  }

  writeRaw({ ...data, conversations });
}

/** Returns all conversations from localStorage, with Dates rehydrated. */
export function getConversationsFromStorage(): Conversation[] {
  const data = readRaw();
  if (!data) return [];
  try {
    return data.conversations.map(rehydrateConversation);
  } catch {
    // Malformed conversation data — reset conversations only, keep client identity
    writeRaw({ ...data, conversations: [] });
    return [];
  }
}

/** Removes a single conversation from localStorage. */
export function deleteConversationLocally(conversationId: string): void {
  const data = readRaw();
  if (!data) return;
  writeRaw({
    ...data,
    conversations: data.conversations.filter((c) => c.id !== conversationId),
  });
}

/** Clears the entire localStorage store (logout / reset). */
export function clearClientStorage(): void {
  if (!isAvailable()) return;
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Firestore sync ───────────────────────────────────────────────────────────

/**
 * Syncs a locally-held conversation to Firestore.
 * Handles new conversations (creates the doc) and updates (patches messages,
 * title, action plan flag, and feedback).
 */
/**
 * Syncs the full conversation to Firestore using the local ID as the document ID.
 * Uses upsertConversation (setDoc) so it works whether or not the doc exists yet.
 */
export async function syncConversationToFirestore(
  conversation: Conversation
): Promise<void> {
  try {
    await upsertConversation(conversation);
  } catch (err) {
    console.error("[clientStorage] Firestore sync failed:", err);
    // Non-fatal — local data is preserved
  }
}

// ─── Conversation helpers (used by ChatInterface) ─────────────────────────────

/** Creates a new in-memory conversation. Does NOT persist yet. */
export function createNewConversation(clientId?: string): Conversation {
  const now = new Date();
  return {
    id: generateId(),
    clientId: clientId ?? getClientFromStorage()?.clientId ?? "local",
    title: "New Conversation",
    startedAt: now,
    lastMessageAt: now,
    messages: [],
    situationType: "other",
    actionPlanDelivered: false,
    actionPlanDeliveredAt: null,
    userFeedback: null,
  };
}

/**
 * Appends a message to a conversation, updates derived fields, and persists
 * the result to localStorage. Returns the updated conversation.
 */
export function appendMessage(
  conversation: Conversation,
  message: Message
): Conversation {
  const isFirstUserMessage =
    conversation.messages.length === 0 && message.role === "user";

  const updated: Conversation = {
    ...conversation,
    messages: [...conversation.messages, message],
    lastMessageAt: message.timestamp,
    title: isFirstUserMessage
      ? message.content.slice(0, 50)
      : conversation.title,
    actionPlanDelivered:
      conversation.actionPlanDelivered ||
      (message.role === "assistant" && message.actionPlan !== undefined),
    actionPlanDeliveredAt:
      !conversation.actionPlanDelivered &&
      message.role === "assistant" &&
      message.actionPlan
        ? message.timestamp
        : conversation.actionPlanDeliveredAt,
  };

  saveConversationLocally(updated);
  return updated;
}

/** Deletes a conversation from both localStorage and Firestore. */
export async function deleteConversation(conversationId: string): Promise<void> {
  deleteConversationLocally(conversationId);
  try {
    await firestoreDeleteConversation(conversationId);
  } catch (err) {
    console.error("[clientStorage] Firestore delete failed:", err);
  }
}

/** @deprecated Use saveConversationLocally instead. */
export const saveConversation = saveConversationLocally;

/** @deprecated Use getConversationsFromStorage instead. */
export const getStoredConversations = getConversationsFromStorage;
