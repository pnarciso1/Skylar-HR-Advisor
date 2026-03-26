# Skylar HR Advisor — Pre-Launch Testing Checklist

Run through every item below before going live. Check off each item as you verify it. Any unchecked item should be resolved before launch.

---

## 🏠 Landing Page

- [ ] Company name input accepts text
- [ ] "Continue" button is disabled when input is empty
- [ ] "Continue" button activates once text is entered
- [ ] Clicking "Continue" navigates to `/chat`
- [ ] Pre-authenticated URL works: `/?client=acme-corp` → skips form, goes straight to `/chat`
- [ ] Client record created in Firestore `clients` collection after continuing
- [ ] `clientId` and `identifier` written to `localStorage`
- [ ] Skylar logo displays correctly
- [ ] Page is usable on iPhone SE (375px) — no overflow, readable text

---

## 💬 Chat Interface

### Messages
- [ ] Chat opens with empty conversation (no ghost messages)
- [ ] Sending a message adds it to the right side (blue bubble)
- [ ] Claude responds with streaming text (text appears progressively)
- [ ] Assistant messages render Markdown: bold, lists, headings, code blocks
- [ ] Timestamp appears on message hover
- [ ] Long messages don't break the layout

### Action Plan
- [ ] Action plan renders as an interactive checklist (no raw `** **` asterisks)
- [ ] Each checklist item can be checked and unchecked
- [ ] Checked state persists after refreshing the page (saved to localStorage + Firestore)
- [ ] Feedback prompt appears after action plan delivery

### Conversations
- [ ] Conversation saves to `localStorage` after each assistant message
- [ ] Conversation syncs to Firestore `conversations` collection after each assistant message
- [ ] Conversation title auto-generates after a few exchanges (not stuck on "New Conversation")
- [ ] "New Conversation" button starts a fresh chat
- [ ] Switching conversations in the sidebar loads the correct history
- [ ] Deleting a conversation removes it from the sidebar, `localStorage`, and Firestore
- [ ] Conversations persist across page reloads

### Input
- [ ] Pressing Enter sends the message
- [ ] Pressing Shift+Enter adds a new line (does not send)
- [ ] Input is disabled while Claude is responding
- [ ] Input clears after sending
- [ ] "Send" button shows a spinner while streaming

---

## 📋 Conversation Sidebar

- [ ] Sidebar shows all conversations in reverse chronological order
- [ ] Active conversation is highlighted
- [ ] Date group labels display correctly (Today, Yesterday, etc.)
- [ ] Clicking a conversation loads it
- [ ] Delete button on each conversation card works (with confirmation)
- [ ] Empty state shows when no conversations exist
- [ ] Loading skeleton appears on initial mount before conversations load
- [ ] **Mobile**: hamburger icon opens the sidebar overlay
- [ ] **Mobile**: tapping the backdrop closes the sidebar
- [ ] **Mobile**: close (X) button in sidebar works

---

## 💬 Feedback Prompt

- [ ] Prompt appears after the action plan is delivered
- [ ] "Yes, I acted on it" → shows confidence slider (1–10) and notes field
- [ ] Confidence slider is draggable and shows the current value label
- [ ] "No, I still need help" → shows contact Skylar option and notes field
- [ ] "Yes, contact Skylar" → shows support email address
- [ ] "Not yet decided" → shows "Remind me later" and partial submit options
- [ ] Submitting feedback saves to Firestore `conversations[id].userFeedback`
- [ ] "Thank you" confirmation shows after submission
- [ ] Prompt does not reappear for the same conversation after submission

---

## 🔐 Admin Dashboard (`/admin`)

### Authentication
- [ ] `/admin` shows password modal on first visit
- [ ] Wrong password → error message displayed, dashboard stays hidden
- [ ] Correct password → dashboard loads
- [ ] Password stored in `sessionStorage` (survives page refresh within the session)
- [ ] "Logout" button clears the session and shows the password modal again

### Metrics
- [ ] Total conversations count is accurate
- [ ] Action plans delivered count and percentage are accurate
- [ ] Acted independently count and percentage are accurate
- [ ] Average confidence score displays (e.g., 7.5 / 10)
- [ ] Test status progress bar fills correctly
- [ ] "X more responses needed to pass" text is accurate

### Pilot Clients Table
- [ ] Table lists all pilot clients
- [ ] Status badge (Active / Low Usage / No Usage) is correct for each
- [ ] Clicking a client row opens the Client Detail Modal

### Client Detail Modal
- [ ] Shows client summary stats (conversations, acted %, confidence, last active)
- [ ] Lists all conversations for that client in a table
- [ ] Situation type badge shows correctly per conversation
- [ ] Acted ✅ / ❌ shows correctly per conversation
- [ ] Confidence score shows per conversation
- [ ] "View" button opens the transcript sub-modal
- [ ] Transcript shows all messages (user right / assistant left)
- [ ] Transcript shows feedback if provided
- [ ] Closing transcript returns to conversation list
- [ ] Closing modal returns to dashboard
- [ ] **Mobile**: modal displays as bottom sheet, scrollable

### Charts
- [ ] Situation type breakdown bars show correct percentages
- [ ] Confidence distribution bars show correct counts
- [ ] Days filter (7 / 14 / 30 / All) updates data on change
- [ ] "Refresh" button reloads stats

---

## ⚠️ Edge Cases

- [ ] Network error during streaming → error message shown in chat, can retry
- [ ] Navigating to `/chat` with no `localStorage` data → redirects to `/`
- [ ] Very long AI response → doesn't break layout or overflow
- [ ] Multiple rapid message sends → queued correctly (send button disabled during stream)
- [ ] Going offline mid-conversation → OfflineBanner appears, messages still saved locally
- [ ] Coming back online → OfflineBanner shows reconnected message

---

## 📱 Mobile (test on real device or devtools at 375px)

- [ ] Landing page is usable with no horizontal scroll
- [ ] Chat input doesn't trigger iOS auto-zoom (font size ≥ 16px)
- [ ] Sidebar overlay opens/closes smoothly
- [ ] Feedback prompt is fully usable on small screen (all buttons visible)
- [ ] Admin dashboard header fits without crowding
- [ ] Pilot clients table scrolls horizontally
- [ ] Client Detail Modal opens as bottom sheet
- [ ] All buttons meet 44px minimum touch target height

---

## ♿ Accessibility (keyboard + screen reader)

- [ ] All pages navigable by Tab key alone
- [ ] Focus ring visible on all interactive elements
- [ ] Sending a message and receiving a response → screen reader announces the response (via `aria-live`)
- [ ] Sidebar navigation announced as a nav landmark
- [ ] Each message bubble announced as "Your message" or "Skylar's response"
- [ ] Error states announced immediately (`role="alert"`)
- [ ] All icon-only buttons have `aria-label`
- [ ] Confidence slider readable by screen reader with value announcement
- [ ] Notes textareas have accessible labels

---

## 🚀 Performance

- [ ] Initial page load under 2 seconds on a fast connection
- [ ] First streaming token arrives within ~1 second of sending
- [ ] No layout shift (CLS) on page load
- [ ] `npm run build` completes with no errors or warnings
- [ ] `npm run type-check` passes with no TypeScript errors

---

## ✅ Sign-off

| Area | Tester | Date | Pass/Fail |
|---|---|---|---|
| Landing Page | | | |
| Chat — Core | | | |
| Chat — Action Plan | | | |
| Feedback Flow | | | |
| Conversation Sidebar | | | |
| Admin Dashboard | | | |
| Mobile | | | |
| Accessibility | | | |
| Performance / Build | | | |

**All items checked → ready to launch. 🚀**
