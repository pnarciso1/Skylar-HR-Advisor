// ─── Core chat types ──────────────────────────────────────────────────────────

export interface ActionStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
}

export interface ActionPlan {
  steps: ActionStep[];
  summary: string;
  priority: "low" | "medium" | "high";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actionPlan?: ActionPlan;
}

// ─── Situation / feedback ─────────────────────────────────────────────────────

export type SituationType =
  | "attendance"
  | "performance"
  | "policy"
  | "leave"
  | "other";

export interface UserFeedback {
  actedOnGuidance: boolean | null;
  confidence: number | null;
  contactedSkylar: boolean | null;
  notes: string | null;
  submittedAt: Date;
}

// ─── Conversation ─────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  clientId: string;
  title: string;
  startedAt: Date;
  lastMessageAt: Date;
  messages: Message[];
  situationType: SituationType;
  actionPlanDelivered: boolean;
  actionPlanDeliveredAt: Date | null;
  userFeedback: UserFeedback | null;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  identifier: string;
  firstSeen: Date;
  lastActive: Date;
  conversationCount: number;
  isPilotClient: boolean;
  pilotClientName: string | null;
}

// ─── Admin / analytics ────────────────────────────────────────────────────────

export type PilotClientStatus = "active" | "low-usage" | "no-usage";

export interface PilotClientSummary {
  clientId: string;
  name: string;
  conversationCount: number;
  actedCount: number;
  actedPercentage: number;
  averageConfidence: number;
  lastActive: Date;
  status: PilotClientStatus;
}

export interface SituationTypeBreakdown {
  attendance: number;
  performance: number;
  policy: number;
  leave: number;
  other: number;
}

export interface TestStatus {
  targetPercentage: number;
  currentPercentage: number;
  passed: boolean;
  conversationsNeeded: number;
}

export interface AdminStats {
  totalConversations: number;
  actionPlansDelivered: number;
  actionPlansDeliveredPercentage: number;
  actedIndependently: number;
  actedIndependentlyPercentage: number;
  averageConfidence: number;
  confidenceDistribution: Record<number, number>;
  situationTypeBreakdown: SituationTypeBreakdown;
  testStatus: TestStatus;
  pilotClients: PilotClientSummary[];
}

// ─── API contracts ────────────────────────────────────────────────────────────

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  conversationId?: string;
}

export interface ChatResponse {
  content: string;
  conversationId: string;
  actionPlan?: ActionPlan;
}

export interface FeedbackSubmission {
  conversationId: string;
  messageId: string;
  rating: "helpful" | "not-helpful";
  comment?: string;
}
