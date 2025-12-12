# Profile Management - Updated Specification

**Last Updated:** October 5, 2025
**Status:** Design Complete - Ready for Implementation
**Sources:** Roadmap + Figma Design + Current Implementation

**Latest Changes (Oct 5):**
- ✅ Added "Editable Template + Duplicate" architecture for Professional Info
- ✅ Clarified role_details as reusable template (not one-time seed)
- ✅ Decoupled template from listings (no cascading updates)
- ✅ Updated user flows to show template editing and listing creation separately
- ✅ Added API endpoints for template-based listing creation

---

## Executive Summary

This specification implements **minimalist profiles** that serve only as **identity and trust containers**, while moving all professional and service information to **listings**. This aligns with:

1. **Roadmap principle:** Listings are the atomic unit, profiles are wrappers
2. **Figma design:** Clear separation of Personal Info vs Professional Info
3. **Current code:** Onboarding data in `role_details` table

**Key Changes from Previous Design:**
- ❌ **No** "Tutor Profile tab" or "Agent Profile tab" in public view
- ✅ **Instead:** Basic profile + "View Listings" button
- ❌ **No** direct display of role_details data
- ✅ **Instead:** role_details seeds listing creation, editable in Account settings

---

## Profile Architecture

### Two Profile Views

| View Type | Route | Purpose | Visibility |
|-----------|-------|---------|------------|
| **Public Profile** | `/profile/[username]` | What others see | Everyone |
| **Account Settings** | `/account` | User edits their own data | Owner only |

---

## 1. Public Profile (Minimal)

**Purpose:** Identity, trust, and discovery entry point

**Route:** `/profile/[username]` or `/u/[username]`

### Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     PUBLIC PROFILE                           │
├──────────────┬──────────────────────────────────────────────┤
│              │  Mike Quinn                                   │
│   [Avatar]   │  🎓 Tutor • 🏠 Agent                          │
│              │  📍 London, UK                                │
│   ⭐⭐⭐⭐⭐   │  Member since Jan 2025                        │
│   4.8 (42)   │                                               │
│              │  "Passionate about helping students succeed"  │
│              │                                               │
│  Trust       │  ✓ Email verified                             │
│  Badges:     │  ✓ Phone verified                             │
│  ✓ DBS       │  ✓ DBS checked                                │
│  ✓ QTS       │  ✓ QTS certified                              │
│              │                                               │
├──────────────┼──────────────────────────────────────────────┤
│              │  TABS: [Listings] [Reviews] [About]          │
│              │                                               │
│              │  ┌────────────────────────────────────────┐   │
│              │  │ 📚 GCSE Maths Tutoring      [Active]  │   │
│              │  │ £45/hr • Online & In-person           │   │
│              │  │ ⭐ 4.9 (28 reviews)                    │   │
│              │  │ [View Listing] [Message]              │   │
│              │  └────────────────────────────────────────┘   │
│              │  ┌────────────────────────────────────────┐   │
│              │  │ 👥 Easter Revision Bootcamp [Active]  │   │
│              │  │ £180/student • 8/15 enrolled          │   │
│              │  │ Starts Apr 15, 2025                   │   │
│              │  │ [View Details] [Enroll]               │   │
│              │  └────────────────────────────────────────┘   │
│              │                                               │
└──────────────┴──────────────────────────────────────────────┘
```

### Data Model

```typescript
interface PublicProfile {
  // Identity
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string; // Max 280 characters

  // Basic Info
  location_city?: string;
  location_country?: string;
  member_since: DateTime;

  // Roles (from profiles.roles)
  roles: ('client' | 'tutor' | 'agent')[];

  // Trust Badges (computed from verifications table)
  trust_badges: TrustBadge[];

  // Stats (computed from listings + bookings)
  avg_rating?: number;
  total_reviews: number;
  total_completed_sessions?: number;
  response_rate?: number; // % of messages replied within 24h

  // Active Listings (fetched separately)
  active_listing_count: number;
}

