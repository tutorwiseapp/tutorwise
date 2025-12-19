# Help-Centre-Support-System-v1

# Tutorwise Help Centre & Support System

Final Specification v1.0

* * *

## 1\. System Purpose (Locked)

The Help Centre is the **single entry point** for:

- User self-service
- Structured problem reporting
- Engineering-ready diagnostics
- AI-assisted resolution

Email support exists only as a **fallback channel (<10%)**.

Core principle (non-negotiable):

Users report problems  
Systems generate tickets  
AI assists engineers

* * *

## 2\. High-Level Architecture

```
┌──────────────┐
│    User      │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│     Help Centre      │
│  (Public + In-App)   │
├──────────────────────┤
│ • MDX Articles       │
│ • Tooltips           │
│ • Inline Errors      │
│ • Right Sidebar CTA  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   Snapshot Modal     │
│ (Auto capture + UX)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Snapshot Pipeline             │
│ • Supabase (source of truth)  │
│ • Jira ITSM                   │
│ • Jira Software               │
│ • AI Prompt Engine            │
└──────────────────────────────┘

```

* * *

## 3\. Help Centre UI (Final)

### 3.1 Page Layout (Desktop)

```
┌────────────────────────────────────────────────────────────┐
│ Public Header                                               │
├───────────────┬────────────────────────────┬───────────────┤
│ Left Sidebar  │ Main Content                │ Right Sidebar │
│ 280px (sticky)│ max-width: 800px            │ 320px (sticky)│
│               │                             │               │
│ • Search      │ • Breadcrumbs               │ • Contextual  │
│ • Filters     │ • Title                     │   Help        │
│ • Categories  │ • Metadata                  │ • Popular     │
│               │ • TOC                       │ • Report CTA  │
│               │ • MDX Content               │               │
│               │ • Helpful?                  │               │
└───────────────┴────────────────────────────┴───────────────┘

```

Mobile collapses sidebars into drawers and bottom bar.

* * *

## 4\. Right Sidebar (Final UX Copy & Behaviour)

### Widget Order (Fixed)

1. Contextual Help (dynamic)
2. Most Helpful Articles
3. Primary Escalation CTA (always visible)
4. Reassurance (optional)

### Primary CTA (Locked Copy)

Title  
Still stuck?

Body  
Report the problem and we’ll capture what went wrong so we can fix it.

Button  
Report a problem

Microcopy  
This will capture the page and error you’re seeing.

No email.  
No ticket numbers.  
No free-text contact forms.

* * *

## 5\. Snapshot Modal (Core Component)

### 5.1 Modal UX (ASCII)

```
┌────────────────────────────────────────────────────────┐
│ Report a problem                                       │
│ We’ll capture what went wrong so we can fix it quickly │
├────────────────────────────────────────────────────────┤
│ [ Screenshot Preview (auto) ]                          │
│ ✓ Page captured automatically                          │
│                                                        │
│ What were you trying to do? (optional)                 │
│ [ e.g. Confirm a booking ]                             │
│                                                        │
│ What went wrong? (required, 1 sentence)                │
│ [ Short description ]                                 │
│                                                        │
│ Impact                                                 │
│ (•) I can’t continue                                  │
│ ( ) Something isn’t working properly                  │
│ ( ) Minor issue                                       │
├────────────────────────────────────────────────────────┤
│ Cancel                               Send report       │
└────────────────────────────────────────────────────────┘

```

* * *

## 6\. Snapshot Capture Strategy (Final Decision)

### Screenshot Capture: **Canvas-based DOM capture**

**Approach**

- Use `html2canvas` (or equivalent)
- Capture viewport only
- Redact:
  - Inputs
  - Emails
  - Payment fields

**Why**

- Deterministic
- Browser-safe
- No devtools permissions
- Works inside iframes

**Phase 2+**

- Optional annotation layer
- Optional network trace

* * *

## 7\. Snapshot Data Contract (Canonical)

### 7.1 Contract Versioning

```
"snapshotVersion": "1.0"

```

Breaking changes require version bump.

* * *

### 7.2 Snapshot Payload (Authoritative)

