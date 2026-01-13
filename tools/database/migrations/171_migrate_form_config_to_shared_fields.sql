-- Migration: 171_migrate_form_config_to_shared_fields.sql
-- Purpose: Migrate existing form_config data to new shared_fields structure
-- Extracts shared field definitions and creates context-specific mappings
-- Date: 2026-01-13

-- ============================================================================
-- STEP 1: EXTRACT SHARED FIELDS FROM FORM_CONFIG
-- ============================================================================

-- Identify fields that appear in multiple contexts (these should be shared)
-- Insert into shared_fields with options from form_config

-- subjects
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'subjects',
  'multiselect',
  'Subjects',
  'Select subjects',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'subjects'
  AND config_type = 'option'
  AND context LIKE 'onboarding.tutor%'  -- Use tutor's subjects as canonical
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- qualifications / academicQualifications
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'academicQualifications',
  'multiselect',
  'Academic Qualifications',
  'Select qualifications',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'academicQualifications'
  AND config_type = 'option'
  AND context = 'onboarding.tutor'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- keyStages
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'keyStages',
  'multiselect',
  'Key Stages',
  'Select key stages',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'keyStages'
  AND config_type = 'option'
  AND context = 'onboarding.tutor'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- teachingProfessionalQualifications
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'teachingProfessionalQualifications',
  'multiselect',
  'Teaching Qualifications',
  'Select teaching qualifications',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'teachingProfessionalQualifications'
  AND config_type = 'option'
  AND context = 'onboarding.tutor'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- teachingExperience
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'teachingExperience',
  'select',
  'Teaching Experience',
  'Select experience level',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'teachingExperience'
  AND config_type = 'option'
  AND context = 'onboarding.tutor'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- sessionType
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'sessionType',
  'multiselect',
  'Session Types',
  'Select session types',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'sessionType'
  AND config_type = 'option'
  AND context = 'onboarding.tutor'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- tutoringExperience
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'tutoringExperience',
  'select',
  'Tutoring Experience',
  'Select tutoring experience',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'tutoringExperience'
  AND config_type = 'option'
  AND context = 'onboarding.tutor'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- deliveryMode
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'deliveryMode',
  'multiselect',
  'Delivery Mode',
  'Select delivery modes',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'deliveryMode'
  AND config_type = 'option'
  AND context = 'onboarding.tutor'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- gender
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'gender',
  'select',
  'Gender',
  'Select gender',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'gender'
  AND config_type = 'option'
  AND context = 'onboarding.tutor'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- status
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'status',
  'select',
  'Status',
  'Select status',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'status'
  AND config_type = 'option'
  AND context = 'onboarding.tutor'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- educationLevel (client)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'educationLevel',
  'select',
  'Education Level',
  'Select education level',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'educationLevel'
  AND config_type = 'option'
  AND context = 'onboarding.client'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- learningGoals (client)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'learningGoals',
  'multiselect',
  'Learning Goals',
  'Select learning goals',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'learningGoals'
  AND config_type = 'option'
  AND context = 'onboarding.client'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- learningPreferences (client)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'learningPreferences',
  'multiselect',
  'Learning Preferences',
  'Select preferences',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'learningPreferences'
  AND config_type = 'option'
  AND context = 'onboarding.client'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- specialNeeds (client)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'specialNeeds',
  'multiselect',
  'Special Educational Needs',
  'Select if applicable',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'specialNeeds'
  AND config_type = 'option'
  AND context = 'onboarding.client'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- agencySize (agent)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'agencySize',
  'select',
  'Agency Size',
  'Select agency size',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'agencySize'
  AND config_type = 'option'
  AND context = 'onboarding.agent'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- yearsInBusiness (agent)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'yearsInBusiness',
  'select',
  'Years in Business',
  'Select years',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'yearsInBusiness'
  AND config_type = 'option'
  AND context = 'onboarding.agent'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- services (agent)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
SELECT
  'services',
  'multiselect',
  'Services Offered',
  'Select services',
  jsonb_agg(
    jsonb_build_object(
      'value', option_value,
      'label', option_label
    ) ORDER BY display_order
  )
FROM form_config
WHERE field_name = 'services'
  AND config_type = 'option'
  AND context = 'onboarding.agent'
  AND is_active = true
ON CONFLICT (field_name) DO NOTHING;

-- Text fields (no options)
INSERT INTO shared_fields (field_name, field_type, label, placeholder)
VALUES
  ('bio', 'textarea', 'About Me', 'Tell us about yourself'),
  ('oneOnOneRate', 'number', 'One-on-One Rate (£/hour)', 'Enter hourly rate'),
  ('groupSessionRate', 'number', 'Group Session Rate (£/hour)', 'Enter group rate'),
  ('agencyName', 'text', 'Agency Name', 'Enter agency name'),
  ('website', 'url', 'Website', 'Enter website URL'),
  ('additionalInfo', 'textarea', 'Additional Information', 'Any other details')
ON CONFLICT (field_name) DO NOTHING;

-- ============================================================================
-- STEP 2: CREATE FORM_CONTEXT_FIELDS MAPPINGS
-- ============================================================================

-- For each context in form_config, create form_context_fields entries
-- Map existing field_meta entries to the new shared fields system

-- Onboarding contexts
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT DISTINCT
  fc.context,
  sf.id,
  fc.display_order,
  fc.is_active,
  false  -- We'll need to determine required fields separately
FROM form_config fc
JOIN shared_fields sf ON fc.field_name = sf.field_name
WHERE fc.config_type = 'field_meta'
  AND fc.context LIKE 'onboarding.%'
  AND fc.is_active = true
ON CONFLICT (context, shared_field_id) DO NOTHING;

-- Account contexts
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT DISTINCT
  fc.context,
  sf.id,
  fc.display_order,
  fc.is_active,
  false
FROM form_config fc
JOIN shared_fields sf ON fc.field_name = sf.field_name
WHERE fc.config_type = 'field_meta'
  AND fc.context LIKE 'account.%'
  AND fc.is_active = true
ON CONFLICT (context, shared_field_id) DO NOTHING;

-- Organisation contexts
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT DISTINCT
  fc.context,
  sf.id,
  fc.display_order,
  fc.is_active,
  false
FROM form_config fc
JOIN shared_fields sf ON fc.field_name = sf.field_name
WHERE fc.config_type = 'field_meta'
  AND fc.context LIKE 'organisation.%'
  AND fc.is_active = true
ON CONFLICT (context, shared_field_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================================================

-- Count shared fields created
-- SELECT COUNT(*) as shared_fields_count FROM shared_fields WHERE is_active = true;

-- Count form_context_fields mappings created
-- SELECT context, COUNT(*) as field_count
-- FROM form_context_fields
-- WHERE is_enabled = true
-- GROUP BY context
-- ORDER BY context;

-- View fields for onboarding.tutor
-- SELECT * FROM v_form_fields_with_context WHERE context = 'onboarding.tutor' ORDER BY display_order;

COMMENT ON TABLE form_config IS 'DEPRECATED: Use shared_fields and form_context_fields instead. Kept for backward compatibility during migration.';
