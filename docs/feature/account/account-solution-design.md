# Account Feature - Solution Design

**Version**: v5.0 (Implemented)
**Last Updated**: 2025-12-12
**Status**: Active
**Architecture**: Multi-Role Profile System + Stripe Connect
**Owner**: Backend Team

---

## Executive Summary

The Account feature serves as the central identity hub for Tutorwise, managing user profiles, roles, settings, and integrations with virtually every platform feature. The system supports multi-role profiles (client, tutor, agent, student) with role-specific professional details, comprehensive verification workflows, Stripe Connect integration, and SEO-friendly public profiles.

**Key Capabilities**:
- **Multi-Role Support**: Users can have multiple roles and switch between them seamlessly
- **Role-Specific Professional Details**: JSONB storage for tutor (11 fields), client (10 fields), agent (16 fields)
- **Comprehensive Verification**: Identity, DBS, proof of address with admin approval workflows
- **Stripe Connect Integration**: Account onboarding, payout management, verification tracking
- **SEO-Friendly Public Profiles**: Slug-based URLs with 301 redirects, anonymous viewing
- **Onboarding Integration**: Role-specific wizard flows with progress tracking
- **Document Management**: Upload and verify identity docs, DBS certificates, proof of address
- **Profile Context**: Global state via `UserProfileContext` for all authenticated pages

---

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                  ACCOUNT SYSTEM ARCHITECTURE                        │
└────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                      ┌──────────────┐
│   User       │                                      │  Admin       │
│ (Profile     │                                      │ (Verification)│
│  Owner)      │                                      │              │
└──────┬───────┘                                      └──────┬───────┘
       │                                                     │
       │ 1. Sign Up                                         │
       ↓                                                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│              AUTHENTICATION (Supabase Auth)                         │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. User signs up (email/password or Google OAuth)             │ │
│ │ 2. Auth creates auth.users record                             │ │
│ │ 3. Trigger: handle_new_user() fires                           │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 2. Auto-Create Profile
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│              PROFILE AUTO-CREATION TRIGGER                          │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ handle_new_user() Trigger Logic:                              │ │
│ │ 1. Extract email, first_name, last_name from metadata         │ │
│ │ 2. Generate unique referral code (7 characters)               │ │
│ │ 3. Generate SEO slug from full_name ("john-smith")            │ │
│ │ 4. Handle slug collisions ("john-smith-2")                    │ │
│ │ 5. Create profiles record with default role='client'          │ │
│ │ 6. Initialize onboarding_progress = {}                        │ │
│ │ 7. Initialize professional_details = {}                       │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 3. Profile Created
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    PROFILES TABLE                                   │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ id: uuid (FK to auth.users.id)                                │ │
│ │ email, first_name, last_name, full_name                       │ │
│ │ roles: ['client'] (TEXT[])                                    │ │
│ │ active_role: 'client'                                         │ │
│ │ slug: 'john-smith' (SEO-friendly)                             │ │
│ │ referral_code: 'kRz7Bq2' (unique)                             │ │
│ │ onboarding_progress: {} (JSONB)                               │ │
│ │ professional_details: {} (JSONB)                              │ │
│ │ stripe_account_id: null                                       │ │
│ │ stripe_customer_id: null                                      │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 4. User Completes Onboarding
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ONBOARDING INTEGRATION                                 │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Role-Specific Wizard Flows:                                   │ │
│ │ - TutorOnboardingWizard: Role selection, subjects, bio, etc. │ │
│ │ - ClientOnboardingWizard: Learning goals, subjects, budget   │ │
│ │ - AgentOnboardingWizard: Agency info, services, commission   │ │
│ │                                                                │ │
│ │ Updates:                                                       │ │
│ │ - profiles.onboarding_progress: Track step completion         │ │
│ │ - profiles.professional_details: Store role-specific data     │ │
│ │ - profiles.roles: Add new role to array                       │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 5. User Manages Profile
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│              PROFILE MANAGEMENT FLOW                                │
│                                                                     │
│ ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐│
│ │ Personal Info       │  │ Professional Info   │  │ Settings     ││
│ │ /account/personal   │  │ /account/professional│ │ /account/    ││
│ │ -info               │  │ -info               │  │ settings     ││
│ │                     │  │                     │  │              ││
│ │ - Name, email       │  │ - Role-specific     │  │ - Password   ││
│ │ - Phone, address    │  │   fields (JSONB)    │  │ - Privacy    ││
│ │ - Emergency contact │  │ - Bio, video URL    │  │ - Free Help  ││
│ │ - Avatar upload     │  │ - Qualifications    │  │ - Delete     ││
│ │ - Documents         │  │ - Subjects, rates   │  │   Account    ││
│ └─────────────────────┘  └─────────────────────┘  └──────────────┘│
│                                                                     │
│ ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐│
│ │ Stripe Connect      │  │ Role Switcher       │  │ Public       ││
│ │ /account/stripe     │  │ (Header Component)  │  │ Profile      ││
│ │                     │  │                     │  │              ││
│ │ - Onboarding link   │  │ - Switch between    │  │ /public-     ││
│ │ - Account status    │  │   client/tutor/agent│  │ profile/     ││
│ │ - Verification      │  │ - Update active_role│  │ [id]/[slug]  ││
│ │ - Disconnect        │  │ - Persist in storage│  │              ││
│ └─────────────────────┘  └─────────────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## System Integrations

