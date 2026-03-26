import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
  increment,
  type Firestore,
} from "firebase/firestore";
import type {
  Message,
  UserFeedback,
  Conversation,
  Client,
  AdminStats,
  PilotClientSummary,
  PilotClientStatus,
  SituationTypeBreakdown,
  SituationType,
} from "./types";

// ─── Firestore document shapes (Timestamps instead of Dates) ─────────────────

interface ClientDoc {
  identifier: string;
  firstSeen: Timestamp;
  lastActive: Timestamp;
  conversationCount: number;
  isPilotClient: boolean;
  pilotClientName: string | null;
}

interface MessageDoc {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Timestamp;
}

interface UserFeedbackDoc {
  actedOnGuidance: boolean | null;
  confidence: number | null;
  contactedSkylar: boolean | null;
  notes: string | null;
  submittedAt: Timestamp | null;
}

interface ConversationDoc {
  clientId: string;
  title: string;
  startedAt: Timestamp;
  lastMessageAt: Timestamp;
  messages: MessageDoc[];
  situationType: SituationType;
  actionPlanDelivered: boolean;
  actionPlanDeliveredAt: Timestamp | null;
  userFeedback: UserFeedbackDoc | null;
}

// ─── Initialisation ───────────────────────────────────────────────────────────

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

export function initializeFirebase(): FirebaseApp {
  if (_app) return _app;

  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0]!;
    return _app;
  }

  _app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });

  return _app;
}

export function getFirestoreDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(initializeFirebase());
  return _db;
}

// ─── Converters ───────────────────────────────────────────────────────────────

function docToClient(id: string, d: ClientDoc): Client {
  return {
    id,
    identifier: d.identifier,
    firstSeen: d.firstSeen.toDate(),
    lastActive: d.lastActive.toDate(),
    conversationCount: d.conversationCount,
    isPilotClient: d.isPilotClient,
    pilotClientName: d.pilotClientName,
  };
}

function docToConversation(id: string, d: ConversationDoc): Conversation {
  return {
    id,
    clientId: d.clientId,
    title: d.title,
    startedAt: d.startedAt.toDate(),
    lastMessageAt: d.lastMessageAt.toDate(),
    messages: d.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toDate(),
    })),
    situationType: d.situationType,
    actionPlanDelivered: d.actionPlanDelivered,
    actionPlanDeliveredAt: d.actionPlanDeliveredAt
      ? d.actionPlanDeliveredAt.toDate()
      : null,
    userFeedback: d.userFeedback
      ? {
          actedOnGuidance: d.userFeedback.actedOnGuidance,
          confidence: d.userFeedback.confidence,
          contactedSkylar: d.userFeedback.contactedSkylar,
          notes: d.userFeedback.notes,
          submittedAt: d.userFeedback.submittedAt
            ? d.userFeedback.submittedAt.toDate()
            : new Date(),
        }
      : null,
  };
}

// ─── Client helpers ───────────────────────────────────────────────────────────

/**
 * Creates or refreshes a client document using the provided clientId as the
 * Firestore document ID. This keeps the localStorage hash ID and Firestore ID
 * in sync so conversationCount lookups work correctly.
 */
export async function createOrGetClient(
  clientId: string,
  identifier: string,
  isPilot: boolean,
  pilotName?: string
): Promise<string> {
  const db = getFirestoreDb();
  const clientRef = doc(db, "clients", clientId);
  const snap = await getDoc(clientRef);

  if (snap.exists()) {
    // Refresh lastActive on every visit
    await updateDoc(clientRef, { lastActive: Timestamp.now() });
    return clientId;
  }

  const now = Timestamp.now();
  await setDoc(clientRef, {
    identifier,
    firstSeen: now,
    lastActive: now,
    conversationCount: 0,
    isPilotClient: isPilot,
    pilotClientName: isPilot ? (pilotName ?? null) : null,
  } satisfies ClientDoc);

  return clientId;
}

