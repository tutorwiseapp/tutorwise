# Listing Templates Implementation Summary

## Overview

Implemented a **personalized listing template system** that automatically generates 4 service listing templates for new tutors after they complete onboarding. Templates are displayed at the top of the "My Listings" page with a purple "Template" badge and cannot be deleted.

---

## What Was Built

### 1. JSON Template Definitions
**File:** `apps/web/src/lib/data/listingTemplates.json`

Four professionally-designed templates:
1. **Mathematics GCSE Group Session** - £20/session, group learning, Tuesday/Thursday evenings
2. **English GCSE One-on-One Session** - £35/hr, personalized tutoring, weekday evenings
3. **AI Tutor Study Support** - £10/session, on-demand 24/7, multi-subject
4. **Science Tutor Referral Programme** - £40/hr, referral-based, Biology/Chemistry/Physics

Each template includes:
- Realistic sample data
- Learning outcomes (3-4 bullet points)
- Session duration and type
- Pricing and currency
- Schedule/availability
- Location/mode (online, hybrid, in-person)
- Teaching methods and specializations
- SEO-friendly tags

### 2. Database Schema Changes
**Migration:** `apps/api/migrations/023_add_listing_template_fields.sql`

Added 3 new columns to the `listings` table:
- `is_template` (boolean) - Marks system-generated templates
- `is_deletable` (boolean) - Controls whether listing can be deleted
- `template_id` (varchar) - Unique identifier (e.g., "mathematics-gcse-group")

Updated RLS policy to prevent deletion of non-deletable listings.

**Status:** ⚠️ **MANUAL STEP REQUIRED** - Apply migration via Supabase SQL Editor:
```sql
-- Copy contents of apps/api/migrations/023_add_listing_template_fields.sql
-- Paste into Supabase SQL Editor and run
```

### 3. Template Generation System
**File:** `apps/web/src/lib/utils/templateGenerator.ts`

Exports 3 main functions:

#### `generateListingTemplates(userId, tutorName)`
- Creates 4 personalized templates for a new tutor
- Replaces placeholder names with tutor's actual name
- Sets `is_template=true` and `is_deletable=false`
- Returns array of created listing IDs

#### `hasExistingTemplates(userId)`
- Checks if templates already exist
- Prevents duplicate generation

#### `duplicateTemplate(templateId, userId)`
- Creates an editable copy of a template
- Copy is deletable and not marked as template
- Adds " (Copy)" suffix to title

### 4. Onboarding Integration
**File:** `apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx`

Templates are generated automatically after:
1. ✅ Onboarding marked as completed
2. ✅ Provider role added to user
3. ✅ **NEW:** Templates generated (lines 306-327)
4. ✅ Draft cleared

Uses tutor's full name from Personal Info step or falls back to profile data.

### 5. UI Updates

#### My Listings Page (`apps/web/src/app/my-listings/page.tsx`)
- Templates sorted to top of listings
- Within each group (templates/regular), sorted by creation date

#### Listing Card (`apps/web/src/app/my-listings/ListingCard.tsx`)
**Template Badge:**
- Purple badge showing "Template"
- Displayed above status badge (draft/published)

**Action Buttons:**
- **For Templates:** Single "Duplicate" button (primary, full-width)
- **For Regular Listings:** Edit, Publish/Unpublish, Delete buttons (3-column grid)

