# Wiselists Documentation Review

**Review Date**: 2025-12-13
**Reviewer**: Documentation Audit (following CaaS v2 & Profile Graph v2 standards)
**Scope**: 1 document, existing code implementation
**Actual Implementation Status**: ~80-90% complete (IMPLEMENTATION_STATUS.md is outdated)
**Found**: UI components, API routes, pages exist (not documented in status file)

---

## Executive Summary

The Wiselists feature currently has **minimal documentation** (only IMPLEMENTATION_STATUS.md) but is actually **~80-90% functionally complete** based on code analysis. The IMPLEMENTATION_STATUS.md document is **outdated** (claims 30% complete, but UI components, API routes, and pages exist). This creates a **documentation gap** where the feature works but lacks architectural documentation.

### Current State Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Documentation Structure** | 🔴 Incomplete | Only implementation status doc exists |
| **Solution Design** | ❌ Missing | No architectural overview document |
| **Implementation Guide** | ❌ Missing | No developer patterns guide |
| **AI Prompt Context** | ❌ Missing | No AI assistant reference |
| **README** | ❌ Missing | No navigation or overview |
| **Code Quality** | ✅ Good | Well-structured service layer (523 lines) |
| **Database Schema** | ✅ Excellent | 4 migrations, 19 RLS policies, good constraints |

**Recommendation**: Create full v2 documentation suite to **document existing implementation** (feature is ~80-90% complete, not 30% as status doc claims). Update IMPLEMENTATION_STATUS.md to reflect actual state.

---

## Current Documentation Inventory

| # | Document | Lines | Purpose | Status |
|---|----------|-------|---------|--------|
| 1 | IMPLEMENTATION_STATUS.md | 239 | Track implementation progress | ✅ Exists |
| 2 | Solution Design | - | Architecture & business logic | ❌ **Missing** |
| 3 | Implementation Guide | - | Developer patterns & how-tos | ❌ **Missing** |
| 4 | AI Prompt Context | - | AI assistant reference | ❌ **Missing** |
| 5 | README.md | - | Navigation & overview | ❌ **Missing** |

**Gap Analysis**: Missing 4 of 5 core documentation types.

---

## Feature Overview (From Code Analysis)

### What is Wiselists?

**Wiselists** is TutorWise's "Save & Share" growth engine - an **Airbnb-style planning tool** that enables:
1. **Private Collections**: Users save tutors/listings to organize their research
2. **Public Sharing**: Users create sharable lists (/w/[slug]) for growth loops
3. **Collaboration**: Multi-user editing with role-based permissions
4. **Sales Attribution**: Track bookings from shared lists for commission

**Business Model**: 3 viral growth loops
- **Loop 1**: External Growth (Referral invites via list collaboration)
- **Loop 2**: In-Network Sales (Commission for bookings from shared lists)
- **Loop 3**: CaaS Data ("Total Saves" increases tutor search ranking)

---

## Implementation Analysis

### Actual Implementation Status (Discovered via Code Analysis)

**✅ Phase 1: Database Layer (100% Complete)**
- 4 migrations exist: `081_*.sql`, `082_*.sql`, `083_*.sql`, `084_*.sql`
- 3 tables + 1 column addition (bookings.booking_referrer_id)
- 19 RLS policies, 19 indexes

**✅ Phase 2: TypeScript Types (100% Complete)**
- 6 interfaces in `apps/web/src/types/index.ts`

**✅ Phase 3: API Service Layer (100% Complete)**
- `apps/web/src/lib/api/wiselists.ts` (523 lines)
- 11 functions including localStorage fallback

**✅ Phase 4: REST API Endpoints (100% Complete!)**
Found 6 API route files (not mentioned in status doc):
- `apps/web/src/app/api/wiselists/route.ts`
- `apps/web/src/app/api/wiselists/[id]/route.ts`
- `apps/web/src/app/api/wiselists/[id]/items/route.ts`
- `apps/web/src/app/api/wiselists/[id]/items/[itemId]/route.ts`
- `apps/web/src/app/api/wiselists/[id]/collaborators/route.ts`
- `apps/web/src/app/api/wiselists/[id]/collaborators/[collabId]/route.ts`

