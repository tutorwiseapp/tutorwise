# Organisation Referral System - Terminology Guide

**Last Updated:** 2026-01-03
**Purpose:** Define standard terminology for the organisation referral system to avoid conflicts with marketplace terminology.

---

## Critical Distinction

The TutorWise platform has **two separate systems** that must maintain distinct terminology:

1. **Marketplace Lead Funnel** (B2C) - Public discovery and search
2. **Organisation Referral Pipeline** (B2B) - Member-driven conversions

---

## ✅ CORRECT Terminology - Organisation Referrals

### User-Facing (UI/Components)

| Term | Usage | Example |
|------|-------|---------|
| **Referral Pipeline** | Board name, navigation | "View Referral Pipeline" |
| **Referral Conversion Pipeline** | Analytics context | "Track referrals through the conversion pipeline" |
| **New Referrals** | First stage label | "New Referrals" column in kanban |
| **Referral Details** | Modal titles | "Referral Details" modal header |
| **Contact Name** | Person being referred | "Contact Name: John Smith" |
| **Referral Information** | Section headers | "Referral Information" card |
| **Conversion Rate** | Analytics metrics | "Referral conversion rate: 15%" |
| **Referred contacts** | Plural references | "Track all referred contacts" |

### Technical/Database

| Term | Usage | Example |
|------|-------|---------|
| `conversion_stage` | Column name | `referrals.conversion_stage` |
| `get_organisation_conversion_pipeline()` | RPC function | Database function call |
| `update_referral_conversion_stage()` | RPC function | Stage update function |
| `referral_conversion_activities` | Table name | Activity log table |
| `156_referral_conversion_flow.sql` | Migration file | Database migration |

### Conversion Stages

| Stage Key | Label | Description |
|-----------|-------|-------------|
| `referred` | **New Referrals** | Initial referral created |
| `contacted` | Contacted | Organisation contacted the referral |
| `meeting` | Meeting Set | Meeting scheduled/completed |
| `proposal` | Proposal Sent | Proposal sent to contact |
| `negotiating` | Negotiating | In negotiation phase |
| `converted` | Won | Deal closed (booking created) |
| `lost` | Lost | Opportunity lost |

---

## ❌ AVOID - Terminology Conflicts

**DO NOT USE** these terms in organisation referral context:

| ❌ Incorrect | ✅ Correct | Reason |
|-------------|-----------|---------|
| Lead Pipeline | Referral Pipeline | Conflicts with Marketplace |
| Lead Conversion | Referral Conversion | Conflicts with Marketplace |
| New Leads | New Referrals | Conflicts with Marketplace |
| Lead Details | Referral Details | Conflicts with Marketplace |
| Lead Name | Contact Name | Conflicts with Marketplace |
| Lead Information | Referral Information | Conflicts with Marketplace |
| Sales Pipeline | Conversion Pipeline | "Sales" implies cold outreach |
| Prospect | Referral | Generic, not specific enough |

---

## ✅ EXCEPTION - Marketplace Context Only

**ONLY use "Lead" terminology** in marketplace (B2C) context:

| Term | Usage | Context |
|------|-------|---------|
| **Marketplace Lead Funnel** | Analytics, reports | B2C public search/discovery |
| **Lead Generation** | Marketing features | Marketplace-specific features |
| **Lead Source** | Attribution tracking | Where marketplace leads came from |

---

## Code Examples

### ✅ Correct Usage

```typescript
// Component labels
const STAGE_CONFIG = [
  { key: 'referred', label: 'New Referrals', icon: Users },
  // ...
];

// Toast messages
toast.success(`Referral moved to ${stage.label}`);

// Modal titles
<HubDetailModal title="Referral Details" />

// Field labels
{ label: 'Contact Name', value: referral.profile?.full_name }

// Help text
<p>Track referrals through the conversion pipeline from contact to client.</p>
```

### ❌ Incorrect Usage

