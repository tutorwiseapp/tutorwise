# Account

**Status**: ✅ Active (v4.8 - Hub Layout + CaaS Integration)
**Last Updated**: 2025-12-15
**Last Code Update**: 2025-11-30
**Priority**: Critical (Tier 1 - Core User Profile Infrastructure)
**Architecture**: Hub Layout + Inline Editing + Role-Aware Forms
**Business Model**: Profile completeness drives marketplace trust and booking conversion

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v4.8 docs | **Documentation v2**: Created README-v2, solution-design-v2, prompt-v2 following CaaS pattern |
| 2025-11-30 | v4.8 | **Hub Layout Migration**: Migrated to HubPageLayout architecture with unified navigation |
| 2025-11-20 | v4.7 | **CaaS Integration**: Added score celebration toasts on profile updates |
| 2025-11-09 | v4.6 | **Free Help Toggle**: Added settings page with free help availability control (v5.9 bookings) |
| 2025-10-15 | v4.5 | **Professional Info Expansion**: 2000+ line tutor form with bio video, availability, verification |
| 2025-09-20 | v4.0 | **Initial Release**: Personal info, professional info, settings tabs with inline editing |

---

## Quick Links

- [Solution Design v2](./account-solution-design-v2.md) - Architecture, business context, critical design decisions
- [AI Prompt Context v2](./account-prompt-v2.md) - AI assistant constraints, patterns, gotchas
- [Implementation Guide](./account-implementation.md) - Developer guide with code examples *(v1 - needs v2 update)*

---

## Overview

The **Account** system is TutorWise's comprehensive profile and settings management infrastructure enabling users to edit personal information, professional credentials, upload verification documents, manage availability, and configure account preferences. The system serves 1000+ active users across three roles (tutor, client, agent) with role-specific form fields totaling 60+ editable attributes and sub-2-second inline editing latency.

### Why Account Matters

**For Tutors**:
- Profile completeness drives marketplace visibility (weighted by CaaS score)
- Verification documents build client trust (DBS, ID, proof of address)
- Availability management enables accurate booking slot display
- Free help toggle supports reputation building via 30-minute free sessions
- Bio video integration boosts Digital Professionalism (Bucket 5 of CaaS)

**For Clients** (Students/Parents):
- Learning goals and preferences power tutor recommendations
- Budget range filtering optimizes search results
- Special needs documentation ensures tutor capability matching
- Availability sharing enables calendar synchronization

**For Agents** (Tutor Networks):
- Agency profile transparency builds tutor recruitment trust
- Commission rate visibility sets conversion expectations
- Coverage area mapping targets geographic client matching
- Certifications showcase network quality and compliance

**For Platform**:
- Profile completeness correlates with booking conversion (45% higher for 80%+ complete profiles)
- Inline editing reduces friction (75% faster than traditional form submit patterns)
- CaaS score integration creates gamification loop driving profile quality
- Verification documents reduce fraud and support trust & safety

---

## Key Features

### Core Capabilities

**Three Tab Navigation**:
1. **Personal Info** - Name, contact, address, emergency contact with inline editing
2. **Professional Info** - Role-specific credentials (2000+ lines for tutors including bio video, qualifications, rates, availability, verification documents)
3. **Settings** - Free help toggle, password change, account deletion

**Inline Editing System**:
- Click-to-edit with 150ms auto-save delay on blur
- Keyboard navigation (Escape to cancel, Enter to save)
- Optimistic UI updates with rollback on error
- Visual feedback (focus states, loading spinners, success/error toasts)
- Field-level validation preventing invalid data

**Avatar Upload**:
- Click-to-upload 160x160px circular avatar
- Hover effect with upload overlay
- Instant preview after selection
- Supabase Storage integration
- Default fallback: `/default-avatar.png`

**Profile Completeness Tracking**:
- Progress calculation (0-100%) based on filled fields
- Weighted scoring: Avatar (20%), Bio (15%), Contact (15%), Professional (30%), Verification (20%)
- Color-coded progress bar: Red (<30%), Yellow (30-70%), Green (>70%)
- Displayed in AccountCard sidebar widget

**CaaS Score Integration** (v4.7):
- Before/after score fetching on save
- Celebration toast if score improves
- Next step guidance based on new score threshold
- Improvement description based on updated fields

**Hub Layout Architecture** (v4.8):
- Consistent UI pattern across all hub pages (Account, Bookings, Reviews, etc.)
- Fixed tabbed navigation with active state
- Responsive sidebar with 4 widgets (AccountCard, Help, Tip, Video)
- Mobile-optimized collapsed tabs

---

## Implementation Status

### ✅ Completed (v4.8)

**Phase 1: Hub Layout Migration (2025-11-30)**
- ✅ Migrated to HubPageLayout component
- ✅ Unified header with HubTabs navigation
- ✅ Fixed sidebar with AccountCard + 3 widgets
- ✅ Responsive mobile layout with collapsed tabs
- ✅ Role-aware hero header with avatar, name, role badge, CaaS score

