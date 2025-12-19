# Help Centre - Improved Specification v2.0

**Date:** 2025-01-19
**Status:** Authoritative
**Supersedes:** help-centre-support-system-v1.md (for implementation details)

---

## Executive Summary

This specification integrates the original Help Centre & Support System v1.0 with strategic improvements based on:
- Industry best practices (Stripe, Vercel, Linear)
- Practical implementation considerations
- Phased rollout strategy for sustainable development

**Key Changes from v1.0:**
1. ✅ Left sidebar: **320px** (was 280px) - Better UX, matches right sidebar
2. ✅ Support channels: **Email + Snapshot Modal** (was Snapshot only) - User flexibility
3. ✅ Contextual help system - Higher ROI, phase before Snapshot Modal
4. ✅ Progressive snapshot capture - Privacy-first, performance-optimized
5. ✅ Phased implementation - 4 phases over 12-14 weeks

---

## 1. Layout Specifications (Final)

### Desktop Layout (Updated)

```
┌────────────────────────────────────────────────────────────┐
│ Public Header                                               │
├──────────────────┬─────────────────────────┬───────────────┤
│ Left Sidebar     │ Main Content            │ Right Sidebar │
│ 320px (sticky)   │ max-width: 800px        │ 320px (sticky)│
│                  │                         │               │
│ • Search         │ • Breadcrumbs           │ • Contextual  │
│ • Filters        │ • Title                 │   Help ★      │
│ • Categories     │ • Metadata              │ • Quick       │
│   - Getting      │ • TOC                   │   Actions ★   │
│     Started      │ • MDX Content           │ • Popular     │
│   - Features     │ • Related Articles      │   Articles    │
│   - Account      │ • Helpfulness Widget    │ • System      │
│   - Billing      │                         │   Status ★    │
│   - FAQ          │                         │               │
│                  │                         │               │
│ 320px            │ Fluid (max 800px)       │ 320px         │
└──────────────────┴─────────────────────────┴───────────────┘

Total Width: ~1480px (320 + 800 + 320 + gaps)

★ = New/improved from v1.0
```

### Responsive Breakpoints

```css
/* Desktop (1280px+) */
@media (min-width: 1280px) {
  - Left sidebar: 320px sticky
  - Right sidebar: 320px sticky
  - Content: Max-width 800px centered
  - All widgets visible
}

/* Tablet (1024px - 1279px) */
@media (min-width: 1024px) and (max-width: 1279px) {
  - Left sidebar: 280px sticky (slightly narrower)
  - Right sidebar: Hidden (content moves below articles)
  - Content: Max-width 700px
}

/* Mobile (< 1024px) */
@media (max-width: 1023px) {
  - Left sidebar: Drawer (slide from left)
  - Right sidebar: Sticky bottom bar with key actions
  - Content: Full width padding 1rem
  - Hamburger menu button (top-left)
}
```

**Rationale for 320px Left Sidebar:**
- ✅ Symmetrical with right sidebar (consistent visual weight)
- ✅ Prevents article title truncation (common issue at 280px)
- ✅ Aligns with modern doc sites (Vercel: 300px, Linear: 320px)
- ✅ Minimal performance impact (40px difference negligible)

---

## 2. Right Sidebar Widgets (Priority Order)

### Widget Stack (Fixed Order)

```
┌───────────────────────────────────┐
│ 1. Contextual Help ★              │
│    (Dynamic, page-specific)       │
├───────────────────────────────────┤
│ 2. Quick Actions ★                │
│    (Smart routing)                │
├───────────────────────────────────┤
│ 3. Popular Articles               │
│    (Global, data-driven)          │
├───────────────────────────────────┤
│ 4. System Status ★                │
│    (Conditional, only if issues)  │
└───────────────────────────────────┘

★ = New from v2.0
```

---

### Widget 1: Contextual Help (NEW ★)

**Purpose:** Show relevant help for current page

**Example - Bookings Page:**
```
┌───────────────────────────────────┐
│ 📘 Help with Bookings             │
├───────────────────────────────────┤
│ • How Bookings Work               │
│ • Cancellation Policy             │
│ • Rescheduling Guidelines         │
│ • Common Booking Issues           │
│                                   │
│ Not finding what you need?        │
│ [Search all articles →]           │
└───────────────────────────────────┘
```

