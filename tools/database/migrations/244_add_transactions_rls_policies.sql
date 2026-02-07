-- ============================================================================
-- Migration 244: Add RLS Policies for Transactions Table
-- ============================================================================
-- File: tools/database/migrations/244_add_transactions_rls_policies.sql
-- Purpose: Add Row Level Security policies to transactions table
-- Created: 2026-02-07
-- Issue: CRITICAL #3 - Missing RLS policies for financial data
--
-- Security Requirements:
-- 1. Users can only view their own transactions
-- 2. Platform fees (profile_id IS NULL) are admin-only
-- 3. Service role bypasses RLS for system operations
-- 4. No user can INSERT/UPDATE/DELETE transactions directly (API only)
-- ============================================================================

-- Enable RLS on transactions table (if not already enabled)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Function: Check if user is admin
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SELECT Policies
-- ============================================================================

-- Policy 1: Users can view their own transactions
CREATE POLICY "Users view own transactions"
ON transactions
FOR SELECT
USING (
  -- User's own transactions
  profile_id = auth.uid()
  OR
  -- Service role bypass (for backend operations)
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy 2: Admins can view all transactions including platform fees
CREATE POLICY "Admins view all transactions"
ON transactions
FOR SELECT
USING (
  is_admin()
);

-- ============================================================================
-- INSERT Policies (Restricted to Backend Only)
-- ============================================================================

-- Policy 3: Only service role can insert transactions
-- This ensures all transaction creation goes through backend RPC functions
CREATE POLICY "Service role only inserts"
ON transactions
FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

-- ============================================================================
-- UPDATE Policies (Restricted to Backend Only)
-- ============================================================================

-- Policy 4: Only service role can update transactions
-- Status transitions (clearing→available, available→paid_out) via backend only
CREATE POLICY "Service role only updates"
ON transactions
FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- ============================================================================
-- DELETE Policies (No Deletes Allowed)
-- ============================================================================

-- Policy 5: No one can delete transactions (immutable ledger)
-- Reversals should create offsetting transactions instead
CREATE POLICY "No transaction deletions"
ON transactions
FOR DELETE
USING (false);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- List all RLS policies for transactions table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'transactions';

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. These policies ensure financial data privacy
-- 2. All transaction creation/updates must go through backend RPC functions
-- 3. Platform fees (profile_id IS NULL) are only visible to admins
-- 4. No deletions allowed - use reversal transactions instead
-- 5. Service role bypasses RLS for system operations (webhooks, cron jobs)
-- ============================================================================