// ─── Conversation helpers ─────────────────────────────────────────────────────

/** Creates a new conversation document and bumps the client's conversationCount. */
export async function createConversation(clientId: string): Promise<string> {
  const db = getFirestoreDb();
  const now = Timestamp.now();

  const newDoc: ConversationDoc = {
    clientId,
    title: "New Conversation",
    startedAt: now,
    lastMessageAt: now,
    messages: [],
    situationType: "other",
    actionPlanDelivered: false,
    actionPlanDeliveredAt: null,
    userFeedback: null,
  };

  const ref = await addDoc(collection(db, "conversations"), newDoc);

  // Increment client conversation count
  const clientRef = doc(db, "clients", clientId);
  const clientSnap = await getDoc(clientRef);
  if (clientSnap.exists()) {
    const current = (clientSnap.data() as ClientDoc).conversationCount;
    await updateDoc(clientRef, { conversationCount: current + 1 });
  }

  return ref.id;
}

/**
 * Creates or fully overwrites a conversation document using the local ID as
 * the Firestore document ID. Safe to call whether or not the doc already exists.
 */
export async function upsertConversation(conversation: Conversation): Promise<void> {
  const db = getFirestoreDb();
  const convRef = doc(db, "conversations", conversation.id);

  const convDoc: ConversationDoc = {
    clientId: conversation.clientId,
    title: conversation.title,
    startedAt: Timestamp.fromDate(conversation.startedAt),
    lastMessageAt: Timestamp.fromDate(conversation.lastMessageAt),
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: Timestamp.fromDate(m.timestamp),
    })),
    situationType: conversation.situationType,
    actionPlanDelivered: conversation.actionPlanDelivered,
    actionPlanDeliveredAt: conversation.actionPlanDeliveredAt
      ? Timestamp.fromDate(conversation.actionPlanDeliveredAt)
      : null,
    userFeedback: conversation.userFeedback
      ? {
          actedOnGuidance: conversation.userFeedback.actedOnGuidance,
          confidence: conversation.userFeedback.confidence,
          contactedSkylar: conversation.userFeedback.contactedSkylar,
          notes: conversation.userFeedback.notes,
          submittedAt: Timestamp.fromDate(conversation.userFeedback.submittedAt),
        }
      : null,
  };

  // Check once whether this conversation doc is new before writing
  const existing = await getDoc(convRef);
  const isNew = !existing.exists();

  await setDoc(convRef, convDoc);

  // Atomically increment client conversationCount on first sync.
  // Using setDoc+merge+increment means: create the field if missing, or add 1.
  // No read-modify-write race condition.
  if (isNew && conversation.clientId) {
    await setDoc(
      doc(db, "clients", conversation.clientId),
      { conversationCount: increment(1) },
      { merge: true }
    );
  }
}

/** Updates the AI-generated title on a conversation. */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, "conversations", conversationId), { title });
}

/** Appends a message to the messages array and updates lastMessageAt. */
export async function addMessageToConversation(
  conversationId: string,
  message: Message
): Promise<void> {
  const db = getFirestoreDb();

  const messageDoc: MessageDoc = {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: Timestamp.fromDate(message.timestamp),
  };

  await updateDoc(doc(db, "conversations", conversationId), {
    messages: arrayUnion(messageDoc),
    lastMessageAt: Timestamp.fromDate(message.timestamp),
  });
}

/** Marks actionPlanDelivered = true and records the delivery timestamp. */
export async function markActionPlanDelivered(
  conversationId: string
): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(
    doc(db, "conversations", conversationId),
    { actionPlanDelivered: true, actionPlanDeliveredAt: Timestamp.now() },
    { merge: true }
  );
}