interface TrustBadge {
  type: 'email' | 'phone' | 'dbs' | 'qts' | 'id_verified' | 'payment_verified';
  verified: boolean;
  verified_at?: DateTime;
  issuer?: string; // E.g., "Disclosure Scotland"
}
```

### Component Structure

**File:** `apps/web/src/app/profile/[username]/page.tsx`

```tsx
export default async function PublicProfilePage({
  params: { username }
}: {
  params: { username: string }
}) {
  const profile = await getPublicProfile(username);
  const listings = await getUserActiveListings(profile.user_id);

  return (
    <ProfileLayout>
      <ProfileHeader profile={profile} />
      <ProfileTabs>
        <ListingsTab listings={listings} />
        <ReviewsTab userId={profile.user_id} />
        <AboutTab bio={profile.bio} memberSince={profile.member_since} />
      </ProfileTabs>
    </ProfileLayout>
  );
}
```

### Figma Alignment

**Uses:**
- "Home > Tutors > John Lee" component as template
- Shows avatar, name, basic stats
- Main content is listings (links to full listing pages)

**Differences from Figma:**
- Figma may show more professional info (subjects, rates)
- **We simplify:** Just show active listings as cards
- Professional details live on individual listing pages

---

## 2. Account Settings (Private - Owner Only)

**Purpose:** User manages their own data

**Route:** `/account`

### Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ACCOUNT SETTINGS                                            │
├─────────────────────────────────────────────────────────────┤
│  TABS: [Personal Info] [Professional Info] [Settings]       │
│        [Security] [Billing]                                  │
├─────────────────────────────────────────────────────────────┤
│  (Content based on active tab)                               │
└─────────────────────────────────────────────────────────────┘
```

### Tab 1: Personal Info

**What it contains:**
- Display name
- Avatar upload
- Bio (public)
- Contact email (private)
- Phone number (private)
- Location (city/country, public)
- Preferred language
- Timezone

**Figma Mapping:**
- "Account > Client > Personal Info"
- "Account > Tutor > Personal Info"
- "Account > Agent > Personal Info"

**All three Figma screens are identical** → We use one unified component

```typescript
interface PersonalInfo {
  display_name: string;
  avatar_url?: string;
  bio?: string; // Max 280 chars
  email: string; // From Supabase auth
  phone?: string;
  location_city?: string;
  location_country?: string;
  preferred_language: string;
  timezone: string;
}
```

---

### Tab 2: Professional Info (Editable Template)

**Purpose:** Manage reusable professional information template for creating listings

**What is this?**
This is an **editable template** stored in `role_details` that serves as:
1. ✅ **Reusable baseline** for creating new listings quickly
2. ✅ **Editable anytime** - user can update their template as they gain experience
3. ✅ **Duplicatable** - click "Use Template" when creating new listings to pre-fill data
4. ❌ **NOT displayed on public profile** - exists only for user's convenience

**Key Principle:** Template and listings are **decoupled**
- Editing template does NOT change existing published listings
- Each listing is independent once created
- Template provides consistency without limiting customization

**Figma Mapping:**
- "Account > Client > Professional Info"
- "Account > Tutor > Professional Info"
- "Account > Agent > Professional Info"

**Role-Specific Fields:**

#### Client Professional Info
```typescript
interface ClientProfessionalInfo {
  // Child/Student Info (if applicable)
  student_ages?: number[];
  subjects_of_interest?: string[];
  learning_goals?: string[];
  preferred_teaching_style?: string[];
  budget_range?: { min: number; max: number };

  // Preferences
  preferred_session_length?: number; // minutes
  preferred_session_frequency?: string;
  preferred_delivery_format?: ('online' | 'in_person' | 'hybrid')[];
}
```

#### Tutor Professional Info (from `role_details`)
```typescript
interface TutorProfessionalInfo {
  // Teaching
  subjects: string[]; // Canonical IDs
  levels: string[]; // GCSE, A-Level, etc.
  teaching_experience_years: number;
  teaching_methods: string[];

  // Rates & Availability (baseline, not binding)
  hourly_rate_range?: { min: number; max: number };
  typical_availability?: AvailabilityWindow[];

  // Credentials
  qualifications: Qualification[];
  certifications: Certification[];
  specializations: string[];

  // Preferences
  max_students_per_week?: number;
  preferred_student_age_range?: { min: number; max: number };
  willing_to_travel?: boolean;
  travel_radius_km?: number;
}
```