**Phase 2: CaaS Integration (2025-11-20)**
- ✅ Score celebration toast on profile updates
- ✅ Before/after score comparison
- ✅ Next step guidance (complete professional info, add more details)
- ✅ Improvement description ("Added Bio", "Added Profile Picture", etc.)

**Phase 3: Free Help Settings (2025-11-09)**
- ✅ Toggle control in settings tab
- ✅ API integration (`/api/presence/free-help/online`, `/api/presence/free-help/offline`)
- ✅ Real-time status update (available_free_help boolean)
- ✅ Tutor-only visibility (hidden for clients and agents)

**Previous Releases**:
- ✅ v4.5 (2025-10-15): Professional info expansion (bio video, availability, verification)
- ✅ v4.0 (2025-09-20): Initial release with inline editing and 3-tab navigation

### 🔄 In Progress

- 🔄 Implementation guide v2 (code examples, testing strategies)
- 🔄 Notification preferences (email, push, SMS toggles)
- 🔄 Privacy settings (profile visibility, search indexing control)

### 📋 Future Enhancements (Post v4.8)

- Two-factor authentication setup
- Connected accounts (Google, Microsoft SSO)
- Export personal data (GDPR compliance)
- Profile badge system (verified, top-rated, responsive)

---

## Architecture Highlights

### Database Schema

**Table: `profiles`** (60 columns across 8 functional groups)

**Identity & Core** (8 fields): id, email, display_name, first_name, last_name, full_name, slug, created_at

**Contact & Location** (10 fields): phone, gender, date_of_birth, address_line1, town, city, country, postal_code, emergency_contact_name, emergency_contact_email

**Media & Presentation** (4 fields): avatar_url, cover_photo_url, bio (text), bio_video_url (CaaS Bucket 5 integration)

**Verification Documents** (17 fields):
- Identity: identity_verification_document_url, identity_verification_document_name, identity_verified, identity_verified_at, identity_document_number, identity_issue_date, identity_expiry_date
- DBS: dbs_certificate_number, dbs_certificate_date, dbs_certificate_url, dbs_verified, dbs_verified_at, dbs_expiry_date
- Address: proof_of_address_url, proof_of_address_type, address_document_issue_date, proof_of_address_verified

**Roles & Status** (5 fields): roles (TEXT array), active_role, onboarding_completed (JSONB), onboarding_progress (JSONB), profile_completed (boolean)

**Performance Metrics** (8 fields): sessions_taught, total_reviews, review_count, average_rating, response_time_hours, response_rate_percentage, caas_score, available_free_help

**Payment Integration** (2 fields): stripe_account_id, stripe_customer_id

**Referrals & Network** (2 fields): referral_code, referred_by_profile_id

**Advanced** (2 fields): embedding (vector 1536 for semantic search), preferences (JSONB for user settings)

### Page Routes

**Main Routes**:
- `/account` - Redirects to `/account/personal-info` (authenticated)
- `/account/personal-info` - Personal information tab
- `/account/professional-info` - Professional information tab (role-aware form)
- `/account/settings` - Settings and preferences

### Key Workflows

**Inline Field Edit Flow**:
User clicks field → Field enters edit mode → User modifies value → User tabs away (blur) → 150ms delay → Optimistic UI update → Supabase UPDATE → Success toast (or rollback on error) → UserProfileContext refreshed

**Avatar Upload Flow**:
User clicks avatar → File picker opens → User selects image → Upload to Supabase Storage (`avatars` bucket) → Update profiles.avatar_url → Refresh UserProfileContext → Avatar displays new image → CaaS score recalculated (if first avatar)

**Professional Info Save with CaaS Celebration**:
User edits qualifications → Clicks save → Fetch previous CaaS score → updateRoleDetails() API → Wait 1 second for CaaS recalculation → Fetch new CaaS score → Compare scores → If improved, show celebration toast with score increase and next step guidance

---

## System Integrations

**Strong Dependencies** (Cannot function without):
- **Supabase Auth**: Profile tied to auth.users.id (CASCADE delete)
- **UserProfileContext**: Global profile state management across app

**Medium Coupling** (Trigger-based, async):
- **CaaS**: Profile updates trigger score recalculation (caas_recalculation_queue)
- **Onboarding**: Profile completeness gates onboarding progression
- **Marketplace**: Profile data powers tutor search and filtering
- **Bookings**: Verification status affects booking eligibility

**Low Coupling** (Optional features):
- **Free Help**: available_free_help flag enables instant booking flow
- **Referrals**: referral_code and referred_by_profile_id track agent attribution
- **Reviews**: sessions_taught and average_rating aggregate from reviews system

---

## File Structure

**Main Hub Pages**:
- [page.tsx](../../apps/web/src/app/(authenticated)/account/page.tsx) - Root redirect to personal-info
- [personal-info/page.tsx](../../apps/web/src/app/(authenticated)/account/personal-info/page.tsx) - Personal info tab with inline editing
- [professional-info/page.tsx](../../apps/web/src/app/(authenticated)/account/professional-info/page.tsx) - Role-specific professional form
- [settings/page.tsx](../../apps/web/src/app/(authenticated)/account/settings/page.tsx) - Settings grid with free help toggle