### 1. AUTHENTICATION INTEGRATION - CRITICAL DEPENDENCY

**How It Works**:

**Profile Auto-Creation on Signup**:
```sql
-- Trigger: handle_new_user() (Migration 000)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_slug TEXT;
  v_slug_base TEXT;
  v_slug_count INT := 1;
  v_full_name TEXT;
BEGIN
  -- Extract metadata
  v_full_name := NEW.raw_user_meta_data->>'full_name';

  -- Generate unique referral code
  v_referral_code := generate_referral_code(); -- 7 characters

  -- Generate SEO slug from full name
  v_slug_base := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug_base;

  -- Handle slug collisions
  WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = v_slug) LOOP
    v_slug_count := v_slug_count + 1;
    v_slug := v_slug_base || '-' || v_slug_count::TEXT;
  END LOOP;

  -- Create profile
  INSERT INTO profiles (
    id, email, first_name, last_name, full_name,
    referral_code, slug, roles, active_role,
    onboarding_progress, professional_details
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    v_full_name,
    v_referral_code,
    v_slug,
    ARRAY['client']::TEXT[],  -- Default role
    'client',
    '{}'::JSONB,  -- Empty onboarding progress
    '{}'::JSONB   -- Empty professional details
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**UserProfileContext Integration**:
```typescript
// apps/web/src/app/contexts/UserProfileContext.tsx

export const UserProfileProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);

          // Fetch profile from profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setProfile(profileData);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserProfileContext.Provider value={{ user, profile, ... }}>
      {children}
    </UserProfileContext.Provider>
  );
};
```

**Integration Points**:
- **Trigger**: `handle_new_user()` in Migration 000
- **Context**: `/apps/web/src/app/contexts/UserProfileContext.tsx`
- **Auth**: Supabase Auth `auth.users` table
- **Profile**: `profiles` table (1-to-1 FK relationship)

---

### 2. ONBOARDING INTEGRATION

**How It Works**:

**Onboarding Progress Tracking**:
```typescript
// profiles.onboarding_progress JSONB structure
{
  "onboarding_completed": false,
  "current_step": "role_selection",
  "steps_completed": ["welcome"],
  "tutor": {
    "role_selection": true,
    "subjects": false,
    "bio": false,
    ...
  }
}
```

**Role-Specific Wizard Flows**:
```typescript
// apps/web/src/app/onboarding/tutor/page.tsx
// TutorOnboardingWizard Component

