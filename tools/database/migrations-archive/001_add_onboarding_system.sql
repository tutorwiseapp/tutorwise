-- =====================================================================
-- Migration: Add User Onboarding System
-- Version: 001
-- Created: 2025-09-29
-- Description: Adds tables and fields for user role onboarding system
-- =====================================================================

-- First, let's extend the existing profiles table to support onboarding
-- Check if columns already exist before adding them
DO $$
BEGIN
    -- Add onboarding_completed JSONB column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed JSONB DEFAULT '{}';
    END IF;

    -- Add preferences JSONB column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'preferences'
    ) THEN
        ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{}';
    END IF;

    -- Add onboarding_progress JSONB column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'onboarding_progress'
    ) THEN
        ALTER TABLE profiles ADD COLUMN onboarding_progress JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create role_details table for storing detailed role-specific information
CREATE TABLE IF NOT EXISTS role_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('seeker', 'provider', 'agent')),

    -- Common fields for all roles
    subjects TEXT[] DEFAULT '{}',
    skill_levels JSONB DEFAULT '{}', -- {"math": 3, "science": 2} where 1-5 scale
    goals TEXT[] DEFAULT '{}',

    -- Seeker-specific fields (students looking for tutors)
    learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'reading')),
    budget_range JSONB DEFAULT '{}', -- {"min": 20, "max": 50, "currency": "GBP"}
    schedule_preferences JSONB DEFAULT '{}', -- {"days": ["mon", "wed"], "times": ["afternoon"], "format": "online"}
    previous_experience BOOLEAN DEFAULT false,

    -- Provider-specific fields (tutors offering services)
    teaching_experience JSONB DEFAULT '{}', -- {"years": 5, "environments": ["university", "online"], "age_groups": ["adult"]}
    qualifications JSONB DEFAULT '{}', -- [{"title": "BSc Math", "institution": "Cambridge", "year": 2020, "verified": false}]
    availability JSONB DEFAULT '{}', -- {"mon": ["09:00", "12:00"], "tue": ["14:00", "18:00"]}
    hourly_rate INTEGER, -- Rate in pence/cents
    teaching_methods TEXT[] DEFAULT '{}', -- ["visual", "interactive", "problem_solving"]
    professional_background TEXT,

    -- Agent-specific fields (if needed in future)
    commission_preferences JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Ensure one record per profile-role combination
    UNIQUE(profile_id, role_type)
);