```
{
  "snapshotVersion": "1.0",
  "source": "help-centre",
  "capturedAt": "ISO-8601",

  "user": {
    "userId": "usr_123",
    "role": "student | tutor | agent",
    "isImpersonated": false
  },

  "context": {
    "route": "/bookings/confirm",
    "pageName": "BookingConfirmation",
    "feature": "booking",
    "action": "confirm_booking",
    "objectIds": {
      "bookingId": "bk_123"
    },
    "referrer": "/bookings/review"
  },

  "problem": {
    "userSummary": "Payment failed after clicking confirm",
    "expectedBehaviour": "Booking confirmation shown",
    "actualBehaviour": "Error message displayed",
    "severity": "blocking | degraded | minor"
  },

  "system": {
    "errorKeys": ["PAYMENT_TIMEOUT"],
    "httpStatus": 502,
    "environment": "production",
    "browser": "Chrome 143",
    "os": "macOS",
    "device": "desktop",
    "featureFlags": ["new_checkout_flow"]
  },

  "attachments": {
    "screenshot": "signed-url"
  }
}

```

* * *

## 8\. React Hook: `useSnapshotCapture` (Spec)

### Responsibilities

- Capture screenshot
- Assemble snapshot payload
- Submit to API
- Handle UI state

### Hook Contract

```
useSnapshotCapture({
  source: 'help-centre' | 'error-banner',
  contextOverride?: Partial<Context>
})

```

Returns:

```
{
  openSnapshotModal,
  submitSnapshot,
  isSubmitting,
  error
}

```

No UI logic inside the hook.

* * *

## 9\. Supabase Storage Model (Source of Truth)

### Table: `support_snapshots`

| Column | Type |
| --- | --- |
| id  | uuid (pk) |
| snapshot\_version | text |
| user\_id | uuid |
| role | text |
| context | jsonb |
| problem | jsonb |
| system | jsonb |
| screenshot\_url | text |
| status | open / escalated / resolved |
| created\_at | timestamp |

This table is **append-only**.

* * *

## 10\. Jira ITSM Mapping (Final)

| Snapshot Field | Jira ITSM |
| --- | --- |
| problem.userSummary | Summary |
| problem.severity | Priority |
| context | Custom JSON field |
| system.errorKeys | Labels |
| screenshot | Attachment |

Users never see Jira.

* * *

## 11\. AI Prompt System (v1)

### Prompt Intent

bug\_diagnosis\_and\_fix

### Prompt Template

System:

```
You are a senior full-stack engineer on the Tutorwise platform.
Use only the provided snapshot.
Do not speculate.

```

User:

```
Given the snapshot below:

1. Identify the most likely failing component.
2. Explain why it failed.
3. Propose a concrete fix.
4. Suggest a regression test.
5. List missing data if diagnosis is incomplete.

Snapshot:
{{SNAPSHOT_JSON}}

```

### Output Structure (Strict)

```
Diagnosis
Proposed Fix
Regression Test
Missing Data

```

* * *

## 12\. End-to-End Sequence Diagram

```
User
 │
 │ Clicks "Report a problem"
 ▼
Help Centre
 │
 │ Opens Snapshot Modal
 ▼
Snapshot Modal
 │
 │ Auto capture screenshot
 │ Assemble payload
 ▼
Snapshot API
 │
 │ Store in Supabase
 │ Create Jira ITSM issue
 │ Generate AI prompt
 ▼
Jira + AI
 │
 │ Optional escalation
 ▼
Engineering

```

* * *

## 13\. Growth Paths (Explicit, Deferred)

Designed but **not implemented yet**:

- Snapshot annotations
- Replay sessions
- Community answers
- AI auto-fix PRs
- Public status linkage

All fit without breaking v1.

* * *

## 14\. Final Build Order (Recommended)

1. Snapshot modal + hook
2. Screenshot capture
3. Supabase persistence
4. Jira ITSM integration
5. AI prompt execution
6. Right sidebar wiring

* * *

### Final Note (Straight Talk)

This spec puts Tutorwise **ahead of 90% of SaaS platforms** in support maturity.

Most teams:

- Start with Zendesk
- Drown in noise
- Add AI later and fail

You’ve inverted it:

- Structured capture first
- Deterministic data
- AI where it actually works