#### Agent Professional Info (from `role_details`)
```typescript
interface AgentProfessionalInfo {
  // Agency Details
  agency_name: string;
  agency_size: number;
  years_in_business: number;
  agency_description: string;

  // Services
  services_offered: string[]; // 'tutoring', 'courses', 'group_sessions'
  subject_specializations: string[];
  commission_rate?: number;

  // Coverage
  service_areas: string[]; // Geographic areas
  online_service_available: boolean;

  // Capacity
  student_capacity: number;
  tutor_network_size?: number;
}
```

**UI Flow - Editing Template:**
1. User goes to Account > Professional Info
2. Sees current template data (from `role_details`)
3. User edits fields (e.g., adds new qualification, updates subjects)
4. **On Save:**
   - Updates `role_details` table
   - Shows success message: "✅ Template saved"
   - Shows note: "Changes won't affect your existing listings"

**UI Flow - Creating Listing from Template:**
1. User clicks "Create New Listing" from dashboard or My Listings
2. Sees two options:
   - **[Use Professional Info Template]** ← Primary CTA (button)
   - **[Start From Scratch]** ← Secondary option (link)
3. **If "Use Template":**
   - Listing form opens pre-filled with template data
   - User customizes for this specific listing (e.g., change title, pricing)
   - User publishes → Saved as new independent listing
   - Template remains unchanged
4. **If "Start Fresh":**
   - Empty listing form
   - No connection to template

---

### Tab 3: Settings

**What it contains:**
- Account preferences
- Notification settings
- Privacy settings
- Communication preferences

```typescript
interface AccountSettings {
  // Notifications
  email_notifications: {
    new_match: boolean;
    new_message: boolean;
    booking_reminder: boolean;
    marketing: boolean;
  };
  sms_notifications: {
    booking_reminder: boolean;
    urgent_messages: boolean;
  };

  // Privacy
  profile_visibility: 'public' | 'listings_only' | 'private';
  show_last_active: boolean;
  allow_messages_from: 'anyone' | 'matched_only' | 'nobody';

  // Communication
  auto_reply_message?: string;
  response_time_target: number; // hours
}
```

**Figma Mapping:**
- "Account > Client > Settings"
- "Account > Tutor > Settings"
- "Account > Agent > Settings"

---

### Tab 4: Security

**What it contains:**
- Password change (Supabase Auth)
- 2FA setup
- Active sessions
- Trust verifications

```typescript
interface SecuritySettings {
  // Auth
  password_last_changed: DateTime;
  two_factor_enabled: boolean;
  active_sessions: Session[];

  // Verifications
  verifications: {
    email: { verified: boolean; verified_at?: DateTime };
    phone: { verified: boolean; verified_at?: DateTime };
    identity: { verified: boolean; verified_at?: DateTime; doc_type?: string };
    dbs: { verified: boolean; verified_at?: DateTime; expiry?: DateTime };
    qts: { verified: boolean; verified_at?: DateTime; number?: string };
  };

  // Audit
  recent_login_attempts: LoginAttempt[];
}
```

---

### Tab 5: Billing (Future)

**What it contains:**
- Payment methods
- Payout settings (for tutors/agents)
- Transaction history
- Invoices

---

## Database Schema

### Profiles Table (Existing)

```sql
-- Minimal profile (identity only)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT CHECK (char_length(bio) <= 280),

    -- Basic Info
    location_city TEXT,
    location_country TEXT,
    preferred_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'Europe/London',

    -- Roles
    roles TEXT[] DEFAULT ARRAY['client'], -- Can have multiple

    -- Contact (private)
    phone TEXT,

    -- Metadata
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_progress JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read for basic info
CREATE POLICY "Public profiles viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
```

### Role Details Table (Existing)

