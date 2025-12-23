-- ============================================================================
-- Migration 107: Add Transaction Context Fields
-- ============================================================================
-- Purpose: Add service context fields to transactions for better display
-- Author: AI Architect
-- Date: 2025-12-10
-- Related: Migration 104 (Booking Snapshot), Migration 105 (Review Snapshot)
--
-- Problem:
-- - Transactions only store booking_id, amount, and generic description
-- - Missing service context (what subject, what service, when session occurred)
-- - Have to join to bookings for service information
-- - Transactions page shows generic "Payment" instead of "GCSE Maths Tutoring"
-- - Platform fee transactions (NULL profile_id) lack context
--
-- Solution:
-- Add context fields from booking at transaction creation time:
-- - service_name: What service was paid for (e.g., "GCSE Maths Tutoring")
-- - subjects: Subject categories (e.g., ["Mathematics"])
-- - session_date: When the session occurred
-- - location_type: online/in_person/hybrid
-- - tutor_name: Tutor name for better transaction display
-- - client_name: Client name for better transaction display
--
-- Benefits:
-- 1. Transactions show service context without joins
-- 2. Better UX - "Payment for GCSE Maths Tutoring (Mathematics)" vs "Payment"
-- 3. Can analyze revenue by subject without joins
-- 4. Historical accuracy - transaction shows booking details at payment time
-- 5. Platform fee transactions get context for reporting
-- ============================================================================

-- Step 1: Add context columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subjects TEXT[];
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS session_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS location_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tutor_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS client_name TEXT;

COMMENT ON COLUMN transactions.service_name IS 'Service name from booking (snapshot)';
COMMENT ON COLUMN transactions.subjects IS 'Subjects taught (snapshot from booking)';
COMMENT ON COLUMN transactions.session_date IS 'Session date from booking (snapshot)';
COMMENT ON COLUMN transactions.location_type IS 'Delivery mode: online/in_person/hybrid (snapshot)';
COMMENT ON COLUMN transactions.tutor_name IS 'Tutor name for display (snapshot)';
COMMENT ON COLUMN transactions.client_name IS 'Client name for display (snapshot)';

-- Step 2: Backfill existing transactions from bookings
UPDATE transactions t
SET
  service_name = b.service_name,
  subjects = b.subjects,
  session_date = b.session_start_time,
  location_type = b.location_type,
  tutor_name = tutor_profile.full_name,
  client_name = client_profile.full_name
FROM bookings b
LEFT JOIN profiles tutor_profile ON b.tutor_id = tutor_profile.id
LEFT JOIN profiles client_profile ON b.client_id = client_profile.id
WHERE t.booking_id = b.id
  AND t.service_name IS NULL;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_subjects ON transactions USING GIN (subjects);
CREATE INDEX IF NOT EXISTS idx_transactions_session_date ON transactions (session_date);
CREATE INDEX IF NOT EXISTS idx_transactions_service_name ON transactions (service_name);

-- Step 4: Show migration results
DO $$
DECLARE
  total_transactions INTEGER;
  transactions_with_context INTEGER;
  booking_transactions INTEGER;
  platform_fee_transactions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_transactions FROM transactions;
  SELECT COUNT(*) INTO transactions_with_context FROM transactions WHERE service_name IS NOT NULL;
  SELECT COUNT(*) INTO booking_transactions FROM transactions WHERE booking_id IS NOT NULL;
  SELECT COUNT(*) INTO platform_fee_transactions FROM transactions WHERE profile_id IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 107 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total transactions: %', total_transactions;
  RAISE NOTICE 'Transactions with context: %', transactions_with_context;
  RAISE NOTICE 'Booking transactions: %', booking_transactions;
  RAISE NOTICE 'Platform fee transactions: %', platform_fee_transactions;
  RAISE NOTICE '========================================';
END $$;
