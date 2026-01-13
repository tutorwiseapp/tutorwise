-- Migration: 172_add_listing_shared_fields.sql
-- Purpose: Add listing form fields to shared_fields and form_context_fields
-- Enables admin to manage Create Listing form options via /admin/configurations
-- Date: 2026-01-13

-- ============================================================================
-- STEP 1: INSERT SHARED FIELDS FOR LISTINGS
-- ============================================================================

-- subjects (already exists from onboarding, reuse it)
-- This field is already created in migration 171

-- keyStages/levels (already exists as keyStages from onboarding)
-- This field is already created in migration 171

-- sessionDuration
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'sessionDuration',
  'multiselect',
  'Session Duration',
  'Select available durations',
  '[
    {"value": "30", "label": "30 minutes"},
    {"value": "45", "label": "45 minutes"},
    {"value": "60", "label": "1 hour"},
    {"value": "90", "label": "1.5 hours"},
    {"value": "120", "label": "2 hours"},
    {"value": "150", "label": "2.5 hours"},
    {"value": "180", "label": "3 hours"},
    {"value": "240", "label": "4 hours"},
    {"value": "300", "label": "5 hours"},
    {"value": "360", "label": "6 hours"},
    {"value": "420", "label": "7 hours"},
    {"value": "480", "label": "8 hours"},
    {"value": "540", "label": "9+ hours"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- serviceType
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'serviceType',
  'multiselect',
  'Service Type',
  'Select service types',
  '[
    {"value": "one-to-one", "label": "One-to-One Session"},
    {"value": "group-session", "label": "Group Session"},
    {"value": "workshop", "label": "Workshop / Webinar"},
    {"value": "study-package", "label": "Study Package"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- category
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'category',
  'select',
  'Category',
  'Select category',
  '[
    {"value": "Mathematics", "label": "Mathematics"},
    {"value": "English", "label": "English"},
    {"value": "Science", "label": "Science"},
    {"value": "Languages", "label": "Languages"},
    {"value": "Humanities", "label": "Humanities"},
    {"value": "Arts", "label": "Arts"},
    {"value": "Professional", "label": "Professional Development"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- packageType
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'packageType',
  'select',
  'Package Type',
  'Select package type',
  '[
    {"value": "pdf", "label": "PDF / eBook"},
    {"value": "video", "label": "Video Course"},
    {"value": "bundle", "label": "Bundle (PDF + Video)"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- aiTools
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'aiTools',
  'multiselect',
  'AI Tools Used',
  'Select AI tools',
  '[
    {"value": "ChatGPT", "label": "ChatGPT"},
    {"value": "Claude", "label": "Claude"},
    {"value": "Grammarly", "label": "Grammarly"},
    {"value": "Khan Academy", "label": "Khan Academy"},
    {"value": "Quizlet", "label": "Quizlet"},
    {"value": "Duolingo", "label": "Duolingo"},
    {"value": "Photomath", "label": "Photomath"},
    {"value": "Socratic", "label": "Socratic"},
    {"value": "Other", "label": "Other"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- deliveryMode
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'deliveryMode',
  'select',
  'Delivery Mode',
  'Select delivery mode',
  '[
    {"value": "online", "label": "Online"},
    {"value": "in-person", "label": "In-Person"},
    {"value": "hybrid", "label": "Hybrid (Online & In-Person)"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- Text/textarea fields for listings
INSERT INTO shared_fields (field_name, field_type, label, placeholder)
VALUES
  ('title', 'text', 'Service Name', 'Enter service name'),
  ('description', 'textarea', 'Description', 'Describe your service'),
  ('hourlyRate', 'number', 'Hourly Rate (£)', 'Enter rate'),
  ('locationDetails', 'textarea', 'Location Details', 'Enter location details'),
  ('cancellationPolicy', 'textarea', 'Cancellation Policy', 'Enter cancellation policy'),
  ('speakerBio', 'textarea', 'Speaker Bio', 'Enter speaker bio'),
  ('eventAgenda', 'textarea', 'Event Agenda', 'Enter event agenda'),
  ('materialUrl', 'url', 'Material URL', 'Enter material URL')
ON CONFLICT (field_name) DO NOTHING;

-- ============================================================================
-- STEP 2: CREATE FORM_CONTEXT_FIELDS FOR LISTING CONTEXTS
-- ============================================================================

-- listing.tutor context
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'listing.tutor',
  sf.id,
  CASE sf.field_name
    WHEN 'serviceType' THEN 1
    WHEN 'title' THEN 2
    WHEN 'description' THEN 3
    WHEN 'category' THEN 4
    WHEN 'subjects' THEN 5
    WHEN 'keyStages' THEN 6
    WHEN 'sessionDuration' THEN 7
    WHEN 'hourlyRate' THEN 8
    WHEN 'deliveryMode' THEN 9
    WHEN 'locationDetails' THEN 10
    WHEN 'aiTools' THEN 11
    WHEN 'cancellationPolicy' THEN 12
    WHEN 'packageType' THEN 13
    WHEN 'materialUrl' THEN 14
    WHEN 'speakerBio' THEN 15
    WHEN 'eventAgenda' THEN 16
    ELSE 99
  END,
  true,
  sf.field_name IN ('serviceType', 'title', 'description', 'category', 'subjects', 'hourlyRate')
FROM shared_fields sf
WHERE sf.field_name IN (
  'serviceType', 'title', 'description', 'category', 'subjects', 'keyStages',
  'sessionDuration', 'hourlyRate', 'deliveryMode', 'locationDetails',
  'aiTools', 'cancellationPolicy', 'packageType', 'materialUrl',
  'speakerBio', 'eventAgenda'
)
ON CONFLICT (context, shared_field_id) DO NOTHING;

-- listing.agent context (similar to tutor)
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'listing.agent',
  sf.id,
  CASE sf.field_name
    WHEN 'serviceType' THEN 1
    WHEN 'title' THEN 2
    WHEN 'description' THEN 3
    WHEN 'category' THEN 4
    WHEN 'subjects' THEN 5
    WHEN 'keyStages' THEN 6
    WHEN 'sessionDuration' THEN 7
    WHEN 'hourlyRate' THEN 8
    WHEN 'deliveryMode' THEN 9
    WHEN 'locationDetails' THEN 10
    WHEN 'services' THEN 11
    WHEN 'cancellationPolicy' THEN 12
    ELSE 99
  END,
  true,
  sf.field_name IN ('serviceType', 'title', 'description', 'category', 'hourlyRate')
FROM shared_fields sf
WHERE sf.field_name IN (
  'serviceType', 'title', 'description', 'category', 'subjects', 'keyStages',
  'sessionDuration', 'hourlyRate', 'deliveryMode', 'locationDetails',
  'services', 'cancellationPolicy'
)
ON CONFLICT (context, shared_field_id) DO NOTHING;

-- listing.client context (for client requests/needs)
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'listing.client',
  sf.id,
  CASE sf.field_name
    WHEN 'title' THEN 1
    WHEN 'description' THEN 2
    WHEN 'subjects' THEN 3
    WHEN 'educationLevel' THEN 4
    WHEN 'sessionDuration' THEN 5
    WHEN 'deliveryMode' THEN 6
    WHEN 'learningGoals' THEN 7
    WHEN 'specialNeeds' THEN 8
    ELSE 99
  END,
  true,
  sf.field_name IN ('title', 'description', 'subjects', 'educationLevel')
FROM shared_fields sf
WHERE sf.field_name IN (
  'title', 'description', 'subjects', 'educationLevel',
  'sessionDuration', 'deliveryMode', 'learningGoals', 'specialNeeds'
)
ON CONFLICT (context, shared_field_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (run manually to verify)
-- ============================================================================

-- Count listing fields created
-- SELECT COUNT(*) FROM shared_fields WHERE field_name IN ('sessionDuration', 'serviceType', 'category', 'packageType', 'aiTools');

-- Count form_context_fields for listing contexts
-- SELECT context, COUNT(*) as field_count
-- FROM form_context_fields
-- WHERE context LIKE 'listing.%'
-- GROUP BY context
-- ORDER BY context;

-- View all listing fields for tutor
-- SELECT
--   fcf.context,
--   sf.field_name,
--   sf.label,
--   sf.field_type,
--   fcf.is_required,
--   fcf.is_enabled,
--   fcf.display_order
-- FROM form_context_fields fcf
-- JOIN shared_fields sf ON fcf.shared_field_id = sf.id
-- WHERE fcf.context = 'listing.tutor'
-- ORDER BY fcf.display_order;