#### Styling (`apps/web/src/app/my-listings/ListingCard.module.css`)
- Added `.badges` container for stacked badges
- Added `.templateBadge` with purple color (#8b5cf6)
- Added `.actionsTemplate` for single button layout

### 6. TypeScript Types
**File:** `apps/web/src/types/index.ts`

Updated `Listing` interface with:
```typescript
is_template?: boolean;
is_deletable?: boolean;
template_id?: string;
inquiry_count?: number;
```

---

## File Changes Summary

### Created Files
1. `apps/web/src/lib/data/listingTemplates.json` - Template definitions
2. `apps/web/src/lib/utils/templateGenerator.ts` - Generation logic
3. `apps/api/migrations/023_add_listing_template_fields.sql` - Database schema

### Modified Files
1. `apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx` - Added template generation
2. `apps/web/src/app/my-listings/page.tsx` - Sort templates first
3. `apps/web/src/app/my-listings/ListingCard.tsx` - Template badge & delete protection
4. `apps/web/src/app/my-listings/ListingCard.module.css` - Badge styling
5. `apps/web/src/types/index.ts` - Added template fields to Listing type

---

## How It Works

### User Journey
1. **User signs up** → completes Personal Info step (name collected)
2. **User completes onboarding** → selects subjects, qualifications, availability
3. **System generates templates** → 4 personalized templates created automatically
4. **User visits "My Listings"** → sees templates at top with purple "Template" badge
5. **User clicks "Duplicate"** → creates editable copy of template (instant)
6. **New listing appears** → copy added to listings (without " (Copy)" suffix, fully editable)
7. **User customizes** → can edit, publish/unpublish, or delete the copy

### Template Behavior
✅ **Templates:**
- Always displayed at the top of My Listings
- Marked with a purple "Template" badge
- Show only a "Duplicate" button (no Edit/Delete buttons)
- Personalized with tutor's actual name
- Cannot be deleted or edited directly
- Can be duplicated unlimited times

✅ **Template Copies (Duplicated Listings):**
- Created instantly when "Duplicate" is clicked
- Fully editable (all fields can be changed)
- Can be published/unpublished
- Can be deleted by user
- Appear in regular listings section (below templates)

### Data Flow
```
Signup Form (firstName, lastName)
  ↓
Auth Metadata (given_name, family_name, full_name)
  ↓
Database Trigger → Profile (first_name, last_name, full_name)
  ↓
Onboarding Personal Info Step (pre-populated)
  ↓
Onboarding Completion
  ↓
Template Generator (uses full_name)
  ↓
4 Listing Templates Created
  ↓
My Listings Page (templates sorted first)
```

---

## Next Steps

### 1. Apply Database Migration (REQUIRED)
```bash
# Open Supabase SQL Editor
# Copy contents of: apps/api/migrations/023_add_listing_template_fields.sql
# Run in SQL Editor
```

### 2. Test the Flow
```bash
# Start dev server
npm run dev

# Test steps:
1. Create new test user account
2. Complete tutor onboarding
3. Check console for: "✓ Generated 4 listing templates"
4. Visit /my-listings
5. Verify templates appear at top with purple badge
6. Try to delete template (should be disabled)
7. Click "Duplicate & Edit" (should create copy)
```

### 3. Verify Database
```bash
# Run check script
node check-listings-schema.mjs

# Should show:
# - is_template: ✅ EXISTS
# - is_deletable: ✅ EXISTS
# - template_id: ✅ EXISTS
```

---

## Design Decisions

### Why Templates Can't Be Deleted
- **User expectation:** "Templates cannot be deleted" per requirements
- **Always available:** Tutors can always reference sample listings
- **Duplicate instead:** Users create editable copies

### Why Templates Sort First
- **High visibility:** Templates immediately visible as examples
- **User experience:** Clear separation between templates and custom listings
- **Badge indication:** Purple "Template" badge makes them distinctive

### Why 4 Specific Templates
Based on your requirements:
1. **GCSE focus:** Most common UK qualification level
2. **Variety:** Group, 1-on-1, AI, Referral (different models)
3. **Realistic:** Proper pricing, schedules, learning outcomes
4. **Subject coverage:** Maths, English, Science (core subjects)

### Why JSON Instead of Database
- **Easy to update:** Change templates without migrations
- **Version control:** Track template changes in git
- **Type-safe:** Compiled with TypeScript
- **Future-proof:** Can move to database later if needed

---

## Template Examples

### Mathematics GCSE Group Session
- **Price:** £20 per student
- **Duration:** 90 minutes
- **Schedule:** Tuesday/Thursday 6-7:30pm
- **Mode:** Online via Zoom
- **Learning Outcomes:**
  - Strengthen GCSE Maths core principles
  - Improve exam technique through drills
  - Build confidence in problem-solving

### English GCSE One-on-One Session
- **Price:** £35/hour
- **Duration:** 60 minutes
- **Schedule:** Mon-Fri 4-8pm
- **Mode:** Hybrid (online or London area)
- **Learning Outcomes:**
  - Enhance reading comprehension and analysis
  - Improve essay structure and vocabulary
  - Develop exam confidence through practice

### AI Tutor Study Support
- **Price:** From £10/session
- **Duration:** Flexible (15-60 mins)
- **Schedule:** 7 days/week, on-demand
- **Mode:** Online via AI platform
- **Learning Outcomes:**
  - Quick, accurate answers to questions
  - Guided AI-generated exercises
  - Self-paced study habits

### Science Tutor Referral Programme
- **Price:** £40/hour
- **Duration:** 60 minutes
- **Schedule:** Weekdays 5-9pm, Sat 10am-2pm
- **Mode:** Hybrid (online or Central London)
- **Learning Outcomes:**
  - Deeper understanding of scientific concepts
  - Strong exam strategies and practical skills
  - Confidence in higher-level questions

---

## Future Enhancements

### Potential Improvements
1. **Dynamic templates** - Generate based on subjects selected in onboarding
2. **Template categories** - Add more templates (Primary, A-Level, Adult Learning)
3. **Customizable templates** - Let tutors edit template content (not just copy)
4. **Template analytics** - Track which templates are most duplicated
5. **Multi-language** - Templates in Welsh, Scottish Gaelic, etc.
6. **Import/Export** - Share templates between tutors

### Technical Debt
- Migration 023 needs to be applied to production
- Add E2E tests for template generation
- Add error handling for failed template generation
- Consider adding `learning_outcomes` column to listings table

---

## Testing Checklist

### Manual Testing
- [ ] Apply migration 023 to Supabase
- [ ] Create new tutor account
- [ ] Complete Personal Info step with name
- [ ] Complete full onboarding
- [ ] Check console: "✓ Generated 4 listing templates"
- [ ] Visit /my-listings
- [ ] Verify 4 templates at top with purple "Template" badge
- [ ] Verify templates show only "Duplicate" button (no Edit/Delete)
- [ ] Click "Duplicate" on one template
- [ ] Verify success toast: "Template duplicated successfully!"
- [ ] Verify copy appears below templates
- [ ] Verify copy has Edit, Publish/Unpublish, Delete buttons
- [ ] Edit the copy - verify it works
- [ ] Publish the copy - verify it works
- [ ] Delete the copy - verify it works
- [ ] Try duplicating same template again - verify multiple copies allowed

### Database Verification
- [ ] Check `is_template` column exists
- [ ] Check `is_deletable` column exists
- [ ] Check `template_id` column exists
- [ ] Verify RLS policy prevents deleting templates
- [ ] Check 4 templates exist for test user
- [ ] Verify template_ids are unique

---

## Known Limitations

1. **Manual migration required** - Migration 023 must be applied via SQL Editor
2. **No template deletion** - Even tutors cannot delete their own templates (by design)
3. **Fixed templates** - All tutors get same 4 templates (could be personalized more)
4. **UK-centric** - Templates assume UK education system (GCSE, A-Level)
5. **English only** - Templates only in English

---

## Support

### If Templates Don't Generate
Check console logs for:
- `[TutorOnboardingWizard] Generating listing templates...`
- `[TemplateGenerator] Creating template: Mathematics GCSE Group Session`
- `[TutorOnboardingWizard] ✓ Generated 4 listing templates`

Common issues:
- Migration 023 not applied → templates fail to save
- User already has templates → generation skipped
- Missing first_name/last_name → falls back to "Tutor"

### If Templates Don't Show
Check:
- Migration 023 applied?
- Listings API returns `is_template` field?
- Browser console for TypeScript errors?
- Sort logic in `loadListings()`?

---

## Summary

✅ **Completed:**
- JSON template definitions created
- Database schema designed (migration ready)
- Template generation function implemented
- Onboarding integration complete
- UI updates with badge and delete protection
- TypeScript types updated

⚠️ **Pending:**
- Apply migration 023 to Supabase (MANUAL STEP)
- Test complete flow end-to-end
- Deploy to production

🎯 **Result:**
New tutors automatically get 4 personalized, professional listing templates that serve as examples and can be duplicated for customization. Templates are prominently displayed, clearly marked, and cannot be accidentally deleted.

---

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
