-- Migration: Add job listing fields to listings table (CORRECTED)
-- Version: 193
-- Date: 2026-01-20
-- Purpose: Enable agents to create comprehensive job listings for recruiting tutors
-- Note: delivery_mode already exists as VARCHAR(50), needs to be changed to TEXT[]

-- Step 1: Modify existing delivery_mode column to TEXT[] array
ALTER TABLE listings ALTER COLUMN delivery_mode TYPE TEXT[] USING
  CASE
    WHEN delivery_mode IS NULL THEN '{}'::TEXT[]
    WHEN delivery_mode = '' THEN '{}'::TEXT[]
    ELSE ARRAY[delivery_mode]::TEXT[]
  END;

ALTER TABLE listings ALTER COLUMN delivery_mode SET DEFAULT '{}';

-- Step 2: Add new job-specific columns (23 columns, excluding delivery_mode)
ALTER TABLE listings
  -- Section 1: Job Basics (5 fields)
  ADD COLUMN employment_type VARCHAR(50),
  ADD COLUMN contract_length VARCHAR(50),
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE,
  ADD COLUMN application_deadline DATE,

  -- Section 2: Teaching Details (2 fields)
  ADD COLUMN student_numbers VARCHAR(50),
  ADD COLUMN class_type TEXT[] DEFAULT '{}',

  -- Section 3: Location & Schedule (4 fields - delivery_mode already handled)
  ADD COLUMN work_location TEXT,
  ADD COLUMN hours_per_week VARCHAR(50),
  ADD COLUMN schedule_flexibility VARCHAR(50),
  ADD COLUMN timezone_requirements TEXT,

  -- Section 4: Compensation & Benefits (5 fields)
  ADD COLUMN compensation_type VARCHAR(50),
  ADD COLUMN compensation_min NUMERIC(10, 2),
  ADD COLUMN compensation_max NUMERIC(10, 2),
  ADD COLUMN benefits TEXT[] DEFAULT '{}',
  ADD COLUMN additional_benefits TEXT,

  -- Section 5: Requirements & Qualifications (5 fields)
  ADD COLUMN minimum_qualifications TEXT[] DEFAULT '{}',
  ADD COLUMN teaching_credentials TEXT[] DEFAULT '{}',
  ADD COLUMN minimum_experience VARCHAR(50),
  ADD COLUMN dbs_check VARCHAR(50),
  ADD COLUMN other_requirements TEXT,

  -- Section 6: Application Process (2 fields)
  ADD COLUMN how_to_apply VARCHAR(50),
  ADD COLUMN application_instructions TEXT,

  -- Section 7: About Organisation (2 fields)
  ADD COLUMN about_organisation TEXT,
  ADD COLUMN organisation_type VARCHAR(50);

-- Step 3: Add check constraints for data integrity
ALTER TABLE listings
  ADD CONSTRAINT valid_employment_type
    CHECK (employment_type IS NULL OR employment_type IN ('full-time', 'part-time', 'contract', 'freelance')),
  ADD CONSTRAINT valid_contract_length
    CHECK (contract_length IS NULL OR contract_length IN ('permanent', 'fixed-3m', 'fixed-6m', 'fixed-1y', 'temporary')),
  ADD CONSTRAINT valid_compensation_range
    CHECK (compensation_min IS NULL OR compensation_max IS NULL OR compensation_max >= compensation_min),
  ADD CONSTRAINT valid_date_range
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  ADD CONSTRAINT valid_compensation_type
    CHECK (compensation_type IS NULL OR compensation_type IN ('hourly', 'annual', 'per-session', 'commission')),
  ADD CONSTRAINT valid_minimum_experience
    CHECK (minimum_experience IS NULL OR minimum_experience IN ('entry', 'junior', 'mid', 'senior', 'any')),
  ADD CONSTRAINT valid_dbs_check
    CHECK (dbs_check IS NULL OR dbs_check IN ('required', 'assist', 'no')),
  ADD CONSTRAINT valid_how_to_apply
    CHECK (how_to_apply IS NULL OR how_to_apply IN ('tutorwise', 'network', 'organisation'));

-- Step 4: Add indexes for job listing queries
CREATE INDEX idx_listings_employment_type ON listings(employment_type);
CREATE INDEX idx_listings_delivery_mode_gin ON listings USING GIN(delivery_mode);
CREATE INDEX idx_listings_compensation_type ON listings(compensation_type);
CREATE INDEX idx_listings_start_date ON listings(start_date);
CREATE INDEX idx_listings_application_deadline ON listings(application_deadline);
CREATE INDEX idx_listings_minimum_qualifications_gin ON listings USING GIN(minimum_qualifications);
CREATE INDEX idx_listings_teaching_credentials_gin ON listings USING GIN(teaching_credentials);
CREATE INDEX idx_listings_compensation_range ON listings(compensation_min, compensation_max);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN listings.employment_type IS 'Type of employment: full-time, part-time, contract, or freelance';
COMMENT ON COLUMN listings.contract_length IS 'Duration of contract: permanent or fixed-term';
COMMENT ON COLUMN listings.start_date IS 'Job start date';
COMMENT ON COLUMN listings.end_date IS 'Job end date (for fixed-term contracts)';
COMMENT ON COLUMN listings.application_deadline IS 'Deadline for job applications';
COMMENT ON COLUMN listings.student_numbers IS 'Expected number of students per week';
COMMENT ON COLUMN listings.class_type IS 'Types of classes: one-to-one, small-group, medium-group, large-group';
COMMENT ON COLUMN listings.delivery_mode IS 'How tutoring is delivered: online, in-person, or hybrid (array)';
COMMENT ON COLUMN listings.work_location IS 'Physical work location for in-person/hybrid roles';
COMMENT ON COLUMN listings.hours_per_week IS 'Expected hours per week';
COMMENT ON COLUMN listings.schedule_flexibility IS 'Schedule flexibility: fixed, flexible, weekends, evenings';
COMMENT ON COLUMN listings.timezone_requirements IS 'Timezone requirements for the role';
COMMENT ON COLUMN listings.compensation_type IS 'How tutor is compensated: hourly, annual salary, per-session, commission';
COMMENT ON COLUMN listings.compensation_min IS 'Minimum compensation amount';
COMMENT ON COLUMN listings.compensation_max IS 'Maximum compensation amount';
COMMENT ON COLUMN listings.benefits IS 'Benefits offered: flexible-schedule, professional-dev, paid-training, etc.';
COMMENT ON COLUMN listings.additional_benefits IS 'Additional benefits not covered in standard list';
COMMENT ON COLUMN listings.minimum_qualifications IS 'Required educational qualifications';
COMMENT ON COLUMN listings.teaching_credentials IS 'Required teaching credentials: QTLS, QTS, PGCE, etc.';
COMMENT ON COLUMN listings.minimum_experience IS 'Minimum experience level required';
COMMENT ON COLUMN listings.dbs_check IS 'DBS check requirement: required, assist, or no';
COMMENT ON COLUMN listings.other_requirements IS 'Additional requirements not covered elsewhere';
COMMENT ON COLUMN listings.how_to_apply IS 'Application method: tutorwise messages, network connections, or organisation page';
COMMENT ON COLUMN listings.application_instructions IS 'Specific instructions for applicants';
COMMENT ON COLUMN listings.about_organisation IS 'Description of the hiring organisation';
COMMENT ON COLUMN listings.organisation_type IS 'Type of organisation: tutoring-agency, company, school, college, university, charity, other';
