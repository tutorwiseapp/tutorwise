-- Migration: Add Custom Skills System
-- Created: 2026-02-24
-- Purpose: Phase 2 Feature #2 - Allow tutors to create custom skills beyond predefined library
-- Version: v1.0

-- Custom Skills Table
-- Stores user-created skills that aren't in the predefined library
CREATE TABLE IF NOT EXISTS custom_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique index for case-insensitive skill names
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_skills_unique_name ON custom_skills(LOWER(name));

-- AI Tutor Skills Link Table
-- Links AI tutors to their skills (both predefined and custom)
CREATE TABLE IF NOT EXISTS ai_tutor_skills (
  ai_tutor_id uuid NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  skill_name varchar(100) NOT NULL,
  is_custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),

  PRIMARY KEY (ai_tutor_id, skill_name)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_custom_skills_created_by ON custom_skills(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_skills_name ON custom_skills(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_ai_tutor_skills_tutor ON ai_tutor_skills(ai_tutor_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_skills_skill_name ON ai_tutor_skills(skill_name);

-- Add comments
COMMENT ON TABLE custom_skills IS 'User-created custom skills for AI tutors';
COMMENT ON TABLE ai_tutor_skills IS 'Link table connecting AI tutors to their skills (predefined and custom)';
COMMENT ON COLUMN custom_skills.name IS 'Skill name (case-insensitive unique)';
COMMENT ON COLUMN ai_tutor_skills.is_custom IS 'Whether this skill is custom (true) or predefined (false)';

-- Function: Get skills for an AI tutor
CREATE OR REPLACE FUNCTION get_ai_tutor_skills(tutor_id uuid)
RETURNS TABLE (
  skill_name varchar(100),
  is_custom boolean,
  created_by uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ats.skill_name,
    ats.is_custom,
    cs.created_by
  FROM ai_tutor_skills ats
  LEFT JOIN custom_skills cs ON ats.skill_name = cs.name AND ats.is_custom = true
  WHERE ats.ai_tutor_id = tutor_id
  ORDER BY ats.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function: Get popular custom skills
CREATE OR REPLACE FUNCTION get_popular_custom_skills(limit_count integer DEFAULT 20)
RETURNS TABLE (
  skill_name varchar(100),
  usage_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ats.skill_name,
    COUNT(*) as usage_count
  FROM ai_tutor_skills ats
  WHERE ats.is_custom = true
  GROUP BY ats.skill_name
  ORDER BY usage_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Add skill to AI tutor
CREATE OR REPLACE FUNCTION add_skill_to_ai_tutor(
  tutor_id uuid,
  skill varchar(100),
  custom boolean DEFAULT false
) RETURNS void AS $$
BEGIN
  -- If custom skill, ensure it exists in custom_skills table
  IF custom THEN
    IF NOT EXISTS (SELECT 1 FROM custom_skills WHERE LOWER(name) = LOWER(skill)) THEN
      RAISE EXCEPTION 'Custom skill "%" does not exist', skill;
    END IF;
  END IF;

  -- Insert or ignore if already exists
  INSERT INTO ai_tutor_skills (ai_tutor_id, skill_name, is_custom)
  VALUES (tutor_id, skill, custom)
  ON CONFLICT (ai_tutor_id, skill_name) DO NOTHING;

  -- Update ai_tutors.updated_at
  UPDATE ai_tutors SET updated_at = now() WHERE id = tutor_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Remove skill from AI tutor
CREATE OR REPLACE FUNCTION remove_skill_from_ai_tutor(
  tutor_id uuid,
  skill varchar(100)
) RETURNS void AS $$
BEGIN
  DELETE FROM ai_tutor_skills
  WHERE ai_tutor_id = tutor_id AND skill_name = skill;

  -- Update ai_tutors.updated_at
  UPDATE ai_tutors SET updated_at = now() WHERE id = tutor_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update custom_skills.updated_at
CREATE OR REPLACE FUNCTION trigger_update_custom_skills_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_custom_skills_update
  BEFORE UPDATE ON custom_skills
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_custom_skills_timestamp();

-- Note: ai_tutors.skills column has been removed in favor of ai_tutor_skills table
-- All new AI tutors will use the ai_tutor_skills table for skill management
