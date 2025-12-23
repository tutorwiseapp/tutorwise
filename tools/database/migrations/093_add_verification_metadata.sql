-- Migration: Add detailed verification metadata
-- Version: 093
-- Purpose: Support new 2-column verification UI with specific dates and numbers
-- Created: 2025-11-25

BEGIN;

ALTER TABLE public.profiles
-- 1. Proof of Address (New Section)
ADD COLUMN IF NOT EXISTS proof_of_address_url TEXT,
ADD COLUMN IF NOT EXISTS proof_of_address_type TEXT, -- 'Utility Bill', 'Bank Statement', etc.
ADD COLUMN IF NOT EXISTS address_document_issue_date DATE, -- For the 'Issue Date' picker
ADD COLUMN IF NOT EXISTS proof_of_address_verified BOOLEAN DEFAULT FALSE,

-- 2. Government ID (Enhancements to existing fields)
-- Note: identity_verification_document_url already exists (Migration 010)
ADD COLUMN IF NOT EXISTS identity_document_number TEXT, -- Passport/License Number
ADD COLUMN IF NOT EXISTS identity_issue_date DATE,
ADD COLUMN IF NOT EXISTS identity_expiry_date DATE,

-- 3. DBS Certificate (Enhancements)
-- Note: dbs_certificate_number, dbs_certificate_date (Issue), dbs_certificate_url already exist (Migration 010)
ADD COLUMN IF NOT EXISTS dbs_expiry_date DATE;

-- Add comments for schema clarity
COMMENT ON COLUMN public.profiles.proof_of_address_url IS 'Secure URL to the uploaded proof of address document';
COMMENT ON COLUMN public.profiles.proof_of_address_type IS 'Type of address document: Utility Bill, Bank Statement, Tax Bill, or Solicitor Letter';
COMMENT ON COLUMN public.profiles.address_document_issue_date IS 'Must be within the last 3 months for valid verification';
COMMENT ON COLUMN public.profiles.proof_of_address_verified IS 'Admin verification flag for proof of address';
COMMENT ON COLUMN public.profiles.identity_document_number IS 'The unique ID number of the passport or driving license';
COMMENT ON COLUMN public.profiles.identity_issue_date IS 'Issue date of the government ID document';
COMMENT ON COLUMN public.profiles.identity_expiry_date IS 'Expiry date of the government ID document (optional)';
COMMENT ON COLUMN public.profiles.dbs_expiry_date IS 'Expiry date of the DBS certificate (optional)';

COMMIT;
