-- Migration: Create failed_webhooks table for Dead-Letter Queue
-- Version: 058
-- Created: 2025-11-11
-- Description: Implements SDD v4.9, Section 3.3 - Webhook Dead-Letter Queue (DLQ)
-- This table stores webhook events that fail permanently for manual review

BEGIN;

-- =====================================================================
-- Create failed_webhooks table
-- =====================================================================

CREATE TABLE public.failed_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Webhook identification
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,

    -- Failure tracking
    status TEXT NOT NULL DEFAULT 'failed',
    error_message TEXT,
    retry_count INT DEFAULT 0,

    -- Full event payload for debugging
    payload JSONB NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_retry_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    -- Optional: Link to related entities if parseable
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,

    -- Resolution notes
    resolution_notes TEXT
);

-- =====================================================================
-- Create indexes for efficient queries
-- =====================================================================

-- Index for finding specific events
CREATE INDEX idx_failed_webhooks_event_id ON public.failed_webhooks(event_id);

-- Index for filtering by status
CREATE INDEX idx_failed_webhooks_status ON public.failed_webhooks(status);

-- Index for finding recent failures
CREATE INDEX idx_failed_webhooks_created_at ON public.failed_webhooks(created_at DESC);

-- Index for filtering by event type
CREATE INDEX idx_failed_webhooks_event_type ON public.failed_webhooks(event_type);

-- =====================================================================
-- Add table comment
-- =====================================================================

COMMENT ON TABLE public.failed_webhooks IS
'Dead-Letter Queue for Stripe webhook events that fail permanently. Used for manual review and debugging.';

COMMIT;
