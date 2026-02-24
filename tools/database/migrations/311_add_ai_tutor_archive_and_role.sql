-- Migration: Add archive and role-based filtering to AI Tutors
-- Purpose: Match service listings pattern for archive workflow and role filtering
-- Created: 2026-02-24

-- Add archived_at column (matches listings.archived_at)
ALTER TABLE ai_tutors
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add created_as_role column (matches listings.created_as_role)
ALTER TABLE ai_tutors
ADD COLUMN IF NOT EXISTS created_as_role VARCHAR(20);

-- Add index for archived status queries
CREATE INDEX IF NOT EXISTS idx_ai_tutors_archived_at ON ai_tutors(archived_at) WHERE archived_at IS NOT NULL;

-- Add index for role filtering
CREATE INDEX IF NOT EXISTS idx_ai_tutors_created_as_role ON ai_tutors(created_as_role);

-- Update existing rows to set created_as_role to 'tutor' (default for existing AI tutors)
UPDATE ai_tutors
SET created_as_role = 'tutor'
WHERE created_as_role IS NULL;

-- Add comment
COMMENT ON COLUMN ai_tutors.archived_at IS 'Timestamp when AI tutor was archived. NULL = not archived. Implements 5-day waiting period before deletion like listings.';
COMMENT ON COLUMN ai_tutors.created_as_role IS 'Role the user was in when creating this AI tutor (tutor/agent/client). Enables role-based filtering.';