const steps = [
  { id: 'role_selection', title: 'Choose Your Roles' },
  { id: 'subjects', title: 'Select Subjects' },
  { id: 'bio', title: 'Write Your Bio' },
  { id: 'qualifications', title: 'Add Qualifications' },
  { id: 'rates', title: 'Set Your Rates' },
];

const updateOnboardingProgress = async (step: string, data: any) => {
  await supabase
    .from('profiles')
    .update({
      onboarding_progress: {
        ...profile.onboarding_progress,
        current_step: step,
        tutor: {
          ...profile.onboarding_progress.tutor,
          [step]: true,
        },
      },
      professional_details: {
        ...profile.professional_details,
        ...data, // Role-specific data
      },
    })
    .eq('id', user.id);
};
```

**Middleware Enforcement**:
```typescript
// apps/web/src/middleware.ts

// Check if onboarding is complete
if (!profile.onboarding_progress?.onboarding_completed) {
  const currentStep = profile.onboarding_progress?.current_step || 'role_selection';
  return NextResponse.redirect(
    new URL(`/onboarding?step=${currentStep}`, request.url)
  );
}
```

**Integration Points**:
- **Pages**: `/apps/web/src/app/onboarding/**/page.tsx` (tutor, client, agent)
- **Context**: `UserProfileContext.updateOnboardingProgress()`
- **Middleware**: `/apps/web/src/middleware.ts` (enforcement)
- **Migration**: `004_add_onboarding_progress_to_profiles.sql`

---

### 3. ROLE MANAGEMENT INTEGRATION

**How It Works**:

**Multi-Role Support**:
```sql
-- Database Schema
ALTER TABLE profiles ADD COLUMN roles TEXT[] DEFAULT ARRAY['client'];
ALTER TABLE profiles ADD COLUMN active_role TEXT DEFAULT 'client';
ALTER TABLE profiles ADD COLUMN primary_role TEXT; -- User's main role
```

**Role Switcher Component**:
```typescript
// apps/web/src/app/components/layout/RoleSwitcher.tsx

const RoleSwitcher = () => {
  const { profile, switchRole } = useUserProfile();
  const availableRoles = profile.roles; // ['client', 'tutor', 'agent']
  const activeRole = profile.active_role; // 'tutor'

  const handleRoleSwitch = async (newRole: string) => {
    // Update database
    await supabase
      .from('profiles')
      .update({ active_role: newRole })
      .eq('id', profile.id);

    // Update localStorage for persistence
    localStorage.setItem('activeRole', newRole);

    // Update context
    switchRole(newRole);

    // Refresh page to load role-specific UI
    window.location.reload();
  };

  return (
    <Dropdown>
      {availableRoles.map(role => (
        <DropdownItem
          key={role}
          onClick={() => handleRoleSwitch(role)}
          active={role === activeRole}
        >
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </DropdownItem>
      ))}
    </Dropdown>
  );
};
```

**UserProfileContext Integration**:
```typescript
// Context provides role switching functionality
const { activeRole, availableRoles, switchRole } = useUserProfile();

