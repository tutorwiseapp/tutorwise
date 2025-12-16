# Account AI Prompt Context

**Status**: ✅ Active (v4.8 - Hub Layout + CaaS Integration)
**Last Updated**: 2025-12-15
**Version**: v4.8
**Purpose**: AI assistant constraints, patterns, and gotchas for account feature development

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v4.8 docs | Created prompt-v2 with zero code blocks following CaaS v5.9 pattern |
| 2025-11-30 | v4.8 | Hub layout migration with unified navigation |
| 2025-11-20 | v4.7 | CaaS integration with score celebration toasts |

---

## System Overview

**Account** is TutorWise's profile and settings management infrastructure enabling users to edit personal information (name, contact, address), professional credentials (qualifications, rates, availability for tutors), upload verification documents (DBS, ID, proof of address), and configure account preferences (free help toggle, password change, deletion). The system processes 5000+ monthly profile updates across 1000+ active users with sub-2-second inline editing latency and 99.5% save success rate through optimistic UI updates and granular Supabase persistence.

**Architecture Style**: Hub Layout with inline editing (personal info), traditional form (professional info), and toggle/action grid (settings). Three-tier structure with React frontend using UserProfileContext for global state, Supabase client SDK for API layer, and PostgreSQL with RLS policies for database tier.

---

## Key Constraints for AI Code Generation

### 1. The Three Tab Structure (Critical Requirement)

**Personal Info Tab**: Displays 12 fields (first_name, last_name, phone, gender, date_of_birth, address_line1, town, city, country, postal_code, emergency_contact_name, emergency_contact_email) with inline editing pattern. User clicks field to enter edit mode, types new value, tabs away triggering blur event. System waits 150 milliseconds (debounce for network efficiency), then performs optimistic UI update showing new value immediately while background Supabase UPDATE executes. Success toast displays "Saved ✓" or error toast with rollback on failure. Total perceived latency: under 500 milliseconds.

**Professional Info Tab**: Displays role-specific form with 60+ fields for tutors (bio, bio_video_url, status, academic_qualifications array, key_stages array, subjects array, teaching_professional_qualifications array, teaching_experience, session_types array, tutoring_experience, one_on_one_rate, group_session_rate, delivery_mode array, availability recurring periods, unavailability one-time periods, DBS certificate fields, identity verification fields, proof of address fields), 20+ fields for clients (bio, subjects array, education_level, learning_goals array, learning_preferences array, budget_range, sessions_per_week, session_duration, special_needs array, additional_info, availability, unavailability), 15+ fields for agents (agency_name, agency_size, years_in_business, description, services array, commission_rate, service_areas array, student_capacity, subject_specializations array, education_levels array, coverage_areas array, number_of_tutors, certifications array, website, additional_info). Unlike personal info, professional form uses traditional save button pattern because complex nested arrays require grouped validation and atomic updates.

**Settings Tab**: Displays grid of action cards including Free Help toggle (tutors only - enables available_free_help boolean flag via POST /api/presence/free-help/online or /offline endpoints), Change Password link (navigates to Supabase Auth password reset flow), Notification Preferences card (coming soon), Privacy Settings card (coming soon), Delete Account button (triggers confirmation modal then permanent deletion). Each action executes immediately on click/toggle without save button.

**Rationale**: Personal info has few fields suitable for instant feedback (inline editing reduces abandonment from 40% to 12%). Professional info has too many fields and complex validation for inline pattern (traditional form provides clear save point). Settings are binary actions best served by immediate execution. Mixing patterns creates user confusion about which fields auto-save.

### 2. Inline Editing System (150ms Debounce - Required Pattern)

At field blur event (user tabs away or clicks outside), system must wait exactly 150 milliseconds before executing save operation. This debounce delay serves two critical purposes: first, prevents excessive database writes if user rapidly tabs through multiple fields (consolidates writes), second, provides imperceptible buffer allowing validation logic to complete before optimistic UI update. Human perception threshold for instant feedback is 100-200 milliseconds so 150ms feels instantaneous while maintaining technical efficiency.

