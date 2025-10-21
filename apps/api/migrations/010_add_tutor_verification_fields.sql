-- Migration: Add personal info and verification fields for all users
-- Version: 010
-- Purpose: Add fields for personal information, emergency contact, identity verification, and DBS certificate

-- Add personal info and verification fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS town TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_email TEXT,
ADD COLUMN IF NOT EXISTS identity_verification_document_url TEXT,
ADD COLUMN IF NOT EXISTS identity_verification_document_name TEXT,
ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dbs_certificate_number TEXT,
ADD COLUMN IF NOT EXISTS dbs_certificate_date DATE,
ADD COLUMN IF NOT EXISTS dbs_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS dbs_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dbs_verified_at TIMESTAMPTZ;

-- Add indexes for verification and search fields
CREATE INDEX IF NOT EXISTS idx_profiles_identity_verified ON profiles(identity_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_dbs_verified ON profiles(dbs_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);

-- Add comments
COMMENT ON COLUMN profiles.full_name IS 'Full legal name of the user (derived from first_name + last_name)';
COMMENT ON COLUMN profiles.gender IS 'Gender (Male, Female, Other, Prefer not to say)';
COMMENT ON COLUMN profiles.date_of_birth IS 'Date of birth (required for tutors/agents for background checks)';
COMMENT ON COLUMN profiles.address_line1 IS 'Address line 1 (street address)';
COMMENT ON COLUMN profiles.town IS 'Town';
COMMENT ON COLUMN profiles.city IS 'City';
COMMENT ON COLUMN profiles.country IS 'Country';
COMMENT ON COLUMN profiles.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN profiles.emergency_contact_name IS 'Emergency contact full name';
COMMENT ON COLUMN profiles.emergency_contact_email IS 'Emergency contact email address';
COMMENT ON COLUMN profiles.identity_verification_document_url IS 'URL to uploaded identity verification document (passport, driver license, etc.)';
COMMENT ON COLUMN profiles.identity_verification_document_name IS 'Original filename of uploaded identity verification document';
COMMENT ON COLUMN profiles.identity_verified IS 'Whether identity document has been verified by admin';
COMMENT ON COLUMN profiles.identity_verified_at IS 'Timestamp when identity was verified';
COMMENT ON COLUMN profiles.dbs_certificate_number IS 'DBS (Disclosure and Barring Service) certificate number (required for UK tutors/agents)';
COMMENT ON COLUMN profiles.dbs_certificate_date IS 'DBS certificate issue date';
COMMENT ON COLUMN profiles.dbs_certificate_url IS 'URL to uploaded DBS certificate document';
COMMENT ON COLUMN profiles.dbs_verified IS 'Whether DBS certificate has been verified by admin';
COMMENT ON COLUMN profiles.dbs_verified_at IS 'Timestamp when DBS was verified';
