-- Seed Test Transactions for Payment Testing
-- This script creates test transaction data for testing withdrawals

-- Instructions:
-- 1. Replace 'YOUR_USER_ID' with your actual user ID from the auth.users table
-- 2. Run this in your Supabase SQL Editor or via psql

-- Get your user ID first (run this and copy the result):
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Example: Replace 'YOUR_USER_ID' with the actual UUID
-- Then run the INSERT statements below

-- Test Scenario 1: Multiple small transactions (available for withdrawal)
INSERT INTO transactions (profile_id, type, description, amount, status, available_at, created_at)
VALUES
  ('YOUR_USER_ID', 'Booking Payment', 'Test booking #1 - Available', 50.00, 'available', NOW(), NOW() - INTERVAL '8 days'),
  ('YOUR_USER_ID', 'Booking Payment', 'Test booking #2 - Available', 75.50, 'available', NOW(), NOW() - INTERVAL '9 days'),
  ('YOUR_USER_ID', 'Booking Payment', 'Test booking #3 - Available', 100.00, 'available', NOW(), NOW() - INTERVAL '10 days');

-- Test Scenario 2: Transactions still in clearing period
INSERT INTO transactions (profile_id, type, description, amount, status, available_at, created_at)
VALUES
  ('YOUR_USER_ID', 'Booking Payment', 'Test booking #4 - Clearing', 60.00, 'clearing', NOW() + INTERVAL '5 days', NOW() - INTERVAL '2 days'),
  ('YOUR_USER_ID', 'Booking Payment', 'Test booking #5 - Clearing', 45.00, 'clearing', NOW() + INTERVAL '4 days', NOW() - INTERVAL '3 days');

-- Test Scenario 3: Mix of transaction types
INSERT INTO transactions (profile_id, type, description, amount, status, available_at, created_at)
VALUES
  ('YOUR_USER_ID', 'Booking Payment', 'Regular booking payment', 120.00, 'available', NOW(), NOW() - INTERVAL '15 days'),
  ('YOUR_USER_ID', 'Referral Bonus', 'Referral reward - John Doe', 25.00, 'available', NOW(), NOW() - INTERVAL '20 days'),
  ('YOUR_USER_ID', 'Booking Payment', 'Premium session', 200.00, 'available', NOW(), NOW() - INTERVAL '12 days');

-- Test Scenario 4: Historical paid_out transactions (for display purposes)
INSERT INTO transactions (profile_id, type, description, amount, status, stripe_payout_id, created_at)
VALUES
  ('YOUR_USER_ID', 'Withdrawal', 'Previous withdrawal', -150.00, 'paid_out', 'po_test_12345', NOW() - INTERVAL '30 days'),
  ('YOUR_USER_ID', 'Withdrawal', 'Another withdrawal', -200.00, 'paid_out', 'po_test_67890', NOW() - INTERVAL '45 days');

-- Verify the data
SELECT
  type,
  description,
  amount,
  status,
  available_at,
  created_at
FROM transactions
WHERE profile_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- Check available balance
SELECT * FROM get_available_balance('YOUR_USER_ID');

-- Check pending balance
SELECT * FROM get_pending_balance('YOUR_USER_ID');

-- Check total earnings
SELECT * FROM get_total_earnings('YOUR_USER_ID');

-- Expected results with above data:
-- Available Balance: £225.50 (50 + 75.50 + 100 from scenario 1)
-- Pending Balance: £105.00 (60 + 45 from scenario 2)
-- Total Earnings: £775.50 (sum of all positive amounts)