/** Saves post-conversation user feedback. */
export async function saveConversationFeedback(
  conversationId: string,
  feedback: UserFeedback
): Promise<void> {
  const db = getFirestoreDb();

  const feedbackDoc: UserFeedbackDoc = {
    actedOnGuidance: feedback.actedOnGuidance,
    confidence: feedback.confidence,
    contactedSkylar: feedback.contactedSkylar,
    notes: feedback.notes,
    submittedAt: Timestamp.fromDate(feedback.submittedAt),
  };

  await setDoc(
    doc(db, "conversations", conversationId),
    { userFeedback: feedbackDoc },
    { merge: true }
  );
}

/** Returns all conversations for a client, newest first. */
export async function getClientConversations(
  clientId: string
): Promise<Conversation[]> {
  const db = getFirestoreDb();

  const snap = await getDocs(
    query(
      collection(db, "conversations"),
      where("clientId", "==", clientId),
      orderBy("lastMessageAt", "desc")
    )
  );

  return snap.docs.map((d) => docToConversation(d.id, d.data() as ConversationDoc));
}

/** Deletes a conversation document from Firestore. */
export async function deleteConversation(
  conversationId: string
): Promise<void> {
  const db = getFirestoreDb();
  await deleteDoc(doc(db, "conversations", conversationId));
}

// ─── Admin / analytics ────────────────────────────────────────────────────────

/**
 * Pure aggregation helper — computes all AdminStats from pre-fetched data.
 * Kept separate so it can be unit-tested without a Firestore connection.
 */
export function calculateAdminStats(
  convs: Conversation[],
  pilotClientDocs: Client[]
): AdminStats {
  const TARGET_PERCENTAGE = 70;

  const totalConversations = convs.length;
  const actionPlansDelivered = convs.filter((c) => c.actionPlanDelivered).length;
  const actionPlansDeliveredPercentage =
    totalConversations > 0
      ? Math.round((actionPlansDelivered / totalConversations) * 100)
      : 0;

  const feedbackConvs = convs.filter((c) => c.userFeedback !== null);
  const actedIndependently = feedbackConvs.filter(
    (c) => c.userFeedback?.actedOnGuidance === true
  ).length;
  const actedIndependentlyPercentage =
    actionPlansDelivered > 0
      ? Math.round((actedIndependently / actionPlansDelivered) * 100)
      : 0;

  const confidenceScores = feedbackConvs
    .map((c) => c.userFeedback?.confidence)
    .filter((v): v is number => v !== null && v !== undefined);
  const averageConfidence =
    confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

  // Build confidence distribution (keys 1–10, all initialised to 0)
  const confidenceDistribution: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) confidenceDistribution[i] = 0;
  for (const score of confidenceScores) {
    if (score >= 1 && score <= 10) confidenceDistribution[score]++;
  }

  // Situation type breakdown
  const situationTypeBreakdown: SituationTypeBreakdown = {
    attendance: 0,
    performance: 0,
    policy: 0,
    leave: 0,
    other: 0,
  };
  for (const c of convs) {
    situationTypeBreakdown[c.situationType] =
      (situationTypeBreakdown[c.situationType] ?? 0) + 1;
  }

  // Test status: % of action-plan recipients who acted independently
  const currentPercentage = actedIndependentlyPercentage;
  const passed = currentPercentage >= TARGET_PERCENTAGE;
  // How many more "yes" responses are needed to reach 70% of actionPlansDelivered
  const needed = passed
    ? 0
    : Math.ceil(TARGET_PERCENTAGE / 100 * actionPlansDelivered) - actedIndependently;
  const conversationsNeeded = Math.max(0, needed);

  // Per pilot-client breakdown (uses the date-window convs, not client.conversationCount)
  const pilotClients: PilotClientSummary[] = pilotClientDocs.map((client) => {
    const clientConvs = convs.filter((c) => c.clientId === client.id);
    const clientActed = clientConvs.filter(
      (c) => c.userFeedback?.actedOnGuidance === true
    ).length;
    const clientActedPercentage =
      clientConvs.length > 0
        ? Math.round((clientActed / clientConvs.length) * 100)
        : 0;
    const clientScores = clientConvs
      .map((c) => c.userFeedback?.confidence)
      .filter((v): v is number => v !== null && v !== undefined);
    const clientAvgConfidence =
      clientScores.length > 0
        ? clientScores.reduce((a, b) => a + b, 0) / clientScores.length
        : 0;

    const daysSinceActive =
      (Date.now() - client.lastActive.getTime()) / (1000 * 60 * 60 * 24);
    const status: PilotClientStatus =
      clientConvs.length === 0
        ? "no-usage"
        : daysSinceActive > 7
        ? "low-usage"
        : "active";

    return {
      clientId: client.id,
      name: client.pilotClientName ?? client.identifier,
      conversationCount: clientConvs.length,
      actedCount: clientActed,
      actedPercentage: clientActedPercentage,
      averageConfidence: clientAvgConfidence,
      lastActive: client.lastActive,
      status,
    };
  });

  return {
    totalConversations,
    actionPlansDelivered,
    actionPlansDeliveredPercentage,
    actedIndependently,
    actedIndependentlyPercentage,
    averageConfidence,
    confidenceDistribution,
    situationTypeBreakdown,
    testStatus: {
      targetPercentage: TARGET_PERCENTAGE,
      currentPercentage,
      passed,
      conversationsNeeded,
    },
    pilotClients,
  };
}

