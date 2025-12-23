-- Migration: Create onboarding_progress table
-- Purpose: Store user's onboarding wizard progress for auto-save and resume functionality
-- Date: 2025-10-08

-- Create the onboarding_progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('tutor', 'client', 'agent')),
    current_step INT NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 5),
    step_data JSONB NOT NULL DEFAULT '{}',
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one progress record per profile + role_type combination
    CONSTRAINT unique_profile_role UNIQUE(profile_id, role_type)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_profile
    ON onboarding_progress(profile_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_role
    ON onboarding_progress(role_type);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_complete
    ON onboarding_progress(is_complete);

-- Add comment for documentation
COMMENT ON TABLE onboarding_progress IS 'Stores user onboarding wizard progress for auto-save and resume functionality';
COMMENT ON COLUMN onboarding_progress.profile_id IS 'References the user profile';
COMMENT ON COLUMN onboarding_progress.role_type IS 'Type of role being onboarded: tutor, client, or agent';
COMMENT ON COLUMN onboarding_progress.current_step IS 'Current step number in onboarding wizard (1-5)';
COMMENT ON COLUMN onboarding_progress.step_data IS 'JSON data containing step-specific information';
COMMENT ON COLUMN onboarding_progress.is_complete IS 'Whether the onboarding process is completed';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_onboarding_progress_updated_at
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_progress_updated_at();
