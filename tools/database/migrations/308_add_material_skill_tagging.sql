-- Migration: Add Skill Tagging to Materials
-- Created: 2026-02-24
-- Purpose: Phase 2 Feature #4 - Material Skill-Tagging for better RAG retrieval
-- Version: v1.0

-- Add skills column to ai_tutor_materials (matching ai_tutor_links pattern)
ALTER TABLE ai_tutor_materials ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;

-- Add column comment
COMMENT ON COLUMN ai_tutor_materials.skills IS 'Array of skill names this material covers (for targeted RAG retrieval)';

-- Note: ai_tutor_links table already has skills column (added in migration 301)
-- This enables skill-filtered RAG queries for both materials and links
