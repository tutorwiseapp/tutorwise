# public-profile-solution-design-v4.8

Tpublic-profile-solution-design-v4.8

**Prompt:**

**Analyse my proposed solution in \`public-profile-solution-design-v4.8.md\`.**

- **Review and propose a solution that is functional, reliable, align to the standard dashboard Hub UI/UX and design-system.md.**
- **Implement and integrate with the application existing features/files for viral growth.**
- **Ask me any questions.**

* * *

### **public-profile solution-design-v4.8**

- **Version:** 4.8
- **Date:** 2025-11-10
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisite:** v4.3 (Referrals), v4.4 (Network), v4.5 (Reviews), v4.7 (Account Hub)

### 1.0 Executive Summary

This document details the architecture for the Public Profile Page (v4.8). This is the "public shop window" for all roles (Tutor, Client, Agent) and is the primary conversion point where our Network, Referral, and Review systems converge . This design replaces all legacy profile viewers (`/profile/[id]`).

This update enhances the v4.8 design with two key architectural improvements:

1. **Unified Tab Structure:** All roles (Tutor, Client, Agent) will now display the **same three tabs** ("About," "Services," "Reviews") for a consistent, equitable user experience. The content within these tabs remains role-specific.
2. **Resilient SEO-Friendly URLs:** The URL structure is upgraded from `.../[id]` to `.../[id]/[[...slug]]` to provide permanent, unbreakable links (via the `id`) that are also human-readable and SEO-friendly (via the `slug`).

**Key Design Principles:**

- **SEO-First:** The page must be a Next.js Server Component to ensure it is server-rendered, fast, and indexable by Google.
- **Unified Tab Structure:** The layout will feature a consistent 3-tab structure for all roles. The content *within* these tabs will adapt based on the role of the profile being viewed.
- **Resilient SEO-Friendly URLs:** All public-facing links will use the `[id]/[slug]` format. The page will only fetch data using the `[id]`, guaranteeing links never break, and will 301-redirect to the correct `slug` if a user's name changes.
- **Viral Loop Integration (v4.3):** The "Share Profile" button is a key growth feature, leveraging our "First-to-Refer" commission model .
- **Resilient Referral Tracking (v4.8):** The robust, 3-layer attribution system ("Cookie + IP Match + Manual Field") is retained to ensure referral conversions are not lost.

* * *

### 2.0 Architectural & File Structure

This design consolidates all public-facing profile logic into one route.

- **Primary File (Updated):** `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`
  - This will be the single, server-rendered page for viewing all profiles.
  - The page component will receive `params: { id: string, slug?: string[] }`.
  - It will fetch data using **only** the `params.id` with the server-side Supabase client (`apps/web/src/utils/supabase/server.ts`).
  - It **must** include logic to validate the `slug` and perform a 301 permanent redirect if it does not match the profile's current `slug`, ensuring SEO integrity.
- **Data Fetching & Redirect Logic (New):**
```
TypeScript
```
```
// In apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { generateSlug } from '@/lib/utils/slugify'; // (New utility function)
export default async function PublicProfilePage({ params }) {
  const supabase = createClient();
  // 1. Fetch profile using ONLY the ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, slug') // (Ensure 'slug' is selected)
    .eq('id', params.id)
    .single();
  if (!profile) {
    notFound();
  }
  // 2. Get the current correct slug (or generate if missing)
  const correctSlug = profile.slug || generateSlug(profile.full_name);
  // 3. Get the slug from the URL
  const urlSlug = params.slug?.[0] || '';
  // 4. Validate and redirect if slugs do not match
  if (correctSlug !== urlSlug) {
    return redirect(`/public-profile/${profile.id}/${correctSlug}`, 'permanent');
  }
  // ... rest of page rendering logic
}
```
- **Legacy Files (To Be Deleted):**
  - `apps/web/src/app/profile/[id]/page.tsx`
- **Redirect (Retained):**
  - The `middleware.ts` will redirect any legacy `/profile/[id]` traffic to the new `/public-profile/[id]/[slug]` route .

* * *

### 3.0 UI Layout: 2-Column (70:30)

The 2-column layout (70:30 split) is retained . It does not include the main `AppSidebar`.

- **File:** `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`
- **CSS:** `apps/web/src/app/public-profile/[id]/page.module.css`

**ASCII Diagram:** `public-profile/[id]/[[...slug]]/page.tsx` **(Updated v4.8)**

```
+
+
[Header] (Logo, Nav, Login/Signup)
+
+
+-------------------------------------------------+----------------------------------+
| [Column 1: Main Content (70%)]                  | [Column 2: Sidebar (30%)]        |
|                                                 |                                  |
| +-[UnifiedProfileTabs]------------------------+ | +-[PublicHeroCard]---------------+
| |                                             | | | (Avatar) (192x192)           |
| | [ About ] [ Services ] [ Reviews ]          | | | AAAAAAA^^^^^                 |
| | (Default)                                   | | | Michael Quan                 |
| |                                             | | | Tutor (5.0 ★★★★★)            |
| | Renders 'About' Tab Content:                | | | United Kingdom               |
| | +-[<TutorProfessionalInfo />]-------------+ | | +------------------------------+
| | |                                           | | |                                  |
| | | Bio: "..."                                | | | +-[PublicActionCard]-----------+
| | | Subjects: [...]                           | | | | [Book a Session (Primary)]   |
| | | Key Stages: [...]                         | | | | [ Connect ] (Secondary)      |
| | | ...                                       | | | | [ Message ] (Tertiary)     |
| | +-------------------------------------------+ | | | [ Share Profile ] (Tertiary) |
| |                                                 | | +------------------------------+
| |                                                 | | |                                  |
| |                                                 | | | +-[RoleStatsCard]--------------+
| |                                                 | | | | (Tutor Stats from v4.7)    |
| |                                                 | | | | [Credibility] [1-on-1 Rate]... |
| |                                                 | | +------------------------------+
| |                                                 | |                                  |
+-------------------------------------------------+----------------------------------+