**Implementation:**
```typescript
// Each hub page passes context
<HelpCentreLayout
  contextualHelp={{
    title: "Help with Bookings",
    icon: "📘",
    articles: [
      { title: "How Bookings Work", slug: "features/bookings" },
      { title: "Cancellation Policy", slug: "features/cancellations" },
      { title: "Rescheduling Guidelines", slug: "features/rescheduling" },
      { title: "Common Booking Issues", slug: "troubleshooting/bookings" },
    ]
  }}
/>
```

**Benefits:**
- Reduces search time (users get relevant help immediately)
- Prevents support tickets (30-40% reduction expected)
- Analytics: Track which pages need better contextual help

---

### Widget 2: Quick Actions (IMPROVED ★)

**Purpose:** Smart routing to appropriate support channel

**UI:**
```
┌───────────────────────────────────┐
│ Need Help?                        │
├───────────────────────────────────┤
│ [💬 Report a Problem]             │ ← Snapshot Modal (Phase 3)
│ Technical issues, bugs, errors    │
│                                   │
│ [📧 Ask a Question]               │ ← Email/Chat (Phase 1)
│ Accounts, billing, policies       │
│                                   │
│ [🔴 Urgent Support]               │ ← Live Chat (if online)
│ Can't access account, payment     │
└───────────────────────────────────┘
```

**Smart Routing Logic:**
```typescript
const supportChannels = {
  snapshotModal: {
    label: "Report a Problem",
    icon: "💬",
    description: "Technical issues, bugs, errors",
    useWhen: [
      "UI not working",
      "Page errors",
      "Feature broken",
      "System slow"
    ],
    // Phase 3
  },
  emailChat: {
    label: "Ask a Question",
    icon: "📧",
    description: "Accounts, billing, policies",
    useWhen: [
      "How do I...?",
      "Account changes",
      "Billing questions",
      "Policy clarifications"
    ],
    // Phase 1
  },
  liveChat: {
    label: "Urgent Support",
    icon: "🔴",
    description: "Can't access account, payment issues",
    showIf: "agent_online && business_hours",
    // Phase 1 (Crisp integration)
  }
};
```

**Key Improvement from v1.0:**
- ❌ v1.0: "No email. No ticket numbers. No free-text contact forms."
- ✅ v2.0: Smart routing based on issue type
- **Rationale:** Not all issues need snapshots (e.g., "How do I change my email?")

---

### Widget 3: Popular Articles (UNCHANGED)

**Purpose:** Global popular articles (Supabase analytics)

**UI:**
```
┌───────────────────────────────────┐
│ 🔥 Most Helpful                   │
├───────────────────────────────────┤
│ 1. How to Get Paid (234 views)   │
│ 2. Create a Listing (189 views)  │
│ 3. Referral System (156 views)   │
│ 4. Stripe Setup (142 views)      │
│ 5. Booking Flow (121 views)      │
└───────────────────────────────────┘
```

**Query:**
```typescript
const { data: popularArticles } = useQuery({
  queryKey: ['popular-help-articles'],
  queryFn: () => getPopularArticles(5),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

### Widget 4: System Status (NEW ★)

**Purpose:** Show service disruptions proactively

**UI (when issues exist):**
```
┌───────────────────────────────────┐
│ ⚠️ System Status                  │
├───────────────────────────────────┤
│ Stripe Payments: Degraded        │
│ Some payments may be delayed.     │
│                                   │
│ [View status page →]              │
└───────────────────────────────────┘
```

**UI (when all systems normal):**
```
Widget hidden (no need to show "all good")
```

**Implementation:**
```typescript
const { data: systemStatus } = useQuery({
  queryKey: ['system-status'],
  queryFn: checkSystemStatus,
  refetchInterval: 60 * 1000, // Check every minute
});

