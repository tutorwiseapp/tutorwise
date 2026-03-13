# Phase 2 Complete: ProfessionalInfoForm Data Flow

## ✅ Status: ALREADY COMPLETE

After thorough code review, **Phase 2 was already implemented correctly**. The Professional Info form is fully configured to read from and write to the `professional_details` structure backed by the `role_details` table.

---

## 🔍 Code Review Findings

### 1. Form Loads Data from `professional_details` ✅
**File**: `apps/web/src/components/feature/account/ProfessionalInfoForm.tsx` (Lines 269-357)

The `useEffect` hook correctly loads data from `profile.professional_details`:

```typescript
useEffect(() => {
  // Transform role_details array to professional_details format
  const roleDetailsArray = (profile as any).role_details || [];
  const professionalDetails: any = {};
  roleDetailsArray.forEach((rd: any) => {
    professionalDetails[rd.role_type] = rd;
  });

  // Merge with existing professional_details
  const combined = { ...professionalDetails, ...profile.professional_details };

  const agentData = combined?.agent;
  const tutorData = combined?.tutor;
  const clientData = combined?.client;

  setFormData(prev => ({
    ...prev,
    // Tutor fields
    subjects: tutorData?.subjects || [],
    teaching_experience: tutorData?.teaching_experience || '',
    one_on_one_rate: tutorData?.one_on_one_rate?.toString() || '',
    // ... etc

    // Client fields
    subjects_client: clientData?.subjects || [],
    learning_goals: clientData?.learning_goals || [],
    // ... etc

    // Agent fields
    agency_name: agentData?.agency_name || '',
    description: agentData?.description || '',
    // ... etc
  }));
}, [profile, activeRole]);
```

**Key Points**:
- ✅ Reads from `professional_details.tutor` for tutor fields
- ✅ Reads from `professional_details.client` for client fields
- ✅ Reads from `professional_details.agent` for agent fields
- ✅ Includes backward compatibility fallback to raw `role_details` array

---

### 2. Form Saves Data to `professional_details` ✅
**File**: `apps/web/src/components/feature/account/ProfessionalInfoForm.tsx` (Lines 429-544)

The `handleSaveField` function correctly constructs `professional_details` updates:

```typescript
const handleSaveField = async (field: EditingField) => {
  // ... validation logic ...

  // Handle tutor fields
  if (['subjects', 'teaching_experience', 'one_on_one_rate', ...].includes(field)) {
    const currentTutor = profile.professional_details?.tutor || {};
    const fieldValue = formData[field as keyof typeof formData];

    updateData = {
      professional_details: {
        ...profile.professional_details,
        tutor: {
          ...currentTutor,
          [dbField]: fieldValue  // Save to professional_details.tutor
        }
      }
    };
  }

  // Similar logic for client and agent fields...

  await onSave(updateData);  // Pass to parent handler
};
```

**Key Points**:
- ✅ Constructs nested `professional_details.tutor` object
- ✅ Preserves existing `professional_details` data
- ✅ Handles field name mapping (e.g., `session_type` → `session_types`)

---

### 3. Page Handler Writes to `role_details` Table ✅
**File**: `apps/web/src/app/(authenticated)/account/professional-info/page.tsx` (Lines 35-69)

The parent page's `handleSave` function correctly routes data to the database:

```typescript
const handleSave = async (updatedProfile: Partial<Profile>) => {
  try {
    // Check if update contains role-specific data
    if (updatedProfile.professional_details) {
      const roleType = profile?.active_role || 'tutor';
      const roleData = updatedProfile.professional_details[roleType as keyof typeof updatedProfile.professional_details];

      if (roleData) {
        // ✅ Save to role_details table
        await updateRoleDetails(roleType as 'tutor' | 'client' | 'agent', roleData);
      }

      // Remove professional_details (not a profiles column)
      const { professional_details, ...profileUpdates } = updatedProfile;

      // Update profile-level fields if any
      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(profileUpdates);
      }
    } else {
      // No role data, just update profile
      await updateProfile(updatedProfile);
    }

    await refreshProfile();  // ✅ Triggers Phase 1 transformation
    toast.success('Profile updated successfully');
  } catch (error) {
    console.error('Error updating profile:', error);
    toast.error('Failed to update profile');
  }
};
```

