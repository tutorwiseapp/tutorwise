-- Fix Sage enum values to match frontend
-- Migration: 270_fix_sage_enums.sql
--
-- The frontend sends lowercase level values (e.g. 'gcse', 'primary', 'ks3', 'adult')
-- but the original enum used mixed case ('GCSE', 'A-Level', 'University', 'Other').
-- Add the missing values so both old and new data work.

-- Add missing level values (Postgres 9.1+ allows ADD VALUE)
DO $$ BEGIN
    ALTER TYPE sage_level ADD VALUE IF NOT EXISTS 'primary';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE sage_level ADD VALUE IF NOT EXISTS 'ks3';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE sage_level ADD VALUE IF NOT EXISTS 'gcse';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE sage_level ADD VALUE IF NOT EXISTS 'a-level';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE sage_level ADD VALUE IF NOT EXISTS 'university';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE sage_level ADD VALUE IF NOT EXISTS 'adult';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add missing session goal values
DO $$ BEGIN
    ALTER TYPE sage_session_goal ADD VALUE IF NOT EXISTS 'homework';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE sage_session_goal ADD VALUE IF NOT EXISTS 'exam-prep';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE sage_session_goal ADD VALUE IF NOT EXISTS 'concept-review';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