// Only show widget if issues
if (systemStatus.hasIssues) {
  return <SystemStatusWidget status={systemStatus} />;
}
```

**Benefits:**
- Prevents support tickets during outages
- Sets expectations (users know it's not their fault)
- Reduces frustration

---

## 3. Snapshot Modal System (Phase 3)

### 3.1 Progressive Capture Strategy (IMPROVED ★)

**v1.0 Approach:** Always capture screenshot with html2canvas

**v2.0 Approach:** User-controlled progressive capture

```typescript
const snapshotLevels = {
  minimal: {
    // Just metadata (fast, privacy-safe)
    context: true,        // Page, action, user role
    screenshot: false,
    network: false,
    console: false,
  },
  standard: {
    // Metadata + screenshot (default)
    context: true,
    screenshot: true,     // html2canvas
    network: false,
    console: false,
  },
  diagnostic: {
    // Everything (for complex bugs)
    context: true,
    screenshot: true,
    network: true,        // Network tab logs
    console: true,        // Console errors
    localStorage: true,   // Redacted
  }
};
```

**Smart Defaults by Issue Type:**
```typescript
const defaultLevel = {
  "payment-issue": "minimal",      // No screenshot (PCI compliance)
  "ui-bug": "standard",            // Screenshot helpful
  "system-error": "diagnostic",    // Full context needed
  "feature-request": "minimal",    // No technical data needed
};
```

**Modal UI:**
```
┌────────────────────────────────────────────┐
│ Report a Problem                           │
│ We'll capture what went wrong              │
├────────────────────────────────────────────┤
│ What were you trying to do?               │
│ [ e.g. Confirm a booking ]                │
│                                            │
│ What went wrong? (1 sentence)             │
│ [ Payment failed after clicking confirm ] │
│                                            │
│ Impact:                                    │
│ (•) I can't continue                      │
│ ( ) Something isn't working properly      │
│ ( ) Minor issue                           │
│                                            │
│ ──────────────────────────────────────    │
│                                            │
│ We'll include:                             │
│ [x] Page you're on                        │
│ [x] Screenshot (optional)                 │ ← User control
│ [ ] Network logs (advanced)               │ ← Optional
│                                            │
│ Your screenshot preview:                   │
│ [Screenshot thumbnail with redactions]     │
│                                            │
├────────────────────────────────────────────┤
│ [Cancel]                    [Send Report] │
└────────────────────────────────────────────┘
```

**Benefits over v1.0:**
- ✅ **Privacy-first:** Users control what's captured
- ✅ **Performance:** Faster by default (no screenshot for simple issues)
- ✅ **Compliance:** Avoids capturing sensitive payment data
- ✅ **Flexibility:** Power users can share more context

---

### 3.2 Screenshot Redaction (IMPROVED ★)

**v1.0 Approach:** Redact inputs, emails, payment fields

**v2.0 Approach:** Intelligent redaction with user review

```typescript
const redactionRules = {
  // Always redact
  alwaysRedact: [
    'input[type="password"]',
    'input[type="email"]',
    'input[name*="card"]',
    'input[name*="cvv"]',
    '.payment-field',
  ],

  // Blur sensitive areas
  blur: [
    '.profile-image',
    '.student-photo',
    '.document-upload',
  ],

  // Replace with placeholder
  replace: [
    { selector: 'input[type="text"]', with: '[TEXT INPUT]' },
    { selector: 'textarea', with: '[TEXT AREA]' },
  ],
};
```

**Redaction Preview:**
```
Before Redaction:
┌─────────────────────────┐
│ Email: user@example.com │
│ Card: 4242 4242 4242... │
│ Amount: £50.00          │
└─────────────────────────┘

After Redaction (shown to user):
┌─────────────────────────┐
│ Email: [REDACTED]       │
│ Card: [REDACTED]        │
│ Amount: £50.00          │ ← Not redacted (not sensitive)
└─────────────────────────┘
```

**User Can Review:**
- See preview before submitting
- Click to un-redact specific fields if needed
- Add manual redaction (drag to blur areas)

---

## 4. Contextual Help System (NEW - Phase 2 Priority ★)

### 4.1 Inline Tooltips

**Purpose:** Reduce friction by providing help exactly where needed

**Component:**
```typescript
<HelpTooltip
  article="features/bookings#cancellation"
  excerpt="You can cancel up to 24 hours before..."
