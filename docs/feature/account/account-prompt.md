# Account Hub Feature - AI Prompt

**Version**: v4.7
**Date**: 2025-11-08
**Status**: For Implementation
**Owner**: Senior Architect
**Prerequisite**: v4.4 (Network Hub), v4.5 (Reviews Hub)

---

## Prompt

Analyse my proposed solution in `account-solution-design-v4.7.md`. Create an enhanced proposed solution that is functional, reliable, with great UI/UX. Implement an advanced review & rating system integrated with the overall application; profile, bookings, referral system, payments for viral growth. The next features after this are the Messages/Chat using Tawk and Analytics & Reporting. Ask me any questions.

---

## Problem Statement

The platform's user profile editing functionality is fragmented and creates a confusing user experience:

1. **Unified Hub vs Legacy Editor**: New features use the modern unified hub layout (`/dashboard`, `/listings`), but profile editing still uses the old standalone `/profile` page
2. **Duplicate Profile Viewers**: Two separate routes handle profile viewing (`/profile/[id]` and `/public-profile/[id]`), causing confusion
3. **Disconnected Settings**: Settings pages like `/settings` and `/delete-account` are isolated from the main user hub
4. **Inconsistent Layout**: The `/profile` page doesn't follow the new 3-column Hub layout pattern
5. **Poor User Mental Model**: Users don't understand where to go to edit personal vs professional info vs settings

---

## Goals

### Must Have
1. **Deprecate Legacy Routes**: Remove `/profile`, `/profile/[id]`, `/settings`, `/delete-account`
2. **Consolidated Account Hub**: Move all editing functionality to `/account` with consistent Hub layout
3. **3-Column Layout**: Implement AppSidebar (Col 1) + Content Tabs (Col 2) + Hero & Stats (Col 3)
4. **Three Content Tabs**: Personal Info, Professional Info, Settings
5. **Avatar Upload**: Click-to-upload avatar in Hero card (Column 3)
6. **Role-Aware Forms**: Professional Info tab adapts to user role (tutor, client, agent)
7. **Middleware Redirects**: Ensure legacy URLs redirect to new locations

### Should Have
1. **Profile Completeness**: Show progress bar (0-100%) in sidebar
2. **Role-Specific Stats**: Display credibility, rates, network size in RoleStatsCard
3. **Auto-Save Forms**: Personal info auto-saves on blur
4. **Modal Editing**: Professional info uses edit modals to preserve existing UX

### Nice to Have
1. **Profile Preview**: "View Public Profile" link in Hero card
2. **Quick Stats**: Mini dashboard of account health metrics
3. **Recent Activity**: Show last login, profile views, etc.

---

## Non-Goals

1. **Public Profile Viewing**: Use `/public-profile/[id]` (separate feature)
2. **Profile Analytics**: Separate analytics feature
3. **Custom Profile Themes**: Out of scope
4. **Multi-Profile Management**: One profile per user

---

## User Stories

### As a User (Any Role)
- I want one place to manage all my account settings
- I want to edit my personal info (name, email, phone, address)
- I want to upload my profile photo easily
- I want to change my password
- I want to delete my account if needed
- I want to see my profile completeness and improve it

### As a Tutor
- I want to edit my bio, qualifications, and teaching experience
- I want to set my hourly rates for 1-on-1 and group sessions
- I want to manage my subject expertise and key stages
- I want to upload verification documents (DBS, ID, proof of address)
- I want to manage my availability calendar
- I want to see my credibility score and ratings

### As a Client
- I want to edit my learning goals and preferences
- I want to specify my budget range and session frequency
- I want to list my special needs or requirements
- I want to manage my availability for sessions
- I want to see my completed bookings count

### As an Agent
- I want to edit my agency information
- I want to manage my commission rate and service areas
- I want to specify my student capacity and tutor count
- I want to upload agency certifications
- I want to see my network size and active referrals

---

## Use Cases

### UC1: Edit Personal Information
1. User navigates to `/account` (redirects to `/account/personal-info`)
2. Page shows 3-column layout:
   - Col 1: AppSidebar with "Account" active
   - Col 2: Tabs (Personal Info, Professional Info, Settings) + PersonalInfoForm
   - Col 3: HeroProfileCard + RoleStatsCard
3. User sees form with fields: Full Name, Phone, Email (read-only), Country
4. User updates phone number
5. Clicks "Save Changes"
6. Toast: "Personal info updated successfully"
7. Hero card reflects new phone number

