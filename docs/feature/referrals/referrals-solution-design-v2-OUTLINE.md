# Referrals Solution Design v2 - OUTLINE

**Version**: v5.0 (Patent-Aligned Documentation)
**Date**: 2025-12-16 (OUTLINE ONLY - Complete after patent filing)
**Status**: DRAFT OUTLINE - Fill sections after patent amendments finalized
**Owner**: Growth Team
**Patent**: UK Provisional Application (Amendments Filed 2026-01-XX)

---

## PURPOSE OF THIS OUTLINE

This is a **TEMPLATE STRUCTURE** for the full Solution Design v2 document.

**DO NOT FILL SECTIONS YET** - Wait until:
1. Patent amendments reviewed by attorney
2. Patent amendments finalized
3. Patent language becomes "source of truth"

Then fill this outline using EXACT patent terminology for consistency.

---

## HEADER STRUCTURE (Use Patent Language)

```markdown
# Referrals Solution Design

**Status**: ✅ Active (v5.0 - Commission Delegation + Hierarchical Attribution)
**Last Updated**: [DATE AFTER PATENT FILING]
**Last Code Update**: 2025-11-28
**Priority**: Critical (Tier 1 - Core Growth Infrastructure)
**Architecture**: Persistent Multi-Role Attribution + Offline Partnership Model
**Business Model**: Lifetime revenue share with conditional delegation
**Patent**: UK Provisional Application [APPLICATION NUMBER] (Filed [DATE])

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-XX-XX | v5.0 docs | **Documentation v2**: Patent-aligned, added delegation mechanism |
| 2025-11-28 | v4.3 | Commission Delegation (listings.delegate_commission_to_profile_id) |
| 2025-11-07 | v3.6 | Secure referral codes (7-char alphanumeric) |
| 2025-10-09 | v1.0 | Initial referral system (basic cookie tracking) |
```

---

## SECTION 1: Patent Status & Implementation Alignment

### TO BE FILLED WITH:

**Patent Claims vs Implementation Matrix:**

| Patent Element | Claim # | Implementation Status | Evidence | Code Reference |
|----------------|---------|----------------------|----------|----------------|
| Unique Referral Identifier Generation | 1(a) | ✅ IMPLEMENTED | profiles.referral_code | Migration 035 |
| Metadata Capture (URL, Cookie, Manual) | 1(b) | 🚧 PARTIAL (cookie basic, no HMAC) | /a/[code]/route.ts | Line 81 |
| Hierarchical Attribution Resolution | 1(c) | 📋 PLANNED (Q1 2026) | handle_new_user() | Migration XXX (pending) |
| Identity-Level Persistent Binding | 1(d) | ✅ **IMPLEMENTED (CORE PATENT)** | profiles.referred_by_profile_id | Migration 090, Line 113 |
| Multi-Role Architecture | 1(e) | ✅ IMPLEMENTED | profiles.roles array | Migration XXX |
| Supply-Side Agent Acquisition | 1(f) | ✅ IMPLEMENTED | Tutor referrals monetized | process_booking_payment RPC |
| **Commission Delegation Mechanism** | **Dep Claim 9** | ✅ **IMPLEMENTED (CORE NOVELTY)** | listings.delegate_commission_to_profile_id | Migration 034 |
| Commission Ledger | 1(g) | ✅ IMPLEMENTED | transactions table | Financials system |
| QR Code Attribution | Dep Claim 4 | 📋 PLANNED (Q2 2026) | Not implemented | N/A |
| Demand-Side Agent Acquisition | 1(f) note | ⚠️ ARCHITECTURE ONLY (not monetized) | Client referrals tracked but no commission | N/A |

**Implementation Completeness:**
- ✅ **Core Patent Elements**: 6/8 (75%) - Strong
- 📋 **Future Enhancements**: 2/8 (QR generation, demand-side monetization)
- **Patent Filing Status**: Amendments submitted [DATE], full application [DATE]

---

## SECTION 2: Executive Summary

### TO BE FILLED WITH (Mirror Patent Abstract):

> [Copy exact wording from Patent Amendment Package, Section: Amended Abstract]
>
> The referrals system implements a **persistent multi-role referral attribution**
> architecture with **conditional commission delegation** enabling offline partnership
> models while preserving lifetime attribution rights...

**Business Impact:**
- [Metrics: referral conversion rate, revenue from referrals, partnership count]

**Novel Elements (Patent-Protected):**
- Identity-level persistent binding (Claim 1d)
- Multi-role simultaneous support (Claim 1e)
- **Conditional commission delegation (Dependent Claim 9)** ← STRONGEST NOVELTY
- Offline-online attribution bridge (QR codes)

---

## SECTION 3: Commission Delegation Mechanism (CORE NOVELTY)

### TO BE FILLED WITH (Mirror Patent Section 7):