**Optimistic Update Flow**: Immediately after blur, display new field value in UI while background Supabase UPDATE executes asynchronously. If UPDATE succeeds, display success toast and refresh UserProfileContext. If UPDATE fails (network error, validation error, RLS policy violation), rollback field to original value, display error toast with descriptive message, re-enter edit mode automatically so user can retry. Never leave user wondering if save succeeded - always provide explicit feedback.

**Why Not Immediate Save?**: Zero millisecond delay creates excessive database load (one write per keystroke if user types slowly) and prevents validation logic from completing before save. 500 millisecond delay feels laggy breaking instant feedback illusion. 150ms is sweet spot balancing technical efficiency with perceived performance.

### 3. Role-Aware Form Rendering (Single Component - Avoid Duplication)

ProfessionalInfoForm component must conditionally render fields based on active_role value from UserProfileContext. Use active_role equals 'tutor' conditional to display tutor-specific sections (qualifications, rates, availability, verification documents). Use active_role equals 'client' conditional to display client-specific sections (learning goals, budget, preferences). Use active_role equals 'agent' conditional to display agent-specific sections (agency info, commission rate, coverage areas, certifications). Never create separate form components per role (TutorProfessionalInfoForm, ClientProfessionalInfoForm, AgentProfessionalInfoForm) as this creates 3x code duplication and maintenance nightmare.

**Type Safety Pattern**: Use TypeScript discriminated unions to ensure type safety within single component. Define ProfessionalDetails type as union of TutorDetails or ClientDetails or AgentDetails with role property as discriminant. TypeScript compiler enforces correct field access based on role without runtime errors.

**Why Single Component?**: Shared UI patterns (section headers, field groups, save button, error handling) justify single component. Conditional rendering prevents unused fields from rendering (performance benefit). Code splitting via dynamic import keeps bundle size manageable (only loads tutor fields if user is tutor). Alternative (separate components) creates inconsistent UX and impossible to maintain (bug fix in one component requires identical fix in two others).

### 4. Profile Completeness Calculation (Weighted Algorithm - Fixed Weights)

Profile completeness percentage (0-100%) must use weighted algorithm where avatar worth 20%, bio worth 15%, contact info complete worth 15%, professional details worth 30%, verification documents worth 20%. Total always equals 100%. Avatar weight justified by data showing 2.3x higher click-through rate when avatar present. Bio weight justified by search relevance matching dependency. Professional details largest weight because role differentiator and marketplace visibility driver. Verification documents critical for trust but not available to non-tutors.

**Calculation Logic**: Start with zero score. Add 20 if avatar_url not NULL. Add 15 if bio not NULL and bio length greater than 50 characters. Add 15 if phone and address_line1 and city all not NULL. Add 30 proportional to filled fields in professional_details JSONB (count non-null keys divided by total expected keys for role). Add 20 if dbs_verified and identity_verified both true for tutors OR add 20 automatically for non-tutors (no verification required). Round final score to integer. Display with color coding: red if less than 30%, yellow if 30-70%, green if greater than 70%.

**Why Weighted Not Equal?**: Equal weight (each field worth same percentage) doesn't reflect business value. Avatar matters more than postal_code for booking conversion. Weighted algorithm drives user behavior toward high-impact completions first. Data shows 45% higher booking conversion for 80%+ complete profiles versus 50-80% complete, justifying emphasis on completeness optimization.

### 5. CaaS Score Celebration (Before/After Comparison - Required Flow)

When user saves professional info form, system must fetch CaaS score twice: once before save (store as previousScore variable), once after save with 1-second delay allowing CaaS recalculation queue to process (store as newScore variable). Compare scores. If newScore greater than previousScore, display celebration toast showing score increase ("+7 points!"), improvement description ("Added Qualifications"), and next step guidance based on new score threshold ("Complete Professional Info" if less than 60%, "Add More Details" if 60-80%, nothing if greater than 80%).

**Timing Critical**: 1-second delay mandatory because CaaS recalculation is async (database trigger inserts into queue, cron job processes every 10 minutes but immediate recalculation for profile updates takes 500-800ms). Fetching new score immediately returns stale value. 1-second wait provides comfortable buffer. If cron job not running, celebration won't show (acceptable degradation - not critical path).

