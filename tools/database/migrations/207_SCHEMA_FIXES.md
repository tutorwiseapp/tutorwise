# Migration 207 Schema Fixes Required

## Summary
The original migration 207 was written based on assumed schema patterns that don't match the actual database. This document lists ALL required fixes to align with actual schema.

## Schema Mismatches Found

### 1. ✅ FIXED: roles column type
- **Assumed:** JSONB
- **Actual:** text[]
- **Fix:** Changed `jsonb_array_length(roles)` to `array_length(roles, 1)`
- **Fix:** Changed `jsonb_array_elements_text(v_profile.roles)` to just `v_roles := v_profile.roles`

### 2. ✅ FIXED: Booking amount column
- **Assumed:** `total_price`
- **Actual:** `amount`
- **Fix:** Replaced all `total_price` with `amount`

### 3. ✅ FIXED: Status enum capitalization
- **Assumed:** lowercase ('completed', 'confirmed', 'paid', 'cancelled')
- **Actual:** Capitalized ('Completed', 'Confirmed', 'Paid', 'Cancelled')
- **Enums found:**
  - `booking_status_enum`: {Pending,Confirmed,Completed,Cancelled,Declined}
  - `transaction_status_enum`: {Pending,Paid,Failed,Cancelled}
- **Fix:** Replaced all lowercase with capitalized versions

### 4. ✅ FIXED: Booking time column
- **Assumed:** `start_time`
- **Actual:** `session_start_time`
- **Fix:** Replaced all `start_time` with `session_start_time`

### 5. ✅ FIXED: Booking duration calculation
- **Assumed:** `end_time - session_start_time` (no end_time column exists)
- **Actual:** `duration_minutes` column exists
- **Fix:** Changed `EXTRACT(EPOCH FROM (end_time - session_start_time)) / 3600` to `duration_minutes / 60.0`

### 6. ✅ FIXED: Referral tracking architecture
- **Assumed:** referrals table with `referrer_id` column tracks conversions
- **Actual:**
  - Lifetime attribution in `profiles.referred_by_profile_id`
  - Referral commissions in `transactions` table with `type = 'Referral Commission'`
  - `referrals` table is for referral LINKS, not conversions
- **Fixes:**
  - Referrals made: COUNT from `profiles WHERE referred_by_profile_id = user_id`
  - Referrals converted: COUNT DISTINCT profiles with referred_by + completed bookings
  - Referral earnings: SUM from `transactions WHERE profile_id = user_id AND type = 'Referral Commission'`

### 7. ❌ NEEDS FIX: CaaS scores column
- **Assumed:** `total` column
- **Actual:** `total_score` column
- **Fix:** Change `COALESCE(total, 0)` to `COALESCE(total_score, 0)`

### 8. ❓ NEEDS VERIFICATION: Reviews and messages tables
- **Migration references:** Queries for reviews and unread messages
- **Status:** reviews table doesn't exist (might be `listing_reviews` or `profile_reviews`)
- **Status:** messages table doesn't exist (might be `chat_messages`)
- **Needs:** Check migration queries against actual table names

## Next Steps

1. Fix CaaS score column name (#7)
2. Verify and fix reviews table references (#8)
3. Verify and fix messages table references (#8)
4. Test complete migration end-to-end
5. Run backfill script