**Patent Reference:** Section 7, Dependent Claim 9

#### 3.1 Overview
[Copy from Patent Section 7.1]

#### 3.2 Technical Problem Statement
[Copy from Patent Section 7.2]

#### 3.3 Delegation Configuration
[Copy from Patent Section 7.3, add implementation details]

**Database Implementation:**
```sql
-- FROM PATENT SECTION 7.3
ALTER TABLE listings
ADD COLUMN delegate_commission_to_profile_id UUID REFERENCES profiles(id);

-- Migration 034 (actual implementation)
COMMENT ON COLUMN listings.delegate_commission_to_profile_id IS
'[Patent Section 7] Enables conditional commission delegation...';
```

#### 3.4 Conditional Delegation Logic
[Copy from Patent Section 7.4, add actual RPC code]

**Decision Tree (Patent Section 7.4):**
[Copy pseudocode from patent]

**Actual Implementation (process_booking_payment RPC):**
```sql
-- TODO: Add actual RPC code with patent comments
```

#### 3.5 Use Cases (Patent Examples)

**Use Case 1: Coffee Shop Partnership** (Patent Section 7.5, Example 1)
[Copy from patent, add screenshots/diagrams]

**Use Case 2: Third-Party Agent Protection** (Patent Section 7.5, Example 2)
[Copy from patent]

**Use Case 3: Organic Discovery** (Patent Section 7.5, Example 3)
[Copy from patent]

#### 3.6 Prior Art Distinction
[Copy from Patent Section 7.10 - why no other system has this]

---

## SECTION 4: Attribution Resolution (Hierarchical Fallback)

### TO BE FILLED WITH (Mirror Patent Section 3):

**Patent Reference:** Section 3, Dependent Claim 2

#### 4.1 Priority Order
1. URL Parameter (Patent Section 3.1)
2. First-Party Cookie (Patent Section 3.2)
3. Manual Code Entry (Patent Section 3.3)

[For each priority: Copy patent explanation, add implementation code]

#### 4.2 Current Implementation Status

**As of [DATE]:**
- ✅ Manual code entry: WORKING
- 🚧 Cookie fallback: PARTIAL (basic cookie, no HMAC signature)
- 📋 URL parameter: PLANNED
- ❌ HMAC signature: NOT IMPLEMENTED

**Roadmap:**
- Q1 2026: Implement hierarchical fallback (Migration XXX)
- Q1 2026: Add HMAC cookie signature (security enhancement)
- Q2 2026: Add audit logging (attribution_method tracking)

---

## SECTION 5: Commission Calculation & Distribution

### TO BE FILLED WITH (Mirror Patent Section 8):

**Patent Reference:** Section 8

#### 5.1 Commission Split Methodology
[Copy from Patent Section 8.1 - worked example with £100 booking]

#### 5.2 Commission Types
[Copy from Patent Section 8.2 - supply-side, demand-side (future), delegated partner]

#### 5.3 Commission Lifecycle
[Copy from Patent Section 8.3 - pending → available → scheduled → paid_out]

#### 5.4 Integration with Financials System
[Reference financials-solution-design-v2.md for RPC implementation]

---

## SECTION 6: Database Schema (Patent Section 4A)

### TO BE FILLED WITH (Mirror Patent Section 4A):

#### 6.1 Profiles Table (Identity & Attribution)
[Copy from Patent Section 4A.1]

#### 6.2 Referrals Table (Tracking & Analytics)
[Copy from Patent Section 4A.2]

#### 6.3 Listings Table (Delegation Configuration)
[Copy from Patent Section 4A.3 - CRITICAL for Dependent Claim 9]

#### 6.4 Transactions Table (Commission Ledger)
[Copy from Patent Section 4A.5]

---

## SECTION 7: API Endpoints & Components

### TO BE FILLED WITH:

#### 7.1 Referral Link Handler
**File:** `/app/a/[referral_id]/route.ts`
**Patent Reference:** Section 2.1 (URL Parameter Storage)

```typescript
// TODO: Add patent comments to actual code
/**
 * Patent Section 2.1: URL Parameter Storage
 * Implements encoded link capture and cookie setting
 */
```

#### 7.2 Signup Attribution
**File:** `handle_new_user()` trigger (Migration 090)
**Patent Reference:** Section 3 (Attribution Resolution Module)

#### 7.3 Commission Distribution
**File:** `process_booking_payment()` RPC
**Patent Reference:** Section 7.4 (Delegation Logic), Section 8 (Commission Calculation)

---

## SECTION 8: Testing Strategy

### TO BE FILLED WITH:

#### 8.1 Patent Compliance Tests

