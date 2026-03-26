# Skylar HR Advisor — Deployment Guide

Deployment target: **Vercel** (recommended) with Firebase Firestore as the database and Anthropic as the AI provider.

---

## Prerequisites

| Service | Purpose | Where to get it |
|---|---|---|
| Anthropic API key | Powers Claude (AI responses) | [console.anthropic.com](https://console.anthropic.com) |
| Firebase project | Firestore database | [console.firebase.google.com](https://console.firebase.google.com) |
| GitHub repo | Source for Vercel deploys | Already set up |

---

## Step 1 — Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → your `skylar-hr-advisor` project
2. **Firestore Database** → ensure it is in **production mode**
3. **Security Rules** — set the following (only server-side SDK access; no client writes):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> All Firestore access goes through Next.js API routes using the Firebase Admin SDK or the server-side config. Direct client reads/writes are blocked.

4. Create the two collections if they don't exist already (Firestore creates them on first write, so this is automatic):
   - `clients`
   - `conversations`

---

## Step 2 — Vercel Project Setup

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the GitHub repo: `pnarciso1/Skylar-HR-Advisor`
3. Framework preset will auto-detect as **Next.js** ✅
4. **Root Directory**: set to `hr-assistant-test`
5. Leave build/output settings as default (they are defined in `vercel.json`)

---

## Step 3 — Environment Variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add all of the following for **Production**, **Preview**, and **Development** environments:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `skylar-hr-advisor.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `skylar-hr-advisor` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `skylar-hr-advisor.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your app ID |
| `ADMIN_PASSWORD` | A strong password for the `/admin` dashboard |

> **Never commit `.env.local`** — it is git-ignored. Use `.env.example` as reference.

---

## Step 4 — Deploy

1. Push to `main` branch → Vercel auto-deploys
2. Or trigger manually: **Vercel Dashboard → Deployments → Redeploy**

---

## Step 5 — Post-Deploy Verification

Work through this checklist after every production deploy:

### Core Functionality
- [ ] Landing page loads at `/`
- [ ] Enter a company name → redirects to `/chat`
- [ ] Pre-authenticated URL works: `/?client=your-pilot-client`
- [ ] Client record created in Firestore `clients` collection
- [ ] Chat interface opens with empty state
- [ ] Send a message → Claude responds (streaming works)
- [ ] Action plan checklist renders and items can be checked off
- [ ] Conversation saved in Firestore `conversations` collection
- [ ] `conversationCount` increments on client document
- [ ] Conversation title auto-generated after a few exchanges
- [ ] Sidebar shows conversation history
- [ ] New conversation starts correctly
- [ ] Delete conversation removes from sidebar + Firestore

### Feedback Flow
- [ ] Feedback prompt appears after action plan delivery
- [ ] Submit feedback → record saved in Firestore with `userFeedback` fields

### Admin Dashboard
- [ ] `/admin` loads login modal
- [ ] Wrong password → error shown
- [ ] Correct password → dashboard loads
- [ ] All stats metrics display (not NaN / undefined)
- [ ] Pilot clients table populates
- [ ] Client detail modal opens, shows conversations
- [ ] Transcript view works
- [ ] Refresh button reloads data
- [ ] Logout clears session

### Streaming & API Routes
- [ ] `POST /api/chat` streams responses (no timeout on Vercel — uses edge-compatible Node runtime)
- [ ] `POST /api/feedback` returns `{ success: true }`
- [ ] `GET /api/admin/stats` returns 401 without token, 200 with correct token

### Mobile
- [ ] Test on a real iOS/Android device or browser devtools mobile emulation
- [ ] Sidebar slide-in works
- [ ] Feedback prompt usable on small screen
- [ ] No horizontal scroll on any page

---

## Rollback

To roll back to a previous deploy:
1. Vercel Dashboard → **Deployments**
2. Find the last good deployment → **⋯ → Promote to Production**

---

## Environment Variable Updates

After changing any env var in Vercel, you **must redeploy** for the change to take effect (Vercel does not hot-reload env vars).

---

## Useful Commands (local)

```bash
# Type-check without building
npm run type-check

# Lint
npm run lint

# Production build (verify locally before pushing)
npm run build
npm start
```
