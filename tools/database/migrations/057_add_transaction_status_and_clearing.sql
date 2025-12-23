-- Migration: Add transaction status enum and clearing period support
-- Version: 057
-- Created: 2025-11-11
-- Description: Implements SDD v4.9, Section 3.2 - Dynamic Payout Clearing Period
-- Adds status tracking and available_at timestamp for clearing periods

BEGIN;

-- =====================================================================
-- STEP 1: Create new transaction_status_v4_9 enum
-- =====================================================================
-- Note: We create a new enum because transaction_status_enum already exists
-- We'll need to migrate data and swap the enums

CREATE TYPE transaction_status_v4_9 AS ENUM (
    'clearing',     -- Funds held during clearing period
    'available',    -- Funds available for payout
    'paid_out',     -- Funds have been paid out to bank
    'disputed',     -- Transaction is under dispute/chargeback
    'refunded'      -- Transaction has been refunded
);

-- =====================================================================
-- STEP 2: Add new columns to transactions table
-- =====================================================================

-- Add available_at timestamp for dynamic clearing periods
ALTER TABLE public.transactions
ADD COLUMN available_at TIMESTAMPTZ;

-- Add new status column (we'll migrate data later)
ALTER TABLE public.transactions
ADD COLUMN status_v4_9 transaction_status_v4_9 DEFAULT 'clearing';

-- =====================================================================
-- STEP 3: Migrate existing data
-- =====================================================================
-- Map old status values to new status values
-- Old: 'Pending' -> New: 'clearing'
-- Old: 'Paid' -> New: 'available' (for user transactions) or 'paid_out' (for withdrawals)
-- Old: 'Failed' -> Keep as is (we'll handle separately)
-- Old: 'Cancelled' -> Keep as is (we'll handle separately)

UPDATE public.transactions
SET status_v4_9 = CASE
    -- Withdrawal transactions that are 'Paid' are actually paid out
    WHEN type = 'Withdrawal' AND status = 'Paid' THEN 'paid_out'::transaction_status_v4_9
    -- All other 'Paid' transactions are available for payout
    WHEN status = 'Paid' THEN 'available'::transaction_status_v4_9
    -- Pending transactions are in clearing
    WHEN status = 'Pending' THEN 'clearing'::transaction_status_v4_9
    -- Default to clearing for safety
    ELSE 'clearing'::transaction_status_v4_9
END;

-- Set available_at for existing transactions
-- For already-paid transactions, set to past date (immediately available)
-- For pending transactions, set to a reasonable clearing period (7 days from creation)
UPDATE public.transactions
SET available_at = CASE
    WHEN status_v4_9 = 'available' OR status_v4_9 = 'paid_out' THEN created_at
    WHEN status_v4_9 = 'clearing' THEN created_at + INTERVAL '7 days'
    ELSE created_at + INTERVAL '7 days'
END;

-- =====================================================================
-- STEP 4: Drop old status column and rename new one
-- =====================================================================

-- Drop old status column
ALTER TABLE public.transactions
DROP COLUMN status;

-- Rename new column to 'status'
ALTER TABLE public.transactions
RENAME COLUMN status_v4_9 TO status;

-- Make status NOT NULL with default
ALTER TABLE public.transactions
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'clearing';

-- =====================================================================
-- STEP 5: Create indexes for efficient queries
-- =====================================================================

CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_available_at ON public.transactions(available_at);

-- Compound index for common query pattern (available funds)
CREATE INDEX idx_transactions_profile_status_available
ON public.transactions(profile_id, status, available_at)
WHERE status = 'available';

-- =====================================================================
-- STEP 6: Add comments
-- =====================================================================

COMMENT ON COLUMN public.transactions.status IS
'Transaction status: clearing (held), available (ready for payout), paid_out (withdrawn), disputed (chargeback), refunded';

COMMENT ON COLUMN public.transactions.available_at IS
'Timestamp when funds become available for payout. Calculated based on service completion + clearing period (24h-7 days based on seller trust).';

COMMIT;