```typescript
describe('Patent Compliance: Identity-Level Binding (Claim 1d)', () => {
  it('should permanently bind referrer at profile creation', async () => {
    // Test lifetime attribution
  });
});

describe('Patent Compliance: Commission Delegation (Dependent Claim 9)', () => {
  it('should pay delegated partner when tutor is direct referrer', async () => {
    // Test delegation applies (Patent Section 7.5, Example 1)
  });

  it('should pay original agent when third party brings client', async () => {
    // Test delegation ignored (Patent Section 7.5, Example 2)
  });
});
```

---

## SECTION 9: Analytics & Performance

### TO BE FILLED WITH:

#### 9.1 Referral Pipeline Metrics
- Clicked → Signed Up → Converted (Patent Section 4A.2: referrals.status)

#### 9.2 Delegation Performance
- % bookings via delegation (new metric specific to Dependent Claim 9)
- Partner ROI (coffee shops, schools)

---

## SECTION 10: Future Enhancements (Post-Patent)

### TO BE FILLED WITH:

#### 10.1 QR Code Generation API (Dependent Claim 4)
**Timeline:** Q2 2026
**Patent Reference:** Section 2.4

#### 10.2 Demand-Side Agent Monetization (Claim 1f Extension)
**Timeline:** TBD
**Patent Reference:** Section 8.2 (noted as future enhancement)

#### 10.3 HMAC Cookie Signature (Security Enhancement)
**Timeline:** Q1 2026
**Patent Reference:** Section 2.2 (optional enhancement)

---

## INSTRUCTIONS FOR COMPLETING THIS OUTLINE

### Step 1: Wait for Patent Finalization
- ✅ Patent amendments reviewed by attorney
- ✅ Attorney feedback incorporated
- ✅ Final patent language approved

### Step 2: Extract Patent Language
For each section marked "TO BE FILLED WITH":
1. Open Patent Amendment Package (PATENT-AMENDMENTS-v2.md)
2. Find corresponding section (references provided)
3. Copy EXACT wording from patent
4. Add implementation details (code, screenshots, diagrams)

### Step 3: Add Implementation Evidence
For each "✅ IMPLEMENTED" element:
1. Add code snippet from actual implementation
2. Add migration reference
3. Add line numbers for traceability
4. Add comments linking to patent section

**Example:**
```sql
-- Patent Section 7.3: Delegation Configuration
-- Dependent Claim 9(a): "service providers may configure a delegation target identifier"
ALTER TABLE listings
ADD COLUMN delegate_commission_to_profile_id UUID REFERENCES profiles(id);
```

### Step 4: Add Status Badges
Use these badges consistently:
- ✅ **IMPLEMENTED** - Fully working, matches patent spec
- 🚧 **IN PROGRESS** - Partially working, planned completion in [date]
- 📋 **PLANNED** - Not yet started, roadmap item for [date]
- ⚠️ **ARCHITECTURE ONLY** - Supported but not monetized/activated

### Step 5: Cross-Reference Validation
After completing all sections:
1. Create terminology glossary
2. Ensure patent terms match solution design terms EXACTLY
3. Validate all claim references are correct
4. Check all code examples are accurate

---

## TERMINOLOGY MAPPING (Patent ↔ Implementation)

TO BE COMPLETED:

| Patent Term | Solution Design Term | Code Identifier | Status |
|-------------|---------------------|-----------------|--------|
| "referral code" | "referral code" | `referral_code` | ✅ Match |
| "lifetime attribution" | "persistent identity-level binding" | `referred_by_profile_id` | ✅ Match |
| "delegation target identifier" | "delegated partner profile ID" | `delegate_commission_to_profile_id` | ⚠️ Align wording |
| "commission ledger" | "transactions table" | `transactions` | ✅ Match |
| "attribution resolution module" | "hierarchical fallback logic" | `handle_new_user()` | ✅ Match |
| "supply-side agent" | "tutor referrer / agent" | `agent_profile_id` | ✅ Match |

---

## COMPLETION CHECKLIST

Before finalizing Solution Design v2:

- [ ] Patent amendments filed and attorney-approved
- [ ] All "TO BE FILLED WITH" sections completed
- [ ] All patent references validated (Section X.Y format)
- [ ] All code examples tested and accurate
- [ ] All status badges applied consistently
- [ ] Terminology mapping 100% aligned with patent
- [ ] Cross-references validated (patent ↔ solution design ↔ code)
- [ ] Implementation status percentages calculated
- [ ] Diagrams created (system architecture, delegation flow, attribution resolution)
- [ ] Testing strategy includes patent compliance tests
- [ ] Future enhancements section references patent claims

---

**Status:** OUTLINE COMPLETE - Ready for Section Filling (Post-Patent Approval)
**Estimated Completion Time:** 2-3 days after patent finalized
**Next Steps:**
1. Wait for patent attorney review
2. Incorporate attorney feedback into patent
3. Use finalized patent language to complete this outline
4. Validate 100% terminology alignment
5. Publish Solution Design v2