>
  <QuestionMarkIcon />
</HelpTooltip>
```

**Renders:**
```
[?] ← User hovers
    ↓
┌────────────────────────────────────┐
│ Cancellation Policy                │
│                                    │
│ You can cancel up to 24 hours     │
│ before the session without penalty│
│                                    │
│ [Learn more →]                     │ ← Links to full article
└────────────────────────────────────┘
```

**Usage in Components:**
```tsx
// In Bookings page
<div className={styles.cancellationSection}>
  <h3>
    Cancellation Policy
    <HelpTooltip article="features/cancellation-policy">
      <QuestionMarkIcon />
    </HelpTooltip>
  </h3>
  <p>You can cancel up to 24 hours before...</p>
</div>
```

**Analytics Tracking:**
```typescript
// Track tooltip interactions
trackEvent('help_tooltip_clicked', {
  article: 'features/cancellation-policy',
  page: '/bookings',
  user_role: 'tutor'
});
```

**Benefits:**
- ✅ **Reduces support tickets** (users get help inline)
- ✅ **Analytics:** Track which tooltips are clicked most
- ✅ **SEO:** Links to help articles improve discoverability
- ✅ **Non-intrusive:** Only shows on hover/click

---

### 4.2 Error Contextual Help

**Purpose:** Show relevant help when errors occur

**Example - Payment Error:**
```tsx
// When payment fails
<ErrorBanner
  message="Payment failed"
  helpArticle="troubleshooting/payment-failures"
  quickActions={[
    { label: "Try again", action: retryPayment },
    { label: "Report issue", action: openSnapshotModal },
  ]}