### UC2: Upload Profile Avatar
1. User hovers over avatar in Col 3 HeroProfileCard
2. Overlay appears: "Change" button with camera icon
3. User clicks avatar
4. File picker opens
5. User selects image
6. Upload begins, shows "Uploading..." state
7. Upload completes
8. Avatar refreshes with new image
9. Toast: "Avatar updated successfully"
10. Public profile also shows new avatar

### UC3: Edit Professional Info (Tutor)
1. User clicks "Professional Info" tab
2. Page renders ProfessionalInfoEditor component
3. Component detects role: tutor
4. Renders TutorNarrative component (read-only)
5. Shows sections: Bio, Qualifications, Experience, Subjects, Key Stages, Rates, Availability
6. User clicks "Edit" button on Bio section
7. EditNarrativeModal opens
8. User edits bio in textarea
9. Clicks "Save Changes"
10. Modal closes
11. Bio updates in read-only view
12. Supabase profiles table updated

### UC4: Change Password
1. User clicks "Settings" tab
2. Page shows two cards: Change Password + Delete Account
3. User enters current password
4. User enters new password
5. User confirms new password
6. Clicks "Update Password"
7. Supabase auth.updateUser() called
8. Success toast: "Password changed successfully"
9. User receives confirmation email

### UC5: View Role-Specific Stats (Tutor)
1. User views account hub (any tab)
2. Col 3 shows RoleStatsCard
3. Detects role: tutor
4. Fetches tutor stats from API
5. Displays:
   - Credibility: 4.8/5.0 (from average_rating)
   - 1-on-1 Rate: 35/hour (from listings)
   - Group Rate: 25/hour (from listings)
6. Stats update in real-time as user makes changes

### UC6: Delete Account
1. User navigates to Settings tab
2. Scrolls to "Delete Account" card (danger zone)
3. Reads warning text
4. Clicks "Delete My Account" button
5. Confirmation modal appears: "Are you absolutely sure?"
6. User types "DELETE" to confirm
7. Clicks final "Delete Account" button
8. API call to DELETE /api/user/delete
9. Supabase deletes auth.users record (cascade deletes profile)
10. User signed out
11. Redirect to homepage

### UC7: Legacy URL Redirect
1. User clicks old bookmark: `/profile`
2. Middleware intercepts request
3. Detects legacy route
4. 302 redirects to `/account/personal-info`
5. User lands on new account hub
6. Toast: "We've moved! This is your new Account page."

---

## Acceptance Criteria

### AC1: 3-Column Layout
- [ ] `/account/layout.tsx` creates 70:30 grid (Col 2:Col 3)
- [ ] Col 1 is AppSidebar from (authenticated)/layout.tsx
- [ ] Col 2 contains AccountTabs + dynamic content area
- [ ] Col 3 contains HeroProfileCard + RoleStatsCard
- [ ] Mobile: Single column, stacked vertically
- [ ] Desktop: 2.5fr (Col 2) + 1fr (Col 3) grid split

### AC2: Three Content Tabs
- [ ] AccountTabs component renders 3 tabs
- [ ] Tabs: Personal Info, Professional Info, Settings
- [ ] Active tab highlighted with visual indicator
- [ ] Tab content renders in content area below tabs
- [ ] URL updates on tab change: `/account/personal-info`, `/account/professional`, `/account/settings`

### AC3: Personal Info Form
- [ ] `/account/personal-info/page.tsx` exists
- [ ] Renders PersonalInfoForm component
- [ ] Fields: Full Name, Phone, Email (read-only), Country dropdown
- [ ] 2-column internal grid for fields
- [ ] "Save Changes" button (NOT auto-save)
- [ ] Success/error toasts on submit
- [ ] Updates profiles table via Supabase

### AC4: Professional Info Tab
- [ ] `/account/professional/page.tsx` exists
- [ ] Renders ProfessionalInfoEditor component
- [ ] Component reads user role from UserProfileContext
- [ ] For tutors: Renders TutorNarrative (read-only + Edit modals)
- [ ] For clients: Renders ClientProfessionalInfo (read-only + Edit modals)
- [ ] For agents: Renders AgentProfessionalInfo (read-only + Edit modals)
- [ ] Preserves existing modal-based editing pattern