```

* * *

### 4.0 Column 1: Main Content (`<UnifiedProfileTabs />`) (Updated v4.8)

This component renders the **unified 3-tab structure** for all roles. The "About" tab is the default for all profiles.

- **File (New):** `apps/web/src/app/components/public-profile/UnifiedProfileTabs.tsx`
- **Logic:** This component will be rendered in `page.tsx`'s `mainContent` (Column 1). It will render the same three tabs for everyone, using the `profile.active_role` to switch the *content* of the active tab panel.

#### **4.1 "About" Tab (Default)**

This tab serves as the primary introduction, displaying the user's read-only professional details.

- **Tutor:** Renders the standardized `<TutorProfessionalInfo />` component.
- **Client:** Renders the standardized `<ClientProfessionalInfo />` component.
- **Agent:** Renders the standardized `<AgentProfessionalInfo />` component.

#### **4.2 "Services" Tab**

This tab unifies the "Listings" concept under a more generic name to accommodate all roles.

- **Tutor:** Shows all active service listings created by the tutor.
  - **Fetches:** `supabase.from('listings').eq('profile_id', profile.id)`.
  - **Renders:** Maps results using the existing `<ListingCard />` component.
- **Client:** Shows all open "Lesson Requests" posted by the client.
  - **Fetches:** `supabase.from('lesson_requests').eq('client_id', profile.id).eq('status', 'open')`.
  - **Renders:** Maps results using the new `<LessonRequestCard />` component.
- **Agent (New Logic):** Shows the list of **Tutors and Listings** managed by this Agent.
  - **Fetches:** This will require new logic to fetch associated profiles and their listings.
  - **Renders:** Will render results using `<TutorCard />` and `<ListingCard />` components.

#### **4.3 "Reviews" Tab**

This tab's function is unchanged from v4.8 and is consistent for all roles.

- **All Roles:** Fetches and displays all *received* reviews for this profile.
  - **Fetches:** `GET /api/reviews/received?id=${profile.id}` (v4.5 API).
  - **Renders:** Maps results using the v4.5 `<ProfileReviewCard />`.

* * *

### 5.0 Column 2: Sidebar (Conversion & Identity)

**Retained in full from v4.8 design.** This column contains the user's core identity and primary CTAs.

- **Component 1 (New):** `<PublicHeroCard />`
  - **File:** `apps/web/src/app/components/public-profile/PublicHeroCard.tsx`
  - **Purpose:** Renders the user's core identity (Avatar, Name, Role, Rating, Country). This is a read-only version of the `<HeroProfileCard />` from the Account Hub .
- **Component 2 (New):** `<PublicActionCard />`
  - **File:** `apps/web/src/app/components/public-profile/PublicActionCard.tsx`
  - **Purpose:** The critical, dynamic conversion component. It renders different buttons based on the viewer's auth state .
  - **Logic:**
    - If viewing *own* profile: Renders `[ Edit My Profile ]` (links to `/account/personal-info`) .
    - If viewing *another* profile: Renders `[ Book a Session ]`, `[ Connect ]`, `[ Message ]`, and `[ Share Profile ]` .
- **Component 3 (Reused):** `<RoleStatsCard />`
  - **File:** `apps/web/src/app/components/account/RoleStatsCard.tsx`
  - **Purpose:** Reuses the exact same component from the v4.7 Account Hub to show consistent, role-aware public stats.

* * *

### 6.0 Resilient Referral Attribution (v4.8)

**Retained in full from v4.8 design, with updated link generation.**

#### **6.1 Strategy**

The 3-layer attribution model (Manual Field + IP Match + Cookie) is retained .

#### **6.2 Step 1: The "Share Profile" Button (Frontend) (Updated v4.8)**

- **File:** `apps/web/src/app/components/public-profile/PublicActionCard.tsx`
- **Action:** The `[ Share Profile ]` button, when clicked:
  - Gets the viewer's `profile.referral_code` from the `UserProfileContext`.
  - Gets the current page's path: `window.location.pathname` (e.g., `/public-profile/a1b2.../john-smith`).
  - **Generates the contextual referral link (Updated v4.8):**
```
TypeScript
```
```
// In PublicActionCard.tsx, 'profile' is the profile being *viewed*
const profileUrl = `/public-profile/${profile.id}/${profile.slug}`;
// 'viewerReferralCode' is from UserProfileContext
const referralLink = `${window.location.origin}/a/${viewerReferralCode}?redirect=${profileUrl}`;
```
  - Opens a modal (e.g., `<ShareModal />`) showing this link with a `[ Copy Link ]` button .

#### **6.3 Step 2: The Click & Log (Backend)**

- **File:** `apps/web/src/app/a/[referral_id]/route.ts`
- **Action:** This route handler must perform two actions:
  1. **Set Cookie:** Sets the `referral_code` cookie.
  2. **Log Click:** Gets the `request.ip` and logs it to the new `referral_click_log` table.
  - Redirects to the `?redirect=` path (e.g., `/public-profile/a1b2.../john-smith`).

#### **6.4 Step 3: The Signup Form (Frontend)**

- **File:** `apps/web/src/app/signup/page.tsx`
- **Action:**
  - Add a new, optional text field: `<Input label="Referral Code (Optional)" name="referral_code" />`.
  - On page load, a script checks for the `referral_code` cookie and pre-fills this field .

#### **6.5 Step 4: The Signup Logic (Backend)**

- **File:** `apps/api/migrations/051_update_handle_new_user_with_ip_match.sql`
- **Action:** The `handle_new_user` trigger is updated to use the 3-layer logic :
  1. **Layer 1 (Manual/Cookie):** Check for `referral_code` from the form field .
  2. **Layer 2 (IP Match):** If form is blank, try to match by IP from the `referral_click_log` .
  3. **Layer 3 (Cookie):** Handled by pre-filling the form field.

* * *

### 7.0 New "Lesson Request" Schema (For Client Profile)

**Retained in full from v4.8 design.** This schema is required for the Client's "Services" tab.

- **New Migration:** `apps/api/migrations/052_create_lesson_requests.sql`
  - **Schema:** Creates the `public.lesson_requests` table with `client_id`, `title`, `description`, `status`, etc. .
  - **RLS:** Allows users to manage their own requests and all users to view 'open' requests .
- **New Component:** `apps/web/src/app/components/public-profile/LessonRequestCard.tsx`
  - **Purpose:** Renders the `lesson_requests` data in the Client's "Services" tab.

* * *

### 8.0 Component Renaming & Standardization

**Retained in full from v4.8 design.** This is critical for the "About" tab.

- **Action:** Files in `apps/web/src/app/components/profile/` will be renamed and moved to `apps/web/src/app/components/account/professional/` .
- **Examples:**
  - `.../profile/TutorNarrative.tsx` → `.../account/professional/TutorProfessionalInfo.tsx`
  - `.../profile/ClientProfessionalInfo.tsx` → `.../account/professional/ClientProfessionalInfo.tsx`
  - `.../profile/AgentProfessionalInfo.tsx` → `.../account/professional/AgentProfessionalInfo.tsx`
- **Usage:** These newly named components will be imported and used (in read-only mode) by the `UnifiedProfileTabs.tsx` component for the "About" tab .

* * *

### 9.0 New Database Migrations (v4.8)

To support the `[id]/[slug]` URL structure, two new migrations are required.

- **New Migration 1:** `apps/api/migrations/053_add_profile_slugs.sql`
  - **Purpose:** Adds a `slug` column to the `profiles` table and a helper function to generate slugs.
```
SQL
```
```
-- Add a new 'slug' column to the profiles table
ALTER TABLE public.profiles
ADD COLUMN slug TEXT;
-- Create a function to generate a base slug from a name
CREATE OR REPLACE FUNCTION generate_slug(full_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- This regex replaces non-alphanumeric chars with a dash
  RETURN lower(regexp_replace(full_name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;
-- Add a unique index to enforce one-slug-per-user
CREATE UNIQUE INDEX idx_profiles_slug ON public.profiles(slug);
-- Add check to prevent empty slugs
ALTER TABLE public.profiles
ADD CONSTRAINT check_slug_not_empty CHECK (slug IS NOT NULL AND slug <> '');
```
- **New Migration 2:** `apps/api/migrations/054_update_handle_new_user_with_slug.sql`
  - **Purpose:** Modifies the existing `handle_new_user` trigger (from `051_...`) to automatically generate a unique `slug` on user creation.
```
SQL
```
```
-- This migration modifies the handle_new_user function from 051_...
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_profile_id UUID;
  v_referral_code TEXT := NEW.raw_user_meta_data->>'referral_code'; -- From form [cite: 238]
  v_request_ip INET;
  v_full_name TEXT := NEW.raw_user_meta_data->>'full_name';
  v_slug TEXT;
  v_slug_base TEXT;
  v_slug_count INT;
BEGIN
  -- ... (All v4.8 referral logic from 051_... remains here) [cite: 241-261]
  -- ... (v_referral_profile_id is set here)
  -- START: NEW SLUG LOGIC
  v_slug_base := generate_slug(v_full_name);
  v_slug := v_slug_base;
  v_slug_count := 1;
  -- Loop to find a unique slug if collisions exist (e.g., 'john-smith-2')
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug) LOOP
    v_slug_count := v_slug_count + 1;
    v_slug := v_slug_base || '-' || v_slug_count::TEXT;
  END LOOP;
  -- END: NEW SLUG LOGIC
  -- Insert the new profile with the referral ID and the new unique slug
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    referral_code,
    referred_by_profile_id,
    slug -- New column
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    generate_secure_referral_code(), -- From migration 035 [cite: 275]
    v_referral_profile_id, -- This is from Form, IP Match, or NULL [cite: 276]
    v_slug -- New value
  );
  RETURN NEW;
END;
$$;
```