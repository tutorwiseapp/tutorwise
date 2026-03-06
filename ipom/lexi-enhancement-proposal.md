# Lexi Enhancement Proposal — Smarter, More Knowledgeable, More Useful
**Version 1.0 — 2026-03-05**
**Author: Platform Architecture Review**

---

## Executive Summary

Lexi is a solid v1 platform assistant: role-adaptive, RAG-powered, tool-equipped, multi-provider. But it was designed before Sage Pro, the Growth Advisor, the CAS Process Engine, and the Admin Process Studio shipped. It treats users reactively (answer when asked), uses shallow read-only tools, and has no awareness of cross-platform state.

This proposal defines five enhancement tracks that would make Lexi materially smarter and more useful — for users, admins, and platform support engineers.

---

## Current State: Honest Assessment

### What Works Well
- Role-adaptive personas (5 roles, 4 sub-personas) with good tone matching
- RAG over help centre articles (16 categories, vector search)
- 11 read-only tools for live data queries
- 6-provider LLM fallback chain — resilient
- Proactive page-context suggestions
- Streaming SSE with suggestion chips

### Critical Gaps

| Gap | Impact |
|-----|--------|
| **Read-only tools** — Lexi can tell you how to cancel a booking but cannot cancel it | High friction, users context-switch to UI |
| **No cross-module awareness** — Lexi doesn't know you have a Sage session, Growth Pro, or a pending CAS approval | Feels disconnected from actual platform state |
| **Static knowledge base** — RAG is seeded once; doesn't reflect latest feature releases or policy changes automatically | Stale answers on new/updated features |
| **Rate limit: 10/day** — Too low for users with real support needs; blocks power users entirely | Users give up, tickets created unnecessarily |
| **No proactive intelligence** — Lexi waits to be asked; never says "your listing has had no views in 14 days" | Missed opportunities for genuine value |
| **No admin/support engineer mode** — Support engineers use the same Lexi as end-users, with no elevated context | Slow investigations, repeated manual queries |
| **Guest access gap** — Help centre says guests can use Lexi; implementation blocks all unauthenticated users | Inconsistent experience, lost leads |
| **No action escalation loop** — `create_support_ticket` sends a ticket but Lexi loses context afterward | Handoffs are cold and uninformative |

---

## Enhancement Track 1: Write-Action Tools (Actions, Not Just Advice)

**The problem:** Lexi says "go to Settings > Availability and uncheck Saturday". This requires 4 clicks after Lexi answers. Every answer is an instruction manual, not a resolution.

**The fix:** Add write-action tools behind confirmation dialogs. Lexi asks for consent, user confirms, Lexi executes.

### Proposed New Tools

| Tool | What It Does | Roles |
|------|-------------|-------|
| `draft_listing` | Creates a listing draft pre-filled with suggested content | Tutors |
| `update_availability` | Sets availability slots directly | Tutors |
| `cancel_booking` | Cancels a booking with reason and notifies counterparty | All |
| `send_message` | Sends a pre-drafted message to a booking counterpart | All |
| `request_review` | Sends a review request to a recently tutored student | Tutors |
| `add_to_wiselist` | Saves a tutor/listing to user's Wiselist | Clients |
| `initiate_payout` | Triggers a manual payout request (with eligibility check first) | Tutors |
| `update_listing_price` | Updates an existing listing's price with validation | Tutors |
| `flag_issue` | Flags a session/booking/message for admin review with evidence | All |

### UX Pattern — Confirmed Actions

```
User: "Can you cancel my 3pm booking tomorrow with James?"

Lexi: I found it — Booking #4821, James Wilson, Tuesday 4 March at 3:00pm
      (Maths GCSE, online).

      ⚠️ Cancelling within 24 hours may affect your cancellation rate.

      Shall I cancel it? [Confirm Cancel] [No, keep it]

User: [Confirm Cancel]

Lexi: Done. Booking cancelled. James has been notified. Your next booking
      is Thursday at 5pm with Emma Clarke.
```

**Implementation note:** All write tools must:
1. Show a confirmation step with full context before executing
2. Log the action in an audit trail (who, what, when, via Lexi)
3. Send appropriate platform notifications to affected parties
4. Be rollback-safe where possible (soft deletes, not hard)

---

## Enhancement Track 2: Cross-Module Intelligence

