-- Migration: 170_create_shared_fields_tables.sql
-- Purpose: Create shared_fields system for centralized field management
-- Enables admins to manage field options once and use them across multiple contexts
-- Date: 2026-01-13

-- ============================================================================
-- SHARED FIELDS - GLOBAL FIELD DEFINITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Field identification
  field_name TEXT NOT NULL UNIQUE,        -- 'subjects', 'qualifications', etc.
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'multiselect', 'number', 'date', 'email', 'url')),

  -- Default labels and metadata
  label TEXT NOT NULL,                    -- Default label: 'Subjects'
  placeholder TEXT,                       -- Default placeholder: 'Select subjects'
  help_text TEXT,                         -- Default help text

  -- Options (for select/multiselect types)
  options JSONB,                          -- Array of {value, label} objects

  -- Validation rules (optional)
  validation_rules JSONB,                 -- {min_length, max_length, pattern, etc.}

  -- Management
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_fields_name ON shared_fields(field_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shared_fields_type ON shared_fields(field_type) WHERE is_active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_shared_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shared_fields_updated_at_trigger
  BEFORE UPDATE ON shared_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_fields_updated_at();

-- ============================================================================
-- FORM CONTEXT FIELDS - FIELD USAGE PER CONTEXT
-- ============================================================================

CREATE TABLE IF NOT EXISTS form_context_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Context identification
  context TEXT NOT NULL,                  -- 'onboarding.tutor', 'account', 'listing'

  -- Field reference
  shared_field_id UUID REFERENCES shared_fields(id) ON DELETE CASCADE,

  -- Context-specific overrides
  custom_label TEXT,                      -- Override default label
  custom_placeholder TEXT,                -- Override default placeholder
  custom_help_text TEXT,                  -- Override default help text

  -- Field behavior in this context
  is_enabled BOOLEAN DEFAULT TRUE,        -- Show/hide field
  is_required BOOLEAN DEFAULT FALSE,      -- Required/optional
  display_order INT DEFAULT 0,            -- Sort order in form

  -- Management
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Ensure field appears only once per context
  UNIQUE(context, shared_field_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_form_context_fields_context ON form_context_fields(context) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_form_context_fields_order ON form_context_fields(context, display_order);
CREATE INDEX IF NOT EXISTS idx_form_context_fields_field ON form_context_fields(shared_field_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_form_context_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_context_fields_updated_at_trigger
  BEFORE UPDATE ON form_context_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_form_context_fields_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- shared_fields policies
ALTER TABLE shared_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read shared fields"
  ON shared_fields
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Allow admins to manage shared fields"
  ON shared_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  );

-- form_context_fields policies
ALTER TABLE form_context_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read form context fields"
  ON form_context_fields
  FOR SELECT
  TO authenticated
  USING (is_enabled = true);

CREATE POLICY "Allow admins to manage form context fields"
  ON form_context_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  );

-- ============================================================================
-- HELPFUL COMMENTS
-- ============================================================================

COMMENT ON TABLE shared_fields IS 'Global field definitions shared across multiple form contexts';
COMMENT ON COLUMN shared_fields.field_name IS 'Unique identifier for the field (e.g., subjects, qualifications)';
COMMENT ON COLUMN shared_fields.field_type IS 'Type of input field (text, select, multiselect, etc.)';
COMMENT ON COLUMN shared_fields.options IS 'JSON array of {value, label} objects for select/multiselect fields';
COMMENT ON COLUMN shared_fields.validation_rules IS 'JSON object defining validation constraints';

COMMENT ON TABLE form_context_fields IS 'Configuration of which shared fields appear in each form context';
COMMENT ON COLUMN form_context_fields.context IS 'Form context identifier (e.g., onboarding.tutor, account)';
COMMENT ON COLUMN form_context_fields.custom_label IS 'Context-specific label override (null = use default from shared_fields)';
COMMENT ON COLUMN form_context_fields.is_required IS 'Whether field is required in this specific context';
COMMENT ON COLUMN form_context_fields.display_order IS 'Sort order for displaying fields in this context';

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View to easily query fields with their context configuration
CREATE OR REPLACE VIEW v_form_fields_with_context AS
SELECT
  fcf.id AS config_id,
  fcf.context,
  sf.id AS field_id,
  sf.field_name,
  sf.field_type,
  COALESCE(fcf.custom_label, sf.label) AS effective_label,
  COALESCE(fcf.custom_placeholder, sf.placeholder) AS effective_placeholder,
  COALESCE(fcf.custom_help_text, sf.help_text) AS effective_help_text,
  sf.options,
  fcf.is_required,
  fcf.is_enabled,
  fcf.display_order,
  sf.validation_rules
FROM form_context_fields fcf
JOIN shared_fields sf ON fcf.shared_field_id = sf.id
WHERE fcf.is_enabled = true AND sf.is_active = true
ORDER BY fcf.context, fcf.display_order;

COMMENT ON VIEW v_form_fields_with_context IS 'Combines shared field definitions with context-specific configuration for easy querying';