const switchRole = async (newRole: string) => {
  // Validate user has access to role
  if (!profile.roles.includes(newRole)) {
    throw new Error('User does not have access to this role');
  }

  // Update profile state
  setProfile({ ...profile, active_role: newRole });

  // Persist to database and localStorage
  await updateActiveRole(newRole);
};
```

**Integration Points**:
- **Component**: `/apps/web/src/app/components/layout/RoleSwitcher.tsx`
- **Context**: `UserProfileContext.switchRole()`, `activeRole`, `availableRoles`
- **Storage**: localStorage persistence for role preferences
- **Dashboard**: Role-specific navigation and features

---

### 4. PROFESSIONAL DETAILS INTEGRATION (JSONB Storage)

**How It Works**:

**Role-Specific Fields** (Stored in `profiles.professional_details` JSONB):

**Tutor Fields** (11 fields):
```json
{
  "bio": "Experienced GCSE Maths tutor...",
  "video_url": "https://youtube.com/...",
  "status": "active",
  "academic_qualifications": ["BSc Mathematics"],
  "key_stages": ["KS3", "KS4", "A-Level"],
  "subjects": ["Mathematics", "Physics"],
  "teaching_qualifications": ["QTS", "PGCE"],
  "years_experience": 5,
  "session_types": ["1-on-1", "group"],
  "hourly_rate_1on1": 45.00,
  "hourly_rate_group": 30.00,
  "delivery_mode": ["online", "in-person"],
  "availability": "Monday-Friday 3-6pm"
}
```

**Client Fields** (10 fields):
```json
{
  "subjects": ["Mathematics"],
  "education_level": "GCSE",
  "learning_goals": "Improve algebra skills",
  "learning_preferences": "Visual learner",
  "budget_min": 30.00,
  "budget_max": 50.00,
  "sessions_per_week": 2,
  "preferred_duration": 60,
  "special_needs": "None",
  "availability": "Weekends"
}
```

**Agent Fields** (16 fields):
```json
{
  "agency_name": "Elite Tutoring Agency",
  "agency_size": "medium",
  "years_in_business": 10,
  "description": "Premium tutoring services...",
  "services_offered": ["1-on-1 tutoring", "exam prep"],
  "commission_rate": 15.00,
  "service_areas": ["London", "Birmingham"],
  "student_capacity": 100,
  "subject_specializations": ["STEM subjects"],
  "education_levels": ["GCSE", "A-Level"],
  "coverage_areas": ["Greater London"],
  "number_of_tutors": 25,
  "certifications": ["CRB checked"],
  "website": "https://...",
  "operating_hours": "Mon-Fri 9am-6pm",
  "languages": ["English", "Spanish"]
}
```

**Professional Info Form**:
```typescript
// apps/web/src/app/(authenticated)/account/professional-info/page.tsx

const ProfessionalInfoForm = () => {
  const { profile, activeRole } = useUserProfile();
  const [formData, setFormData] = useState(profile.professional_details);

  const handleSave = async () => {
    await supabase
      .from('profiles')
      .update({
        professional_details: {
          ...profile.professional_details,
          ...formData, // Merge with existing data
        },
      })
      .eq('id', profile.id);
  };

  // Render role-specific fields
  if (activeRole === 'tutor') {
    return <TutorFields data={formData} onChange={setFormData} />;
  } else if (activeRole === 'client') {
    return <ClientFields data={formData} onChange={setFormData} />;
  } else if (activeRole === 'agent') {
    return <AgentFields data={formData} onChange={setFormData} />;
  }
};
```

**Integration Points**:
- **Page**: `/apps/web/src/app/(authenticated)/account/professional-info/page.tsx`
- **Component**: `ProfessionalInfoForm.tsx`
- **Migration**: `026_drop_role_details_tables.sql` (consolidated to JSONB)
- **Context**: `UserProfileContext.profile.professional_details`

---

### 5. VERIFICATION & TRUST INTEGRATION

**How It Works**:

**Document Upload Fields**:
```sql
-- Identity Verification
ALTER TABLE profiles ADD COLUMN identity_verification_document_url TEXT;
ALTER TABLE profiles ADD COLUMN identity_document_number TEXT;
ALTER TABLE profiles ADD COLUMN identity_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN identity_verified_at TIMESTAMPTZ;

-- DBS Certificate
ALTER TABLE profiles ADD COLUMN dbs_certificate_url TEXT;
ALTER TABLE profiles ADD COLUMN dbs_certificate_number TEXT;
ALTER TABLE profiles ADD COLUMN dbs_certificate_date DATE;
ALTER TABLE profiles ADD COLUMN dbs_expiry_date DATE;
ALTER TABLE profiles ADD COLUMN dbs_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN dbs_verified_at TIMESTAMPTZ;