**The problem:** Lexi is blind to what the user has been doing on the platform. It doesn't know you just had a Sage session on quadratic equations, received Growth Advisor advice about pricing, or have a pending HITL approval in the CAS queue. Every conversation starts from zero.

**The fix:** Lexi gets a live context snapshot at session start — a structured JSON of the user's platform state across all modules.

### Platform Context Snapshot (injected at session start)

```typescript
interface LexiPlatformContext {
  // Core
  profile: { role, caas_score, listing_count, active_since }

  // Financials
  earnings: { today, this_week, this_month, pending_payout, stripe_connected }

  // Bookings
  bookings: { upcoming_count, past_30_days, cancellation_rate, next_booking }

  // Sage
  sage: { has_pro, sessions_this_month, last_session_subject, daily_usage }

  // Growth
  growth: { has_pro, sessions_this_month, last_topic_discussed, daily_usage }

  // CAS / Process Studio
  cas: { pending_approvals: [], recent_executions: [] }

  // Platform signals
  signals: {
    listing_last_view_days_ago: number      // "your listing hasn't been seen in 14 days"
    unread_messages: number
    stripe_issues: boolean
    incomplete_profile_fields: string[]
    last_review_days_ago: number
  }
}
```

### Cross-Module Conversations

With this context, Lexi can have genuinely useful conversations:

```
User: "Why am I not getting many bookings?"

Lexi (with context): Looking at your account, I can see a few things:

  - Your listing hasn't appeared in search results for 18 days
    (CaaS score: 62 — below the 70 threshold for featured placement)
  - You have 3 unanswered messages from potential clients
  - Your hourly rate (£55) is 18% above the local average for GCSE Maths

  Your Growth Advisor session last week touched on listing optimisation —
  would you like me to help you act on that advice now?
```

```
User: "I have a pending approval - what is it for?"

Lexi (with context, CAS-aware): You have 1 pending approval in the
  Process Studio — it's for a commission payout to Sarah Chen (£127.50)
  as part of the weekly payout batch. It's been waiting 2 hours.

  Shall I open the approval screen, or would you like me to explain
  the payout calculation first?
```

### Module-Specific Handoffs

Lexi should be the intelligent router between modules:

| If user asks about... | Lexi action |
|----------------------|-------------|
| Homework / exam prep | "I'll hand you to Sage with this topic pre-loaded" + deep link with context |
| Income strategy / pricing | "Your Growth Advisor can give you a detailed plan" + deep link |
| A pending process / approval | "You have N items in Process Studio" + direct link to relevant execution |
| A bug / technical issue | Creates structured ticket with platform context pre-filled |

---

## Enhancement Track 3: Proactive Intelligence (Lexi That Surfaces Issues)

**The problem:** Lexi is passive. It waits to be asked. But the most valuable support happens before the user even knows they have a problem.

**The fix:** A lightweight signals engine that feeds Lexi with platform anomalies, and Lexi surfaces them at the right moment.

### Signal Categories

**Listing Health Signals**
- Listing not updated in 60+ days
- No views in 14+ days
- Price significantly above/below market rate
- Missing required fields (no profile photo, no bio)
- CaaS score dropped below 70 (featured threshold)

**Earnings & Payout Signals**
- Stripe not connected / identity not verified
- Payout stuck in pending for 3+ days
- Earnings dropped >30% vs previous month
- High refund rate this month

**Engagement Signals**
- Unanswered messages >24h
- Pending booking request not actioned
- Review request sent but not followed up
- Student hasn't booked a follow-up lesson in 4 weeks

**Platform Health Signals (for admins/support)**
- User's Stripe account flagged
- Multiple failed booking attempts by same user
- Unusual login pattern
- Payment dispute opened

### Proactive Message Design

Signals should surface as Lexi **proactive messages** — triggered when the user opens the Lexi modal, not as push notifications (avoid notification fatigue):

```
[Lexi opens]

Hi Sarah! Before you ask — I noticed two things worth your attention:

1. 🔔 You have 2 unread messages from potential clients (3 days old)
2. 📊 Your listing hasn't appeared in search this week — your CaaS score
   dropped to 61. Would you like help improving it?

What can I help you with today?
```

**Implementation:** Add a `generate_signals()` function called at session start. Returns a max of 2 priority signals. Lexi prepends them to its greeting naturally, not as an alert dump.