**Key Points**:
- ✅ Detects `professional_details` in update
- ✅ Extracts role-specific data based on `active_role`
- ✅ Calls `updateRoleDetails()` API to write to `role_details` table
- ✅ Strips `professional_details` before profile update (since it's not a column)
- ✅ Calls `refreshProfile()` which triggers Phase 1 transformation

---

### 4. API Function Upserts to Database ✅
**File**: `apps/web/src/lib/api/profiles.ts` (Lines 148-178)

The `updateRoleDetails` function correctly persists data:

```typescript
export async function updateRoleDetails(
  roleType: 'tutor' | 'client' | 'agent',
  updates: Partial<RoleDetailsUpdate>
): Promise<void> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const roleDetailsData = {
    profile_id: user.id,
    role_type: roleType,
    updated_at: new Date().toISOString(),
    ...updates,
  };

  // ✅ Upsert with conflict resolution
  const { error } = await supabase
    .from('role_details')
    .upsert(roleDetailsData, {
      onConflict: 'profile_id,role_type'  // Update if exists, insert if new
    });

  if (error) {
    console.error('Error updating role details:', error);
    throw error;
  }
}
```

**Key Points**:
- ✅ Uses `upsert` for idempotent updates
- ✅ Conflict resolution on `(profile_id, role_type)` composite key
- ✅ Updates `updated_at` timestamp automatically
- ✅ Proper error handling

---

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ONBOARDING WIZARD                           │
│  TutorOnboardingWizard saves to role_details table             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PHASE 1: UserProfileContext                    │
│  Fetches role_details via JOIN, transforms to professional_details│
│  profile.professional_details.tutor = { subjects, hourly_rate }│
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 2: ProfessionalInfoForm (READ)               │
│  useEffect loads: formData.subjects = profile.professional_details.tutor.subjects│
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ (User edits "Subjects" field)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│             PHASE 2: ProfessionalInfoForm (WRITE)               │
│  handleSaveField constructs:                                    │
│  { professional_details: { tutor: { subjects: ["Math"] } } }   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│          PHASE 2: Page Handler (professional-info/page.tsx)     │
│  1. Extracts professional_details.tutor                         │
│  2. Calls updateRoleDetails('tutor', { subjects: ["Math"] })    │
│  3. Calls refreshProfile() to re-fetch with transformation      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               PHASE 2: API (lib/api/profiles.ts)                │
│  UPSERT INTO role_details (profile_id, role_type, subjects)    │
│  VALUES (user_id, 'tutor', '["Math"]')                          │
│  ON CONFLICT (profile_id, role_type) DO UPDATE                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE PERSISTED ✅                        │
│  role_details table updated                                     │
│  UserProfileContext will read this on next page load            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Verified Database Test Data

```sql
-- Query: Get tutor profile with role_details
SELECT
  p.email,
  p.full_name,
  p.active_role,
  rd.subjects,
  rd.hourly_rate,
  rd.qualifications
FROM profiles p
LEFT JOIN role_details rd ON p.id = rd.profile_id
WHERE p.active_role = 'tutor'
LIMIT 1;
```

**Result**:
```
Email: johnsmith@gmail.com
Full Name: John Smith
Active Role: tutor
Role Details: {
  "subjects": ["languages"],
  "role_type": "tutor",
  "hourly_rate": 40,
  "qualifications": {
    "bio": "...",
    "education": "some_college",
    "certifications": ["tesol_tefl"],
    "experience_level": "intermediate"
  }
}
```

✅ **Confirmed**: Onboarding data exists in `role_details` table and is ready to be displayed in Account page.

---

## 🧪 Manual Testing Checklist

To verify end-to-end functionality:

1. **Test: Load Account Page**
   - [ ] Navigate to `/account/professional-info` as a tutor
   - [ ] Verify "Subjects" field shows onboarding data (e.g., "languages")
   - [ ] Verify "Hourly Rate" field shows onboarding data (e.g., "40")
   - [ ] Verify qualifications fields are populated

2. **Test: Edit and Save**
   - [ ] Click "Subjects" field to edit
   - [ ] Change value (e.g., add "Mathematics")
   - [ ] Click outside field (triggers auto-save)
   - [ ] Verify success toast appears
   - [ ] Refresh page
   - [ ] Verify change persisted

3. **Test: Database Verification**
   - [ ] After edit, query `role_details` table
   - [ ] Verify `subjects` column updated
   - [ ] Verify `updated_at` timestamp changed

---

## 📝 Summary

**Phase 2 Status**: ✅ COMPLETE (No changes needed)

All four components of the data flow are correctly implemented:
1. ✅ ProfessionalInfoForm reads from `professional_details`
2. ✅ ProfessionalInfoForm writes to `professional_details`
3. ✅ Page handler routes to `updateRoleDetails()` API
4. ✅ API upserts to `role_details` table

**Next Step**: Phase 3 - Data Migration (for users with old data in `profiles.*` columns)
