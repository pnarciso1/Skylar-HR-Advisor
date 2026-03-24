# Skylar HR Advisor — Development Handoff Document

**Date:** March 23, 2026  
**Project:** Skylar HR Advisor — AI-powered HR guidance for California employers  
**Stack:** Next.js 14 (App Router), TypeScript (strict), Tailwind CSS, Firebase Firestore, Anthropic Claude API  
**Repository:** hr-assistant-test  
**Local dev:** `cd hr-assistant-test && npm run dev` → http://localhost:3000

---

## What Was Built Today (Phases 1–5 Complete)

### Phase 1 — Project Setup

- Initialized Next.js 14 with App Router, TypeScript strict mode, Tailwind CSS
- Installed all dependencies: `@anthropic-ai/sdk`, `firebase`, `react-markdown`, `remark-gfm`, `date-fns`, `lucide-react`
- Configured `tailwind.config.ts` with custom color scheme (primary blue #2563eb, background #f8fafc)
- Configured `app/layout.tsx` with Inter font from `next/font/google`
- Created full folder structure: `app/`, `components/`, `lib/`, `public/`
- Created `.env.local` with all required API keys (Anthropic, Firebase, Admin password)

**Custom color tokens:**
```
primary: #2563eb / primary-dark: #1e40af
secondary: #64748b
background: #f8fafc / surface: #ffffff
```

---

### Phase 2 — Data Layer

#### `lib/types.ts`
All TypeScript interfaces for the application:
- `Message` — role, content, timestamp, optional `actionPlan`
- `ActionStep` / `ActionPlan` — checklist steps with `completed: boolean`
- `Conversation` — full conversation including messages, situationType, feedback, action plan flags
- `Client` — company identifier, pilot status, conversation count
- `UserFeedback` — actedOnGuidance, confidence (1–10), contactedSkylar, notes
- `AdminStats` / `PilotClientSummary` — admin dashboard types
- `ChatRequest` / `ChatResponse` / `FeedbackSubmission` — API contracts

#### `lib/utils.ts`
- `generateId()` — timestamp + random suffix
- `hashIdentifier(str)` — deterministic djb2 hash, returns `local-XXXXX` format
- `generateClientId(identifier)` — salted hash returning `client_XXXXXXX`
- `isPilotClient(param)` — checks against hardcoded pilot client registry
- `withTimeout(promise, ms)` — wraps async call with timeout (replaced with sync flow)
- `formatMessageTime` / `formatConversationDate` / `formatRelativeTime` — date-fns wrappers
- `truncateText`, `cn` — utility helpers

#### `lib/firebase.ts`
Full Firebase v9+ modular SDK implementation:
- `initializeFirebase()` / `getFirestoreDb()` — singleton init with env vars
- `createOrGetClient(clientId, identifier, isPilot, pilotName?)` — uses `setDoc` with the local hash as document ID, so Firestore ID matches localStorage ID exactly
- `upsertConversation(conversation)` — creates or fully overwrites a conversation doc using the local ID. On first sync (isNew), atomically increments client's `conversationCount` using Firestore `increment(1)`. **Key design decision: local `generateId()` ID is used as the Firestore document ID permanently.**
- `updateConversationTitle(id, title)` — patches title field
- `addMessageToConversation(id, message)` — appends via `arrayUnion`
- `markActionPlanDelivered(id)` — uses `setDoc` with merge (safe if doc missing)
- `saveConversationFeedback(id, feedback)` — uses `setDoc` with merge (safe if doc missing)
- `getClientConversations(clientId)` — ordered by lastMessageAt desc
- `deleteConversation(id)` — deletes doc
- `getAdminStats(daysBack)` — full aggregation for admin dashboard
- `getPilotClientDetails(clientId)` — single pilot client stats

**Critical fix applied:** All write functions that previously used `updateDoc` (which fails if the document doesn't exist) were updated to use `setDoc` with `{ merge: true }`. This fixes the "No document to update" Firestore errors.

**Firestore collections:**
```
clients/{local-XXXXX}
  - identifier: string
  - firstSeen: Timestamp
  - lastActive: Timestamp
  - conversationCount: number  ← atomically incremented via increment(1)
  - isPilotClient: boolean
  - pilotClientName: string | null

conversations/{local-timestamp-random}
  - clientId: string  ← matches clients doc ID
  - title: string
  - startedAt / lastMessageAt: Timestamp
  - messages: MessageDoc[]  ← includes full content + actionPlan steps
  - situationType: 'attendance' | 'performance' | 'policy' | 'leave' | 'other'
  - actionPlanDelivered: boolean
  - actionPlanDeliveredAt: Timestamp | null
  - userFeedback: { actedOnGuidance, confidence, contactedSkylar, notes, submittedAt } | null
```

#### `lib/clientStorage.ts`
localStorage management with full serialization/deserialization:
- `initClientStorage(clientId, identifier)` — writes `skylar_client_data` key
- `getClientFromStorage()` — returns `{ clientId, identifier }` or null
- `saveConversationLocally(conversation)` — upserts into conversations array, newest first
- `getConversationsFromStorage()` — rehydrates all Dates from ISO strings
- `deleteConversationLocally(id)` — removes from array
- `clearClientStorage()` — full reset
- `syncConversationToFirestore(conversation)` — calls `upsertConversation`, fire-and-forget with error logging
- `createNewConversation(clientId?)` — creates in-memory conversation (not yet persisted)
- `appendMessage(conversation, message)` — updates derived fields, persists locally
- `deleteConversation(id)` — deletes from both localStorage and Firestore

**Edge cases handled:** localStorage unavailable (private browsing), QuotaExceededError (evicts oldest conversations), malformed data (resets and starts fresh).

#### `lib/prompts.ts`
- `SYSTEM_PROMPT` — full Skylar persona: role definition, communication style, response format rules, when to include completion checklist
- `CALIFORNIA_LAW_CONTEXT` — comprehensive CA employment law reference: wage/hour (daily+weekly OT, meal/rest breaks, final pay), FEHA protected classes, all leave laws (FMLA/CFRA interplay, PDL, baby bonding, paid sick leave, SDI/PFL), at-will employment, hiring restrictions, common pitfalls
- `TITLE_GENERATION_PROMPT` — short prompt for 5–7 word conversation titles
- `ACTION_PLAN_MARKER` — `"✅ COMPLETION CHECKLIST"` (used to split responses)

#### `lib/claude.ts`
- `getClaudeClient()` — singleton Anthropic client
- `streamChatResponse(messages)` — streams using `claude-sonnet-4-20250514`, combines SYSTEM_PROMPT + CALIFORNIA_LAW_CONTEXT, 4096 max tokens, returns `ReadableStream<Uint8Array>` of SSE chunks (`data: {"text":"..."}\n\n` ... `data: [DONE]\n\n`)
- `generateConversationTitle(messages)` — uses `claude-3-haiku-20240307`, first 6 messages, validates output, falls back to timestamped title
- `extractActionPlan(content)` — parses `✅ COMPLETION CHECKLIST` section into `ActionPlan` with stable step IDs. **Strips `**` and backticks from titles/descriptions.**

**Model configuration:**
- Chat: `claude-sonnet-4-20250514` ← Claude 4 Sonnet (only model accessible on this API key)
- Titles: `claude-3-haiku-20240307` ← confirmed accessible, fast/cheap

---

### Phase 3 — UI Components

#### `components/LandingPage.tsx`
- Gradient background (blue-50 → indigo-100), centered card, max-w-lg
- Skylar logo from `/public/SkylarLogo.jpg` with error fallback (icon + text)
- Standard flow: company name input → `hashIdentifier()` → `initClientStorage()` → `router.push("/chat")`. **Navigation is fully synchronous** — no async wait before navigating. Firebase syncs in background via fire-and-forget.
- Pilot flow: `?client=` URL param auto-redirects with welcome message
- Hydration-safe: no localStorage reads during render

#### `components/ConversationSidebar.tsx`
- Desktop: fixed left panel (md:flex)
- Mobile: overlay with slide-in animation
- Company name loaded in `useEffect` (not render) to prevent hydration mismatch
- Conversations grouped by date (Today, Yesterday, date)
- Each card: title, timestamp, situation badge, delete button on hover
- Delete confirmation dialog
- Props: `conversations`, `activeConversationId`, `onSelectConversation`, `onNewConversation`, `onDeleteConversation`, `isOpen`, `onClose`

#### `components/ChatInterface.tsx`
Main orchestrator — manages all state:
- Client verification on mount (redirects to `/` if no localStorage client)
- Conversation state: list + active conversation, synced to sessionStorage for refresh persistence
- `sendMessage()` — posts to `/api/chat`, reads SSE stream, accumulates text, commits assistant message with `extractActionPlan()` result attached as `message.actionPlan`
- After every assistant message: `syncConversationToFirestore()` (always, not just on action plan)
- Action plan detection: calls `markActionPlanDelivered()`, shows feedback prompt after 2-second delay
- `generateTitle()` — fires after 6 messages (3 full exchanges)
- `handleChecklistToggle(messageId, stepId, completed)` — updates step in message, saves locally + syncs to Firestore
- `handleFeedbackSubmit(feedback)` — saves to localStorage immediately, calls `/api/feedback` in background
- Streaming bubble: shows `MessageBubble` with `isStreaming` prop during response
- Typing indicator: shown before first token arrives
- Starter prompts: 4 clickable example questions on empty state
- Error handling: API errors displayed as assistant message bubbles

#### `components/MessageBubble.tsx`
- User messages: right-aligned, blue bubble, rounded-br-none
- Assistant messages: left-aligned, white bubble with border, rounded-bl-none
- Timestamp on hover
- Markdown rendering via `react-markdown` + `remark-gfm` with custom Tailwind components
- Streaming cursor: `after:content-['▋'] after:animate-pulse`
- Checklist detection: if `message.actionPlan` exists, uses its steps (stable IDs, persisted `completed` state). Falls back to `parseChecklist` for older messages.
- Passes `onToggle` callback to `ActionPlanDisplay`

#### `components/ActionPlanDisplay.tsx`
- Blue gradient header with "Completion Checklist" + `X/Y` counter
- Progress bar
- Each step: circle toggle → checkmark, step number label, title + description
- Initialises `completed` state from `step.completed` props (persisted across renders)
- Calls `onToggle(stepId, completed)` on each tick
- Footer: "Tap each step" → "✓ All steps completed — great work!" (green)

#### `components/FeedbackPrompt.tsx`
Three-path post-action-plan survey:
- **Yes, I acted** → confidence slider 1–10 with live labels + notes textarea
- **No, still need help** → contact Skylar question (shows email) + notes textarea
- **Not yet decided** → "come back when ready" + "Remind me later" dismiss
- Each path shows an `AnsweredBadge` with "change" link to go back
- After submit: green thank-you card, auto-closes after 2 seconds
- Props: `conversationId`, `onClose`, `onSubmit(feedback: UserFeedback)`

---

### Phase 4 — API Routes

#### `POST /api/chat`
- Parses `{ conversationId, messages }` from body
- Calls `streamChatResponse(messages)` from `lib/claude.ts`
- Returns `ReadableStream` with `text/event-stream` headers
- SSE format: `data: {"text":"..."}\n\n` ... `data: [DONE]\n\n`
- `export const dynamic = "force-dynamic"` + `runtime = "nodejs"` for Next.js 14 streaming
- `X-Accel-Buffering: no` to prevent nginx buffering

#### `POST /api/feedback`
- Validates `conversationId` (non-empty string), `actedOnGuidance` (boolean|null), `confidence` (integer 1–10 or null)
- Stamps `submittedAt: new Date()` server-side
- Calls `saveConversationFeedback()` from `lib/firebase.ts`
- Returns `{ success: true, message: "Feedback saved" }`

#### `POST /api/title`
- Calls `generateConversationTitle(messages)` from `lib/claude.ts`
- Returns `{ title: string }`
- Falls back to `"HR Conversation"` on any error

---

### Phase 5 — Bug Fixes Applied

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Continue button not navigating | Async Firebase call before `router.push` created a race — chat page mounted before localStorage was written | Made `handleContinue` fully synchronous; Firebase syncs in background |
| Claude returning 404 | API key only has access to Claude 4 series, not 3.5/3.7 | Updated to `claude-sonnet-4-20250514` |
| Hydration mismatch on refresh | `getClientFromStorage()` called during render (SSR has no localStorage) | Moved to `useEffect` + `useState` with safe default |
| Asterisks in checklist titles | `extractActionPlan` in `lib/claude.ts` didn't strip `**` markdown | Added `stripMd` function to `extractActionPlan` (and `parseChecklist` fallback) |
| Firebase "No document to update" | `updateDoc` requires doc to exist; conversations are local-first | Changed `markActionPlanDelivered`, `saveConversationFeedback`, and sync to use `setDoc` with merge |
| conversationCount always 0 | Firestore client doc used auto-generated ID; localStorage used hash ID — they never matched | Changed `createOrGetClient` to use local hash as Firestore doc ID; increment uses atomic `increment(1)` |
| Checklist completion resets on refresh | `ActionPlanDisplay` used `useState` with no persistence; step IDs regenerated on every render | Attached `extractActionPlan` result to `message.actionPlan` when committing; step IDs are stable; completion state flows through props + is persisted to localStorage via conversation updates |
| Conversations only synced on action plan | `syncConversationToFirestore` only called on action plan delivery | Now called after every assistant message |

---

## Current Application State

### What works end-to-end ✅
- Landing page → chat navigation (instant, no spinner)
- Claude 4 Sonnet streaming responses
- Completion checklist rendered, interactive, and persisted
- All conversations synced to Firestore after every exchange
- User feedback collected and saved to Firestore
- Sidebar with conversation history, switching, deletion
- Conversation title auto-generated after 3 exchanges
- `conversationCount` on client doc increments correctly
- No hydration errors on page refresh

### Known minor items
- `situationType` is always `"other"` — Claude doesn't classify situation type yet. Admin dashboard will need this for the breakdown chart. Should be classified either by Claude response analysis or a secondary Claude call.
- Conversation title generation fires at 6 messages exactly; if a conversation ends at 5 messages it keeps the default "New Conversation" title in Firestore (though the local title may have been set from the first message).

---

## Environment Variables (`.env.local`)

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...          # Claude API — only Claude 4 + Haiku-3 accessible
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=skylar-hr-advisor.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=skylar-hr-advisor
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=skylar-hr-advisor.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
ADMIN_PASSWORD=HappyBirthdayToMe1966       # Used for admin dashboard auth
```

---

## Key Architecture Decisions

1. **Local-first, sync-second**: All conversation data is written to localStorage immediately. Firestore syncs happen asynchronously and are non-blocking. This prevents any Firebase latency from affecting the user experience.

2. **Shared ID strategy**: The `hashIdentifier()` function produces the same ID every time for a given company name. This ID is used as both the localStorage key and the Firestore document ID. This eliminates the ID mismatch problem that existed with Firestore's auto-generated IDs.

3. **No authentication on chat**: The app uses a company name as a "soft identifier." There is no login/password for end users. This is intentional for the pilot phase — low friction.

4. **SSE streaming via ReadableStream**: The `/api/chat` route uses `ReadableStream` with `export const dynamic = "force-dynamic"` and `runtime = "nodejs"`. This is the correct pattern for Next.js 14 App Router streaming. The client reads via `response.body.getReader()`.

5. **Action plan as structured data**: When Claude's response is committed, `extractActionPlan()` parses the checklist into `message.actionPlan` with stable IDs. This is the source of truth for the checklist UI. The raw marker text remains in `message.content` for display purposes.

---

## Tomorrow's Work — Phases 6–8

---

### Phase 6A — Admin Stats API Route

**File:** `app/api/admin/stats/route.ts`  
**Endpoint:** `GET /api/admin/stats?days=14`

**Authentication:** `Authorization: Bearer [ADMIN_PASSWORD]` header checked against `process.env.ADMIN_PASSWORD`. Return 401 if missing or wrong.

**Response shape:**
```typescript
{
  totalConversations: number,
  actionPlansDelivered: number,
  actionPlansDeliveredPercentage: number,
  actedIndependently: number,
  actedIndependentlyPercentage: number,
  averageConfidence: number,
  confidenceDistribution: Record<number, number>,  // keys 1–10
  pilotClients: Array<{
    clientId: string,
    name: string,
    conversationCount: number,
    actedCount: number,
    actedPercentage: number,
    averageConfidence: number,
    lastActive: Date,
    status: 'active' | 'low-usage' | 'no-usage'
  }>,
  situationTypeBreakdown: {
    attendance: number,
    performance: number,
    policy: number,
    leave: number,
    other: number
  },
  testStatus: {
    targetPercentage: 70,
    currentPercentage: number,
    passed: boolean,
    conversationsNeeded: number
  }
}
```

**Implementation steps:**
1. Authenticate request (check header vs env var)
2. Parse `days` query param (default 14, 0 = all time)
3. Query Firestore: all conversations in date range + all pilot clients
4. Aggregate all metrics
5. Add `calculateAdminStats(conversations, clients)` helper function
6. Status thresholds: active = used in last 7 days, low-usage = 7–14 days, no-usage = >14 days
7. Return 401 on bad auth, 500 on Firestore failure

---

### Phase 6B — Admin Dashboard Page

**File:** `app/admin/page.tsx` (`'use client'`)

**Authentication flow:**
- Check `sessionStorage` for `skylar_admin_password`
- If not found, show password modal (centered, clean)
- On submit, call `/api/admin/stats` with Bearer token
- 401 → show error; 200 → store in sessionStorage, show dashboard
- Logout button clears sessionStorage

**Dashboard layout (4 sections):**

1. **Test Metrics** — 4 stat cards: Total Convos, Action Plans (with %), Acted Independently (with %), Avg Confidence

2. **Test Status** — Progress bar toward 70% target, text showing how many more "yes" responses needed to pass

3. **Pilot Clients table** — columns: Client name, Convos, Acted (X/Y %), Confidence, Last Active, Status badge (active=green, low-usage=orange, no-usage=red). Click row opens `ClientDetailModal`.

4. **Charts section** — Situation type breakdown (horizontal bars) + Confidence distribution (1–10 horizontal bars)

**Data flow:** On mount (after auth), fetch `/api/admin/stats?days=14`. Include refresh button. Show loading spinner during fetch.

---

### Phase 6C — Client Detail Modal

**File:** `components/ClientDetailModal.tsx`

**Props:** `{ client: PilotClientSummary, conversations: Conversation[], onClose: () => void, isOpen: boolean }`

**Layout:**
- Fixed overlay (black/50 backdrop)
- Centered modal, max-w-3xl, white, rounded-xl, shadow-2xl
- Header: client name + close button
- Stats summary: 3-column grid (total convos, acted %, avg confidence, last active)
- Conversations table: Date | Situation | Acted? | Confidence | Notes (truncated) | View button
- Transcript sub-modal: opens when "View" clicked, shows full conversation, feedback section at bottom

---

### Phase 7A — Polish & Error Handling

**Components to update:**
- `ChatInterface`: loading skeleton, error boundary, offline detection banner
- `ConversationSidebar`: loading skeleton, improved empty state
- `LandingPage`: already has loading state — verify spinner shows correctly
- `FeedbackPrompt`: disable submit during save, retry on failure
- `Admin Dashboard`: loading spinner, error state with retry, empty state

**New components to create:**
- `ErrorBoundary` — catches React errors, shows friendly page with reload
- `OfflineBanner` — detects `navigator.onLine`, shows banner

---

### Phase 7B — Mobile Responsiveness Audit

Test at 375px (iPhone SE), 390px (iPhone 12 Pro), 768px (iPad), 1920px (Desktop).

**Known areas to audit:**
- Message bubble max-width (currently 70% — may be too wide on mobile)
- Admin table horizontal scroll on mobile
- Modal full-screen on mobile
- Touch targets minimum 44px height

---

### Phase 7C — Accessibility (WCAG 2.1 AA)

- `aria-label` on all icon buttons
- `aria-live="polite"` on chat messages area
- `role="alert"` on error messages
- Focus trap in modals
- Escape key closes modals
- All inputs have associated `<label>` elements

---

### Phase 7D — Documentation

Add JSDoc comments to all `lib/` files and API routes. Create `README.md` with:
- Project overview
- Local setup instructions
- Environment variables table
- Architecture overview diagram (text-based)
- Deployment instructions

---

### Phase 7E — Deployment Prep

1. Create `vercel.json`
2. Create `.env.example` (no real values)
3. Update `.gitignore`
4. Create `DEPLOYMENT.md` checklist
5. Remove/gate `console.log` calls behind `process.env.NODE_ENV === 'development'`
6. Add meta tags + favicon
7. Run `npm run build` and fix any build errors

---

### Phase 8 — Final Testing & Launch

Full testing checklist covering:
- Landing page flow (standard + pilot URL)
- Chat: sending, streaming, action plans, persistence
- Feedback: all three paths, Firestore write
- Admin: auth, all metrics, client detail, transcript
- Edge cases: network errors, localStorage full, private browsing, very long messages
- Mobile: iPhone SE, iPad, touch targets, sidebar overlay
- Accessibility: keyboard nav, tab order, screen reader
- Performance: page load < 2s, streaming latency < 500ms

---

## File Map

```
hr-assistant-test/
├── app/
│   ├── page.tsx                    ← Landing page wrapper (Suspense for useSearchParams)
│   ├── layout.tsx                  ← Root layout, Inter font, metadata
│   ├── globals.css                 ← CSS variables + Tailwind directives
│   ├── chat/
│   │   └── page.tsx               ← Chat page wrapper
│   ├── admin/
│   │   └── page.tsx               ← Admin dashboard (TODO: Phase 6B)
│   └── api/
│       ├── chat/route.ts          ← SSE streaming endpoint
│       ├── feedback/route.ts      ← Feedback save endpoint
│       ├── title/route.ts         ← Title generation endpoint
│       └── admin/
│           └── stats/route.ts     ← Admin stats (TODO: Phase 6A)
├── components/
│   ├── LandingPage.tsx
│   ├── ChatInterface.tsx           ← Main orchestrator
│   ├── ConversationSidebar.tsx
│   ├── MessageBubble.tsx
│   ├── ActionPlanDisplay.tsx
│   ├── FeedbackPrompt.tsx
│   ├── Header.tsx                  ← Stub (header is inline in ChatInterface)
│   └── ClientDetailModal.tsx      ← TODO: Phase 6C
├── lib/
│   ├── types.ts                    ← All TypeScript interfaces
│   ├── utils.ts                    ← ID generation, hashing, date formatting
│   ├── firebase.ts                 ← Firestore CRUD helpers
│   ├── claude.ts                   ← Anthropic client, streaming, title gen
│   ├── prompts.ts                  ← System prompt, CA law context, title prompt
│   └── clientStorage.ts           ← localStorage management + Firestore sync
└── public/
    └── SkylarLogo.jpg             ← 240×91px wide logo
```

---

## Firestore Security Rules (Current)

The app uses the Firebase client SDK directly from the browser. Firestore security rules should allow read/write to `clients` and `conversations` collections. Verify rules allow writes from unauthenticated clients for pilot phase. Before production, add proper auth.

---

## Notes for Incoming Developer

1. **Test with a fresh browser profile** (or clear `skylar_client_data` from localStorage + delete Firestore docs) when testing `conversationCount` — stale data from earlier sessions will have wrong IDs.

2. **The Anthropic API key only has access to Claude 4 Sonnet and Claude 3 Haiku** — do not try other model IDs or you will get 404 errors. `claude-sonnet-4-20250514` is the confirmed working model for chat, `claude-3-haiku-20240307` for titles.

3. **The streaming route requires `export const dynamic = "force-dynamic"` and `runtime = "nodejs"`** — without these, Next.js 14 buffers the response and streaming won't work.

4. **All Firebase writes use `setDoc` with merge, not `updateDoc`** — this was a deliberate fix. Do not switch back to `updateDoc` or you will get "No document to update" errors for new conversations.

5. **The `situationType` field is always `"other"`** — this needs to be set either by analyzing the conversation content with Claude or by user selection. It affects the admin dashboard's situation breakdown chart.