-- Proof of Address
ALTER TABLE profiles ADD COLUMN proof_of_address_url TEXT;
ALTER TABLE profiles ADD COLUMN proof_of_address_type TEXT; -- 'utility_bill', 'bank_statement', etc.
ALTER TABLE profiles ADD COLUMN address_document_issue_date DATE;
ALTER TABLE profiles ADD COLUMN proof_of_address_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN proof_of_address_verified_at TIMESTAMPTZ;
```

**Document Upload Hook**:
```typescript
// apps/web/src/hooks/useDocumentUpload.ts

const useDocumentUpload = (documentType: 'identity' | 'dbs' | 'address') => {
  const uploadDocument = async (file: File, metadata: any) => {
    // 1. Validate file (PDF, size < 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large');
    }

    // 2. Upload to Supabase Storage
    const fileName = `${documentType}/${profile.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, file);

    if (error) throw error;

    // 3. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(fileName);

    // 4. Update profile with document URL and metadata
    const updates = {
      [`${documentType}_verification_document_url`]: publicUrl,
      ...metadata, // document_number, issue_date, etc.
    };

    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    return publicUrl;
  };

  return { uploadDocument };
};
```

**Admin Verification Flow**:
```typescript
// Admin reviews uploaded documents
// Updates verified flags and timestamps

await supabase
  .from('profiles')
  .update({
    identity_verified: true,
    identity_verified_at: new Date().toISOString(),
  })
  .eq('id', profileId);
```

**Integration Points**:
- **Hook**: `/apps/web/src/hooks/useDocumentUpload.ts`
- **Migration**: `010_add_tutor_verification_fields.sql`
- **Migration**: `093_add_verification_metadata.sql`
- **Storage**: Supabase Storage bucket `verification-documents`

---

### 6. STRIPE CONNECT INTEGRATION

**How It Works**:

**Account Onboarding**:
```typescript
// apps/web/src/app/api/stripe/connect-account/route.ts

export async function POST(request: Request) {
  const { userId } = await request.json();

  // 1. Check if user already has Stripe account
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', userId)
    .single();

  let stripeAccountId = profile.stripe_account_id;

  // 2. Create Stripe Express account if doesn't exist
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: profile.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    stripeAccountId = account.id;

    // 3. Save to profiles table
    await supabase
      .from('profiles')
      .update({ stripe_account_id: stripeAccountId })
      .eq('id', userId);
  }

  // 4. Create account onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${origin}/account/stripe?refresh=true`,
    return_url: `${origin}/account/stripe?connected=true`,
    type: 'account_onboarding',
  });

  return Response.json({ url: accountLink.url });
}
```

**Account Status Check**:
```typescript
// apps/web/src/app/api/stripe/get-connect-account/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', userId)
    .single();

  if (!profile.stripe_account_id) {
    return Response.json({ connected: false });
  }

  // Get account details from Stripe
  const account = await stripe.accounts.retrieve(profile.stripe_account_id);

  return Response.json({
    connected: true,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
  });
}
```

**Integration Points**:
- **API**: `/apps/web/src/app/api/stripe/connect-account/route.ts` - Onboarding
- **API**: `/apps/web/src/app/api/stripe/get-connect-account/route.ts` - Status
- **API**: `/apps/web/src/app/api/stripe/disconnect-account/route.ts` - Disconnect
- **Field**: `profiles.stripe_account_id` - Links to Stripe Express account
- **Payments**: Used for receiving payouts from bookings

---

### 7. PUBLIC PROFILE INTEGRATION

**How It Works**:

**SEO-Friendly URL Structure**:
```
Format: /public-profile/[id]/[slug]
Example: /public-profile/abc123/john-smith

- ID is permanent (UUID)
- Slug is SEO-friendly (lowercase, hyphens)
- 301 redirect if slug doesn't match current profile slug
```

**Public Profile Page**:
```typescript
// apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx

export default async function PublicProfilePage({
  params,
}: {
  params: { id: string; slug?: string[] };
}) {
  const profileId = params.id;
  const slugParam = params.slug?.[0];

  // Fetch profile (no auth required - public data)
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      profile_reviews(rating, comment, reviewer_name),
      listings(id, title, subjects, hourly_rate)
    `)
    .eq('id', profileId)
    .single();

  // 301 redirect if slug doesn't match
  if (slugParam && slugParam !== profile.slug) {
    redirect(`/public-profile/${profileId}/${profile.slug}`);
  }

  return (
    <div>
      <ProfileHeroSection profile={profile} />
      <ProfileAbout bio={profile.professional_details.bio} />
      <ProfileStats
        rating={profile.average_rating}
        reviews={profile.total_reviews}
        sessions={profile.sessions_completed}
      />
      <ProfileReviews reviews={profile.profile_reviews} />
      <ProfileListings listings={profile.listings} />
    </div>
  );
}
```

**Slug Generation**:
```typescript
// apps/web/src/lib/utils/slugify.ts

export const generateSlug = (fullName: string): string => {
  return fullName
    .normalize('NFD')                     // Normalize unicode
    .replace(/[\u0300-\u036f]/g, '')      // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')          // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');             // Trim hyphens
};

// Examples:
// "John O'Brien" → "john-o-brien"
// "José García" → "jose-garcia"
// "Anna-Maria Smith" → "anna-maria-smith"
```

**Integration Points**:
- **Page**: `/apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`
- **Components**: `/apps/web/src/app/components/feature/public-profile/*.tsx`
- **Migration**: `053_add_profile_slugs.sql`
- **Utility**: `/apps/web/src/lib/utils/slugify.ts`

---

### 8. EMAIL NOTIFICATION INTEGRATION

**How It Works**:

**Email Service (Resend)**:
```typescript
// apps/web/src/lib/email.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  to,
  subject,
  template,
  data,
}: {
  to: string;
  subject: string;
  template: string;
  data: any;
}) => {
  const { error } = await resend.emails.send({
    from: 'Tutorwise <noreply@tutorwise.com>',
    to,
    subject,
    react: EmailTemplate({ template, data }),
  });

  if (error) {
    console.error('Email send error:', error);
    throw error;
  }
};
```

**Email Types Sent**:
```typescript
// Connection Request Notification
export const sendConnectionRequestNotification = async (
  targetProfileId: string,
  sourceProfileId: string
) => {
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', targetProfileId)
    .single();

  const { data: sourceProfile } = await supabase
    .from('profiles')
    .select('full_name, slug')
    .eq('id', sourceProfileId)
    .single();

  await sendEmail({
    to: targetProfile.email,
    subject: `${sourceProfile.full_name} wants to connect`,
    template: 'connection-request',
    data: {
      targetName: targetProfile.full_name,
      sourceName: sourceProfile.full_name,
      profileUrl: `/public-profile/${sourceProfileId}/${sourceProfile.slug}`,
      acceptUrl: `/network/connections?request=${sourceProfileId}`,
    },
  });
};

// Organisation Invitation
export const sendOrganisationInvitation = async (
  email: string,
  orgName: string,
  inviterName: string
) => {
  await sendEmail({
    to: email,
    subject: `${inviterName} invited you to join ${orgName}`,
    template: 'organisation-invitation',
    data: { orgName, inviterName },
  });
};
```

**Integration Points**:
- **Service**: `/apps/web/src/lib/email.ts`
- **Provider**: Resend API
- **Triggers**: Connection requests, organisation invites, referral invites
- **Related Features**: Network, Referrals, Bookings, Reviews

---

### 9. ACCOUNT DELETION INTEGRATION

**How It Works**:

**Complete Account Deletion Flow**:
```typescript
// apps/web/src/app/api/user/delete/route.ts

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // 1. Fetch Stripe IDs from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id, stripe_customer_id')
    .eq('id', userId)
    .single();

  // 2. Delete Stripe Connect account (if exists)
  if (profile.stripe_account_id) {
    try {
      await stripe.accounts.del(profile.stripe_account_id);
    } catch (error) {
      console.error('Stripe Connect deletion error:', error);
    }
  }

  // 3. Delete Stripe Customer account (if exists)
  if (profile.stripe_customer_id) {
    try {
      await stripe.customers.del(profile.stripe_customer_id);
    } catch (error) {
      console.error('Stripe Customer deletion error:', error);
    }
  }

  // 4. Delete auth user (CASCADE deletes all related data)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
```

**Cascaded Table Deletions** (via FK `ON DELETE CASCADE`):
```sql
-- All tables with FK to profiles(id) cascade delete:
- profiles (deleted directly)
- profile_graph (all connections)
- bookings (all bookings)
- listings (all listings)
- wiselists (all wiselists)
- connection_groups, group_members (all groups)
- chat_messages (all messages)
- transactions (all financial records)
- network_analytics (all analytics)
- referral_links (all referral links)
- profile_reviews (all reviews given and received)
```

**Integration Points**:
- **API**: `/apps/web/src/app/api/user/delete/route.ts`
- **Page**: `/apps/web/src/app/(authenticated)/delete-account/page.tsx`
- **Stripe**: Deletes both Connect and Customer accounts
- **Database**: CASCADE deletes all related data across 15+ tables

---

### 10. FREE HELP NOW INTEGRATION (v5.9)

**How It Works**:

**Free Help Toggle**:
```typescript
// apps/web/src/app/(authenticated)/account/settings/page.tsx

const FreeHelpToggle = () => {
  const { profile } = useUserProfile();
  const [enabled, setEnabled] = useState(profile.available_free_help);

  const handleToggle = async (newValue: boolean) => {
    // Update profile
    await supabase
      .from('profiles')
      .update({ available_free_help: newValue })
      .eq('id', profile.id);

    // Update presence/heartbeat system
    if (newValue) {
      await startFreeHelpPresence();
    } else {
      await stopFreeHelpPresence();
    }

    setEnabled(newValue);
  };

  return (
    <Toggle
      enabled={enabled}
      onChange={handleToggle}
      label="Offer 30-minute free help sessions"
    />
  );
};
```

**Presence/Heartbeat System**:
```typescript
// When free help is enabled, send periodic heartbeats
const startFreeHelpPresence = async () => {
  const heartbeatInterval = setInterval(async () => {
    await supabase
      .from('profiles')
      .update({ free_help_last_seen: new Date().toISOString() })
      .eq('id', profile.id);
  }, 60000); // Every 1 minute

  return heartbeatInterval;
};
```

**Integration Points**:
- **Toggle**: `/apps/web/src/app/(authenticated)/account/settings/page.tsx`
- **Field**: `profiles.available_free_help` (BOOLEAN)
- **Field**: `profiles.free_help_last_seen` (TIMESTAMPTZ)
- **Feature**: Free Help Now marketplace listing

---

## Database Schema

### profiles Table (Core Schema)

```sql
CREATE TABLE profiles (
  -- Identity
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  slug TEXT UNIQUE, -- SEO-friendly URL slug

  -- Roles
  roles TEXT[] DEFAULT ARRAY['client'], -- Multiple roles
  active_role TEXT DEFAULT 'client',    -- Currently active role
  primary_role TEXT,                    -- User's main role

  -- Contact
  phone TEXT,
  country TEXT DEFAULT 'GB',
  city TEXT,
  timezone TEXT DEFAULT 'Europe/London',
  address_line1 TEXT,
  town TEXT,
  postal_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_email TEXT,

  -- Profile
  bio TEXT,
  headline TEXT,
  avatar_url TEXT,
  cover_photo_url TEXT,
  custom_picture_url TEXT,

  -- Verification
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,
  identity_verified_at TIMESTAMPTZ,
  identity_verification_document_url TEXT,
  identity_document_number TEXT,
  dbs_verified BOOLEAN DEFAULT FALSE,
  dbs_verified_at TIMESTAMPTZ,
  dbs_certificate_url TEXT,
  dbs_certificate_number TEXT,
  dbs_certificate_date DATE,
  dbs_expiry_date DATE,
  proof_of_address_verified BOOLEAN DEFAULT FALSE,
  proof_of_address_verified_at TIMESTAMPTZ,
  proof_of_address_url TEXT,
  proof_of_address_type TEXT,
  address_document_issue_date DATE,

  -- JSONB Fields
  professional_details JSONB DEFAULT '{}'::JSONB,  -- Role-specific data
  onboarding_progress JSONB DEFAULT '{}'::JSONB,   -- Onboarding state

  -- Referrals
  referral_code TEXT UNIQUE,                       -- User's unique code
  referred_by_agent_id UUID REFERENCES profiles(id), -- Lifetime attribution

  -- Stripe
  stripe_account_id TEXT,     -- Stripe Connect account
  stripe_customer_id TEXT,    -- Stripe Customer account

  -- Stats
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INT DEFAULT 0,
  sessions_completed INT DEFAULT 0,

  -- Free Help (v5.9)
  available_free_help BOOLEAN DEFAULT FALSE,
  free_help_last_seen TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_slug ON profiles(slug);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_active_role ON profiles(active_role);
CREATE INDEX idx_profiles_roles ON profiles USING GIN(roles);
```

---

## Security Considerations

### Row Level Security (RLS)

```sql
-- Users can view their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Everyone can view basic public profile info
CREATE POLICY profiles_select_public ON profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (via trigger)
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Authentication & Authorization

1. **Profile Ownership**: All profile updates require authenticated user to match profile ID
2. **Document Upload**: Only profile owner can upload verification documents
3. **Role Switching**: Only available roles can be switched to (validated in `switchRole()`)
4. **Stripe Account**: Only profile owner can connect/disconnect Stripe account
5. **Account Deletion**: Requires authentication and deletes all related data

---

## Performance Considerations

### Optimizations

1. **Database Indexes**:
   - `idx_profiles_email` for login lookups
   - `idx_profiles_slug` for public profile URLs
   - `idx_profiles_referral_code` for referral attribution
   - `idx_profiles_roles` GIN index for role queries

2. **JSONB Storage**:
   - `professional_details` reduces table bloat (vs. separate role tables)
   - Indexed queries on JSONB fields where needed

3. **UserProfileContext Caching**:
   - Profile data cached in React Context
   - Reduces database calls on every page load
   - Invalidates on profile updates

### Performance Metrics

- **Profile Fetch**: ~100ms (indexed query)
- **Profile Update**: ~150ms (database write + trigger)
- **Slug Generation**: ~50ms (trigger execution)
- **Public Profile Load**: ~200-300ms (with reviews, listings)

---

## Summary of System Integrations

### ✅ Strong Integrations

1. **Auth** - Auto-creation via trigger, session management, UserProfileContext
2. **Onboarding** - Role-specific wizards, progress tracking, middleware enforcement
3. **Roles** - Multi-role support, role switcher, localStorage persistence
4. **Stripe Connect** - Account onboarding, verification, payout management
5. **Public Profile** - SEO slugs, anonymous viewing, 301 redirects
6. **Verification** - Document uploads, admin approval, trust badges
7. **Email** - Connection requests, org invites, referral invites (Resend)
8. **Account Deletion** - CASCADE deletes, Stripe cleanup, complete data removal
9. **Free Help** - Toggle, presence/heartbeat, marketplace integration
10. **Referrals** - Lifetime attribution, referral code generation

### ⚠️ Partial Integrations

1. **Privacy Settings** - Planned (Coming Soon)
2. **Notification Preferences** - Planned (Coming Soon)

### ❌ No Integration Found

1. **SMS Notifications** - Not implemented
2. **2FA/MFA** - Not implemented (Supabase supports it)

---

**Last Updated**: 2025-12-12
**Version**: v5.0 (Multi-Role Support)
**Architecture**: Multi-Role Profile System + Stripe Connect
**Owner**: Backend Team
**For Questions**: See implementation guides and migration files