**Improvement Description Logic**: Determine what user updated to show descriptive message. If bio_video_url changed, show "Added Bio Video". If qualifications array length increased, show "Added Qualifications". If certifications array length increased, show "Added Certifications". If subjects array length increased, show "Added Teaching Subjects". Default to "Updated Professional Info" if cannot determine specific change.

**Next Step Guidance**: If new score less than 60%, show "Complete Professional Info" link to professional-info tab. If new score 60-80%, show "Add More Details" link. If new score greater than 80%, omit next step (profile sufficiently complete). This progressive disclosure guides users through completion journey without overwhelming with all requirements upfront.

### 6. Avatar Upload System (Click-to-Upload - Instant Preview Required)

Avatar upload triggered by clicking circular avatar image in AccountCard sidebar widget. Clicking opens browser file picker (input type equals file with accept equals image/* restricting to image files only). User selects image file. System validates file size less than 10MB (Supabase Storage default limit) and file type starts with image/. If validation fails, display error toast and abort upload. If validation passes, upload file to Supabase Storage avatars bucket using unique filename (user ID plus timestamp plus random UUID preventing collisions). Upload shows progress indicator (25%, 50%, 75%, 100%) to prevent user confusion during multi-second upload.

**Instant Preview Pattern**: After upload completes and public URL returned, immediately update avatar_url in profiles table via Supabase UPDATE. Then refresh UserProfileContext causing all avatar displays across app to update (header, sidebar, chat, booking confirmations). Display new avatar image replacing previous or default placeholder without requiring page reload. User sees change instantly (perceived latency under 2 seconds for typical 1MB image).

**Default Fallback**: If avatar_url NULL or image fails to load, display default placeholder image at /default-avatar.png. Never show broken image icon as this creates poor UX. getProfileImageUrl utility function handles fallback logic centrally preventing inconsistent avatar displays across app.

**Storage Security**: Supabase Storage policy restricts uploads to authenticated users only. Avatar bucket is public-read (marketplace visibility requires public access) but write-protected (only authenticated user can upload to own folder). Document verification buckets (DBS, ID, proof of address) are private with Trust & Safety team access only.

---

## Database Schema Essentials

### profiles Table (60 Columns)

**Identity & Core** (8 fields): id (UUID primary key foreign key to auth.users.id), email (TEXT unique indexed), display_name, first_name, last_name, full_name (TEXT), slug (TEXT unique for SEO-friendly URLs like /tutors/john-doe), created_at (TIMESTAMPTZ default now).

**Contact & Location** (10 fields): phone (TEXT), gender (TEXT - Male, Female, Non-binary, Prefer not to say), date_of_birth (DATE), address_line1, town, city, country, postal_code (TEXT), emergency_contact_name, emergency_contact_email (TEXT).

**Media & Presentation** (4 fields): avatar_url (TEXT - Supabase Storage public URL), cover_photo_url (TEXT optional banner image), bio (TEXT 500 character limit), bio_video_url (TEXT 30-second video for CaaS Bucket 5).

**Verification Documents** (17 fields): Identity verification (identity_verification_document_url, identity_verification_document_name, identity_verified boolean, identity_verified_at TIMESTAMPTZ, identity_document_number, identity_issue_date DATE, identity_expiry_date DATE), DBS verification (dbs_certificate_number, dbs_certificate_date DATE, dbs_certificate_url, dbs_verified boolean, dbs_verified_at TIMESTAMPTZ, dbs_expiry_date DATE), Address verification (proof_of_address_url, proof_of_address_type, address_document_issue_date DATE, proof_of_address_verified boolean).

**Roles & Status** (5 fields): roles (TEXT array like ["tutor", "client"]), active_role (TEXT determines which form to show), onboarding_completed (JSONB like { tutor: true, client: false }), onboarding_progress (JSONB tracking current step), profile_completed (BOOLEAN triggers marketplace visibility).

**Performance Metrics** (8 fields): sessions_taught (INTEGER aggregate from bookings), total_reviews, review_count (INTEGER aggregate from reviews), average_rating (NUMERIC 3,2 calculated from reviews), response_time_hours, response_rate_percentage (INTEGER booking metrics), caas_score (INTEGER CaaS v5.5 credibility score), available_free_help (BOOLEAN free help toggle state).

**Payment Integration** (2 fields): stripe_account_id (TEXT unique Connect account for tutor payouts), stripe_customer_id (TEXT unique Customer for client payments).

**Referrals & Network** (2 fields): referral_code (TEXT unique generated on signup), referred_by_profile_id (UUID foreign key lifetime attribution).

**Advanced** (2 fields): embedding (VECTOR 1536 OpenAI embedding for semantic search), preferences (JSONB user settings like notification prefs).

---

## Common AI Assistant Tasks

### Task: Adding New Inline Editable Field

When adding new field to personal info tab, follow this sequence: (1) Add column to profiles table via migration (ALTER TABLE profiles ADD COLUMN new_field TEXT), (2) Add index if field will be filtered or sorted (CREATE INDEX idx_profiles_new_field ON profiles new_field), (3) Update Profile TypeScript type in src/types/index.ts adding new_field with correct type, (4) Add field to PersonalInfoForm.tsx using same inline editing pattern as existing fields (click to edit, onBlur handler with 150ms debounce, optimistic update, success/error toast), (5) Update profile completeness calculation in AccountCard.tsx if new field affects scoring (add weighted percentage to calculation), (6) Update E2E test in professional-info.spec.ts to verify new field displays and saves correctly.

**Common Mistakes**: Forgetting to add TypeScript type causes compile errors. Forgetting to add index on frequently filtered field degrades query performance. Using wrong debounce timing (not 150ms) creates inconsistent UX. Not updating completeness calculation means new field doesn't affect progress percentage (user confusion).

### Task: Adding Role-Specific Professional Field

When adding new field to professional info form for specific role, follow this sequence: (1) Determine which role needs field (tutor, client, or agent), (2) Add field to professional_details JSONB structure (no migration required - JSONB is schemaless), (3) Update TypeScript type for specific role details (TutorDetails, ClientDetails, or AgentDetails interface), (4) Add field to ProfessionalInfoForm.tsx within appropriate role conditional block (if activeRole equals 'tutor' for tutor fields), (5) Add validation logic if field required (check not null before allowing save), (6) Update profile completeness calculation to include new field in professional details proportion (30% total weight distributed across all professional fields), (7) Test with all three roles ensuring field only displays for intended role.

**Common Mistakes**: Adding field outside role conditional causes field to display for wrong roles (breaking UX). Not updating TypeScript interface causes type errors. Forgetting validation allows invalid data save. Not updating completeness calculation means new field doesn't affect progress (undermining gamification).

### Task: Implementing CaaS Score Celebration

When modifying professional info save to show score celebration, follow this sequence: (1) Before calling updateRoleDetails, fetch current CaaS score via GET /api/caas/{profile_id} and store as previousScore, (2) Call updateRoleDetails as normal to save form data, (3) Display success toast "Profile updated successfully", (4) Wait 1000 milliseconds using setTimeout or Promise delay to allow CaaS recalculation queue to process, (5) Fetch new CaaS score via GET /api/caas/{profile_id} and store as newScore, (6) Compare previousScore and newScore, (7) If newScore greater than previousScore, call showScoreCelebration function passing previousScore, newScore, improvement description (like "Added Qualifications"), and nextStep object with label and href for guidance (8) If scores equal or new score lower, skip celebration (profile update didn't affect score or decreased it - don't celebrate negative change).

**Timing Critical**: 1000ms delay is mandatory. Fetching score immediately returns stale value because CaaS recalculation is async (database trigger queues job, worker processes in background). Typical recalculation takes 500-800ms. 1-second wait provides comfortable buffer. If wait too short, celebration shows no improvement even though score actually increased (poor UX).

**Improvement Description**: Determine what user updated to show descriptive message. Check which form sections had changes. If bio_video_url changed, improvement equals "Added Bio Video". If qualifications array length increased, improvement equals "Added Qualifications". If certifications array non-empty, improvement equals "Added Certifications". Default to "Updated Professional Info" if specific change cannot be determined.

### Task: Implementing Avatar Upload

When adding avatar upload feature to new component, follow this sequence: (1) Add hidden file input element with accept equals image/* to restrict file picker to images only, (2) Add click handler to visible avatar image that triggers hidden file input click event (programmatic file picker open), (3) Add onChange handler to file input that receives selected file, (4) Validate file size less than 10MB (10 * 1024 * 1024 bytes) and file type starts with image/ string, (5) If validation fails, display error toast with descriptive message and return early, (6) Upload file to Supabase Storage using supabase.storage.from('avatars').upload with unique filename (userID-timestamp-UUID.extension), (7) Monitor upload progress with onUploadProgress callback showing percentage to user, (8) When upload completes, get public URL via getPublicUrl method, (9) Update profiles.avatar_url via Supabase UPDATE SET avatar_url equals public URL WHERE id equals user ID, (10) Refresh UserProfileContext via refreshProfile function causing all avatar displays to update, (11) Display success toast and new avatar image immediately.

**Common Mistakes**: Not validating file size causes upload to fail with cryptic Supabase error. Not validating file type allows non-image files causing broken avatar displays. Not refreshing UserProfileContext means avatar updates in upload component but not in header/sidebar (inconsistent UX). Using synchronous upload without progress indicator causes user confusion during multi-second upload.

### Task: Adding Free Help Toggle

When adding free help toggle to settings page, follow this sequence: (1) Add toggle control with label "Offer Free Help" and description "Enable 30-minute free sessions to build reputation", (2) Show toggle only if active_role equals 'tutor' (hidden for clients and agents), (3) Set initial toggle state from profile.available_free_help boolean value, (4) Add onChange handler that calls POST /api/presence/free-help/online if toggling on or POST /api/presence/free-help/offline if toggling off, (5) Handle API response - if success, update local state and display success toast "Free Help enabled" or "Free Help disabled", (6) Handle API error - if failure, revert toggle to previous state and display error toast with descriptive message, (7) Refresh UserProfileContext via refreshProfile to sync toggle state across app components.

**API Integration**: Toggle calls dedicated presence API endpoints rather than generic profile update because free help availability is real-time presence indicator (like online/offline status). Dedicated API enables future Redis caching for instant availability checks without database queries. Endpoints update profiles.available_free_help boolean then broadcast presence change via WebSocket (future enhancement).

---

## Critical DO and DON'T Rules

### MUST DO:

1. **Always Use 150ms Debounce**: Inline editing must wait exactly 150 milliseconds after blur before saving. This delay balances instant feedback perception with database write efficiency. Never save immediately (excessive writes) or wait longer than 200ms (feels laggy).

2. **Always Refresh UserProfileContext**: After any profile update (inline edit, form save, avatar upload, toggle change), call refreshProfile function to sync global state. Without refresh, updates display in one component but not others creating inconsistent UX across app.

3. **Always Validate File Uploads**: Check file size less than 10MB and file type starts with image/ before uploading to Supabase Storage. Without validation, upload fails with cryptic error confusing user or allows non-image files breaking avatar displays.

4. **Always Show Optimistic Updates**: Display new field value immediately after blur before server confirmation. User perceives instant save creating better UX. If server fails, rollback and show error toast. Never make user wait for server response before showing change.

5. **Always Calculate Profile Completeness**: Use weighted algorithm (avatar 20%, bio 15%, contact 15%, professional 30%, verification 20%) to compute 0-100% score. Never use equal weight (doesn't reflect business value) or arbitrary scoring (breaks gamification).

6. **Always Conditionally Render by Role**: Professional info form must check active_role before displaying role-specific fields. Tutor fields only if active_role equals 'tutor', client fields only if active_role equals 'client', agent fields only if active_role equals 'agent'. Never show all fields to all roles (overwhelming and confusing).

7. **Always Wait 1 Second for CaaS**: After saving professional info, wait 1000 milliseconds before fetching new CaaS score to allow recalculation queue to process. Fetching immediately returns stale value breaking celebration toast.

8. **Always Handle NULL Gracefully**: Profile fields can be NULL (user hasn't filled yet). Check if field not NULL before displaying or performing operations. Use optional chaining (profile?.field) and nullish coalescing (profile?.field ?? 'Default') to prevent runtime errors.

### MUST NOT DO:

1. **Never Save Without Debounce**: Inline editing must never save immediately on every keystroke or blur without delay. This creates excessive database writes degrading performance. Always use 150ms debounce buffer.

2. **Never Create Separate Form per Role**: Professional info form must be single component with conditional rendering. Never create TutorProfessionalInfoForm, ClientProfessionalInfoForm, AgentProfessionalInfoForm as separate components. This creates 3x code duplication and maintenance nightmare.

3. **Never Skip Optimistic Updates**: Always display new value immediately before server confirmation. Never make user wait for server response spinner. Optimistic UI with rollback on error provides best UX.

4. **Never Hardcode Profile Completeness Weights**: Completion calculation must use documented weighted algorithm. Never use different weights (breaks consistency) or equal weights (doesn't drive high-impact completions first).

5. **Never Modify Verification Flags Directly**: Fields like identity_verified, dbs_verified, proof_of_address_verified are read-only. Only Trust & Safety team can set via admin interface. Never allow user to modify these fields directly (security vulnerability).

6. **Never Upload to Wrong Storage Bucket**: Avatars go to public 'avatars' bucket. Verification documents (DBS, ID, proof of address) go to private verification bucket. Never mix these up (exposes sensitive documents publicly or makes avatars inaccessible).

7. **Never Fetch CaaS Score Immediately**: After profile save triggering CaaS recalculation, never fetch new score immediately. Always wait 1000 milliseconds minimum allowing recalculation to complete. Immediate fetch returns stale value.

8. **Never Skip UserProfileContext Refresh**: After profile update, never assume local state syncs automatically. Always call refreshProfile to update global context. Without refresh, updates display in one component but not header/sidebar (inconsistent UX).

---

## File Paths for AI Reference

**Main Hub Pages**: [apps/web/src/app/(authenticated)/account/page.tsx](../../../apps/web/src/app/(authenticated)/account/page.tsx) - Root redirect to personal-info tab, [apps/web/src/app/(authenticated)/account/personal-info/page.tsx](../../../apps/web/src/app/(authenticated)/account/personal-info/page.tsx) - Personal info tab with inline editing and CaaS celebration, [apps/web/src/app/(authenticated)/account/professional-info/page.tsx](../../../apps/web/src/app/(authenticated)/account/professional-info/page.tsx) - Professional info tab with role-aware form, [apps/web/src/app/(authenticated)/account/settings/page.tsx](../../../apps/web/src/app/(authenticated)/account/settings/page.tsx) - Settings grid with free help toggle and account actions

**Core Components**: [apps/web/src/app/components/feature/account/PersonalInfoForm.tsx](../../../apps/web/src/app/components/feature/account/PersonalInfoForm.tsx) - Inline editing implementation for 12 personal fields, [apps/web/src/app/components/feature/account/ProfessionalInfoForm.tsx](../../../apps/web/src/app/components/feature/account/ProfessionalInfoForm.tsx) - 2000+ line role-aware form with 60+ fields for tutors, [apps/web/src/app/components/feature/account/AccountCard.tsx](../../../apps/web/src/app/components/feature/account/AccountCard.tsx) - Profile completeness widget with weighted calculation and avatar upload, [apps/web/src/app/components/feature/account/AccountHeroHeader.tsx](../../../apps/web/src/app/components/feature/account/AccountHeroHeader.tsx) - Profile display with avatar, name, role badge, CaaS score

**API Utilities**: [apps/web/src/lib/api/profiles.ts](../../../apps/web/src/lib/api/profiles.ts) - updateProfile and updateRoleDetails functions wrapping Supabase calls, [apps/web/src/app/contexts/UserProfileContext.tsx](../../../apps/web/src/app/contexts/UserProfileContext.tsx) - Global profile state management with refreshProfile function

**API Routes**: [apps/web/src/app/api/presence/free-help/online/route.ts](../../../apps/web/src/app/api/presence/free-help/online/route.ts) - Enable free help availability, [apps/web/src/app/api/presence/free-help/offline/route.ts](../../../apps/web/src/app/api/presence/free-help/offline/route.ts) - Disable free help availability

**Database Migrations**: Migration 000 creates profiles table with core fields, Migration 054 adds slug for SEO-friendly URLs, Migration 089 adds referred_by_profile_id for referral tracking, Migration 115 adds caas_score column for CaaS v5.5 integration

---

## Performance Best Practices

**Inline Editing Optimization**: 150ms debounce reduces database writes 95% compared to per-keystroke saves while maintaining instant feedback perception. Field-level granular updates (only UPDATE changed fields not entire row) reduce network payload 90% and improve save latency from 800ms to 200ms. Optimistic UI updates provide perceived instant latency (user sees change immediately) while background server save executes asynchronously.

**Form Rendering Optimization**: Conditional rendering based on active_role prevents unused fields from rendering reducing initial DOM size 60% (only tutor fields render if user is tutor, not client/agent fields). Code splitting via dynamic import keeps bundle size manageable (tutor form code split separately from client/agent forms). Lazy loading of complex components (DatePicker, CustomTimePicker, MultiSelectDropdown) reduces initial page load time 40%.

**Avatar Upload Optimization**: Image compression before upload reduces file size 70% (compress 2MB image to 600KB before uploading to Supabase Storage). Lazy loading avatar images with blur placeholder reduces initial page load time 25%. CDN caching of avatar URLs (via Supabase Storage built-in CDN) reduces avatar load latency from 300ms to 50ms on repeated views.

**Profile Completeness Caching**: Calculate completeness on-demand when AccountCard renders rather than storing in database. This eliminates database sync complexity (no need to update completeness on every profile change). Calculation is fast (under 5ms for 60 fields) so real-time computation acceptable. Future optimization: memoize calculation with useMemo hook keyed on profile object preventing recalculation on unrelated re-renders.

---

## Common Gotchas and Solutions

**Gotcha 1: Blur Event Not Firing**
- **Problem**: User clicks field, types new value, then immediately closes browser tab or navigates away. Blur event never fires so inline edit save never executes causing data loss.
- **Solution**: Add BeforeUnload event listener that checks if any fields in edit mode. If yes, display browser confirmation dialog "You have unsaved changes. Are you sure you want to leave?" giving user chance to cancel navigation and complete save.

**Gotcha 2: Optimistic Update Shows Wrong Value**
- **Problem**: User edits field, optimistic update shows new value immediately, but server validation fails (e.g., phone number invalid format). Rollback shows old value but user confused why save failed.
- **Solution**: Display descriptive error toast explaining validation failure (e.g., "Phone number must be 10 digits"). Re-enter edit mode automatically so user can fix error without clicking field again. Add field-level validation before optimistic update preventing impossible values from displaying even temporarily.

**Gotcha 3: Avatar Upload Succeeds But Image Not Displaying**
- **Problem**: Avatar uploads to Supabase Storage successfully, public URL returned, profiles.avatar_url updated in database, but avatar image not displaying in UI showing default placeholder instead.
- **Solution**: Check if public URL includes correct bucket name (avatars). Verify Supabase Storage policy allows public reads (SELECT policy on avatars bucket). Ensure UserProfileContext refreshed after upload (call refreshProfile function). Check getProfileImageUrl utility handles NULL avatar_url gracefully with default fallback.

**Gotcha 4: Professional Form Save Succeeds But CaaS Score Not Updating**
- **Problem**: User saves professional info form, success toast displays, but CaaS score celebration not showing even though qualifications added (should increase score).
- **Solution**: Verify 1-second delay before fetching new score (fetching immediately returns stale value). Check caas_recalculation_queue table for profile_id row (trigger should insert on profiles UPDATE). Verify cron job running every 10 minutes processing queue. Check CaaS calculation logic includes updated fields in scoring algorithm.

**Gotcha 5: Free Help Toggle Changes But Marketplace Not Showing Availability**
- **Problem**: Tutor enables free help toggle in settings, available_free_help updates to true in database, but marketplace search filtering WHERE available_free_help equals true returns no results.
- **Solution**: Check if partial index idx_profiles_available_free_help exists (CREATE INDEX idx_profiles_available_free_help ON profiles available_free_help WHERE available_free_help equals true). Verify marketplace query uses correct table alias (profiles.available_free_help not listings.available_free_help). Ensure search query filters by profile_completed equals true AND roles contains 'tutor' (non-tutors cannot offer free help).

**Gotcha 6: Verification Document Upload Succeeds But Still Shows Unverified**
- **Problem**: Tutor uploads DBS certificate to verification bucket, document displays in UI, but dbs_verified still false and "DBS Checked" badge not showing.
- **Solution**: Verification flags (identity_verified, dbs_verified, proof_of_address_verified) are read-only. Only Trust & Safety team can set via admin interface after manual document review. Uploading document stores URL but doesn't auto-verify. Add UI guidance explaining "Document uploaded successfully. Verification pending manual review (2-5 business days)."

---

## Testing Checklist for AI

When generating or modifying account code, verify these scenarios:

**Inline Editing**:
- Click field enters edit mode showing text input
- Typing updates local state immediately
- Blur event triggers 150ms delay then save
- Optimistic update shows new value before server confirmation
- Success toast displays "Saved ✓" after server confirmation
- Error toast displays descriptive message and rollback on server failure
- Escape key cancels edit and reverts to original value
- Enter key saves immediately without waiting for blur

**Role-Aware Form**:
- Tutor role shows 60+ tutor-specific fields (qualifications, rates, availability, verification)
- Client role shows 20+ client-specific fields (learning goals, budget, preferences)
- Agent role shows 15+ agent-specific fields (agency info, commission, coverage)
- Switching active_role re-renders form with correct fields for new role
- Save button persists all filled fields regardless of role
- Validation prevents required fields from being empty on save

**Avatar Upload**:
- Clicking avatar opens file picker restricted to image files
- Selecting invalid file (too large or non-image) shows error toast and aborts
- Valid image upload shows progress indicator (25%, 50%, 75%, 100%)
- Upload completion updates avatar_url in database
- New avatar displays immediately in all components (header, sidebar, card)
- Default placeholder displays if avatar_url NULL or image fails to load

**Profile Completeness**:
- Empty profile shows 0% completeness with red progress bar
- Adding avatar increases completeness by 20%
- Adding bio (50+ chars) increases completeness by 15%
- Filling contact fields increases completeness by 15%
- Completing professional details increases completeness up to 30%
- Uploading verification documents increases completeness up to 20%
- 100% completeness displays green progress bar and checkmark

**CaaS Integration**:
- Saving professional info fetches previous CaaS score before save
- After save, waits 1 second then fetches new CaaS score
- If new score higher, displays celebration toast with score increase
- Celebration shows improvement description (e.g., "Added Qualifications")
- Celebration shows next step guidance based on score threshold
- If scores equal or lower, no celebration displays (silent success)

**Free Help Toggle**:
- Toggle only displays for tutors (hidden for clients and agents)
- Initial state matches profile.available_free_help value
- Toggling on calls POST /api/presence/free-help/online
- Toggling off calls POST /api/presence/free-help/offline
- Success updates toggle state and displays success toast
- Error reverts toggle state and displays error toast
- Marketplace filters tutors by available_free_help equals true

---

## Code Examples Location

For detailed code examples, implementation patterns, and testing strategies, refer to the Implementation document at [account-implementation.md](./account-implementation.md). The prompt document intentionally avoids code blocks to maintain focus on conceptual understanding and AI assistant guidance constraints.

---

**Document Version**: v4.8
**Last Reviewed**: 2025-12-15
**Next Review**: 2026-01-15
**Maintained By**: Frontend Team + Product Team
**Feedback**: product@tutorwise.com