### AC5: Settings Tab
- [ ] `/account/settings/page.tsx` exists
- [ ] Shows ChangePasswordForm card
- [ ] Shows DeleteAccountSection card (danger zone styling)
- [ ] Change password calls supabase.auth.updateUser()
- [ ] Delete account requires typed confirmation
- [ ] Both functions work correctly

### AC6: Hero Profile Card
- [ ] HeroProfileCard component in Col 3
- [ ] Displays avatar (192x192px, circular)
- [ ] Avatar is clickable for upload
- [ ] Hover shows overlay: "Change" + camera icon
- [ ] File input hidden, triggered on click
- [ ] Upload via useImageUpload hook
- [ ] Shows full_name from profile
- [ ] Shows primary_role badge
- [ ] Shows "View Public Profile" link
- [ ] Shows country/location

### AC7: Role Stats Card
- [ ] RoleStatsCard component in Col 3
- [ ] Detects user role
- [ ] For tutors: Shows Credibility, 1-on-1 Rate, Group Rate
- [ ] For clients: Shows Active Requests, Completed, Total Spent
- [ ] For agents: Shows Credibility, Active Referrals, Network Size
- [ ] Reuses StatCard and StatGrid components from v4.4
- [ ] Fetches data from role-specific API routes

### AC8: Legacy Route Cleanup
- [ ] `/app/profile/` folder deleted
- [ ] `/app/settings/` folder deleted
- [ ] `/app/delete-account/` folder deleted
- [ ] Legacy components moved or deleted
- [ ] Middleware redirects implemented:
  - `/profile` → `/account/personal-info`
  - `/profile/[id]` → `/public-profile/[id]`
  - `/settings/*` → `/account/settings`
  - `/delete-account` → `/account/settings`

### AC9: AppSidebar Update
- [ ] NavLink updated: "Profile" → "Account"
- [ ] NavLink href: `/profile` → `/account/personal-info`
- [ ] NavMenu (header dropdown) also updated
- [ ] Active state highlights correctly

### AC10: Profile Completeness (Optional)
- [ ] Calculate score: Avatar (20%) + Bio (15%) + Contact (15%) + Professional (30%) + Verification (20%)
- [ ] Display progress bar in Hero card
- [ ] Color-coded: Red (<30%), Yellow (30-70%), Green (>70%)

---

## Test Cases

### TC1: 3-Column Layout Responsiveness
1. Open `/account/personal-info` on desktop (1920x1080)
2. Verify 3 columns visible: AppSidebar, Content (70%), Hero (30%)
3. Resize to tablet (768px)
4. Verify AppSidebar collapses, Content + Hero remain
5. Resize to mobile (375px)
6. Verify single column: Content, then Hero below

### TC2: Tab Navigation
1. Navigate to `/account` (default)
2. Verify redirects to `/account/personal-info`
3. Verify Personal Info tab active
4. Click "Professional Info" tab
5. Verify URL changes to `/account/professional`
6. Verify tab content updates
7. Verify active indicator moves to Professional Info
8. Click "Settings" tab
9. Verify URL changes to `/account/settings`
10. Verify settings content renders

### TC3: Avatar Upload
1. Navigate to `/account/personal-info`
2. Hover over avatar in Col 3
3. Verify overlay appears
4. Click avatar
5. Select test image (e.g., avatar.png)
6. Verify "Uploading..." state
7. Wait for upload
8. Verify avatar updates
9. Check Supabase Storage for new file
10. Check profiles.avatar_url updated

### TC4: Personal Info Update
1. Navigate to `/account/personal-info`
2. Update phone: +44 123 456 7890
3. Update country: United Kingdom
4. Click "Save Changes"
5. Verify toast: "Personal info updated successfully"
6. Refresh page
7. Verify changes persisted
8. Check profiles table in Supabase
9. Verify phone and country columns updated

### TC5: Professional Info (Tutor)
1. Sign in as tutor
2. Navigate to `/account/professional`
3. Verify TutorNarrative component renders
4. Click "Edit" on Bio section
5. Update bio text
6. Click "Save Changes" in modal
7. Verify modal closes
8. Verify bio updated in read-only view
9. Check profiles.bio column

### TC6: Change Password
1. Navigate to `/account/settings`
2. Enter current password
3. Enter new password (min 8 chars)
4. Confirm new password
5. Click "Update Password"
6. Verify success toast
7. Sign out
8. Sign in with NEW password
9. Verify login successful
10. Verify old password fails

