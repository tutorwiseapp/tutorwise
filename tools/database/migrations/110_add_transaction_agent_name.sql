-- ============================================================================
-- Migration 110: Add agent_name to Transactions
-- ============================================================================
-- Purpose: Add missing agent_name field to transaction context
-- Author: AI Architect
-- Date: 2025-12-10
-- Related: Migration 107 (Transaction Context Fields), Migration 109 (RPC Update)
--
-- Problem:
-- - Migration 107 added 6 context fields but missed agent_name
-- - Bookings can have agent_id (agent-led bookings)
-- - Agent commissions show generic description without agent name
-- - Inconsistent with having tutor_name and client_name
--
-- Solution:
-- Add agent_name field to transactions:
-- - agent_name: Agent name for display (snapshot from profiles)
--
-- Benefits:
-- 1. Complete context for agent-led bookings
-- 2. Agent commission transactions show agent name
-- 3. Consistent with tutor_name and client_name pattern
-- 4. Better transaction history display
-- ============================================================================

-- Step 1: Add column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS agent_name TEXT;

COMMENT ON COLUMN transactions.agent_name IS 'Agent name for display (snapshot from agent profile)';

-- Step 2: Backfill existing transactions from bookings
UPDATE transactions t
SET agent_name = agent_profile.full_name
FROM bookings b
LEFT JOIN profiles agent_profile ON b.agent_id = agent_profile.id
WHERE t.booking_id = b.id
  AND b.agent_id IS NOT NULL
  AND t.agent_name IS NULL;

-- Step 3: Show migration results
DO $$
DECLARE
  total_transactions INTEGER;
  agent_transactions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_transactions FROM transactions;
  SELECT COUNT(*) INTO agent_transactions FROM transactions WHERE agent_name IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 110 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total transactions: %', total_transactions;
  RAISE NOTICE 'Agent transactions: %', agent_transactions;
  RAISE NOTICE '========================================';
END $$;
