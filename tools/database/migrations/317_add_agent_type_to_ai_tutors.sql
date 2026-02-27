-- Migration 317: Add agent_type and agent_context columns to ai_tutors table
-- Part of Unified AI Architecture (Phases 5-7)
-- Enables filtering AI agents by type (tutor, coursework, study_buddy, research_assistant, exam_prep)

-- Add agent_type column with default 'tutor' for backward compatibility
ALTER TABLE ai_tutors
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50) NOT NULL DEFAULT 'tutor'
CHECK (agent_type IN ('tutor', 'coursework', 'study_buddy', 'research_assistant', 'exam_prep'));

-- Add agent_context column with default 'marketplace' for backward compatibility
ALTER TABLE ai_tutors
ADD COLUMN IF NOT EXISTS agent_context VARCHAR(50) NOT NULL DEFAULT 'marketplace'
CHECK (agent_context IN ('platform', 'marketplace'));

-- Backfill: set all existing records to 'tutor' type (already handled by DEFAULT)
UPDATE ai_tutors SET agent_type = 'tutor' WHERE agent_type IS NULL;

-- Create index for filtering by agent_type
CREATE INDEX IF NOT EXISTS idx_ai_tutors_agent_type ON ai_tutors(agent_type);

-- Create composite index for filtered queries
CREATE INDEX IF NOT EXISTS idx_ai_tutors_agent_type_status ON ai_tutors(agent_type, status);

-- Comments
COMMENT ON COLUMN ai_tutors.agent_type IS 'Type of AI agent: tutor, coursework, study_buddy, research_assistant, exam_prep';
COMMENT ON COLUMN ai_tutors.agent_context IS 'Context: platform (internal) or marketplace (public)';
