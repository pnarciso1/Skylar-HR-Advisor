import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatMessageTime(date: Date): string {
  return format(date, "h:mm a");
}

export function formatConversationDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

export function extractConversationTitle(firstMessage: string): string {
  return truncateText(firstMessage, 50);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Stable numeric hash of a string, returned as a base-36 string. */
export function hashIdentifier(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return `local-${hash.toString(36)}`;
}

// ─── Client ID generation ─────────────────────────────────────────────────────

/**
 * Generates a deterministic client ID from a company name or email.
 * Uses a djb2-variant hash with a fixed salt for stable, unique IDs.
 * Same input always returns the same output.
 *
 * Example: "Acme Corp" → "client_1k3z9q2"
 */
export function generateClientId(identifier: string): string {
  const SALT = 0xdeadbeef;
  const normalized = identifier.trim().toLowerCase();

  let hash = 5381 ^ SALT;
  for (let i = 0; i < normalized.length; i++) {
    hash = Math.imul((hash << 5) + hash, 1) ^ normalized.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }

  return `client_${hash.toString(36).padStart(7, "0")}`;
}

// ─── Pilot client registry ────────────────────────────────────────────────────

const PILOT_CLIENTS: Record<string, string> = {
  "acme-corp": "Acme Corporation",
  "beta-inc": "Beta Inc",
  "gamma-llc": "Gamma LLC",
  "delta-co": "Delta Company",
  "epsilon-group": "Epsilon Group",
  "zeta-systems": "Zeta Systems",
  "eta-solutions": "Eta Solutions",
  "theta-consulting": "Theta Consulting",
  "iota-partners": "Iota Partners",
  "kappa-ventures": "Kappa Ventures",
};

export interface PilotClientResult {
  isPilot: boolean;
  pilotName: string | null;
}

/**
 * Checks whether a URL `?client=` parameter value matches a known pilot client.
 * Lookup is case-insensitive and trims whitespace.
 *
 * Example: "Acme-Corp" → { isPilot: true, pilotName: "Acme Corporation" }
 * Example: "unknown"   → { isPilot: false, pilotName: null }
 */
export function isPilotClient(clientParam: string): PilotClientResult {
  const key = clientParam.trim().toLowerCase();
  const name = PILOT_CLIENTS[key] ?? null;
  return { isPilot: name !== null, pilotName: name };
}

/** Wraps a promise with a timeout. Rejects with Error("timeout") if ms elapses first. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}
