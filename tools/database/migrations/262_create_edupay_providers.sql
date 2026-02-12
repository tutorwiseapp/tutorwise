/**
 * Migration: 262_create_edupay_providers.sql
 * Purpose: Create edupay_providers table for ISA and Savings providers
 * Created: 2026-02-12
 * Pattern: Follows EduPay table patterns from 259/261
 */

-- Create edupay_providers table
CREATE TABLE IF NOT EXISTS edupay_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('isa', 'savings')),
  description TEXT,
  interest_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for active providers lookup
CREATE INDEX IF NOT EXISTS idx_edupay_providers_active ON edupay_providers(is_active, provider_type);

-- Add RLS policies
ALTER TABLE edupay_providers ENABLE ROW LEVEL SECURITY;

-- Public read access for active providers (users can see available options)
CREATE POLICY "Anyone can view active providers"
  ON edupay_providers
  FOR SELECT
  USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage providers"
  ON edupay_providers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_edupay_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER edupay_providers_updated_at
  BEFORE UPDATE ON edupay_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_edupay_providers_updated_at();

-- Insert default providers (based on MOCK_PROVIDERS from page)
INSERT INTO edupay_providers (name, provider_type, description, interest_rate_percent, is_active) VALUES
  ('Moneybox ISA', 'isa', 'Stocks & Shares ISA with auto-invest features', 4.50, true),
  ('Plum ISA', 'isa', 'AI-powered savings and ISA platform', 4.25, true),
  ('Marcus by Goldman Sachs', 'savings', 'Easy access savings account', 4.75, true),
  ('Chase Saver', 'savings', 'Digital savings with instant access', 4.10, true);

-- Add comment
COMMENT ON TABLE edupay_providers IS 'ISA and Savings providers for EduPay conversions';
