-- Migration: Create payment_settings table
-- Purpose: Store payment and fee configuration settings
-- Date: 2025-12-29

-- Create the payment_settings table
-- This uses a singleton pattern - only one row should exist
CREATE TABLE IF NOT EXISTS payment_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensure only one row

    -- Fee Structure
    platform_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    minimum_booking_amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    currency_processing_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 1.50,
    fixed_transaction_fee DECIMAL(10,2) NOT NULL DEFAULT 0.20,

    -- Payout Settings
    auto_payout_enabled BOOLEAN NOT NULL DEFAULT true,
    payout_schedule VARCHAR(50) NOT NULL DEFAULT 'weekly',
    minimum_payout_amount DECIMAL(10,2) NOT NULL DEFAULT 25.00,

    -- Refund Settings
    refund_window_hours INTEGER NOT NULL DEFAULT 24,
    auto_refund_on_cancellation BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE payment_settings IS 'Payment and fee configuration settings (singleton table)';
COMMENT ON COLUMN payment_settings.id IS 'Always 1 - ensures singleton pattern';
COMMENT ON COLUMN payment_settings.platform_fee_percent IS 'Platform commission percentage (e.g., 10.00 for 10%)';
COMMENT ON COLUMN payment_settings.minimum_booking_amount IS 'Minimum allowed booking amount';
COMMENT ON COLUMN payment_settings.currency_processing_fee_percent IS 'Stripe processing fee percentage (UK: 1.50%)';
COMMENT ON COLUMN payment_settings.fixed_transaction_fee IS 'Fixed Stripe transaction fee (UK: £0.20)';
COMMENT ON COLUMN payment_settings.auto_payout_enabled IS 'Enable automatic payouts to tutors';
COMMENT ON COLUMN payment_settings.payout_schedule IS 'Payout frequency: daily, weekly, monthly';
COMMENT ON COLUMN payment_settings.minimum_payout_amount IS 'Minimum balance required for payout';
COMMENT ON COLUMN payment_settings.refund_window_hours IS 'Hours before booking when full refund is allowed';
COMMENT ON COLUMN payment_settings.auto_refund_on_cancellation IS 'Automatically refund on tutor cancellation';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_payment_settings_updated_at
    BEFORE UPDATE ON payment_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_settings_updated_at();

-- Insert default settings (singleton row)
INSERT INTO payment_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