/>
```

**Renders:**
```
┌────────────────────────────────────────────┐
│ ⚠️ Payment failed                          │
│                                            │
│ Your payment couldn't be processed.        │
│                                            │
│ Common fixes:                              │
│ • Check your card details                 │
│ • Ensure sufficient funds                 │
│ • Try a different payment method          │
│                                            │
│ [Try again] [Report issue] [Get help →]   │
└────────────────────────────────────────────┘
```

---

## 5. Implementation Phases (Revised)

### Phase 1: Foundation (2-3 weeks) ✅ PARTIAL

**Status:** MDX components complete, layout pending

**Deliverables:**
- [x] MDX components (CalloutBox, CodeBlock, VideoEmbed, Tabs)
- [x] Database schema (analytics tables)
- [x] API layer (article tracking, feedback)
- [ ] Layout (320px + 320px)
- [ ] Left sidebar navigation
- [ ] Right sidebar widgets (Popular Articles, Email/Chat)
- [ ] 10-15 essential articles
- [ ] Basic search (Pagefind)

**Goal:** Functional help centre with email/chat support

---

### Phase 2: Contextual Help (2 weeks)

**Deliverables:**
- [ ] Contextual help widget (right sidebar)
- [ ] Inline help tooltips component
- [ ] Error contextual help system
- [ ] Page-level help metadata
- [ ] Analytics dashboard (content health)

**Goal:** Reduce support tickets by 30-40%

---

### Phase 3: Snapshot Modal (3 weeks)

**Deliverables:**
- [ ] Snapshot modal UI
- [ ] Progressive capture (minimal/standard/diagnostic)
- [ ] Screenshot capture with redaction
- [ ] Supabase storage (`support_snapshots` table)
- [ ] "Report a Problem" widget (replace email for technical issues)

**Goal:** Structured bug reporting with context

---

### Phase 4: Intelligence (4+ weeks)

**Deliverables:**
- [ ] AI search suggestions (intent detection)
- [ ] Jira ITSM integration
- [ ] AI prompt engine (bug diagnosis)
- [ ] Content health dashboard
- [ ] Auto-fix suggestions (AI-generated PRs)

**Goal:** AI-assisted support and engineering

---

## 6. Decision Log (v1.0 → v2.0 Changes)

| Decision | v1.0 | v2.0 | Rationale |
|----------|------|------|-----------|
| **Left sidebar width** | 280px | **320px** | Symmetry, prevents truncation, modern standard |
| **Support channels** | Snapshot only | **Snapshot + Email** | User flexibility, not all issues need snapshots |
| **Snapshot capture** | Always screenshot | **Progressive (user control)** | Privacy, performance, compliance |
| **Email support** | Forbidden | **Allowed (smart routing)** | Practical for account/billing questions |
| **Jira integration** | Phase 1 | **Phase 4** | Low support volume doesn't justify complexity yet |
| **Contextual help** | Mentioned, not specified | **Full system (Phase 2)** | Higher ROI than Snapshot Modal initially |
| **Implementation order** | Snapshot first | **Contextual help first** | Prevent tickets before adding reporting tools |

---

## 7. Success Metrics

### Phase 1 (Foundation)
- 80%+ of users find answers in help centre
- Average time to find article: <2 minutes
- Helpfulness score: >70% for top 20 articles

### Phase 2 (Contextual Help)
- Support tickets reduced by 30-40%
- Tooltip click-through rate: >15%
- Contextual help views: >50% of article views

### Phase 3 (Snapshot Modal)
- 70%+ of technical issues reported via Snapshot Modal
- Screenshot capture success rate: >95%
- Redaction accuracy: 100% (no sensitive data leaked)

### Phase 4 (Intelligence)
- AI diagnosis accuracy: >80%
- Content health score: >85%
- Auto-fix success rate: >60%

---

## 8. Technical Stack (Final)

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Content:** MDX (@next/mdx)
- **Styling:** CSS Modules
- **State:** React Query (TanStack Query)
- **Search:** Pagefind (static)
- **Screenshots:** html2canvas
- **Live Chat:** Crisp

### Backend
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (screenshots)
- **Analytics:** Custom (Supabase tables)
- **AI:** Claude API (Anthropic)
- **Ticketing:** Jira ITSM (Phase 4)

### DevOps
- **Deployment:** Vercel
- **Monitoring:** Sentry
- **Analytics:** Mixpanel / PostHog

---

## 9. Next Steps

**Immediate (This Week):**
1. Complete Phase 1 layout components
2. Build left sidebar navigation (320px)
3. Build right sidebar widgets (Popular Articles, Email/Chat)
4. Write 5 essential articles (top user questions)

**Short-term (Next 2 Weeks):**
1. Implement search (Pagefind)
2. Add analytics tracking
3. Create 15-20 more articles
4. Begin Phase 2 (contextual help)

**Long-term (Month 2-3):**
1. Complete Phase 2 (contextual help system)
2. Build Snapshot Modal (Phase 3)
3. Gather feedback and iterate

---

## Appendices

### Appendix A: Article Categories

```
Getting Started (4 articles)
├─ For Tutors
├─ For Students
├─ For Agents
└─ Platform Overview

Features (20 articles)
├─ Bookings (5)
├─ Payments (4)
├─ Referrals (3)
├─ Listings (4)
└─ Reviews (4)

Account (10 articles)
├─ Profile Setup
├─ Security
├─ Notifications
└─ Privacy

Billing (8 articles)
├─ How to Get Paid
├─ Stripe Setup
├─ Pricing
└─ Refunds

Troubleshooting (15 articles)
├─ Common Issues
├─ Payment Failures
├─ Login Problems
└─ Performance Issues
```

### Appendix B: Support Channel Routing Matrix

| Issue Type | Snapshot Modal | Email/Chat | Live Chat | Status |
|------------|---------------|------------|-----------|--------|
| UI bug | ✅ Primary | Fallback | - | Phase 3 |
| Payment error | ✅ Primary | Fallback | If urgent | Phase 3 |
| How-to question | - | ✅ Primary | If urgent | Phase 1 |
| Account change | - | ✅ Primary | If urgent | Phase 1 |
| Billing question | - | ✅ Primary | - | Phase 1 |
| Policy question | - | ✅ Primary | - | Phase 1 |
| Feature request | ✅ Standard | Email | - | Phase 3 |
| System outage | Check status | Email | ✅ Primary | Phase 2 |

---

**Document Control:**
- Version: 2.0
- Last Updated: 2025-01-19
- Next Review: After Phase 2 completion
- Owner: Engineering Team
- Status: Authoritative

**Changes from v1.0:** See Section 6 (Decision Log)