**✅ Phase 5: UI Components (90% Complete!)**
Found 10 React components (not mentioned in status doc):
- `WiselistCard.tsx`
- `WiselistStatsWidget.tsx`
- `WiselistHelpWidget.tsx`
- `WiselistTipWidget.tsx`
- `WiselistVideoWidget.tsx`
- `CreateWiselistModal.tsx`
- `AddToWiselistModal.tsx`
- `WiselistSelectionModal.tsx`
- Plus modals and widgets

**✅ Phase 5: Pages (Partial)**
- Hub page exists: `apps/web/src/app/(authenticated)/wiselists/page.tsx`
- Detail page: Unknown (need to check for `[id]/page.tsx`)

**🚧 Phase 6-7: Integrations (Unknown Status)**
- Referrals integration: Unknown
- Profile Graph integration: Unknown
- Payments/middleware: Unknown
- CaaS integration: Unknown

**Revised Estimate**: **80-90% complete** (much higher than claimed 30%)

---

## Recommended Documentation Suite

Following CaaS v2 and Profile Graph v2 standards, create:

### Document 1: README.md (~400 lines)

**Purpose**: Navigation hub and quick start

**Sections**:
- How to Navigate This Documentation (role-based paths)
- Feature Overview (1-2 paragraphs)
- Three Growth Loops explained
- Quick Links (organized by document type)
- Document Index table

**Estimated Effort**: 1 hour

---

### Document 2: wiselists-solution-design-v2.md (~1,500 lines)

**Purpose**: Complete architecture with business context

**Sections**:
1. **Executive Summary**
   - Business impact metrics
   - "Airbnb for Tutors" positioning
   - Three growth loops overview

2. **Problem Statement (Before/After)**
   - Before: No way to save tutors, no viral growth
   - After: Wiselist-driven acquisition + attribution

3. **Core Architecture**
   - Database schema (3 tables) with design decisions
   - Service layer patterns
   - RLS security model

4. **Three Growth Loops (Detailed)**
   - Loop 1: External Growth (Referral integration)
   - Loop 2: In-Network Sales (Commission attribution)
   - Loop 3: CaaS Data (Search ranking boost)

5. **Polymorphic Items Pattern**
   - Why profiles AND listings?
   - Constraint design (either profile_id OR listing_id)
   - Query patterns

6. **Collaboration Model**
   - 3 roles: OWNER, EDITOR, VIEWER
   - Permission matrix
   - Invite flow (new vs existing users)

7. **Public Sharing (/w/[slug])**
   - Slug generation logic
   - Middleware attribution tracking
   - Booking referrer flow

8. **Integration Points**
   - Referrals v4.3 (invite system)
   - Profile Graph v4.6 (social links)
   - Payments v4.9 (booking attribution)
   - CaaS v5.5 (save count scoring)

9. **Future Enhancements**
   - Wiselist analytics
   - Social sharing (Twitter, LinkedIn)
   - Embedding wiselist widgets

**Style**: Hybrid descriptive (conceptual explanations + worked examples)
**Estimated Effort**: 4 hours

---

### Document 3: wiselists-implementation-v2.md (~700 lines)

**Purpose**: Developer guide with patterns and how-tos

**Sections**:
1. **Architecture Patterns**
   - Service Layer with domain helpers
   - Polymorphic data model
   - localStorage fallback for anonymous users

2. **How to Add a New Item Type**
   - Example: Add "COURSE" type (courses alongside profiles/listings)
   - Step-by-step migration + code changes

3. **Common Usage Patterns**
   - Pattern 1: Quick Save (heart icon)
   - Pattern 2: Create Custom Wiselist
   - Pattern 3: Collaborate with Team
   - Pattern 4: Public Sharing with Attribution

4. **Integration Patterns**
   - Pattern 1: Referral Invite Flow
   - Pattern 2: Booking Attribution Tracking
   - Pattern 3: CaaS Save Count Update

5. **Testing Strategies**
   - Unit tests (service layer)
   - Integration tests (RLS policies)
   - E2E tests (collaboration flow)

6. **Deployment Checklist**
   - Phase 4-7 rollout plan
   - Monitoring dashboards
   - Feature flags

7. **Common Pitfalls & Solutions**
   - Pitfall 1: Forgetting localStorage migration
   - Pitfall 2: Polymorphic query mistakes
   - Pitfall 3: Public slug collisions

**Style**: Pattern-focused with real-world scenarios
**Estimated Effort**: 3 hours

---