```sql
-- Professional info (NOT shown on public profile)
CREATE TABLE role_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('client', 'tutor', 'agent')),

    -- JSON storage for role-specific data
    details JSONB NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(profile_id, role)
);

-- Example details JSONB structure for tutor:
{
  "subjects": ["GCSE_MATHS", "GCSE_PHYSICS"],
  "levels": ["GCSE", "A_LEVEL"],
  "teaching_experience_years": 5,
  "hourly_rate_range": {"min": 40, "max": 60},
  "qualifications": [
    {
      "type": "degree",
      "institution": "University of Oxford",
      "subject": "Mathematics",
      "year": 2018
    }
  ],
  "certifications": ["QTS"],
  "specializations": ["exam_prep", "oxbridge_prep"]
}
```

### Trust Verifications Table (New)

```sql
CREATE TABLE trust_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL CHECK (verification_type IN (
        'email', 'phone', 'identity', 'dbs', 'qts', 'degree', 'custom'
    )),

    -- Verification Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'verified', 'rejected', 'expired'
    )),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Verification Details
    issuer TEXT, -- E.g., "Disclosure Scotland"
    reference_number TEXT,
    document_url TEXT, -- Secure storage link
    metadata JSONB,

    -- Audit
    verified_by UUID REFERENCES profiles(id), -- Admin who verified
    rejection_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trust_verifications_profile ON trust_verifications(profile_id);
CREATE INDEX idx_trust_verifications_type_status ON trust_verifications(verification_type, status);
```

### Profile Stats View (Computed)

```sql
CREATE VIEW profile_stats AS
SELECT
    p.id AS profile_id,

    -- Listing Stats
    COUNT(DISTINCT l.listing_id) FILTER (WHERE l.status = 'active') AS active_listing_count,
    COUNT(DISTINCT l.listing_id) AS total_listing_count,

    -- Booking Stats (from future bookings table)
    -- COUNT(DISTINCT b.booking_id) FILTER (WHERE b.status = 'completed') AS completed_session_count,

    -- Review Stats (from future reviews table)
    -- AVG(r.rating) AS avg_rating,
    -- COUNT(r.review_id) AS total_reviews,

    -- Response Stats (from future messages table)
    -- (COUNT(m.id) FILTER (WHERE m.replied_within_24h = TRUE)::FLOAT /
    --  NULLIF(COUNT(m.id), 0)) AS response_rate

    NULL::NUMERIC AS avg_rating, -- Placeholder
    0 AS total_reviews,
    NULL::NUMERIC AS response_rate

FROM profiles p
LEFT JOIN listings l ON p.id = l.user_id
GROUP BY p.id;
```

---

## Template Architecture Details

### Why "Editable Template + Duplicate" Works

**1. Clear Mental Model**
- Users understand "templates" from other platforms (email templates, document templates)
- "Duplicate to create listing" is explicit vs implicit pre-fill
- Editing template doesn't accidentally affect published content

**2. Flexibility Without Complexity**
- Users can evolve their template as they gain experience or certifications
- Multiple listings can coexist with different specializations
  - Example: "Piano Tutor" listing vs "Music Theory" listing
  - Both created from same base template, customized differently

**3. Data Flow**
```
┌─────────────────────────────────────────────────────────────┐
│ ONBOARDING (One-time)                                       │
├─────────────────────────────────────────────────────────────┤
│ 1. User completes professional info form                    │
│ 2. Saved to profiles.role_details (editable template)      │
│ 3. User sees: "✅ Template saved! Create your first listing?"│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ ACCOUNT > PROFESSIONAL INFO (Anytime)                       │
├─────────────────────────────────────────────────────────────┤
│ [Edit all fields]                                           │
│ [Save Template] ← Updates role_details                     │
│                                                             │
│ Note: "This template helps you create new listings faster. │
│        Changes won't affect your existing listings."       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ CREATE LISTING (Each time user wants new listing)          │
├─────────────────────────────────────────────────────────────┤
│ [Use Professional Info Template] ← Duplicates role_details │
│ [Start From Scratch]                                        │
│                                                             │
│ → Form pre-filled with template data                       │
│ → User customizes for THIS specific listing                │
│ → Saves as NEW row in listings table                       │
│ → Template remains unchanged                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ PUBLISHED LISTING (Independent entity)                     │
├─────────────────────────────────────────────────────────────┤
│ - Stored in listings table                                 │
│ - Has own listing_id                                       │
│ - Can be edited independently                              │
│ - NOT affected by template changes                        │
└─────────────────────────────────────────────────────────────┘
```

