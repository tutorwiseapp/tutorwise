-- Migration: Add stripe_checkout_id to bookings for idempotency
-- Version: 056
-- Created: 2025-11-11
-- Description: Implements SDD v4.9, Section 3.1 - Idempotent Webhook Handling
-- This migration adds a unique constraint to prevent duplicate webhook processing

BEGIN;

-- Add stripe_checkout_id column with UNIQUE constraint for idempotency
ALTER TABLE public.bookings
ADD COLUMN stripe_checkout_id TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX idx_bookings_stripe_checkout_id
ON public.bookings(stripe_checkout_id);

-- Add comment explaining the column's purpose
COMMENT ON COLUMN public.bookings.stripe_checkout_id IS
'Stripe Checkout Session ID used for idempotent webhook processing. Prevents duplicate transaction creation from webhook retries.';

COMMIT;
