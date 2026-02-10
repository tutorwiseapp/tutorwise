-- Migration: 260_add_truelayer_fields_to_edupay_conversions.sql
-- Purpose: Add TrueLayer PISP fields to edupay_conversions for Phase 3 loan payment conversion
-- Created: 2026-02-10

-- ============================================================================
-- 1. Add TrueLayer fields to edupay_conversions
-- ============================================================================

ALTER TABLE edupay_conversions
  ADD COLUMN IF NOT EXISTS truelayer_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS truelayer_resource_token TEXT,
  ADD COLUMN IF NOT EXISTS slc_reference TEXT,
  ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ;

-- Index for webhook/callback lookups by TrueLayer payment ID
CREATE UNIQUE INDEX IF NOT EXISTS edupay_conversions_truelayer_payment_id_idx
  ON edupay_conversions (truelayer_payment_id)
  WHERE truelayer_payment_id IS NOT NULL;

-- ============================================================================
-- 2. Verify
-- ============================================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'edupay_conversions'
  AND column_name IN ('truelayer_payment_id', 'truelayer_resource_token', 'slc_reference', 'initiated_at')
ORDER BY column_name;
