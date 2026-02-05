-- Migration: 230_ensure_shared_fields_complete.sql
-- Purpose: Ensure all shared_fields contexts have complete field configurations
-- This migration reviews existing fields and adds any missing context mappings
-- Date: 2026-02-05

-- ============================================================================
-- STEP 1: ADD ANY MISSING SHARED FIELDS
-- ============================================================================

-- languages (used in listings and profiles)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'languages',
  'multiselect',
  'Languages',
  'Select languages',
  '[
    {"value": "english", "label": "English"},
    {"value": "spanish", "label": "Spanish"},
    {"value": "french", "label": "French"},
    {"value": "german", "label": "German"},
    {"value": "italian", "label": "Italian"},
    {"value": "portuguese", "label": "Portuguese"},
    {"value": "mandarin", "label": "Mandarin Chinese"},
    {"value": "cantonese", "label": "Cantonese"},
    {"value": "japanese", "label": "Japanese"},
    {"value": "korean", "label": "Korean"},
    {"value": "arabic", "label": "Arabic"},
    {"value": "hindi", "label": "Hindi"},
    {"value": "urdu", "label": "Urdu"},
    {"value": "punjabi", "label": "Punjabi"},
    {"value": "bengali", "label": "Bengali"},
    {"value": "polish", "label": "Polish"},
    {"value": "russian", "label": "Russian"},
    {"value": "turkish", "label": "Turkish"},
    {"value": "greek", "label": "Greek"},
    {"value": "dutch", "label": "Dutch"},
    {"value": "swedish", "label": "Swedish"},
    {"value": "norwegian", "label": "Norwegian"},
    {"value": "danish", "label": "Danish"},
    {"value": "finnish", "label": "Finnish"},
    {"value": "other", "label": "Other"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- teachingMethods (how tutor delivers instruction)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'teachingMethods',
  'multiselect',
  'Teaching Methods',
  'Select teaching methods',
  '[
    {"value": "visual", "label": "Visual Learning (diagrams, videos)"},
    {"value": "auditory", "label": "Auditory Learning (discussion, lecture)"},
    {"value": "kinesthetic", "label": "Hands-on Learning (practice, experiments)"},
    {"value": "reading-writing", "label": "Reading/Writing (notes, textbooks)"},
    {"value": "project-based", "label": "Project-Based Learning"},
    {"value": "problem-solving", "label": "Problem-Solving Focus"},
    {"value": "exam-focused", "label": "Exam-Focused Preparation"},
    {"value": "interactive", "label": "Interactive/Socratic Method"},
    {"value": "gamified", "label": "Gamified Learning"},
    {"value": "flipped-classroom", "label": "Flipped Classroom"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- specializations (specific areas of expertise)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'specializations',
  'multiselect',
  'Specializations',
  'Select specializations',
  '[
    {"value": "exam-prep", "label": "Exam Preparation"},
    {"value": "gcse", "label": "GCSE Specialist"},
    {"value": "a-level", "label": "A-Level Specialist"},
    {"value": "11-plus", "label": "11+ Entrance Exams"},
    {"value": "university-prep", "label": "University Preparation"},
    {"value": "sen-support", "label": "SEN Support"},
    {"value": "dyslexia", "label": "Dyslexia Support"},
    {"value": "adhd", "label": "ADHD Support"},
    {"value": "gifted", "label": "Gifted & Talented"},
    {"value": "international-curriculum", "label": "International Curriculum (IB, AP)"},
    {"value": "home-education", "label": "Home Education"},
    {"value": "adult-learning", "label": "Adult Learning"},
    {"value": "career-change", "label": "Career Change Support"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- timezone
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'timezone',
  'select',
  'Timezone',
  'Select timezone',
  '[
    {"value": "Europe/London", "label": "United Kingdom (GMT/BST)"},
    {"value": "Europe/Paris", "label": "Central European Time"},
    {"value": "Europe/Athens", "label": "Eastern European Time"},
    {"value": "America/New_York", "label": "Eastern Time (US)"},
    {"value": "America/Chicago", "label": "Central Time (US)"},
    {"value": "America/Denver", "label": "Mountain Time (US)"},
    {"value": "America/Los_Angeles", "label": "Pacific Time (US)"},
    {"value": "Asia/Dubai", "label": "Gulf Standard Time"},
    {"value": "Asia/Kolkata", "label": "India Standard Time"},
    {"value": "Asia/Singapore", "label": "Singapore Time"},
    {"value": "Asia/Hong_Kong", "label": "Hong Kong Time"},
    {"value": "Asia/Tokyo", "label": "Japan Standard Time"},
    {"value": "Australia/Sydney", "label": "Australian Eastern Time"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- commissionRate (agent)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'commissionRate',
  'select',
  'Commission Rate',
  'Select commission rate',
  '[
    {"value": "10", "label": "10%"},
    {"value": "15", "label": "15%"},
    {"value": "20", "label": "20%"},
    {"value": "25", "label": "25%"},
    {"value": "30", "label": "30%+"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- studentCapacity (agent)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'studentCapacity',
  'select',
  'Student Capacity',
  'Select student capacity',
  '[
    {"value": "1-25", "label": "1-25 students"},
    {"value": "25-100", "label": "25-100 students"},
    {"value": "100-500", "label": "100-500 students"},
    {"value": "500+", "label": "500+ students"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- serviceAreas (agent)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'serviceAreas',
  'multiselect',
  'Service Areas',
  'Select service areas',
  '[
    {"value": "local-in-person", "label": "Local In-Person"},
    {"value": "regional", "label": "Regional"},
    {"value": "online-uk", "label": "Online (UK)"},
    {"value": "online-global", "label": "Online (Global)"},
    {"value": "hybrid", "label": "Hybrid"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- budgetRange (client)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'budgetRange',
  'select',
  'Budget Range',
  'Select your budget',
  '[
    {"value": "0-20", "label": "£0 - £20/hour"},
    {"value": "20-35", "label": "£20 - £35/hour"},
    {"value": "35-50", "label": "£35 - £50/hour"},
    {"value": "50-75", "label": "£50 - £75/hour"},
    {"value": "75-100", "label": "£75 - £100/hour"},
    {"value": "100+", "label": "£100+/hour"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- sessionsPerWeek (client)
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'sessionsPerWeek',
  'select',
  'Sessions Per Week',
  'Select frequency',
  '[
    {"value": "1", "label": "1 session per week"},
    {"value": "2", "label": "2 sessions per week"},
    {"value": "3", "label": "3 sessions per week"},
    {"value": "4+", "label": "4+ sessions per week"},
    {"value": "flexible", "label": "Flexible / As needed"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- proofOfAddressType
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'proofOfAddressType',
  'select',
  'Proof of Address Type',
  'Select document type',
  '[
    {"value": "utility-bill", "label": "Utility Bill"},
    {"value": "bank-statement", "label": "Bank Statement"},
    {"value": "tax-bill", "label": "Council Tax Bill"},
    {"value": "solicitor-letter", "label": "Solicitor Letter"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO NOTHING;

-- Text fields
INSERT INTO shared_fields (field_name, field_type, label, placeholder)
VALUES
  ('phone', 'text', 'Phone Number', 'Enter phone number'),
  ('locationCity', 'text', 'City', 'Enter city'),
  ('locationPostcode', 'text', 'Postcode', 'Enter postcode'),
  ('locationCountry', 'text', 'Country', 'Enter country')
ON CONFLICT (field_name) DO NOTHING;

-- ============================================================================
-- STEP 2: ENSURE ONBOARDING CONTEXTS HAVE ALL RELEVANT FIELDS
-- ============================================================================

-- onboarding.tutor - Add missing fields
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'onboarding.tutor',
  sf.id,
  CASE sf.field_name
    WHEN 'subjects' THEN 1
    WHEN 'keyStages' THEN 2
    WHEN 'languages' THEN 3
    WHEN 'teachingMethods' THEN 4
    WHEN 'specializations' THEN 5
    WHEN 'academicQualifications' THEN 6
    WHEN 'teachingProfessionalQualifications' THEN 7
    WHEN 'teachingExperience' THEN 8
    WHEN 'tutoringExperience' THEN 9
    WHEN 'sessionType' THEN 10
    WHEN 'deliveryMode' THEN 11
    WHEN 'oneOnOneRate' THEN 12
    WHEN 'groupSessionRate' THEN 13
    WHEN 'bio' THEN 14
    WHEN 'timezone' THEN 15
    ELSE 99
  END,
  true,
  sf.field_name IN ('subjects', 'keyStages', 'deliveryMode', 'oneOnOneRate')
FROM shared_fields sf
WHERE sf.field_name IN (
  'subjects', 'keyStages', 'languages', 'teachingMethods', 'specializations',
  'academicQualifications', 'teachingProfessionalQualifications',
  'teachingExperience', 'tutoringExperience', 'sessionType', 'deliveryMode',
  'oneOnOneRate', 'groupSessionRate', 'bio', 'timezone'
)
ON CONFLICT (context, shared_field_id) DO UPDATE SET
  display_order = EXCLUDED.display_order;

-- onboarding.client - Add missing fields
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'onboarding.client',
  sf.id,
  CASE sf.field_name
    WHEN 'subjects' THEN 1
    WHEN 'educationLevel' THEN 2
    WHEN 'learningGoals' THEN 3
    WHEN 'learningPreferences' THEN 4
    WHEN 'specialNeeds' THEN 5
    WHEN 'budgetRange' THEN 6
    WHEN 'sessionsPerWeek' THEN 7
    WHEN 'deliveryMode' THEN 8
    WHEN 'timezone' THEN 9
    ELSE 99
  END,
  true,
  sf.field_name IN ('subjects', 'educationLevel', 'learningGoals')
FROM shared_fields sf
WHERE sf.field_name IN (
  'subjects', 'educationLevel', 'learningGoals', 'learningPreferences',
  'specialNeeds', 'budgetRange', 'sessionsPerWeek', 'deliveryMode', 'timezone'
)
ON CONFLICT (context, shared_field_id) DO UPDATE SET
  display_order = EXCLUDED.display_order;

-- onboarding.agent - Add missing fields
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'onboarding.agent',
  sf.id,
  CASE sf.field_name
    WHEN 'agencyName' THEN 1
    WHEN 'agencySize' THEN 2
    WHEN 'yearsInBusiness' THEN 3
    WHEN 'services' THEN 4
    WHEN 'subjects' THEN 5
    WHEN 'keyStages' THEN 6
    WHEN 'serviceAreas' THEN 7
    WHEN 'studentCapacity' THEN 8
    WHEN 'commissionRate' THEN 9
    WHEN 'bio' THEN 10
    WHEN 'website' THEN 11
    WHEN 'timezone' THEN 12
    ELSE 99
  END,
  true,
  sf.field_name IN ('agencyName', 'agencySize', 'yearsInBusiness', 'services')
FROM shared_fields sf
WHERE sf.field_name IN (
  'agencyName', 'agencySize', 'yearsInBusiness', 'services', 'subjects',
  'keyStages', 'serviceAreas', 'studentCapacity', 'commissionRate',
  'bio', 'website', 'timezone'
)
ON CONFLICT (context, shared_field_id) DO UPDATE SET
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- STEP 3: ENSURE ACCOUNT CONTEXTS HAVE ALL RELEVANT FIELDS
-- ============================================================================

-- account.tutor - Professional profile fields
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'account.tutor',
  sf.id,
  CASE sf.field_name
    WHEN 'subjects' THEN 1
    WHEN 'keyStages' THEN 2
    WHEN 'languages' THEN 3
    WHEN 'teachingMethods' THEN 4
    WHEN 'specializations' THEN 5
    WHEN 'academicQualifications' THEN 6
    WHEN 'teachingProfessionalQualifications' THEN 7
    WHEN 'teachingExperience' THEN 8
    WHEN 'tutoringExperience' THEN 9
    WHEN 'sessionType' THEN 10
    WHEN 'deliveryMode' THEN 11
    WHEN 'oneOnOneRate' THEN 12
    WHEN 'groupSessionRate' THEN 13
    WHEN 'bio' THEN 14
    WHEN 'timezone' THEN 15
    WHEN 'gender' THEN 16
    WHEN 'status' THEN 17
    WHEN 'proofOfAddressType' THEN 18
    ELSE 99
  END,
  true,
  false
FROM shared_fields sf
WHERE sf.field_name IN (
  'subjects', 'keyStages', 'languages', 'teachingMethods', 'specializations',
  'academicQualifications', 'teachingProfessionalQualifications',
  'teachingExperience', 'tutoringExperience', 'sessionType', 'deliveryMode',
  'oneOnOneRate', 'groupSessionRate', 'bio', 'timezone', 'gender', 'status',
  'proofOfAddressType'
)
ON CONFLICT (context, shared_field_id) DO UPDATE SET
  display_order = EXCLUDED.display_order;

-- account.client - Profile preferences
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'account.client',
  sf.id,
  CASE sf.field_name
    WHEN 'subjects' THEN 1
    WHEN 'educationLevel' THEN 2
    WHEN 'learningGoals' THEN 3
    WHEN 'learningPreferences' THEN 4
    WHEN 'specialNeeds' THEN 5
    WHEN 'budgetRange' THEN 6
    WHEN 'sessionsPerWeek' THEN 7
    WHEN 'deliveryMode' THEN 8
    WHEN 'timezone' THEN 9
    WHEN 'gender' THEN 10
    ELSE 99
  END,
  true,
  false
FROM shared_fields sf
WHERE sf.field_name IN (
  'subjects', 'educationLevel', 'learningGoals', 'learningPreferences',
  'specialNeeds', 'budgetRange', 'sessionsPerWeek', 'deliveryMode',
  'timezone', 'gender'
)
ON CONFLICT (context, shared_field_id) DO UPDATE SET
  display_order = EXCLUDED.display_order;

-- account.agent - Agency profile fields
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'account.agent',
  sf.id,
  CASE sf.field_name
    WHEN 'agencyName' THEN 1
    WHEN 'agencySize' THEN 2
    WHEN 'yearsInBusiness' THEN 3
    WHEN 'services' THEN 4
    WHEN 'subjects' THEN 5
    WHEN 'keyStages' THEN 6
    WHEN 'serviceAreas' THEN 7
    WHEN 'studentCapacity' THEN 8
    WHEN 'commissionRate' THEN 9
    WHEN 'bio' THEN 10
    WHEN 'website' THEN 11
    WHEN 'timezone' THEN 12
    WHEN 'gender' THEN 13
    ELSE 99
  END,
  true,
  false
FROM shared_fields sf
WHERE sf.field_name IN (
  'agencyName', 'agencySize', 'yearsInBusiness', 'services', 'subjects',
  'keyStages', 'serviceAreas', 'studentCapacity', 'commissionRate',
  'bio', 'website', 'timezone', 'gender'
)
ON CONFLICT (context, shared_field_id) DO UPDATE SET
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- STEP 4: ENSURE LISTING CONTEXTS HAVE ALL RELEVANT FIELDS
-- ============================================================================

-- listing.tutor - Add missing fields
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'listing.tutor',
  sf.id,
  CASE sf.field_name
    WHEN 'serviceType' THEN 1
    WHEN 'title' THEN 2
    WHEN 'description' THEN 3
    WHEN 'subjects' THEN 4
    WHEN 'keyStages' THEN 5
    WHEN 'languages' THEN 6
    WHEN 'teachingMethods' THEN 7
    WHEN 'specializations' THEN 8
    WHEN 'sessionDuration' THEN 9
    WHEN 'hourlyRate' THEN 10
    WHEN 'deliveryMode' THEN 11
    WHEN 'locationCity' THEN 12
    WHEN 'locationPostcode' THEN 13
    WHEN 'locationCountry' THEN 14
    WHEN 'locationDetails' THEN 15
    WHEN 'timezone' THEN 16
    WHEN 'aiTools' THEN 17
    WHEN 'cancellationPolicy' THEN 18
    ELSE 99
  END,
  true,
  sf.field_name IN ('serviceType', 'title', 'description', 'subjects', 'hourlyRate', 'deliveryMode')
FROM shared_fields sf
WHERE sf.field_name IN (
  'serviceType', 'title', 'description', 'subjects', 'keyStages', 'languages',
  'teachingMethods', 'specializations', 'sessionDuration', 'hourlyRate',
  'deliveryMode', 'locationCity', 'locationPostcode', 'locationCountry',
  'locationDetails', 'timezone', 'aiTools', 'cancellationPolicy'
)
ON CONFLICT (context, shared_field_id) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  is_required = EXCLUDED.is_required;

-- listing.agent - Add missing fields
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'listing.agent',
  sf.id,
  CASE sf.field_name
    WHEN 'serviceType' THEN 1
    WHEN 'title' THEN 2
    WHEN 'description' THEN 3
    WHEN 'subjects' THEN 4
    WHEN 'keyStages' THEN 5
    WHEN 'languages' THEN 6
    WHEN 'services' THEN 7
    WHEN 'sessionDuration' THEN 8
    WHEN 'hourlyRate' THEN 9
    WHEN 'deliveryMode' THEN 10
    WHEN 'locationCity' THEN 11
    WHEN 'locationPostcode' THEN 12
    WHEN 'locationCountry' THEN 13
    WHEN 'serviceAreas' THEN 14
    WHEN 'timezone' THEN 15
    WHEN 'cancellationPolicy' THEN 16
    ELSE 99
  END,
  true,
  sf.field_name IN ('serviceType', 'title', 'description', 'subjects', 'hourlyRate')
FROM shared_fields sf
WHERE sf.field_name IN (
  'serviceType', 'title', 'description', 'subjects', 'keyStages', 'languages',
  'services', 'sessionDuration', 'hourlyRate', 'deliveryMode',
  'locationCity', 'locationPostcode', 'locationCountry', 'serviceAreas',
  'timezone', 'cancellationPolicy'
)
ON CONFLICT (context, shared_field_id) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  is_required = EXCLUDED.is_required;

-- listing.client - Client request/job posting fields
INSERT INTO form_context_fields (context, shared_field_id, display_order, is_enabled, is_required)
SELECT
  'listing.client',
  sf.id,
  CASE sf.field_name
    WHEN 'title' THEN 1
    WHEN 'description' THEN 2
    WHEN 'subjects' THEN 3
    WHEN 'educationLevel' THEN 4
    WHEN 'learningGoals' THEN 5
    WHEN 'specialNeeds' THEN 6
    WHEN 'sessionDuration' THEN 7
    WHEN 'sessionsPerWeek' THEN 8
    WHEN 'budgetRange' THEN 9
    WHEN 'deliveryMode' THEN 10
    WHEN 'locationCity' THEN 11
    WHEN 'locationPostcode' THEN 12
    WHEN 'timezone' THEN 13
    ELSE 99
  END,
  true,
  sf.field_name IN ('title', 'description', 'subjects', 'educationLevel')
FROM shared_fields sf
WHERE sf.field_name IN (
  'title', 'description', 'subjects', 'educationLevel', 'learningGoals',
  'specialNeeds', 'sessionDuration', 'sessionsPerWeek', 'budgetRange',
  'deliveryMode', 'locationCity', 'locationPostcode', 'timezone'
)
ON CONFLICT (context, shared_field_id) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  is_required = EXCLUDED.is_required;

-- ============================================================================
-- VERIFICATION QUERIES (run manually)
-- ============================================================================

-- Count fields per context
-- SELECT context, COUNT(*) as field_count
-- FROM form_context_fields
-- WHERE is_enabled = true
-- GROUP BY context
-- ORDER BY context;

-- List all shared fields
-- SELECT field_name, field_type, label, array_length(options, 1) as option_count
-- FROM shared_fields
-- WHERE is_active = true
-- ORDER BY field_name;

-- View fields for a specific context
-- SELECT * FROM v_form_fields_with_context WHERE context = 'onboarding.tutor' ORDER BY display_order;