```typescript
// DON'T use "Lead" terminology
const STAGE_CONFIG = [
  { key: 'referred', label: 'New Leads', icon: Users }, // ❌
];

toast.success(`Lead moved to ${stage.label}`); // ❌

<HubDetailModal title="Lead Details" /> // ❌

{ label: 'Lead Name', value: referral.profile?.full_name } // ❌

<p>Track leads through the sales pipeline.</p> // ❌
```

---

## Database Schema

### Column Naming

```sql
-- ✅ Correct - Uses "conversion" terminology
ALTER TABLE public.referrals
ADD COLUMN conversion_stage TEXT DEFAULT 'referred';

-- Comment uses "referral" terminology
COMMENT ON COLUMN public.referrals.conversion_stage
IS 'Current stage in the conversion funnel';

-- ✅ Correct constraint
ADD CONSTRAINT check_conversion_stage CHECK (
  conversion_stage IN (
    'referred',      -- Initial referral created
    'contacted',     -- Organisation contacted the referral
    -- ...
  )
);
```

### Function Naming

```sql
-- ✅ Correct - Clear, conversion-focused naming
CREATE FUNCTION get_organisation_conversion_pipeline(p_organisation_id UUID)
CREATE FUNCTION update_referral_conversion_stage(p_referral_id UUID, p_new_stage TEXT)
```

---

## UI Text Guidelines

### Help Text

**✅ Correct:**
- "Track your team's referral pipeline from referrals to converted clients."
- "Track referrals through the conversion pipeline from contact to client."
- "Configure commission rates and referral program settings."

**❌ Incorrect:**
- "Track your team's lead pipeline from leads to converted clients."
- "Manage your sales pipeline and close more deals."
- "Convert leads into paying customers."

### Empty States

**✅ Correct:**
```tsx
<p>No referrals</p>
```

**❌ Incorrect:**
```tsx
<p>No leads</p>
```

### Error Messages

**✅ Correct:**
```typescript
toast.error('Failed to update referral stage');
```

**❌ Incorrect:**
```typescript
toast.error('Failed to update lead stage');
```

---

## Migration History

### 2026-01-03 - Terminology Standardization

**Files Updated:**
1. `ReferralPipeline.tsx` - 4 instances
2. `ReferralAnalyticsDashboard.tsx` - 2 instances
3. `OrganisationReferralDetailModal.tsx` - 9 instances
4. `ReferralHelpWidget.tsx` - 2 instances
5. `156_referral_conversion_flow.sql` - 4 comment instances

**Total Changes:** 21 instances of "Lead" → "Referral"

**Reason:** Eliminate terminology conflict between Marketplace Lead Funnel (B2C) and Organisation Referral Pipeline (B2B).

---

## Summary

### Quick Reference

| Context | Use This | NOT This |
|---------|----------|----------|
| Pipeline name | Referral Pipeline | Lead Pipeline |
| Stage 1 label | New Referrals | New Leads |
| Person referred | Contact, Referral | Lead, Prospect |
| Process name | Conversion Pipeline | Sales Pipeline |
| Database column | `conversion_stage` | `lead_stage` |
| **Exception:** Marketplace only | Lead Funnel | — |

---

## Enforcement

**Code Review Checklist:**
- [ ] No "Lead" terminology in organisation referral components
- [ ] No "Sales Pipeline" references (use "Conversion Pipeline")
- [ ] Stage labels use "New Referrals" not "New Leads"
- [ ] Modal titles use "Referral Details" not "Lead Details"
- [ ] Help text references "referrals" and "contacts" not "leads"
- [ ] Toast messages use "referral" not "lead"
- [ ] Comments in migrations use correct terminology

**Automated Checks:**
```bash
# Search for potential violations
grep -r "lead" apps/web/src/components/feature/organisation/referrals/ --ignore-case
grep -r "sales pipeline" apps/web/src/components/feature/organisation/referrals/ --ignore-case
```

---

**For Questions:** Contact the platform architecture team or refer to this document.