/**
 * Fetches raw Firestore data for the given date window and returns
 * fully-aggregated AdminStats. Pass daysBack = 0 for all-time.
 */
export async function getAdminStats(daysBack: number): Promise<AdminStats> {
  const db = getFirestoreDb();

  const cutoff =
    daysBack > 0
      ? Timestamp.fromMillis(Date.now() - daysBack * 24 * 60 * 60 * 1000)
      : null;

  const convsQuery =
    cutoff !== null
      ? query(
          collection(db, "conversations"),
          where("startedAt", ">=", cutoff),
          orderBy("startedAt", "desc")
        )
      : query(collection(db, "conversations"), orderBy("startedAt", "desc"));

  const [convsSnap, clientsSnap] = await Promise.all([
    getDocs(convsQuery),
    getDocs(query(collection(db, "clients"), where("isPilotClient", "==", true))),
  ]);

  const convs = convsSnap.docs.map((d) =>
    docToConversation(d.id, d.data() as ConversationDoc)
  );
  const pilotClientDocs = clientsSnap.docs.map((d) =>
    docToClient(d.id, d.data() as ClientDoc)
  );

  return calculateAdminStats(convs, pilotClientDocs);
}

/** Returns a detailed PilotClientSummary for a single client. */
export async function getPilotClientDetails(
  clientId: string
): Promise<PilotClientSummary | null> {
  const db = getFirestoreDb();

  const [clientSnap, convsSnap] = await Promise.all([
    getDoc(doc(db, "clients", clientId)),
    getDocs(
      query(
        collection(db, "conversations"),
        where("clientId", "==", clientId),
        orderBy("lastMessageAt", "desc")
      )
    ),
  ]);

  if (!clientSnap.exists()) return null;

  const client = docToClient(clientId, clientSnap.data() as ClientDoc);
  const convs = convsSnap.docs.map((d) =>
    docToConversation(d.id, d.data() as ConversationDoc)
  );

  const actedCount = convs.filter(
    (c) => c.userFeedback?.actedOnGuidance === true
  ).length;
  const confidenceScores = convs
    .map((c) => c.userFeedback?.confidence)
    .filter((v): v is number => v !== null && v !== undefined);
  const averageConfidence =
    confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

  const daysSinceActive =
    (Date.now() - client.lastActive.getTime()) / (1000 * 60 * 60 * 24);
  const status: PilotClientStatus =
    convs.length === 0
      ? "no-usage"
      : daysSinceActive > 14
      ? "low-usage"
      : "active";

  return {
    clientId: client.id,
    name: client.pilotClientName ?? client.identifier,
    conversationCount: convs.length,
    actedCount,
    averageConfidence,
    lastActive: client.lastActive,
    status,
  };
}
