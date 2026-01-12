-- Migration: 164_create_form_config_table.sql
-- Purpose: Create form_config table for dynamic form configuration
-- Allows admins to manage dropdown options and field metadata without code deployment
-- Supports onboarding forms (all roles), account forms, and organisation forms

-- Create the form_config table
CREATE TABLE IF NOT EXISTS form_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What are we configuring?
  config_type TEXT NOT NULL CHECK (config_type IN ('field_meta', 'option')),
  field_name TEXT NOT NULL,           -- e.g., 'subjects', 'bio', 'keyStages'
  context TEXT NOT NULL,              -- e.g., 'onboarding.tutor', 'account', 'organisation.agent'

  -- Field metadata (used when config_type='field_meta')
  field_label TEXT,                   -- Display label for the field
  field_placeholder TEXT,             -- Placeholder text
  field_help_text TEXT,               -- Additional help text

  -- Option data (used when config_type='option')
  option_value TEXT,                  -- The actual value stored in the database
  option_label TEXT,                  -- The label shown to users

  -- Management
  display_order INT DEFAULT 0,        -- Controls the order of options in dropdowns
  is_active BOOLEAN DEFAULT TRUE,     -- Soft delete support
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure uniqueness of options within a context
  UNIQUE(config_type, field_name, context, option_value)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_form_config_lookup
  ON form_config(field_name, context, config_type, is_active);

-- Create index for display order
CREATE INDEX IF NOT EXISTS idx_form_config_order
  ON form_config(field_name, context, display_order);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_form_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_config_updated_at_trigger
  BEFORE UPDATE ON form_config
  FOR EACH ROW
  EXECUTE FUNCTION update_form_config_updated_at();

-- Add RLS policies
ALTER TABLE form_config ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to READ (for displaying forms)
CREATE POLICY "Allow authenticated users to read form config"
  ON form_config
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only allow admins to INSERT/UPDATE/DELETE
-- Note: You'll need to define what makes a user an "admin" in your system
-- This is a placeholder - adjust based on your admin role implementation
CREATE POLICY "Allow admins to manage form config"
  ON form_config
  FOR ALL
  TO authenticated
  USING (
    -- Admin users can read/write form_config
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  )
  WITH CHECK (
    -- Admin users can insert/update form_config
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  );

-- Add helpful comments
COMMENT ON TABLE form_config IS 'Dynamic form configuration for managing dropdown options and field metadata across all forms';
COMMENT ON COLUMN form_config.config_type IS 'Type of configuration: field_meta for labels/placeholders, option for dropdown choices';
COMMENT ON COLUMN form_config.field_name IS 'Name of the field being configured (e.g., subjects, bio, keyStages)';
COMMENT ON COLUMN form_config.context IS 'Context where this config applies (e.g., onboarding.tutor, account, organisation.agent)';
COMMENT ON COLUMN form_config.field_label IS 'Display label for the field (only used when config_type=field_meta)';
COMMENT ON COLUMN form_config.field_placeholder IS 'Placeholder text (only used when config_type=field_meta)';
COMMENT ON COLUMN form_config.field_help_text IS 'Additional help text (only used when config_type=field_meta)';
COMMENT ON COLUMN form_config.option_value IS 'The actual value stored (only used when config_type=option)';
COMMENT ON COLUMN form_config.option_label IS 'The label displayed to users (only used when config_type=option)';
COMMENT ON COLUMN form_config.display_order IS 'Controls the order of options in dropdowns';
COMMENT ON COLUMN form_config.is_active IS 'Soft delete flag - inactive configs are hidden from users';
