-- Migration: Create webhooks table
-- Purpose: Store webhook configurations for integrations
-- Date: 2025-12-29

-- Create the webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Validation constraints
    CONSTRAINT valid_url CHECK (url ~ '^https?://'),
    CONSTRAINT non_empty_events CHECK (array_length(events, 1) > 0)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_webhooks_status
    ON webhooks(status);

CREATE INDEX IF NOT EXISTS idx_webhooks_created_at
    ON webhooks(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE webhooks IS 'Stores webhook configurations for platform integrations';
COMMENT ON COLUMN webhooks.id IS 'Unique webhook identifier';
COMMENT ON COLUMN webhooks.url IS 'Webhook endpoint URL (must be http or https)';
COMMENT ON COLUMN webhooks.events IS 'Array of event types this webhook listens to';
COMMENT ON COLUMN webhooks.status IS 'Webhook status: active or inactive';
COMMENT ON COLUMN webhooks.created_at IS 'Timestamp when webhook was created';
COMMENT ON COLUMN webhooks.updated_at IS 'Timestamp when webhook was last updated';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_webhooks_updated_at();

-- Insert sample webhook data
INSERT INTO webhooks (url, events, status) VALUES
    ('https://example.com/webhooks/bookings', ARRAY['booking.created', 'booking.cancelled'], 'active'),
    ('https://example.com/webhooks/payments', ARRAY['payment.succeeded', 'payment.failed'], 'active')
ON CONFLICT DO NOTHING;
