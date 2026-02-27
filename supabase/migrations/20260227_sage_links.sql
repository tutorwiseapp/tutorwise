--
-- Sage Links Table
--
-- Purpose: Provides URL reference management for Sage (platform AI tutor)
-- Similar to ai_tutor_links but for the platform-wide Sage service
--
-- Created: 2026-02-27
--

-- Create sage_links table
CREATE TABLE IF NOT EXISTS sage_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  skills TEXT[] DEFAULT '{}',
  subject TEXT CHECK (subject IN ('maths', 'english', 'science', 'general')),
  level TEXT CHECK (level IN ('foundation', 'higher', 'a-level', 'gcse')),
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sage_links_status ON sage_links(status);
CREATE INDEX IF NOT EXISTS idx_sage_links_subject ON sage_links(subject);
CREATE INDEX IF NOT EXISTS idx_sage_links_level ON sage_links(level);
CREATE INDEX IF NOT EXISTS idx_sage_links_priority ON sage_links(priority);
CREATE INDEX IF NOT EXISTS idx_sage_links_skills ON sage_links USING GIN(skills);

-- Enable RLS
ALTER TABLE sage_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public read access for active links
CREATE POLICY "sage_links_public_read" ON sage_links
  FOR SELECT
  USING (status = 'active');

-- Admin full access (authenticated users with admin role)
CREATE POLICY "sage_links_admin_all" ON sage_links
  FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'admin' = ANY(profiles.roles)
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_sage_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sage_links_updated_at
  BEFORE UPDATE ON sage_links
  FOR EACH ROW
  EXECUTE FUNCTION update_sage_links_updated_at();

-- Insert seed data (example links for each subject)
INSERT INTO sage_links (title, url, description, skills, subject, level, priority, status) VALUES
  -- Maths resources
  ('BBC Bitesize GCSE Maths', 'https://www.bbc.co.uk/bitesize/examspecs/z9p3mnb', 'Comprehensive GCSE Maths revision with videos and quizzes', ARRAY['algebra', 'geometry', 'statistics'], 'maths', 'gcse', 10, 'active'),
  ('Khan Academy Algebra', 'https://www.khanacademy.org/math/algebra', 'Free algebra course with practice exercises', ARRAY['algebra', 'equations', 'graphs'], 'maths', 'foundation', 20, 'active'),
  ('Corbettmaths', 'https://corbettmaths.com/', 'GCSE Maths practice questions and videos', ARRAY['maths', 'practice', 'gcse'], 'maths', 'gcse', 15, 'active'),

  -- English resources
  ('BBC Bitesize English', 'https://www.bbc.co.uk/bitesize/subjects/z3kw2hv', 'GCSE English Language and Literature resources', ARRAY['reading', 'writing', 'analysis'], 'english', 'gcse', 10, 'active'),
  ('No Fear Shakespeare', 'https://www.sparknotes.com/nofear/shakespeare/', 'Modern translations of Shakespeare plays', ARRAY['shakespeare', 'literature', 'analysis'], 'english', 'gcse', 25, 'active'),

  -- Science resources
  ('BBC Bitesize Science', 'https://www.bbc.co.uk/bitesize/subjects/zng4d2p', 'GCSE Science revision across all topics', ARRAY['biology', 'chemistry', 'physics'], 'science', 'gcse', 10, 'active'),
  ('PhET Simulations', 'https://phet.colorado.edu/', 'Interactive science and maths simulations', ARRAY['physics', 'chemistry', 'simulations'], 'science', 'foundation', 30, 'active'),

  -- General resources
  ('Study Skills Guide', 'https://www.open.ac.uk/students/study/index.htm', 'Effective study techniques and time management', ARRAY['study-skills', 'revision', 'time-management'], 'general', NULL, 50, 'active'),
  ('Exam Board Specifications', 'https://www.aqa.org.uk/subjects', 'Official AQA exam specifications', ARRAY['specifications', 'exam-board', 'curriculum'], 'general', NULL, 40, 'active')
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE sage_links IS 'URL references for Sage AI tutor with priority ordering and subject classification';
