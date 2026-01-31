-- Migration 217: Add one_to_one_session_rate and ensure group_session_rate columns exist
-- Purpose: Add rate columns to role_details table for consistent rate storage
-- Date: 2026-01-30

-- Add one_to_one_session_rate column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'one_to_one_session_rate'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN one_to_one_session_rate NUMERIC(10,2);

        COMMENT ON COLUMN role_details.one_to_one_session_rate IS 'One-to-one session rate (£/hour) for tutors/agents';
        RAISE NOTICE 'Added column: one_to_one_session_rate';
    ELSE
        RAISE NOTICE 'Column one_to_one_session_rate already exists, skipping';
    END IF;
END $$;

-- Add group_session_rate column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'group_session_rate'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN group_session_rate NUMERIC(10,2);

        COMMENT ON COLUMN role_details.group_session_rate IS 'Group session rate (£/hour per student) for tutors/agents';
        RAISE NOTICE 'Added column: group_session_rate';
    ELSE
        RAISE NOTICE 'Column group_session_rate already exists, skipping';
    END IF;
END $$;

-- Also add other commonly used columns that may be missing
-- These are used in the onboarding forms

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN status TEXT;

        COMMENT ON COLUMN role_details.status IS 'Professional status (Professional Tutor, Solo Tutor, etc.)';
        RAISE NOTICE 'Added column: status';
    END IF;
END $$;

-- Add bio column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN bio TEXT;

        COMMENT ON COLUMN role_details.bio IS 'Professional bio/about me text';
        RAISE NOTICE 'Added column: bio';
    END IF;
END $$;

-- Add bio_video_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'bio_video_url'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN bio_video_url TEXT;

        COMMENT ON COLUMN role_details.bio_video_url IS '30-second intro video URL (YouTube, Loom, Vimeo)';
        RAISE NOTICE 'Added column: bio_video_url';
    END IF;
END $$;

-- Add academic_qualifications column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'academic_qualifications'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN academic_qualifications TEXT[] DEFAULT ARRAY[]::TEXT[];

        COMMENT ON COLUMN role_details.academic_qualifications IS 'Academic qualifications (University Degree, Masters, PhD, etc.)';
        RAISE NOTICE 'Added column: academic_qualifications';
    END IF;
END $$;

-- Add teaching_professional_qualifications column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'teaching_professional_qualifications'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN teaching_professional_qualifications TEXT[] DEFAULT ARRAY[]::TEXT[];

        COMMENT ON COLUMN role_details.teaching_professional_qualifications IS 'Teaching qualifications (QTLS, QTS, PGCE, etc.)';
        RAISE NOTICE 'Added column: teaching_professional_qualifications';
    END IF;
END $$;

-- Add tutoring_experience column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'tutoring_experience'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN tutoring_experience TEXT;

        COMMENT ON COLUMN role_details.tutoring_experience IS 'Tutoring experience level (New Tutor, Experienced Tutor, Expert Tutor)';
        RAISE NOTICE 'Added column: tutoring_experience';
    END IF;
END $$;

-- Add key_stages column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'key_stages'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN key_stages TEXT[] DEFAULT ARRAY[]::TEXT[];

        COMMENT ON COLUMN role_details.key_stages IS 'Key stages taught (KS1-KS2, KS3, KS4, A-Levels)';
        RAISE NOTICE 'Added column: key_stages';
    END IF;
END $$;

-- Add session_types column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'session_types'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN session_types TEXT[] DEFAULT ARRAY[]::TEXT[];

        COMMENT ON COLUMN role_details.session_types IS 'Session types offered (One-to-One Session, Group Session)';
        RAISE NOTICE 'Added column: session_types';
    END IF;
END $$;

-- Add delivery_mode column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_details'
        AND column_name = 'delivery_mode'
    ) THEN
        ALTER TABLE role_details
        ADD COLUMN delivery_mode TEXT[] DEFAULT ARRAY[]::TEXT[];

        COMMENT ON COLUMN role_details.delivery_mode IS 'Delivery modes (Online, In-person, Hybrid)';
        RAISE NOTICE 'Added column: delivery_mode';
    END IF;
END $$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE 'Migration 217 complete: Added rate and professional detail columns to role_details';
END $$;