### MVP Implementation (Phase 0)

**Single Template Approach:**
- One template per user stored in `profiles.role_details` (existing table)
- Simpler UX, no additional tables needed
- Sufficient for most users

**Future Enhancement (Phase 1):**
```sql
-- Multiple templates for power users
CREATE TABLE listing_templates (
  template_id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT, -- "Piano Tutor", "Music Theory", etc.
  template_data JSONB,
  is_default BOOLEAN
);
```
- Allows multi-subject tutors to have specialized templates
- "Piano Tutor Template" + "Guitar Tutor Template"
- Not needed for MVP

### Technical Notes

**Database Decoupling:**
```sql
-- Template (role_details) - NO foreign key from listings
profiles.role_details JSONB

-- Listings - independent rows
CREATE TABLE listings (
  listing_id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),

  -- Template data copied at creation time
  subjects TEXT[],
  levels TEXT[],
  qualifications JSONB,

  created_from_template BOOLEAN DEFAULT false,
  -- NO foreign key to template (fully decoupled)
);
```

**Key Principle:** No cascading updates. Template changes are isolated from listings.

---

## API Endpoints

### Public Profile

```typescript
// GET /api/profile/[username]
interface GetPublicProfileResponse {
  profile: PublicProfile;
  listings: ListingSummary[];
  stats: ProfileStats;
  trust_badges: TrustBadge[];
}
```

### Account Settings

```typescript
// GET /api/account/personal-info (authed)
interface GetPersonalInfoResponse {
  personal_info: PersonalInfo;
}

// PATCH /api/account/personal-info (authed)
interface UpdatePersonalInfoRequest {
  display_name?: string;
  bio?: string;
  location_city?: string;
  // ... other fields
}

// GET /api/account/professional-info (authed)
interface GetProfessionalInfoResponse {
  role: 'client' | 'tutor' | 'agent';
  details: ClientProfessionalInfo | TutorProfessionalInfo | AgentProfessionalInfo;
}

// PATCH /api/account/professional-info (authed)
interface UpdateProfessionalInfoRequest {
  role: 'client' | 'tutor' | 'agent';
  details: Record<string, any>; // Role-specific JSONB
}

// GET /api/account/settings (authed)
// PATCH /api/account/settings (authed)

// GET /api/account/security (authed)
// POST /api/account/verify/email (authed)
// POST /api/account/verify/phone (authed)

### Listing Creation from Template

```typescript
// POST /api/listings/create-from-template (authed)
interface CreateListingFromTemplateRequest {
  listing_type: 'tutor_service' | 'client_request' | 'agent_job' | 'agent_group_session' | 'agent_course';
  use_template: boolean;
}

interface CreateListingFromTemplateResponse {
  // Pre-filled form data from role_details template
  template_data: {
    subjects?: string[];
    levels?: string[];
    qualifications?: Qualification[];
    hourly_rate_range?: { min: number; max: number };
    bio?: string;
    // ... other template fields
  };
  listing_id: null; // New listing, not saved yet
  can_customize: true;
}

// POST /api/listings (authed) - Create new listing
interface CreateListingRequest {
  type: string;
  data: Record<string, any>; // Listing-specific data
  created_from_template: boolean;
}
```

---

## Component Architecture

```
apps/web/src/app/
  profile/
    [username]/
      page.tsx                 # Public profile page
      layout.tsx              # Profile layout wrapper
      components/
        ProfileHeader.tsx     # Avatar, name, trust badges
        ListingsTab.tsx       # User's active listings
        ReviewsTab.tsx        # Reviews for this user
        AboutTab.tsx          # Bio and member since

  account/
    page.tsx                   # Redirect to /account/personal-info
    layout.tsx                 # Account settings layout with tabs
    personal-info/
      page.tsx
    professional-info/
      page.tsx
    settings/
      page.tsx
    security/
      page.tsx
    billing/
      page.tsx
    components/
      AccountTabs.tsx          # Shared tab navigation
      PersonalInfoForm.tsx
      ProfessionalInfoForm/
        ClientForm.tsx
        TutorForm.tsx
        AgentForm.tsx
      SettingsForm.tsx
      SecurityPanel.tsx
      TrustBadgeManager.tsx
