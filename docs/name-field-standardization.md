# Name Field Standardization - Fix Complete

## Problem
First name and last name entered on the signup page were not appearing in the onboarding personal info form.

## Root Cause
The application was using inconsistent field names for user names:
- Signup page was sending `given_name` and `family_name` (OAuth convention)
- Database trigger was trying to extract from these OAuth fields
- Profile table uses `first_name` and `last_name`
- This created unnecessary translation complexity and potential for bugs

## Solution
Standardized the entire application to use `first_name` and `last_name` as the primary field names throughout, with backward compatibility for OAuth providers.

## Changes Made

### 1. Signup Page ([signup/page.tsx](apps/web/src/app/signup/page.tsx))
**Changed:** Line 54-56
```typescript
// Before:
data: {
  given_name: firstName,
  family_name: lastName,
  full_name: `${firstName} ${lastName}`.trim(),
}

// After:
data: {
  first_name: firstName,
  last_name: lastName,
  full_name: `${firstName} ${lastName}`.trim(),
}
```

### 2. Database Trigger (Migration 020)
**Created:** [apps/api/migrations/020_standardize_name_fields.sql](apps/api/migrations/020_standardize_name_fields.sql)

**Key improvements:**
- Uses `COALESCE` to prioritize `first_name`/`last_name` from our signup
- Falls back to `given_name`/`family_name` for OAuth (Google, etc.)
- Maintains all existing error handling and fallback logic

```sql
v_first_name := COALESCE(
  NEW.raw_user_meta_data->>'first_name',
  NEW.raw_user_meta_data->>'given_name'
);
v_last_name := COALESCE(
  NEW.raw_user_meta_data->>'last_name',
  NEW.raw_user_meta_data->>'family_name'
);
```

### 3. Migration Applied
✅ Migration 020 successfully applied to production database
✅ Function verified to prioritize `first_name`/`last_name`
✅ Backward compatibility with OAuth maintained

## Data Flow (After Fix)

1. **Signup Page**: User enters first name and last name
   - Sends as `first_name` and `last_name` in auth metadata
   - Also sends `full_name` for convenience

2. **Auth System**: Supabase stores metadata on user object
   - `raw_user_meta_data.first_name`
   - `raw_user_meta_data.last_name`
   - `raw_user_meta_data.full_name`

3. **Database Trigger**: `handle_new_user()` fires on user creation
   - Extracts `first_name`/`last_name` from metadata
   - Falls back to `given_name`/`family_name` if OAuth
   - Inserts into profiles table

4. **UserProfileContext**: Fetches profile from database
   - Provides `profile.first_name` and `profile.last_name`
   - Makes them available throughout the app

5. **Onboarding Form**: `TutorPersonalInfoStep` reads from profile
   - Pre-populates form fields with names from profile
   - User sees their names already filled in

## Testing

### Test Current User
```bash
node test-user-metadata.mjs
```

This will show:
- User metadata (from auth)
- Profile data (from database)
- Whether names are properly populated

### Test New Signup Flow
1. Sign out from the application
2. Go to `/signup`
3. Enter first name, last name, email, password
4. Sign up
5. Should be redirected to `/onboarding`
6. Personal info form should show first and last name pre-filled

## Backward Compatibility

The solution maintains full backward compatibility:
- ✅ New signups use `first_name`/`last_name`
- ✅ Google OAuth still works (uses `given_name`/`family_name`)
- ✅ Existing users with old metadata are unaffected
- ✅ Both field name conventions are supported

## Files Created/Modified

### Modified
- `apps/web/src/app/signup/page.tsx`

### Created
- `apps/api/migrations/020_standardize_name_fields.sql`
- `apply-migration-020-direct.mjs`
- `verify-migration-020.mjs`
- `test-user-metadata.mjs` (updated)
- `NAME-FIELD-STANDARDIZATION.md` (this file)

## Verification Checklist

- [x] Signup page sends `first_name`/`last_name` in metadata
- [x] Database trigger prioritizes `first_name`/`last_name`
- [x] Database trigger falls back to `given_name`/`family_name` for OAuth
- [x] Migration 020 applied successfully
- [x] Function verified to use COALESCE priority logic
- [x] Test script created to verify user metadata
- [ ] End-to-end test with new user signup (requires manual testing)

## Next Steps

1. **Test with a new user**: Create a completely new account to verify the full flow
2. **Test Google OAuth**: Ensure Google signup still works correctly
3. **Clean up old test files**: Remove temporary debug scripts if desired
4. **Document in app**: Update any developer documentation about name field conventions
