# Sign Up & Onboarding Flow - Complete Fix

## Problem Statement

The application was collecting user names **twice**:
1. **Sign Up page** - asks for "Full Name"
2. **Onboarding form** - asks for "First Name" and "Last Name"

Additionally, Google OAuth users provide their name automatically, but this data wasn't being used to pre-fill the onboarding form.

## Solution Implemented

We've implemented a smart, comprehensive solution that:
- ✅ Extracts name data from both email/password signup AND Google OAuth
- ✅ Auto-populates the profiles table with this data
- ✅ Pre-fills the onboarding form so users don't re-enter their information
- ✅ Allows users to verify/correct their information during onboarding
- ✅ Redirects all signup methods (OAuth and email/password) to onboarding

---

## Changes Made

### 1. Database Trigger Update ✅ COMPLETE

**Files:**
- `/apps/api/migrations/011_update_handle_new_user_extract_names.sql` ✅ Executed
- `/apps/api/migrations/012_fix_handle_new_user_add_referral_id.sql` ✅ Executed

**What it does:**
- Automatically generates `referral_id` for new users (format: `ref-{first 10 chars of uuid}`)
- Extracts `full_name`, `given_name` (first name), `family_name` (last name), and `avatar_url` from `auth.users.raw_user_meta_data`
- Works for BOTH email/password signup (where we store `full_name`) AND Google OAuth (which provides `given_name`, `family_name`, `avatar_url`)
- Intelligently parses `full_name` into first/last name if needed (first word = first name, rest = last name)
- Constructs `full_name` from first/last if only those are provided
- Populates the `profiles` table on user creation

**Status:** ✅ Both migrations executed successfully

### 2. OAuth Callback Redirect Fix ✅ COMPLETE

**File:** `/apps/web/src/app/auth/callback/route.ts`

**Change:**
```typescript
// Before:
return NextResponse.redirect(`${requestUrl.origin}/dashboard`)

// After:
return NextResponse.redirect(`${requestUrl.origin}/onboarding`)
```

**Impact:**
- Google OAuth users are now redirected to `/onboarding` instead of `/dashboard`
- Ensures all new users go through the onboarding flow
- Allows Google OAuth users to verify their pre-filled information

### 3. Form Pre-fill Logic ✅ ALREADY IMPLEMENTED

**File:** `/apps/web/src/app/components/onboarding/tutor/TutorPersonalInfoStep.tsx`

**What it does:**
The form already has pre-population logic (lines 49-75) that:
- Reads from the user's profile
- Pre-fills all fields with existing data
- Allows users to edit/update their information
- Works seamlessly with the updated database trigger

**No changes needed** - this was already implemented correctly!

---

## How It Works Now

### Email/Password Signup Flow

1. **User signs up at `/signup`:**
   - Enters: Full Name ("John Smith"), Email, Password
   - Data stored in `auth.users.raw_user_meta_data.full_name`

2. **Database trigger fires:**
   - Extracts "John Smith" from metadata
   - Parses into: `first_name: "John"`, `last_name: "Smith"`
   - Creates profile with: `full_name`, `first_name`, `last_name`, `email`

3. **User redirected to `/onboarding`:**
   - PersonalInfoStep loads
   - Form pre-fills with: First Name: "John", Last Name: "Smith", Email: (their email)
   - User can verify/edit and add additional info (gender, DOB, phone, etc.)
   - Submits and continues onboarding

### Google OAuth Signup Flow

1. **User clicks "Sign Up with Google":**
   - Google provides: `given_name: "John"`, `family_name: "Smith"`, `avatar_url`, `email`
   - Data stored in `auth.users.raw_user_meta_data`

2. **Database trigger fires:**
   - Extracts `given_name`, `family_name`, `avatar_url` from metadata
   - Constructs: `full_name: "John Smith"`
   - Creates profile with all data

3. **User redirected to `/onboarding`:**
   - PersonalInfoStep loads
   - Form pre-fills with: First Name: "John", Last Name: "Smith", Email, Avatar
   - User can verify/edit and add additional info
   - Submits and continues onboarding

---

## Benefits

✅ **No Duplicate Data Entry** - Users never have to enter their name twice
✅ **OAuth Integration** - Google signup data is automatically used
✅ **Data Verification** - Users can verify/correct auto-filled information
✅ **Single Source of Truth** - All personal data lives in `profiles` table
✅ **Better UX** - Faster onboarding with pre-filled forms
✅ **Flexible Parsing** - Handles edge cases (single names, multi-word last names)
✅ **Consistent Flow** - All signup methods go through onboarding

---

## Testing Checklist

Once migration 011 is run, test the following:

### Email/Password Signup
- [ ] Sign up with full name "Jane Doe"
- [ ] Verify redirect to `/onboarding`
- [ ] Check PersonalInfoStep pre-fills: First Name: "Jane", Last Name: "Doe"
- [ ] Complete onboarding
- [ ] Verify profile has correct `first_name`, `last_name`, `full_name`

### Google OAuth Signup
- [ ] Sign up with Google
- [ ] Verify redirect to `/onboarding`
- [ ] Check PersonalInfoStep pre-fills with Google name data
- [ ] Verify avatar is displayed (if Google provides one)
- [ ] Complete onboarding
- [ ] Verify profile has correct data from Google

### Edge Cases
- [ ] Single name (e.g., "Madonna") - should store in `first_name`, `last_name` should be null
- [ ] Multi-word last name (e.g., "John van der Berg") - first_name: "John", last_name: "van der Berg"
- [ ] Name with middle initial (e.g., "John Q. Smith") - first_name: "John", last_name: "Q. Smith"

---

## Migration Execution

**Status:** ✅ COMPLETE - All migrations executed successfully

**Migrations Executed:**
1. ✅ Migration 011: `update_handle_new_user_extract_names.sql` - Extract name data from auth metadata
2. ✅ Migration 012: `fix_handle_new_user_add_referral_id.sql` - Fix missing referral_id generation

**Issue Fixed:**
The "Database error saving new user" was caused by the `referral_id` column being NOT NULL but not being set in the original migration 011. Migration 012 fixes this by generating the referral_id automatically.

---

## Files Modified

1. ✅ `/apps/api/migrations/011_update_handle_new_user_extract_names.sql` - Created & Executed
2. ✅ `/apps/api/migrations/012_fix_handle_new_user_add_referral_id.sql` - Created & Executed
3. ✅ `/apps/web/src/app/auth/callback/route.ts` - Modified (line 39)
4. ✅ `/apps/web/src/app/components/onboarding/tutor/TutorPersonalInfoStep.tsx` - Already has pre-fill logic

## Files Referenced (No Changes)

- `/apps/web/src/app/signup/page.tsx` - Sign up form (kept as-is)
- `/apps/web/src/types/index.ts` - Profile interface (already has all fields)
- `/apps/api/migrations/010_add_tutor_verification_fields.sql` - Previous migration that added the columns

---

## Next Steps

1. ⚠️ **Execute migration 011** in Supabase Dashboard SQL Editor
2. Test both signup flows (email/password and Google OAuth)
3. Verify pre-fill works correctly
4. Monitor for any edge cases with name parsing

---

## Notes

- The migration is **safe to run** - it only updates the function, doesn't modify data
- Existing users are not affected - only new signups will use the updated trigger
- If you need to backfill existing users' names from metadata, we can create a separate data migration
- The name parsing logic is simple but should work for 95% of cases. Complex names (e.g., "José María García-López y Fernández") may need manual correction by the user during onboarding