```

---

## User Flows

### Flow 1: New User Views Tutor Profile

1. User lands on `/profile/john-lee`
2. See basic info: name, avatar, bio, trust badges
3. **Listings Tab (default):**
   - See 2 active tutor service listings
   - Click "View Listing" → Goes to full listing page with details
4. **Reviews Tab:**
   - See reviews from past students
5. **About Tab:**
   - Read longer bio, member since

### Flow 2: Tutor Updates Professional Info Template

1. Tutor goes to `/account/professional-info`
2. Sees current template data from `role_details`:
   - Subjects: GCSE Maths, A-Level Physics
   - Hourly rate range: £40-50
   - Qualifications: BSc Mathematics (Oxford)
3. **Edits:** Adds new subject (GCSE Chemistry) and certification (QTS)
4. **Saves:** Updates `role_details` table
5. **Success message:** "✅ Template saved. Changes won't affect your existing listings."
6. Tutor can now create new listings using the updated template

### Flow 2b: Tutor Creates Listing from Updated Template

1. Tutor goes to Dashboard → "Create New Listing"
2. Sees options:
   - **[Use Professional Info Template]** ← clicks this
   - [Start From Scratch]
3. Listing form opens pre-filled with template:
   - Subjects: GCSE Maths, Physics, Chemistry ✅ (includes newly added)
   - Rate: £45/hr (tutor customizes to specific rate)
   - Qualifications: BSc + QTS ✅ (automatically included)
4. **Tutor customizes:**
   - Title: "Expert GCSE Chemistry Tutor"
   - Removes Maths/Physics from THIS listing
   - Sets specific availability
5. **Publishes** → New independent listing created
6. **Template unchanged** - still has all three subjects for future use

### Flow 3: Client Edits Personal Info

1. Client goes to `/account/personal-info`
2. Updates bio and location
3. Saves → Updates `profiles` table
4. Change instantly visible on public profile

---

## Migration from Current Onboarding

**Current State:**
- Onboarding saves to `role_details` table ✅
- Data is NOT displayed anywhere ❌

**Migration Plan:**

### Step 1: Keep Existing Onboarding
- Don't change onboarding wizard
- Continue saving to `role_details`

### Step 2: Add Account > Professional Info Page (Template Editor)
- Read from `role_details`
- Allow editing as reusable template
- On save, show: "✅ Template saved. Use it to create listings anytime."
- No automatic listing creation prompt (decoupled)

### Step 3: Update Public Profile
- Remove any professional data display
- Show only basic info + listings

### Step 4: Add "Create from Template" Flow
- **Create Listing Page** shows two options:
  - [Use Professional Info Template] ← Primary
  - [Start From Scratch] ← Secondary
- If template selected:
  - Pre-fill form with `role_details` data
  - User customizes for specific listing
  - Save as independent listing

### Step 5: Post-Onboarding Prompt
- After onboarding completes, show:
  - "✨ Your professional info is saved as a template!"
  - "Create your first listing from it?"
  - Button: [Use Template to Create Listing]
- Clicking button → Goes to Create Listing with template pre-filled
- User customizes and publishes

---

## Success Metrics

1. **Profile Completeness:**
   - % users with avatar
   - % users with bio
   - Average trust badges per user

2. **Profile → Listing Conversion:**
   - % users who create listing after updating professional info
   - Time from profile update to listing creation

3. **Public Profile Engagement:**
   - Profile views → listing views
   - Profile views → contact/message rate

4. **Trust:**
   - % users with email verified
   - % tutors with DBS verification
   - % users with 2+ trust badges

---

## Next Steps

1. ✅ Review and approve specification
2. Build Account Settings pages:
   - Personal Info form
   - Professional Info forms (role-specific)
   - Settings page
3. Build Public Profile page:
   - Minimal design
   - Listings tab
4. Add prompt after onboarding:
   - "Create your first listing from profile data"
5. Remove any professional data from public profile display