### TC7: Delete Account
1. Navigate to `/account/settings`
2. Click "Delete My Account"
3. Modal appears with confirmation
4. Type "DELETE" in confirmation field
5. Click final "Delete Account" button
6. Verify API call to /api/user/delete
7. Verify redirect to homepage
8. Verify session cleared
9. Try signing in with old credentials
10. Verify user no longer exists

### TC8: Legacy Redirects
1. Navigate to `/profile`
2. Verify redirects to `/account/personal-info`
3. Navigate to `/settings/change-password`
4. Verify redirects to `/account/settings`
5. Navigate to `/delete-account`
6. Verify redirects to `/account/settings`
7. Navigate to `/profile/abc123` (someone else's profile)
8. Verify redirects to `/public-profile/abc123`

---

## Success Metrics

1. **User Confusion Reduction**: 90% of users find account settings on first try (vs 40% currently)
2. **Profile Completeness**: 70% of users achieve >80% profile completion within 7 days
3. **Avatar Upload Rate**: 80% of users upload custom avatar within 14 days
4. **Settings Discoverability**: 100% of users can find password change without support tickets
5. **Legacy Route Transitions**: 0 broken links after migration

---

## Integration Points

### Authentication Feature
- Uses UserProfileContext for current user data
- Uses Supabase auth for password change, account deletion
- Respects RLS policies on profiles table

### Onboarding Feature
- Profile completeness score influences onboarding progress
- New users directed to account hub after onboarding

### Public Profile Feature
- "View Public Profile" link in Hero card navigates to /public-profile/[id]/[slug]
- Professional info components shared between account hub (edit mode) and public profile (read-only)

### Reviews Feature
- Credibility score in RoleStatsCard comes from reviews

### Bookings Feature
- Completed bookings count in RoleStatsCard (clients)

### Network Feature
- Network size in RoleStatsCard (agents)

### Listings Feature
- Rates in RoleStatsCard pulled from user's listings

---

## Dependencies

### Database
- profiles table: All user data (personal, professional, metadata)
- No schema changes needed (pure frontend refactor)

### Components
- Reuse: StatCard, StatGrid from Network Hub (v4.4)
- Move: TutorNarrative, ClientProfessionalInfo, AgentProfessionalInfo from /components/profile/ to /components/account/professional/
- New: AccountTabs, HeroProfileCard, RoleStatsCard, ProfessionalInfoEditor

### Hooks
- useUserProfile: Access current user and profile data
- useImageUpload: Handle avatar upload
- useRoleGuard: Protect role-specific content (if needed)

### Context
- UserProfileContext: Global auth and profile state

---

## Technical Notes

### Layout Nesting
```
/(authenticated)/layout.tsx (provides AppSidebar)
  └─ /account/layout.tsx (provides 70:30 grid for Content + Hero)
      └─ /account/personal-info/page.tsx (renders in Content area)
```

### Form Pattern Decisions
- **Personal Info**: Single card with explicit "Save Changes" button (NO auto-save)
  - Rationale: User expects control over when changes are saved
  - 2-column grid for short fields (name, phone, email, country)
- **Professional Info**: Read-only display with "Edit" modals
  - Rationale: Preserves existing UX, users already familiar with modal editing
  - 1-column layout for long text fields (bio, qualifications)

### Avatar Upload Flow
```
1. User clicks avatar
2. File input opens
3. User selects file
4. useImageUpload hook triggered
5. Upload to Supabase Storage (bucket: avatars)
6. Get public URL
7. Update profiles.avatar_url
8. Refresh UserProfileContext
9. Avatar re-renders with new image
```

### Middleware Redirect Logic
```typescript
// In middleware.ts
if (request.nextUrl.pathname === '/profile') {
  return NextResponse.redirect(new URL('/account/personal-info', request.url));
}

if (request.nextUrl.pathname.startsWith('/profile/')) {
  const id = request.nextUrl.pathname.split('/')[2];
  if (id) {
    return NextResponse.redirect(new URL(`/public-profile/${id}`, request.url));
  }
  return NextResponse.redirect(new URL('/account/personal-info', request.url));
}

if (request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname === '/delete-account') {
  return NextResponse.redirect(new URL('/account/settings', request.url));
}
```

---

**Last Updated**: 2025-12-12
**For Implementation**: See `account-solution-design-v4.7.md`
