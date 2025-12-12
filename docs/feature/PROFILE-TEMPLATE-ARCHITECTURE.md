# Profile Professional Info: Template Architecture

**Decision Date:** October 5, 2025
**Status:** ✅ Approved
**Related Spec:** [updated-profile-management-specification.md](./updated-profile-management-specification.md)

---

## The Decision

**Professional Info tab = Editable Template for Creating Listings**

### What It Is

`role_details` in the profiles table serves as a **reusable template** that users can:

1. ✅ **Edit anytime** in Account > Professional Info
2. ✅ **Duplicate to create new listings** via "Use Template" button
3. ✅ **Keep updated** as they gain qualifications/experience
4. ❌ **NOT displayed publicly** (listings are the public-facing content)

### Why This Works

**Clear Mental Model:**
- Users understand "templates" from other platforms
- "Duplicate" is explicit (vs implicit pre-fill)
- Editing template won't accidentally change published listings

**Flexibility:**
- Template evolves with user (new certs, subjects, experience)
- Multiple specialized listings from one base template
- Example: Create "GCSE Maths" listing, then "A-Level Maths" listing, both from same template

**Data Integrity:**
- Template and listings are **fully decoupled**
- No foreign keys, no cascading updates
- Each listing is independent once published

---

## User Flows

### Flow 1: Onboarding → Template Created
```
1. User completes onboarding wizard
2. Data saved to profiles.role_details (template)
3. Prompt: "✅ Template saved! Create your first listing from it?"
4. If yes → Go to Create Listing (template pre-filled)
```

### Flow 2: Edit Template (Anytime)
```
1. User → Account > Professional Info
2. Sees current template:
   - Subjects: [Maths, Physics]
   - Rate range: £40-50
   - Qualifications: [BSc Oxford]
3. User adds:
   - New subject: Chemistry
   - New cert: QTS
4. Saves → "✅ Template saved. Changes won't affect existing listings."
```

### Flow 3: Create Listing from Template
```
1. User → Dashboard → "Create New Listing"
2. Sees options:
   [Use Professional Info Template] ← Primary CTA
   [Start From Scratch]
3. Clicks "Use Template"
4. Form pre-filled with:
   - Subjects: [Maths, Physics, Chemistry] ← includes new addition
   - Qualifications: [BSc Oxford, QTS] ← includes new cert
5. User customizes for THIS listing:
   - Title: "Expert GCSE Chemistry Tutor"
   - Removes Maths/Physics (this listing is Chemistry-only)
   - Sets specific rate: £45/hr
   - Sets specific availability
6. Publishes → New independent listing created
7. Template unchanged (still has all 3 subjects for future use)
```

---

## Database Architecture

### MVP (Phase 0): Single Template

```sql
-- Template stored in existing table
profiles.role_details JSONB -- One template per user

-- Listings are independent
CREATE TABLE listings (
  listing_id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),

  -- Template data COPIED at creation
  subjects TEXT[],
  levels TEXT[],
  qualifications JSONB,

  created_from_template BOOLEAN DEFAULT false,
  -- NO foreign key to role_details (decoupled)
);
```

**Why decoupled?**
- Editing template doesn't trigger updates to listings
- Listings are immutable once published (except via explicit edit)
- Template is just a convenience tool, not a source of truth for listings

### Phase 1 Enhancement: Multiple Templates

```sql
-- For power users with multiple specializations
CREATE TABLE listing_templates (
  template_id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT, -- "Piano Tutor", "Music Theory", etc.
  template_data JSONB,
  is_default BOOLEAN
);
```

**Not needed for MVP.** Single template in `role_details` sufficient for 95% of users.

---

## API Endpoints

```typescript
// Get template for creating listing
POST /api/listings/create-from-template
{
  listing_type: 'tutor_service',
  use_template: true
}

Response:
{
  template_data: { ...role_details },
  listing_id: null, // new listing
  can_customize: true
}

// Edit template
PATCH /api/account/professional-info
{
  role: 'tutor',
  details: { ...updated_template_data }
}

Response:
{
  success: true,
  message: "Template saved. Changes won't affect existing listings."
}
```

---

## Implementation Checklist

### Phase 0 (MVP - Weeks 1-8)

- [ ] **Account > Professional Info Page**
  - [ ] Read from `role_details`
  - [ ] Allow editing (role-specific forms)
  - [ ] On save: Update `role_details` + show success message
  - [ ] Show note: "This template helps you create listings faster"

- [ ] **Create Listing Flow**
  - [ ] Show two options: [Use Template] / [Start Fresh]
  - [ ] If template: Pre-fill form with `role_details` data
  - [ ] User customizes
  - [ ] Save as new listing with `created_from_template: true`

- [ ] **Post-Onboarding**
  - [ ] Show prompt: "Template saved! Create first listing?"
  - [ ] Button links to Create Listing with template

- [ ] **Database**
  - [ ] Add `created_from_template` column to listings table
  - [ ] Ensure no foreign keys between `role_details` and listings

### Phase 1 (Weeks 8-16) - Optional Enhancement

- [ ] **Multiple Templates (if user feedback shows need)**
  - [ ] Create `listing_templates` table
  - [ ] Template selector: "Which template to use?"
  - [ ] Allow naming templates: "Piano", "Guitar", "Music Theory"

---

## Key Principles

1. **Template ≠ Profile**
   - Template is a private tool for user convenience
   - Public profile shows only identity + trust
   - Listings are the public-facing professional content

2. **Decoupled by Design**
   - Template changes don't cascade to listings
   - Listings are independent once created
   - No foreign keys, no implicit updates

3. **Flexibility > Automation**
   - User chooses to use template (not forced)
   - User can customize every field (template is starting point)
   - User can ignore template entirely (Start Fresh option)

4. **Progressive Enhancement**
   - MVP: Single template (simple, covers 95% of cases)
   - Phase 1: Multiple templates (power users)
   - Phase 2: AI-suggested templates (future)

---

## Decision Rationale

### Options Considered

**Option A: Pre-fill Only (No Template Tab)**
- ❌ Users can't update baseline info
- ❌ Onboarding data becomes stale
- ❌ Must re-enter same info for each listing

**Option B: Template as One-Time Seed**
- ❌ After first listing, template is archived
- ❌ Users lose ability to maintain baseline
- ❌ Doesn't support evolving professional info

**Option C: Editable Template + Duplicate** ✅ CHOSEN
- ✅ Users can evolve template over time
- ✅ Fast listing creation via duplication
- ✅ Explicit user control (no implicit updates)
- ✅ Scales to multiple listings easily

### Why Option C Won

1. **User Mental Model:** "Templates" are universally understood
2. **Flexibility:** Supports both novice and power users
3. **Data Integrity:** Decoupling prevents accidental changes
4. **Future-Proof:** Easy to add multi-template support later

---

## References

- Full specification: [updated-profile-management-specification.md](./updated-profile-management-specification.md)
- Listing management: [updated-listing-management-specification.md](./updated-listing-management-specification.md)
- Implementation plan: [IMPLEMENTATION-ACTION-PLAN.md](./IMPLEMENTATION-ACTION-PLAN.md)

---

**Approved by:** User
**Ready for:** Implementation (Phase 0 - MVP)