**Core Components** (7 total):
- [PersonalInfoForm.tsx](../../apps/web/src/app/components/feature/account/PersonalInfoForm.tsx) - Inline editing for personal fields
- [ProfessionalInfoForm.tsx](../../apps/web/src/app/components/feature/account/ProfessionalInfoForm.tsx) - 2000+ line role-aware form
- [AccountCard.tsx](../../apps/web/src/app/components/feature/account/AccountCard.tsx) - Profile completeness widget with avatar upload
- [AccountHeroHeader.tsx](../../apps/web/src/app/components/feature/account/AccountHeroHeader.tsx) - Profile display (avatar, name, role, score)
- [AccountHelpWidget.tsx](../../apps/web/src/app/components/feature/account/AccountHelpWidget.tsx) - Help links
- [AccountTipWidget.tsx](../../apps/web/src/app/components/feature/account/AccountTipWidget.tsx) - Security tips
- [AccountVideoWidget.tsx](../../apps/web/src/app/components/feature/account/AccountVideoWidget.tsx) - Video tutorials

**API Utilities**:
- [lib/api/profiles.ts](../../apps/web/src/lib/api/profiles.ts) - updateProfile(), updateRoleDetails() functions

**Database Migrations** (Key):
- Migration 000: Create profiles table with core fields
- Migration 054: Add slug for SEO-friendly profile URLs
- Migration 089: Add referred_by_profile_id for referral tracking
- Migration 115: Add caas_score column for CaaS v5.5 integration

---

## Testing

### Quick Verification

**Check Inline Editing**:
Navigate to `/account/personal-info`, click first_name field, edit value, tab away. Verify 150ms delay then success toast.

**Check Avatar Upload**:
Click avatar in AccountCard, select image file. Verify upload progress then immediate display of new avatar.

**Check Profile Completeness**:
View AccountCard progress bar. Edit fields and verify percentage increases correctly.

**Check CaaS Score Celebration**:
Edit professional info (add bio video), save. Verify celebration toast shows score increase and next step guidance.

**Check Free Help Toggle** (Tutors only):
Navigate to `/account/settings`, toggle "Offer Free Help". Verify API call succeeds and available_free_help updates.

---

## Troubleshooting

### Inline Edit Not Saving

**Possible Causes**:
1. Blur event not firing (user closed browser before blur)
2. Network error during Supabase UPDATE
3. UserProfileContext not refreshing after save

**Solutions**:
1. Add explicit save button as fallback
2. Check browser console for network errors, verify Supabase connection
3. Manually call refreshProfile() after updateProfile()

### Avatar Upload Fails

**Possible Causes**:
1. File exceeds size limit (10MB Supabase default)
2. Invalid file type (must be image/*)
3. Missing storage bucket permissions

**Solutions**:
1. Validate file size before upload, show error if >10MB
2. Check file.type starts with 'image/'
3. Verify Supabase Storage policies allow authenticated uploads to avatars bucket

### Profile Completeness Not Updating

**Cause**: Calculation logic missing newly added fields

**Solution**: Update calculateProfileCompleteness() function in AccountCard.tsx to include all weighted fields

### CaaS Score Not Recalculating

**Cause**: caas_recalculation_queue trigger not firing or cron job not running

**Solution**: Check `caas_recalculation_queue` table for profile_id. If missing, manually INSERT. Verify cron job running every 10 minutes.

---

## Migration Guide

### Upgrading Personal Info to Include New Field

**Database Changes**:
1. Add column to profiles table: `ALTER TABLE profiles ADD COLUMN new_field TEXT;`
2. Add index if needed for filtering: `CREATE INDEX idx_profiles_new_field ON profiles(new_field);`
3. Update RLS policies if new field has privacy requirements

**Code Changes**:
1. Update Profile TypeScript type in `src/types/index.ts`
2. Add field to PersonalInfoForm.tsx with inline editing
3. Update updateProfile() to include new field in Supabase update
4. Update AccountCard completeness calculation to weight new field
5. Update professional-info.spec.ts E2E test to verify new field displays

**Expected Behavior**:
- Existing profiles have NULL value for new field (graceful degradation)
- Inline editing saves new field value immediately on blur
- Profile completeness percentage recalculates including new field

---

## Support

**For Questions**:
1. Check [Solution Design v2](./account-solution-design-v2.md) for architecture and design decisions
2. Review [AI Prompt Context v2](./account-prompt-v2.md) for AI assistant guidance
3. See Implementation Guide for code examples (needs v2 update)
4. Search codebase for specific implementations

**For Bugs**:
1. Check browser console for JavaScript errors
2. Verify Supabase connection and RLS policies
3. Test UserProfileContext.refreshProfile() manually
4. Review inline editing blur event timing (150ms delay)

**For Feature Requests**:
1. Propose changes in Solution Design doc first
2. Consider impact on profile completeness calculation
3. Test with representative user profiles across all 3 roles
4. Document in changelog

---

**Last Updated**: 2025-12-15
**Next Review**: When implementing notification preferences (v5.0)
**Maintained By**: Frontend Team + Product Team