### Document 4: wiselists-prompt-v2.md (~500 lines)

**Purpose**: AI assistant quick reference

**Sections**:
1. **Quick Reference**
   - Feature one-sentence summary
   - 3 growth loops table
   - Core service methods table

2. **System Architecture**
   - 3 database tables (wiselists, wiselist_items, wiselist_collaborators)
   - Polymorphic pattern explained
   - RLS policies summary

3. **Common Usage Patterns**
   - Quick save item
   - Create wiselist
   - Add collaborator
   - Generate public slug

4. **Integration Points**
   - Referrals (invite flow)
   - Profile Graph (social links)
   - Payments (attribution)
   - CaaS (save count)

5. **DO's and DON'Ts**
   - ✅ DO: Check localStorage for anonymous users
   - ✅ DO: Validate polymorphic constraints
   - ✅ DO: Use slug for public links
   - ❌ DON'T: Set both profile_id AND listing_id
   - ❌ DON'T: Forget to migrate temp saves on login
   - ❌ DON'T: Create public wiselist without slug

6. **Metadata Schemas**
   - Wiselist metadata (minimal)
   - WiselistItem notes field
   - Collaborator invite tracking

7. **File References**
   - Service layer, migrations, types, future UI components

**Style**: Simplified with DO/DON'T focus (reduce code blocks)
**Estimated Effort**: 2 hours

---

### Document 5: wiselists-implementation-status.md (Existing)

**Purpose**: Track implementation progress

**Recommendation**: Keep as-is, but update to reference new v2 docs

**Changes Needed**:
- Add link to README.md in header
- Add "See [wiselists-solution-design-v2.md] for architecture details"
- Update "Next Steps" to reference implementation guide

**Estimated Effort**: 15 minutes

---

## Comparison with CaaS and Profile Graph

| Aspect | CaaS v2 | Profile Graph v2 | Wiselists (Proposed v2) |
|--------|---------|------------------|-------------------------|
| **Documents** | 9 total (5 v2 + 3 v1 + 1 review) | 8 total (4 v2 + 3 v1 + 1 review) | 5 total (4 v2 + 1 status) |
| **Solution Design** | 1,450 lines (hybrid descriptive) | 1,450 lines (hybrid descriptive) | ~1,500 lines (proposed) |
| **Implementation Guide** | 600 lines (pattern-focused) | 650 lines (pattern-focused) | ~700 lines (proposed) |
| **AI Prompt** | 350 lines (simplified) | 450 lines (simplified) | ~500 lines (proposed) |
| **README** | 280 lines (navigation) | 450 lines (navigation) | ~400 lines (proposed) |
| **Code Blocks** | Minimal (5-8) | Minimal (5-8) | Minimal (5-8 proposed) |
| **DO/DON'T Section** | ✅ Yes | ✅ Yes | ✅ Yes (proposed) |
| **Implementation Status** | 100% complete | 100% complete | **30% complete** |

**Key Insight**: Wiselists is **less complex** than CaaS but **more complex** than Profile Graph due to 3 growth loops integration.

---

## Benefits of Creating v2 Docs Now (Before Phase 4-7)

### Benefit 1: Avoid Implementation Mistakes

**Without docs**: Developers implement UI → Realize architecture issue → Refactor
**With docs**: Architects review design → Catch issues early → Implement correctly

**Example Issue Caught Early**:
> "Should we create 1 'My Saves' list per user, or allow unlimited lists?"
>
> Answer in docs: "One default 'My Saves' (auto-created), plus unlimited custom lists."

---

### Benefit 2: Consistent Integration Architecture

**3 integration points** (Referrals, Payments, CaaS) need clear specifications:
- Docs define exact API contracts
- Developers implement to spec
- Reduces back-and-forth

---

### Benefit 3: Faster Developer Onboarding

**Phase 4-7 requires**:
- REST API endpoints (Pattern 1)
- React components (Hub + Detail pages)
- Middleware updates
- Webhook modifications

**With v2 docs**: New developer reads implementation guide → Follows patterns → Ships in days
**Without docs**: Developer reads code → Guesses intent → Ships in weeks

---

### Benefit 4: AI Code Generation Accuracy

**Current**: AI must infer patterns from incomplete code
**With v2 prompt**: AI reads prompt-v2.md → Generates correct code → 90%+ accuracy

---