---

## Enhancement Track 4: Platform Support Engineer Mode

**The problem:** When a support engineer or admin investigates a user issue via Lexi, they get the same experience as the end-user. They can't query cross-user data, see platform logs, or run diagnostic queries.

**The fix:** An elevated "Support Mode" for admin-role users, unlocking a second set of tools with broader access.

### Support Mode Tools

| Tool | What It Does |
|------|-------------|
| `lookup_user` | Find any user by email/name — returns profile, role, CaaS score, Stripe status |
| `get_user_bookings` | View any user's booking history with payment statuses |
| `get_payment_history` | Full payment trail for any booking or user |
| `get_user_sessions` | View Sage/Growth/Lexi session activity for any user |
| `get_stripe_status` | Stripe account status, verification, payout history for any user |
| `get_error_logs` | Recent errors/400s/500s for a given user or endpoint |
| `list_pending_approvals` | All pending CAS approvals across the platform |
| `get_process_execution` | Status of any workflow execution |
| `run_diagnostic` | Pre-defined diagnostic queries (slow listings, stuck payouts, etc.) |
| `send_admin_message` | Send a platform notification to any user |
| `impersonate_session` | Read-only session to see what a user sees (audit-logged) |

### Support Mode Conversations

```
Support Engineer: "User hello@tutorwise.com says they're not receiving payouts"

Lexi (Support Mode):
  User: Sarah Chen (sarah@tutorwise.com) — Tutor, CaaS: 71

  Stripe Status: ✅ Connected — stripe_acct_1A2B3C4D
  Identity Verification: ✅ Verified

  Last 3 payout attempts:
  - £127.50 — 2026-03-01 — ✅ Paid (2 days)
  - £89.00  — 2026-02-22 — ✅ Paid (3 days)
  - £215.00 — 2026-02-15 — ⚠️ Delayed — Stripe held for review (resolved)

  Next scheduled payout: Friday 2026-03-07 — £164.00 pending

  Likely cause: No actual issue — last payout was successful.
  The Feb 15 delay may have caused confusion.

  Suggested response to user: Explain the Feb 15 delay was temporary,
  confirm Friday payout is scheduled. Shall I draft that message?
```

### Activation

Support Mode activates automatically when:
1. The user's profile has `is_admin = true` (via `is_admin()` RLS function)
2. OR the user has been granted `support_role` permission

No separate login or interface needed — same Lexi modal, richer tools.

---

## Enhancement Track 5: Knowledge Base Automation

**The problem:** The knowledge base is seeded manually. When new features ship (Growth Advisor, Process Studio, AI Studio updates), Lexi doesn't know about them until someone re-runs the seeder. There's also no feedback loop — Lexi doesn't learn from which answers users rate highly vs poorly.

**The fix:** Three improvements to the knowledge pipeline.

### 5a. Auto-Sync from Help Centre MDX

Add a build-time or webhook trigger that:
1. Detects changes to `/content/help-centre/**/*.mdx`
2. Re-chunks and re-embeds changed articles only (delta sync, not full re-seed)
3. Updates `lexi_knowledge_chunks` with a `last_synced_at` timestamp
4. Sends a Slack/webhook notification on completion

**Benefit:** Lexi stays current automatically. Knowledge base reflects the deployed help centre, always.

### 5b. Feedback-Driven Quality Scoring

Existing thumbs up/down feedback is stored but not used to improve retrieval. Add:
- A `feedback_score` column on `lexi_knowledge_chunks`
- After thumbs-down responses, downweight the chunks used in that answer
- After thumbs-up, upweight those chunks
- Weekly job: re-rank chunks by weighted score, prune stale low-quality content

**Benefit:** Over time, Lexi surfaces better answers for the same questions based on what users actually found helpful.

### 5c. Failure-to-Answer Detection

Track when Lexi says "I don't know" or produces a low-confidence response:
- Log the original question alongside the top-retrieved chunks and their scores
- Weekly admin digest: "Top 10 questions Lexi couldn't answer well this week"
- Platform team uses this list to write missing help articles or improve existing ones

**Benefit:** Continuous improvement loop. The gap between what users ask and what Lexi knows shrinks over time.

### 5d. Add Growth + CAS + Process Studio Knowledge Domains

