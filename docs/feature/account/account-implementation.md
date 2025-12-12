# Account - Implementation Guide

**Version**: v5.9 (Free Help Support)
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Component Overview](#component-overview)
3. [Setup Instructions](#setup-instructions)
4. [Common Tasks](#common-tasks)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [State Management](#state-management)
8. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ app/(authenticated)/account/
│   ├─ page.tsx                           # Redirects to personal-info
│   ├─ personal-info/
│   │   ├─ page.tsx                       # Personal information tab (Server Component)
│   │   └─ page.module.css
│   ├─ professional-info/
│   │   ├─ page.tsx                       # Professional information tab
│   │   └─ page.module.css
│   └─ settings/
│       ├─ page.tsx                       # Account settings
│       └─ page.module.css
│
├─ app/components/feature/account/
│   ├─ PersonalInfoForm.tsx               # Personal details inline editing
│   ├─ PersonalInfoForm.module.css
│   ├─ ProfessionalInfoForm.tsx           # Role-specific professional info (2000+ lines)
│   ├─ ProfessionalInfoForm.module.css
│   ├─ AccountCard.tsx                    # Profile completeness widget
│   ├─ AccountCard.module.css
│   ├─ AccountHelpWidget.tsx              # Help tips
│   ├─ AccountVideoWidget.tsx             # Video tutorials
│   ├─ AvatarUpload.tsx                   # Avatar upload component
│   └─ ProfileCompletenessBar.tsx         # Progress indicator
│
├─ app/contexts/
│   └─ UserProfileContext.tsx             # Global profile state
│
├─ app/api/presence/free-help/
│   ├─ online/route.ts                    # Enable free help
│   └─ offline/route.ts                   # Disable free help
│
└─ lib/api/
    ├─ profiles.ts                        # Profile CRUD functions
    └─ storage.ts                         # Avatar upload helpers

apps/api/
├─ handle_new_user.sql                    # Auth trigger (profile creation)
└─ migrations/
    ├─ 000_create_profiles_table.sql
    ├─ 015_add_referral_fields.sql
    ├─ 045_add_professional_details_jsonb.sql
    └─ 095_add_free_help_field.sql
```

---

## Component Overview

### Account Hub Architecture

```
┌─────────────────────────────────────────────┐
│ Account Hub (/account)                     │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ HubTabs: Personal | Professional | Settings│
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌──────────────────┐  ┌──────────────────┐ │
│ │ Main Content     │  │ Sidebar          │ │
│ │ - PersonalInfo   │  │ - AccountCard    │ │
│ │   Form (inline)  │  │   (completeness) │ │
│ │ - Professional   │  │ - HelpWidget     │ │
│ │   Form (2000+)   │  │ - VideoWidget    │ │
│ │ - Settings       │  │                  │ │
│ └──────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────┘
```

### Component Breakdown

**PersonalInfoForm** (apps/web/src/app/components/feature/account/PersonalInfoForm.tsx)
- Inline editing system (click-to-edit)
- Auto-save on blur (150ms delay)
- Keyboard shortcuts (Escape to cancel, Enter to save)
- Sections: Name, Contact, Address, Emergency Contact

**ProfessionalInfoForm** (apps/web/src/app/components/feature/account/ProfessionalInfoForm.tsx)
- Role-aware form (2000+ lines for tutors)
- JSONB storage for role-specific data
- Complex nested fields (availability, qualifications)
- Document upload integration (DBS, ID, proof of address)

**AccountCard**
- Profile completeness progress (0-100%)
- Avatar upload with click-to-edit
- Name, role, credibility score display
- Quick actions: View Public Profile

---

## Setup Instructions

### Prerequisites
- Next.js 14+ installed
- Supabase configured
- Supabase Storage bucket for avatars (`avatars`)
- React Query installed

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Storage
NEXT_PUBLIC_SUPABASE_STORAGE_URL=your_storage_url
```

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install

# 3. Run migrations
npm run db:migrate

# 4. Create storage bucket (if not exists)
# In Supabase dashboard: Storage → Create bucket "avatars" (public)

# 5. Start dev server
npm run dev

# 6. Open account page
open http://localhost:3000/account
```

---

## Common Tasks

### Task 1: Update Personal Information (Inline Editing)

```typescript
// PersonalInfoForm.tsx
import { useState } from 'react';
import { updateProfile } from '@/lib/api/profiles';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

export function PersonalInfoForm() {
  const { profile, refreshProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({});
  const [values, setValues] = useState<{ [key: string]: string }>({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
  });

  const handleBlur = async (field: string) => {
    setIsEditing({ ...isEditing, [field]: false });

    // 150ms delay before saving
    setTimeout(async () => {
      try {
        await updateProfile(profile.id, {
          [field]: values[field]
        });
        await refreshProfile();
        toast.success('Profile updated');
      } catch (error) {
        toast.error('Update failed');
      }
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Escape') {
      setIsEditing({ ...isEditing, [field]: false });
      setValues({ ...values, [field]: profile[field] });
    } else if (e.key === 'Enter') {
      handleBlur(field);
    }
  };

  return (
    <div className={styles.form}>
      <HubForm.Section title="Name">
        <HubForm.Grid>
          <HubForm.Field label="First Name">
            {isEditing.first_name ? (
              <input
                type="text"
                value={values.first_name}
                onChange={(e) => setValues({ ...values, first_name: e.target.value })}
                onBlur={() => handleBlur('first_name')}
                onKeyDown={(e) => handleKeyDown(e, 'first_name')}
                autoFocus
              />
            ) : (
              <span onClick={() => setIsEditing({ ...isEditing, first_name: true })}>
                {profile.first_name || 'Click to edit'}
              </span>
            )}
          </HubForm.Field>
        </HubForm.Grid>
      </HubForm.Section>
    </div>
  );
}
```

### Task 2: Upload Avatar

```typescript
// AvatarUpload.tsx
import { useState } from 'react';
import { uploadAvatar } from '@/lib/api/storage';
import { updateProfile } from '@/lib/api/profiles';

export function AvatarUpload({ profileId, currentAvatarUrl }) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // 1. Upload to Supabase Storage
      const fileName = `${profileId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 3. Update profile
      await updateProfile(profileId, {
        avatar_url: urlData.publicUrl
      });

      // 4. Refresh profile context
      await refreshProfile();

      toast.success('Avatar updated');
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.avatarUpload}>
      <input
        type="file"
        id="avatar-input"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <label htmlFor="avatar-input" className={styles.avatarLabel}>
        <img
          src={currentAvatarUrl || '/default-avatar.png'}
          alt="Avatar"
          className={styles.avatar}
        />
        <div className={styles.overlay}>
          {uploading ? 'Uploading...' : 'Change Photo'}
        </div>
      </label>
    </div>
  );
}
```

### Task 3: Update Professional Details (JSONB)

```typescript
// ProfessionalInfoForm.tsx
const handleUpdateProfessionalDetails = async (section: string, data: any) => {
  const { profile } = useUserProfile();

  // Merge with existing professional_details
  const updatedDetails = {
    ...profile.professional_details,
    [profile.active_role]: {
      ...profile.professional_details?.[profile.active_role],
      ...data
    }
  };

  await updateProfile(profile.id, {
    professional_details: updatedDetails
  });

  await refreshProfile();
};

// Usage: Update tutor's subjects
await handleUpdateProfessionalDetails('subjects', {
  subjects: ['Mathematics', 'Physics']
});

// Result in database:
// professional_details = {
//   "tutor": {
//     "subjects": ["Mathematics", "Physics"],
//     "key_stages": ["GCSE", "A-Level"],
//     "one_on_one_rate": 35.00,
//     ...
//   }
// }
```

### Task 4: Toggle Free Help Availability

```typescript
// POST /api/presence/free-help/online/route.ts
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Update profile
  const { error } = await supabase
    .from('profiles')
    .update({
      available_free_help: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) throw error;

  return Response.json({ success: true });
}

// POST /api/presence/free-help/offline/route.ts
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      available_free_help: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) throw error;

  return Response.json({ success: true });
}

// Usage in Settings component
const toggleFreeHelp = async (enabled: boolean) => {
  const endpoint = enabled ? '/api/presence/free-help/online' : '/api/presence/free-help/offline';

  await fetch(endpoint, { method: 'POST' });
  await refreshProfile();
};
```

### Task 5: Calculate Profile Completeness

```typescript
// lib/utils/profileCompleteness.ts

export function calculateProfileCompleteness(profile: Profile): number {
  let score = 0;

  // Avatar (20 points)
  if (profile.avatar_url) score += 20;

  // Bio (15 points)
  if (profile.bio && profile.bio.length > 50) score += 15;

  // Contact info (15 points)
  if (profile.phone && profile.address_line1) score += 15;

  // Professional details (30 points)
  const roleDetails = profile.professional_details?.[profile.active_role];
  if (roleDetails) {
    const fields = Object.keys(roleDetails);
    const completedFields = fields.filter(key => {
      const value = roleDetails[key];
      return value && (Array.isArray(value) ? value.length > 0 : true);
    });
    score += Math.min(30, (completedFields.length / fields.length) * 30);
  }

  // Verification documents (20 points)
  if (profile.identity_verified) score += 10;
  if (profile.dbs_verified) score += 10;

  return Math.round(score);
}

// Usage
const completeness = calculateProfileCompleteness(profile);
// Returns: 0-100 (percentage)
```

### Task 6: Handle Document Upload (DBS Certificate)

```typescript
// Document upload component
const handleDBSUpload = async (file: File) => {
  const { profile } = useUserProfile();

  // 1. Upload to storage
  const fileName = `dbs-${profile.id}-${Date.now()}.pdf`;
  const { data, error } = await supabase.storage
    .from('verification-documents')
    .upload(fileName, file);

  if (error) throw error;

  // 2. Get public URL
  const { data: urlData } = supabase.storage
    .from('verification-documents')
    .getPublicUrl(fileName);

  // 3. Update profile
  await updateProfile(profile.id, {
    dbs_certificate_url: urlData.publicUrl,
    dbs_certificate_document_name: file.name,
    dbs_verified: false, // Admin needs to verify
  });

  toast.success('DBS certificate uploaded. Pending admin verification.');
};
```

### Task 7: Role Switcher

```typescript
// Header component with role switcher
import { useUserProfile } from '@/app/contexts/UserProfileContext';

export function RoleSwitcher() {
  const { profile, updateActiveRole } = useUserProfile();

  const handleRoleSwitch = async (role: string) => {
    // Update active_role in database
    await updateProfile(profile.id, {
      active_role: role
    });

    // Refresh profile context
    await refreshProfile();

    // Persist in localStorage
    localStorage.setItem('active_role', role);

    // Redirect to role-specific home
    router.push(`/${role}`);
  };

  return (
    <select
      value={profile.active_role}
      onChange={(e) => handleRoleSwitch(e.target.value)}
    >
      {profile.roles.map(role => (
        <option key={role} value={role}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </option>
      ))}
    </select>
  );
}
```

### Task 8: Delete Account

```typescript
// POST /api/user/delete
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Delete profile (cascade will handle related records)
    await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    // 2. Delete auth user
    await supabase.auth.admin.deleteUser(user.id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Account deletion failed:', error);
    return Response.json({ error: 'Deletion failed' }, { status: 500 });
  }
}

// Usage in Settings
const handleDeleteAccount = async () => {
  const confirmed = confirm(
    'Are you sure? This action cannot be undone.'
  );

  if (!confirmed) return;

  await fetch('/api/user/delete', { method: 'POST' });
  await supabase.auth.signOut();
  router.push('/');
};
```

---

## API Reference

### Profile API

**GET /api/profiles/[id]**
- Fetch single profile by ID
- Returns: `Profile` object

**PATCH /api/profiles/[id]**
- Update profile fields
- Body: `{ [field]: value }`
- Returns: Updated `Profile`

**POST /api/presence/free-help/online**
- Enable free help availability
- Returns: `{ success: boolean }`

**POST /api/presence/free-help/offline**
- Disable free help availability
- Returns: `{ success: boolean }`

**POST /api/user/delete**
- Delete user account permanently
- Returns: `{ success: boolean }`

---

## Database Schema

### profiles table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal Info
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  phone TEXT,
  gender TEXT,
  date_of_birth DATE,

  -- Address
  address_line1 TEXT,
  town TEXT,
  city TEXT,
  country TEXT DEFAULT 'United Kingdom',
  postal_code TEXT,

  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_email TEXT,

  -- Avatar & Media
  avatar_url TEXT,
  cover_photo_url TEXT,
  bio TEXT,
  bio_video_url TEXT,

  -- Roles
  roles TEXT[] DEFAULT ARRAY['client']::TEXT[],
  active_role TEXT DEFAULT 'client',

  -- Identity Verification
  identity_verification_document_url TEXT,
  identity_verification_document_name TEXT,
  identity_verified BOOLEAN DEFAULT false,
  identity_verified_at TIMESTAMPTZ,
  identity_document_number TEXT,
  identity_issue_date DATE,
  identity_expiry_date DATE,

  -- DBS Verification
  dbs_certificate_number TEXT,
  dbs_certificate_date DATE,
  dbs_certificate_url TEXT,
  dbs_certificate_document_name TEXT,
  dbs_verified BOOLEAN DEFAULT false,
  dbs_verified_at TIMESTAMPTZ,

  -- Proof of Address
  proof_of_address_url TEXT,
  proof_of_address_type TEXT,
  address_document_issue_date DATE,
  proof_of_address_verified BOOLEAN DEFAULT false,

  -- Professional
  qualifications TEXT[],
  teaching_experience TEXT,
  degree_level TEXT,
  credibility_score INTEGER DEFAULT 0,

  -- Free Help (v5.9)
  available_free_help BOOLEAN DEFAULT false,

  -- Stripe Integration
  stripe_account_id TEXT,
  stripe_customer_id TEXT,

  -- Referrals
  referral_code VARCHAR(7) UNIQUE,
  referred_by_profile_id UUID REFERENCES profiles(id),
  referral_code_used VARCHAR(7),
  slug TEXT UNIQUE,

  -- JSONB Fields
  onboarding_progress JSONB DEFAULT '{}'::JSONB,
  professional_details JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_slug ON profiles(slug);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_roles ON profiles USING GIN(roles);
```

### professional_details JSONB structure

```typescript
interface ProfessionalDetails {
  tutor?: {
    status: 'Professional' | 'Solo' | 'Part-time';
    academic_qualifications: string[];
    key_stages: string[];
    subjects: string[];
    teaching_professional_qualifications: string[];
    teaching_experience: string;
    session_types: string[];
    tutoring_experience: string;
    one_on_one_rate: number;
    group_session_rate: number;
    delivery_mode: string[];
    availability: AvailabilityPeriod[];
    unavailability: UnavailabilityPeriod[];
  };
  client?: {
    subjects: string[];
    education_level: string;
    learning_goals: string[];
    learning_preferences: string[];
    budget_range: string;
    sessions_per_week: number;
    session_duration: number;
    special_needs: string[];
    additional_info: string;
    availability: AvailabilityPeriod[];
    unavailability: UnavailabilityPeriod[];
  };
  agent?: {
    agency_name: string;
    agency_size: string;
    years_in_business: number;
    description: string;
    services: string[];
    commission_rate: number;
    service_areas: string[];
    student_capacity: number;
    subject_specializations: string[];
    education_levels: string[];
    coverage_areas: string[];
    number_of_tutors: number;
    certifications: string[];
    website: string;
    additional_info: string;
  };
}
```

---

## State Management

### UserProfileContext

```typescript
// apps/web/src/app/contexts/UserProfileContext.tsx

interface UserProfileContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateActiveRole: (role: string) => Promise<void>;
}

export const UserProfileProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    setProfile(data);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <UserProfileContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};
```

---

## Testing

### Component Testing

```typescript
describe('PersonalInfoForm', () => {
  it('enters edit mode on field click', () => {
    render(<PersonalInfoForm />);

    const nameField = screen.getByText('John Doe');
    fireEvent.click(nameField);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('saves on blur', async () => {
    render(<PersonalInfoForm />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Jane Doe' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(userId, {
        first_name: 'Jane'
      });
    });
  });
});
```

---

## Troubleshooting

### Issue: Avatar not updating

**Solution**: Clear browser cache and check storage permissions

```typescript
// Check if storage bucket is public
const { data } = await supabase.storage.getBucket('avatars');
console.log('Is public:', data.public);
```

### Issue: Inline editing not saving

**Solution**: Verify 150ms delay and error handling

```typescript
setTimeout(async () => {
  try {
    await updateProfile(profileId, { field: value });
  } catch (error) {
    console.error('Save failed:', error);
  }
}, 150);
```

---

**Last Updated**: 2025-12-12
**Version**: v5.9
**Maintainer**: Backend Team