-- Create onboarding_sessions table for tracking progress
CREATE TABLE IF NOT EXISTS onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('seeker', 'provider', 'agent')),

    -- Progress tracking
    current_step INTEGER DEFAULT 0, -- -1 means completed
    total_steps INTEGER DEFAULT 6,
    completed_steps INTEGER[] DEFAULT '{}', -- Array of completed step numbers

    -- Form responses (stored as JSONB for flexibility)
    responses JSONB DEFAULT '{}',

    -- Session metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Browser/device info for analytics (optional)
    user_agent TEXT,
    device_type TEXT,

    -- Ensure one active session per profile-role combination
    UNIQUE(profile_id, role_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_details_profile_id ON role_details(profile_id);
CREATE INDEX IF NOT EXISTS idx_role_details_role_type ON role_details(role_type);
CREATE INDEX IF NOT EXISTS idx_role_details_profile_role ON role_details(profile_id, role_type);
CREATE INDEX IF NOT EXISTS idx_role_details_subjects ON role_details USING GIN(subjects);
CREATE INDEX IF NOT EXISTS idx_role_details_completed ON role_details(completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_profile_id ON onboarding_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_role_type ON onboarding_sessions(role_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_profile_role ON onboarding_sessions(profile_id, role_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_active ON onboarding_sessions(last_active) WHERE completed_at IS NULL;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for role_details updated_at
DROP TRIGGER IF EXISTS update_role_details_updated_at ON role_details;
CREATE TRIGGER update_role_details_updated_at
    BEFORE UPDATE ON role_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update last_active timestamp
CREATE OR REPLACE FUNCTION update_last_active_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for onboarding_sessions last_active
DROP TRIGGER IF EXISTS update_onboarding_sessions_last_active ON onboarding_sessions;
CREATE TRIGGER update_onboarding_sessions_last_active
    BEFORE UPDATE ON onboarding_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_active_column();

-- Create view for easy querying of onboarding status
CREATE OR REPLACE VIEW onboarding_status_view AS
SELECT
    p.id as profile_id,
    p.display_name,
    p.email,
    p.roles,
    COALESCE(
        jsonb_object_agg(
            rd.role_type,
            CASE
                WHEN rd.completed_at IS NOT NULL THEN 'completed'
                WHEN os.id IS NOT NULL THEN 'in_progress'
                ELSE 'not_started'
            END
        ) FILTER (WHERE rd.role_type IS NOT NULL OR os.role_type IS NOT NULL),
        '{}'::jsonb
    ) as onboarding_status,
    COALESCE(
        jsonb_object_agg(
            rd.role_type,
            jsonb_build_object(
                'subjects', rd.subjects,
                'completed_at', rd.completed_at,
                'current_step', COALESCE(os.current_step, -1)
            )
        ) FILTER (WHERE rd.role_type IS NOT NULL),
        '{}'::jsonb
    ) as role_details
FROM profiles p
LEFT JOIN role_details rd ON p.id = rd.profile_id
LEFT JOIN onboarding_sessions os ON p.id = os.profile_id AND rd.role_type = os.role_type
GROUP BY p.id, p.display_name, p.email, p.roles;

-- Create helper function to get onboarding progress for a specific user and role
CREATE OR REPLACE FUNCTION get_onboarding_progress(user_id UUID, target_role TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'session_id', os.id,
        'current_step', os.current_step,
        'total_steps', os.total_steps,
        'completed_steps', os.completed_steps,
        'responses', os.responses,
        'started_at', os.started_at,
        'last_active', os.last_active,
        'completed_at', os.completed_at,
        'role_details', jsonb_build_object(
            'subjects', rd.subjects,
            'skill_levels', rd.skill_levels,
            'goals', rd.goals,
            'completed_at', rd.completed_at
        )
    )
    INTO result
    FROM onboarding_sessions os
    LEFT JOIN role_details rd ON os.profile_id = rd.profile_id AND os.role_type = rd.role_type
    WHERE os.profile_id = user_id AND os.role_type = target_role;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Create function to initialize onboarding session
CREATE OR REPLACE FUNCTION start_onboarding_session(user_id UUID, target_role TEXT)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Insert or update onboarding session
    INSERT INTO onboarding_sessions (profile_id, role_type, current_step, started_at, last_active)
    VALUES (user_id, target_role, 0, NOW(), NOW())
    ON CONFLICT (profile_id, role_type)
    DO UPDATE SET
        current_step = 0,
        started_at = NOW(),
        last_active = NOW(),
        completed_at = NULL
    RETURNING id INTO session_id;

    RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to complete onboarding
CREATE OR REPLACE FUNCTION complete_onboarding(user_id UUID, target_role TEXT, final_responses JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    session_exists BOOLEAN;
BEGIN
    -- Check if session exists
    SELECT EXISTS(
        SELECT 1 FROM onboarding_sessions
        WHERE profile_id = user_id AND role_type = target_role
    ) INTO session_exists;

    IF NOT session_exists THEN
        RETURN FALSE;
    END IF;

    -- Mark session as completed
    UPDATE onboarding_sessions
    SET
        current_step = -1,
        completed_at = NOW(),
        responses = final_responses
    WHERE profile_id = user_id AND role_type = target_role;

    -- Create or update role_details record
    INSERT INTO role_details (
        profile_id, role_type,
        subjects, skill_levels, goals,
        learning_style, budget_range, schedule_preferences, previous_experience,
        teaching_experience, qualifications, availability, hourly_rate, teaching_methods,
        professional_background, completed_at
    )
    VALUES (
        user_id, target_role,
        COALESCE((final_responses->>'subjects')::TEXT[], '{}'),
        COALESCE(final_responses->'skillLevels', '{}'),
        COALESCE((final_responses->>'goals')::TEXT[], '{}'),
        final_responses->>'learningStyle',
        final_responses->'budgetRange',
        final_responses->'schedulePreferences',
        COALESCE((final_responses->>'previousExperience')::BOOLEAN, false),
        final_responses->'teachingExperience',
        final_responses->'qualifications',
        final_responses->'availability',
        COALESCE((final_responses->>'hourlyRate')::INTEGER, NULL),
        COALESCE((final_responses->>'teachingMethods')::TEXT[], '{}'),
        final_responses->>'professionalBackground',
        NOW()
    )
    ON CONFLICT (profile_id, role_type)
    DO UPDATE SET
        subjects = EXCLUDED.subjects,
        skill_levels = EXCLUDED.skill_levels,
        goals = EXCLUDED.goals,
        learning_style = EXCLUDED.learning_style,
        budget_range = EXCLUDED.budget_range,
        schedule_preferences = EXCLUDED.schedule_preferences,
        previous_experience = EXCLUDED.previous_experience,
        teaching_experience = EXCLUDED.teaching_experience,
        qualifications = EXCLUDED.qualifications,
        availability = EXCLUDED.availability,
        hourly_rate = EXCLUDED.hourly_rate,
        teaching_methods = EXCLUDED.teaching_methods,
        professional_background = EXCLUDED.professional_background,
        completed_at = NOW(),
        updated_at = NOW();

    -- Update profile's onboarding_completed status
    UPDATE profiles
    SET onboarding_completed = COALESCE(onboarding_completed, '{}'::jsonb) ||
        jsonb_build_object(target_role, NOW()::TEXT)
    WHERE id = user_id;

    -- Add role to profile if not already present
    UPDATE profiles
    SET roles = CASE
        WHEN roles @> ARRAY[target_role]::TEXT[] THEN roles
        ELSE array_append(roles, target_role)
    END
    WHERE id = user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up abandoned sessions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_abandoned_onboarding_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM onboarding_sessions
    WHERE completed_at IS NULL
    AND last_active < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS (Row Level Security) policies
ALTER TABLE role_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own role details
CREATE POLICY "Users can view own role details" ON role_details
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own role details" ON role_details
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own role details" ON role_details
    FOR UPDATE USING (auth.uid() = profile_id);

-- Policy: Users can only access their own onboarding sessions
CREATE POLICY "Users can view own onboarding sessions" ON onboarding_sessions
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own onboarding sessions" ON onboarding_sessions
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own onboarding sessions" ON onboarding_sessions
    FOR UPDATE USING (auth.uid() = profile_id);

-- Add helpful comments to tables
COMMENT ON TABLE role_details IS 'Stores detailed information for each role a user has (seeker, provider, agent)';
COMMENT ON TABLE onboarding_sessions IS 'Tracks onboarding progress and stores responses during the flow';

COMMENT ON COLUMN role_details.skill_levels IS 'JSONB object mapping subjects to skill levels (1-5 scale)';
COMMENT ON COLUMN role_details.budget_range IS 'JSONB object with min, max, and currency for seeker budget preferences';
COMMENT ON COLUMN role_details.schedule_preferences IS 'JSONB object with days, times, and format preferences';
COMMENT ON COLUMN role_details.teaching_experience IS 'JSONB object with years, environments, and age groups for providers';
COMMENT ON COLUMN role_details.qualifications IS 'JSONB array of qualification objects with title, institution, year, verified status';
COMMENT ON COLUMN role_details.availability IS 'JSONB object mapping days to available time slots';

COMMENT ON COLUMN onboarding_sessions.current_step IS 'Current step in onboarding flow (-1 means completed)';
COMMENT ON COLUMN onboarding_sessions.responses IS 'JSONB object storing all form responses during onboarding';

-- Create sample data for testing (optional - remove in production)
-- This is commented out for safety, uncomment if you want test data
/*
INSERT INTO onboarding_sessions (profile_id, role_type, current_step, responses) VALUES
    ('123e4567-e89b-12d3-a456-426614174000', 'seeker', 2, '{"subjects": ["math", "science"], "skillLevels": {"math": 3, "science": 2}}'),
    ('123e4567-e89b-12d3-a456-426614174001', 'provider', 4, '{"subjects": ["english", "history"], "teachingExperience": {"years": 5}}');
*/