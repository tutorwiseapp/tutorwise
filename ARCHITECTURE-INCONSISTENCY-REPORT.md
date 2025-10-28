# Architecture Inconsistency Report: professional_details vs role_details

**Date**: 2025-10-27
**Issue**: Dual architecture for storing user role-specific data
**Severity**: HIGH - Data integrity and maintenance risk

---

## Executive Summary

The codebase has **two competing architectures** for storing role-specific user data:

1. **NEW Architecture** (✅ Correct): `professional_details` JSONB field on `profiles` table
2. **OLD Architecture** (❌ Deprecated): `role_details` separate table

This creates confusion, potential data inconsistencies, and maintenance burden.

---

## Architecture Comparison

### NEW Architecture: `professional_details` (JSONB on profiles)

**Location**: `profiles.professional_details` JSONB column

**Structure**:
```typescript
professional_details: {
  client: ClientProfessionalInfo,   // 11 fields
  agent: AgentProfessionalInfo,     // 16 fields
  tutor: TutorProfessionalInfo      // 17 fields (planned)
}
```

**Used By**:
- ✅ Tutor onboarding ([TutorOnboardingWizard.tsx:290-338](apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx#L290-L338))
- ✅ Client onboarding ([ClientOnboardingWizard.tsx:225-266](apps/web/src/app/components/onboarding/client/ClientOnboardingWizard.tsx#L225-L266))
- ✅ Agent onboarding ([AgentOnboardingWizard.tsx:247-292](apps/web/src/app/components/onboarding/agent/AgentOnboardingWizard.tsx#L247-L292))
- ✅ Profile management ([ProfessionalInfoForm.tsx](apps/web/src/app/components/profile/ProfessionalInfoForm.tsx))

**Benefits**:
- Single source of truth (one row per user)
- No JOINs required
- Flexible JSONB schema
- Auto-populated from onboarding
- Integrated with profile form

---

### OLD Architecture: `role_details` (Separate Table)

**Location**: `role_details` table

**Structure**:
```sql
CREATE TABLE role_details (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  role_type TEXT CHECK (role_type IN ('seeker', 'provider', 'agent')),

  -- Common fields
  subjects TEXT[],
  skill_levels JSONB,
  goals TEXT[],

  -- Provider-specific
  teaching_experience JSONB,
  qualifications JSONB,
  availability JSONB,
  hourly_rate INTEGER,

  -- ... more fields
  UNIQUE(profile_id, role_type)
)
```

**Migration File**: [001_add_onboarding_system.sql](tools/database/migrations/001_add_onboarding_system.sql)

**Used By**:
- ❌ [UserProfileContext.tsx:148-169](apps/web/src/app/contexts/UserProfileContext.tsx#L148-L169) - `getRoleDetails()` function
- ❌ [account.ts:56-62](apps/web/src/lib/api/account.ts#L56-L62) - `getRoleDetails()` API
- ❌ [account.ts:125-131](apps/web/src/lib/api/account.ts#L125-L131) - `saveRoleDetails()` API
- ❌ [OnboardingWizard.tsx:256-262](apps/web/src/app/components/onboarding/OnboardingWizard.tsx#L256-L262) - Old onboarding
- ❌ **Listings integration** ([create/page.tsx:15-51](apps/web/src/app/my-listings/create/page.tsx#L15-L51))

**Problems**:
- Separate table requires JOINs
- More complex queries
- Data can get out of sync
- Not used by new onboarding flows
- Deprecated but still referenced

---

## Critical Issue: Listings Integration

### Current Broken Flow

**Listings are pulling from OLD architecture:**

```typescript
// apps/web/src/app/my-listings/create/page.tsx:24
const roleDetails = await getRoleDetails(activeRole);  // ❌ Queries role_details table

if (roleDetails) {
  const prefillData: Partial<CreateListingInput> = {
    subjects: roleDetails.subjects,                    // ❌ From role_details
    hourly_rate_min: roleDetails.hourly_rate,         // ❌ From role_details
    academic_qualifications: roleDetails.certifications, // ❌ From role_details
    // ...
  };
}
```

**But onboarding saves to NEW architecture:**

```typescript
// apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx:326
await supabase
  .from('profiles')
  .update({
    professional_details: {
      ...currentProfessionalDetails,
      tutor: tutorData  // ✅ Saves to professional_details.tutor
    }
  })
  .eq('id', user!.id);
```

### Result: **BROKEN DATA FLOW** 🚨

```
Tutor completes onboarding
    ↓
Data saved to professional_details.tutor ✅
    ↓
Tutor creates listing
    ↓
Listing form queries role_details table ❌
    ↓
role_details table is EMPTY (no data)
    ↓
Form has NO pre-filled data ❌
```

---

## Code Usage Analysis

### Files Using OLD `role_details` Architecture

1. **[UserProfileContext.tsx:148-169](apps/web/src/app/contexts/UserProfileContext.tsx#L148-L169)**
   ```typescript
   const getRoleDetails = async (role: Role): Promise<RoleDetails | null> => {
     const { data } = await supabase
       .from('role_details')  // ❌ OLD
       .select('*')
       .eq('profile_id', user.id)
       .eq('role_type', role)
       .single();
     return data;
   };
   ```

2. **[lib/api/account.ts:56-62](apps/web/src/lib/api/account.ts#L56-L62)**
   ```typescript
   export async function getRoleDetails(roleType: string): Promise<RoleDetails | null> {
     const { data } = await supabase
       .from('role_details')  // ❌ OLD
       .select('*')
       .eq('profile_id', user.id)
       .eq('role_type', roleType)
       .single();
     return data;
   }
   ```

3. **[lib/api/account.ts:125-131](apps/web/src/lib/api/account.ts#L125-L131)**
   ```typescript
   export async function saveRoleDetails(data: SaveRoleDetailsInput): Promise<void> {
     const { error } = await supabase
       .from('role_details')  // ❌ OLD
       .upsert(upsertData, {
         onConflict: 'profile_id,role_type',
       });
   }
   ```

4. **[OnboardingWizard.tsx:256-262](apps/web/src/app/components/onboarding/OnboardingWizard.tsx#L256-L262)**
   ```typescript
   const { error: roleDetailsError } = await supabase
     .from('role_details')  // ❌ OLD (legacy onboarding)
     .insert(roleDetailsToInsert);
   ```

5. **[my-listings/create/page.tsx:15-51](apps/web/src/app/my-listings/create/page.tsx#L15-L51)** ⚠️ **CRITICAL**
   ```typescript
   useEffect(() => {
     async function loadRoleDetails() {
       const roleDetails = await getRoleDetails(activeRole);  // ❌ Queries OLD table
       if (roleDetails) {
         // Pre-fill listing form - BUT DATA DOESN'T EXIST!
       }
     }
   }, [activeRole, getRoleDetails]);
   ```

### Files Using NEW `professional_details` Architecture

1. **[TutorOnboardingWizard.tsx:290-338](apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx#L290-L338)** ✅
2. **[ClientOnboardingWizard.tsx:225-266](apps/web/src/app/components/onboarding/client/ClientOnboardingWizard.tsx#L225-L266)** ✅
3. **[AgentOnboardingWizard.tsx:247-292](apps/web/src/app/components/onboarding/agent/AgentOnboardingWizard.tsx#L247-L292)** ✅
4. **[ProfessionalInfoForm.tsx](apps/web/src/app/components/profile/ProfessionalInfoForm.tsx)** ✅

---

## Migration Plan

### Phase 1: Fix Listings Integration (IMMEDIATE - 2 hours)

**Update listings to use `professional_details`:**

```typescript
// apps/web/src/app/my-listings/create/page.tsx

// BEFORE (❌ BROKEN)
const roleDetails = await getRoleDetails(activeRole);

// AFTER (✅ FIXED)
useEffect(() => {
  async function loadProfessionalDetails() {
    if (!profile?.professional_details) return;

    const prefillData: Partial<CreateListingInput> = {};

    // Pull from professional_details.tutor (NEW architecture)
    if (activeRole === 'provider') {
      const tutorData = profile.professional_details.tutor;
      if (tutorData) {
        prefillData.subjects = tutorData.subjects || [];
        prefillData.hourly_rate_min = tutorData.hourly_rate?.[0];
        prefillData.hourly_rate_max = tutorData.hourly_rate?.[1];
        prefillData.academic_qualifications = tutorData.certifications || [];
        prefillData.years_of_experience = tutorData.experience_level || '';
        prefillData.teaching_methods = tutorData.teaching_style || [];
      }
    }

    // Pull from professional_details.agent (NEW architecture)
    if (activeRole === 'agent') {
      const agentData = profile.professional_details.agent;
      if (agentData) {
        prefillData.subjects = agentData.subject_specializations || [];
        // ... agent-specific mappings
      }
    }

    setInitialData(prefillData);
  }
  loadProfessionalDetails();
}, [profile, activeRole]);
```

**Files to Update**:
1. [my-listings/create/page.tsx:15-51](apps/web/src/app/my-listings/create/page.tsx#L15-L51)

---

### Phase 2: Deprecate `role_details` Functions (LOW PRIORITY - 4 hours)

**Mark as deprecated and add migration warnings:**

```typescript
// apps/web/src/app/contexts/UserProfileContext.tsx

/**
 * @deprecated Use profile.professional_details instead
 * This function queries the deprecated role_details table.
 * Migrate to professional_details.{client|agent|tutor}
 */
const getRoleDetails = async (role: Role): Promise<RoleDetails | null> => {
  console.warn('[DEPRECATED] getRoleDetails() queries old role_details table. Use profile.professional_details instead.');
  // ... existing code
};
```

**Files to Update**:
1. [UserProfileContext.tsx:148-169](apps/web/src/app/contexts/UserProfileContext.tsx#L148-L169)
2. [lib/api/account.ts:56-62](apps/web/src/lib/api/account.ts#L56-L62)
3. [lib/api/account.ts:125-131](apps/web/src/lib/api/account.ts#L125-L131)

---

### Phase 3: Remove Old Code (FUTURE - 6 hours)

**After verifying no usage:**

1. Remove `getRoleDetails()` from UserProfileContext
2. Remove `getRoleDetails()` from account.ts
3. Remove `saveRoleDetails()` from account.ts
4. Remove or archive [OnboardingWizard.tsx](apps/web/src/app/components/onboarding/OnboardingWizard.tsx) (old onboarding)
5. Drop `role_details` table via migration
6. Drop `onboarding_sessions` table via migration

---

## Database Cleanup

### Check if `role_details` Table Has Data

```sql
-- Query production database
SELECT COUNT(*) as total_rows FROM role_details;

SELECT role_type, COUNT(*) as count
FROM role_details
GROUP BY role_type;
```

**If table is empty**: Safe to drop immediately
**If table has data**: Need data migration first

### Migration Script (if data exists)

```sql
-- Migrate role_details → professional_details
UPDATE profiles p
SET professional_details = jsonb_set(
  COALESCE(professional_details, '{}'::jsonb),
  ARRAY[
    CASE rd.role_type
      WHEN 'seeker' THEN 'client'
      WHEN 'provider' THEN 'tutor'
      WHEN 'agent' THEN 'agent'
    END
  ],
  jsonb_build_object(
    'subjects', rd.subjects,
    'hourly_rate', ARRAY[rd.hourly_rate, rd.hourly_rate],
    'experience_level', rd.teaching_experience->>'years',
    -- ... map other fields
  )
)
FROM role_details rd
WHERE p.id = rd.profile_id;

-- Verify migration
SELECT
  p.id,
  p.email,
  rd.role_type,
  p.professional_details
FROM profiles p
JOIN role_details rd ON p.id = rd.profile_id
LIMIT 5;

-- Drop old table (AFTER verification)
DROP TABLE IF EXISTS role_details CASCADE;
DROP TABLE IF EXISTS onboarding_sessions CASCADE;
```

---

## Recommended Action

### IMMEDIATE (Fix Listings - 2 hours)

1. ✅ Update [my-listings/create/page.tsx](apps/web/src/app/my-listings/create/page.tsx) to read from `professional_details`
2. ✅ Test listing creation after tutor onboarding
3. ✅ Verify form pre-population works

### SHORT-TERM (Mark Deprecated - 4 hours)

4. Add deprecation warnings to `getRoleDetails()` functions
5. Document migration path in code comments
6. Update architecture docs

### LONG-TERM (Remove Old Code - 1 week)

7. Audit all usage of `role_details` table
8. Migrate existing data (if any)
9. Remove deprecated functions
10. Drop `role_details` and `onboarding_sessions` tables

---

## Conclusion

**Current Status**: ❌ **BROKEN**

- Onboarding saves to `professional_details` ✅
- Profile reads from `professional_details` ✅
- **Listings read from `role_details` (EMPTY)** ❌

**Required Action**: Update listings integration to use `professional_details` IMMEDIATELY.

**Impact**: Without this fix, tutors/agents/clients cannot pre-fill listing forms with their profile data, leading to poor UX and data re-entry.

---

**Next Steps**: Implement Phase 1 (Fix Listings Integration) now.