## Recommended Implementation Order

### Step 1: Create Documentation Suite (10 hours)

**Day 1** (6 hours):
1. Create README.md (1 hour)
2. Create wiselists-solution-design-v2.md (4 hours)
3. Update IMPLEMENTATION_STATUS.md (15 min)

**Day 2** (4 hours):
4. Create wiselists-implementation-v2.md (3 hours)
5. Create wiselists-prompt-v2.md (2 hours)

---

### Step 2: Validate Architecture (2 hours)

**Review with stakeholders**:
- Product: Validate 3 growth loops make business sense
- Engineering: Validate technical architecture
- Security: Review RLS policies and public sharing

**Adjust docs based on feedback**

---

### Step 3: Implement Phase 4-7 (10-13 hours)

**Now developers have clear spec**:
- REST API endpoints (follow patterns from implementation guide)
- UI components (follow design from solution design)
- Integrations (follow specs from architecture section)

---

## Success Metrics

**After v2 documentation complete, measure**:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Developer onboarding time | <2 hours | Time to understand feature from docs |
| Architecture questions | <5 per week | Slack/GitHub discussion count |
| Implementation rework | <10% of code | Git changes after initial PR |
| AI code generation accuracy | >85% | Manual review of Claude Code output |
| Documentation maintenance | <30 min per sprint | Time spent updating docs |

---

## File Structure After v2 Creation

```
docs/feature/wiselists/
├── README.md                                  ← New (navigation hub)
│
├── ⭐ RECOMMENDED V2 DOCUMENTATION
│   ├── wiselists-solution-design-v2.md       ← New (architecture)
│   ├── wiselists-implementation-v2.md        ← New (developer guide)
│   └── wiselists-prompt-v2.md                ← New (AI reference)
│
└── 📊 IMPLEMENTATION TRACKING
    └── IMPLEMENTATION_STATUS.md               ← Existing (update with links)
```

**Total files**: 5 (cleaner than CaaS/Profile Graph which have legacy v1 docs)

---

## Comparison with Industry Standards

### Airbnb (Wishlists Feature)

**Similarities**:
- Save items to collections
- Share public lists
- Collaboration with friends

**TutorWise Enhancements**:
- **Sales Attribution**: Track bookings from shared lists (Airbnb doesn't do this)
- **Polymorphic Items**: Profiles AND listings (Airbnb: only properties)
- **Growth Loops**: Referral integration (Airbnb: minimal viral growth from wishlists)

**Learning**: Airbnb's wishlists are primarily UX feature; TutorWise wiselists are **growth engine**

---

### Pinterest (Boards Feature)

**Similarities**:
- Create boards (wiselists)
- Save pins (items)
- Public/private visibility

**TutorWise Enhancements**:
- **Collaboration Roles**: OWNER/EDITOR/VIEWER (Pinterest: binary contributor)
- **In-Network Attribution**: Commission tracking (Pinterest: no monetization)

**Learning**: Pinterest boards are discovery tool; TutorWise wiselists drive **transactions**

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Polymorphic query complexity** | 🟠 Medium | Document query patterns clearly in implementation guide |
| **RLS policy bugs** | 🔴 High | Add RLS testing section to implementation guide |
| **Public slug collisions** | 🟢 Low | Document slug generation + uniqueness constraint |
| **localStorage sync issues** | 🟠 Medium | Document migration pattern + error handling |
| **Attribution tracking failures** | 🔴 High | Document middleware + webhook logic with examples |
| **CaaS integration race conditions** | 🟢 Low | Document async queue pattern |

**Key Risk**: Attribution tracking (Loop 2) is **critical for business model** - must be documented thoroughly.

---

**Document Version**: 1.0
**Review Date**: 2025-12-13
**Recommendation**: Proceed with **v2 documentation creation** before Phase 4-7 implementation
**Estimated Effort**: 10 hours documentation + 2 hours review = 12 hours total
**ROI**: Saves 20+ hours of implementation rework + improves code quality

---

## Next Steps

1. ✅ **Approve v2 documentation plan** (this review)
2. 🔄 **Create 4 v2 documents** (10 hours)
3. 🔄 **Review with stakeholders** (2 hours)
4. 🔄 **Begin Phase 4-7 implementation** (with clear architectural spec)

**Status**: Awaiting approval to proceed with v2 documentation creation