Currently missing from Lexi's knowledge base:
- Growth Advisor usage guide (we just wrote growth.mdx — needs seeding)
- CAS Process Studio — execution, HITL approvals, shadow/live modes
- AI Studio — how to create AI Tutors, training, deployment
- Commission engine — advanced commission calculation rules
- Referrals v2 — org-level referral tracking

---

## Enhancement Track 6: Contextual Handoff Quality

**The problem:** When Lexi hands off to Sage or Growth, it sends the user to a new tab/page with no context. The receiving module (Sage, Growth) starts fresh. The user has to re-explain their situation.

**The fix:** Context-carrying deep links. Lexi encodes the conversation context into a URL parameter or sessionStorage entry, and the receiving module picks it up.

### Lexi → Sage Handoff (Already Partially Implemented)

The `sessionStorage.setItem('sage_handoff', ...)` pattern exists but Lexi doesn't populate it systematically. Lexi should:
1. Detect when it's about to suggest Sage
2. Extract the academic topic from the conversation
3. Encode: `{ subject: 'maths', topic: 'quadratic equations', level: 'gcse', conversationContext: [...] }`
4. Write to sessionStorage before redirecting
5. Sage picks it up on load and pre-populates subject/level, then sends an opening message

### Lexi → Growth Handoff (Not Implemented)

Same pattern for Growth:
1. Detect business strategy intent
2. Extract: `{ topic: 'listing optimisation', context: [...last 3 messages] }`
3. Growth page picks up and provides a warm opening

### Lexi → Support Ticket Handoff (Currently Cold)

When `create_support_ticket` fires, attach the full conversation as context:
```typescript
{
  ticket_id: 'TKT-4821',
  user_id: '...',
  conversation_summary: 'User unable to receive payout. Stripe connected. Issue unresolved.',
  full_transcript: [...],
  platform_context_snapshot: { earnings, bookings, stripe_status },
  suggested_resolution: 'Check Stripe dashboard for payout hold',
}
```

Support engineers open a ticket and immediately have full context — no "please describe your issue" back-and-forth.

---

## Prioritised Roadmap

| Track | Priority | Effort | Value | Suggested Phase |
|-------|----------|--------|-------|-----------------|
| **Track 2: Cross-module context snapshot** | P0 | Medium | Very High | Phase 1 |
| **Track 5d: Seed Growth + CAS knowledge** | P0 | Low | High | Phase 1 (immediate) |
| **Track 3: Proactive signals** | P1 | Medium | High | Phase 1 |
| **Track 4: Support engineer mode** | P1 | Medium | High | Phase 1 |
| **Track 5a: Auto-sync MDX → knowledge** | P1 | Low | Medium | Phase 1 |
| **Track 1: Write-action tools** | P2 | High | Very High | Phase 2 |
| **Track 6: Context-carrying handoffs** | P2 | Low | Medium | Phase 2 |
| **Track 5b/c: Feedback quality loop** | P3 | Medium | Medium | Phase 3 |

---

## Quick Wins (Can Ship This Week)

These require no architectural changes — just new knowledge and minor code changes:

1. **Seed growth.mdx and all new help articles** into `lexi_knowledge_chunks` — Lexi immediately knows about Growth Advisor
2. **Raise rate limit** from 10 → 25/day for authenticated users (reduce abandonment)
3. **Fix guest access gap** — either implement it or correct the documentation
4. **Add proactive signal for unread messages** — cheapest signal, highest impact
5. **Populate support ticket with full transcript** — one-line change to `create_support_ticket` tool
6. **Add CAS/Process Studio to Lexi knowledge** — write the MDX, seed it

---

## Longer-Term Vision: Lexi as Platform Intelligence Layer

At full maturity, Lexi should feel less like a chatbot and more like a **platform co-pilot** that:

- Knows your complete account state before you ask anything
- Surfaces anomalies and opportunities proactively
- Executes routine tasks on your behalf (with consent)
- Routes you intelligently to Sage (academic), Growth (business), or a human (escalation) with full context
- Gives support engineers a command-line-like interface to investigate any platform issue in natural language

The architecture already supports this — it's a matter of expanding tools, enriching context injection, and automating the knowledge pipeline.

---

*This document is a proposal for review. Implementation timelines and scope to be agreed with the product team.*
