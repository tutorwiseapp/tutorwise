/**
 * Migration 049: Create student_integration_links table
 * Purpose: "Data bridge" for external learning platform OAuth integrations (v5.0)
 * Created: 2025-11-13
 *
 * This table stores OAuth tokens for Student accounts to link with external platforms
 * like Google Classroom, Khan Academy, etc. This enables tutors and guardians to
 * track student progress across multiple platforms.
 */

-- Create student_integration_links table
CREATE TABLE IF NOT EXISTS public.student_integration_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform_name TEXT NOT NULL, -- e.g., 'google_classroom', 'khan_academy'
    external_user_id TEXT, -- The user's ID on the external platform

    -- OAuth tokens (should be encrypted in production using pgsodium)
    -- For now storing as TEXT, but production should use encrypted columns
    auth_token TEXT,
    refresh_token TEXT,

    scopes TEXT[], -- e.g., ['classroom.courses.readonly']
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ, -- Track last successful data sync

    CONSTRAINT "unique_student_platform_link" UNIQUE (student_profile_id, platform_name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_integration_links_student_id"
    ON public.student_integration_links(student_profile_id);

CREATE INDEX IF NOT EXISTS "idx_integration_links_platform"
    ON public.student_integration_links(platform_name);

-- Enable Row Level Security
ALTER TABLE public.student_integration_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only the student can manage their own integrations
CREATE POLICY "Students can manage their own integration links"
    ON public.student_integration_links
    FOR ALL
    USING (auth.uid() = student_profile_id)
    WITH CHECK (auth.uid() = student_profile_id);

-- RLS Policy: Guardians (parents/tutors) can view their students' integrations
CREATE POLICY "Guardians can view their students integration links"
    ON public.student_integration_links
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profile_graph
            WHERE profile_graph.target_profile_id = student_integration_links.student_profile_id
            AND profile_graph.source_profile_id = auth.uid()
            AND profile_graph.relationship_type = 'GUARDIAN'
            AND profile_graph.status = 'ACTIVE'
        )
    );

-- Add helpful comments
COMMENT ON TABLE public.student_integration_links IS 'v5.0: Stores OAuth tokens for linking a Student account to external learning platforms (Google Classroom, Khan Academy, etc.)';
COMMENT ON COLUMN public.student_integration_links.student_profile_id IS 'The student who owns this integration';
COMMENT ON COLUMN public.student_integration_links.platform_name IS 'External platform identifier (google_classroom, khan_academy, etc.)';
COMMENT ON COLUMN public.student_integration_links.external_user_id IS 'The student''s user ID on the external platform';
COMMENT ON COLUMN public.student_integration_links.auth_token IS 'OAuth access token (should be encrypted in production)';
COMMENT ON COLUMN public.student_integration_links.refresh_token IS 'OAuth refresh token (should be encrypted in production)';
COMMENT ON COLUMN public.student_integration_links.scopes IS 'Array of OAuth scopes granted (e.g., classroom.courses.readonly)';
COMMENT ON COLUMN public.student_integration_links.last_synced_at IS 'Timestamp of last successful data sync from external platform';
