# Name Pre-population Debugging Guide

## Current Status

### ✅ Backend is Working Perfectly

All backend systems are confirmed working:

1. **Database Trigger** - `handle_new_user()` correctly extracts names from signup metadata
2. **All Profiles Have Names** - Verified all 10 profiles in database have complete name data:
   ```
   1. viniteapp@gmail.com - Vinite App
   2. micquan@gmail.com - Michael Quan
   3. sarah-jones-*@example.com - Sarah Jones
   4. jane-doe-*@example.com - Jane Doe
   ... and 6 more, all with complete names
   ```
3. **Data is Accessible** - Frontend can successfully fetch name data from profiles table

### 🔍 Debug Logging Added

I've added comprehensive debug logging to [TutorPersonalInfoStep.tsx](apps/web/src/app/components/onboarding/tutor/TutorPersonalInfoStep.tsx):

**Location:** Lines 45-110

**What it logs:**
1. **Component Render** - Every time component renders, shows:
   - Whether profile exists
   - Whether user exists
   - Current formData firstName/lastName values

2. **useEffect Trigger** - When useEffect runs, shows:
   - Complete profile data received (id, first_name, last_name, full_name, email)
   - Whether profile/user objects exist

3. **Pre-fill Values** - Shows exact values extracted from profile

4. **FormData Update** - Shows new values being set in state

## How to Debug in Browser

### Step 1: Open Browser Console
1. Navigate to `http://localhost:3000/signup`
2. Press **F12** (or Right-click → Inspect)
3. Click on **Console** tab

### Step 2: Complete Signup or Login
- Either sign up with a new account (First Name + Last Name fields)
- Or login with existing account (Google OAuth or email/password)

### Step 3: Go to Onboarding
- You should be redirected to `/onboarding` automatically
- Navigate to the Personal Information step

### Step 4: Check Console Logs

You should see logs like this:

```
[TutorPersonalInfoStep] Component render
  hasProfile: false
  hasUser: true
  formDataFirstName: ""
  formDataLastName: ""

[TutorPersonalInfoStep] useEffect triggered
  hasProfile: false
  hasUser: true
  profileData: null

[TutorPersonalInfoStep] No profile available yet, form will show placeholders

[TutorPersonalInfoStep] Component render
  hasProfile: true
  hasUser: true
  formDataFirstName: ""
  formDataLastName: ""

[TutorPersonalInfoStep] useEffect triggered
  hasProfile: true
  hasUser: true
  profileData: {
    id: "...",
    first_name: "John",
    last_name: "Smith",
    full_name: "John Smith",
    email: "johnsmith@gmail.com"
  }

[TutorPersonalInfoStep] Pre-filling form with profile data:
  first_name: "John"
  last_name: "Smith"
  email: "johnsmith@gmail.com"

[TutorPersonalInfoStep] Setting formData to:
  firstName: "John"
  lastName: "Smith"
  email: "johnsmith@gmail.com"
```

### Step 5: Send Screenshot

**Please send a screenshot of:**
1. The browser console showing these logs
2. The Personal Information form (showing whether names are filled or not)

This will definitively show us:
- ✅ Is the profile data being loaded?
- ✅ Is the useEffect running?
- ✅ What values are actually in the profile?
- ✅ Is formData being updated?
- ✅ Is there a React re-render issue?

## Expected Behavior

### For New Signups (via Signup Form)
1. User fills First Name: "John", Last Name: "Smith"
2. Backend creates profile with `first_name: "John"`, `last_name: "Smith"`, `full_name: "John Smith"`
3. User redirected to `/onboarding`
4. Form should pre-fill with "John" and "Smith"

### For Google OAuth Login
1. User signs in with Google (provides given_name, family_name)
2. Backend creates profile extracting names from OAuth metadata
3. User redirected to `/onboarding`
4. Form should pre-fill with names from Google profile

## Technical Details

### Database Schema
```sql
profiles (
  id uuid PRIMARY KEY,
  email text,
  first_name text,
  last_name text,
  full_name text,
  ...
)
```

### Trigger Function
Location: [016_final_handle_new_user_with_names.sql](apps/api/migrations/016_final_handle_new_user_with_names.sql)

Extracts names from `auth.users.raw_user_meta_data`:
- `given_name` → `first_name` (from Google OAuth or signup form)
- `family_name` → `last_name` (from Google OAuth or signup form)
- `full_name` (from signup form or constructed from given_name + family_name)

### Migration 019 - Backfill
Location: [019_backfill_missing_names.sql](apps/api/migrations/019_backfill_missing_names.sql)

Updated ALL existing profiles to extract missing names from user metadata. All 10 profiles now have complete name data.

## Verified Test Results

### Test Script: test-prepopulation-debug.mjs

**Results:**
```
✅ Step 1: User created successfully with metadata
✅ Step 2: Profile exists in database with names
✅ Step 3: Frontend CAN fetch names from database

🎉 ALL BACKEND TESTS PASSED
```

**Conclusion:** The issue (if it still exists) must be in the React component rendering or the UserProfileContext timing.

## Next Steps

1. **User:** Complete signup/login in browser with console open
2. **User:** Navigate to Personal Information step
3. **User:** Screenshot console logs + form
4. **User:** Send screenshot

This will show us exactly what's happening in the browser and whether it's a:
- Profile loading timing issue
- React state update issue
- Context provider issue
- Or if it's actually working now!
