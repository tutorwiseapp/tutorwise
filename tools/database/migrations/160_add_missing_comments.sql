-- Migration 160 (Part 2): Add Missing Task Comments Table
-- Only creates org_task_comments since org_task_attachments already exists

BEGIN;

-- ============================================================================
-- 1. CREATE TASK COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES org_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_comment_not_empty CHECK (trim(comment_text) <> '')
);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON org_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON org_task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON org_task_comments(created_at DESC);

-- ============================================================================
-- 2. ADD RLS POLICIES FOR COMMENTS
-- ============================================================================

-- Enable RLS
ALTER TABLE org_task_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organisation members can view task comments" ON org_task_comments;
DROP POLICY IF EXISTS "Organisation members can create task comments" ON org_task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON org_task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON org_task_comments;

-- Comments policies: Only organisation members can view/create comments
CREATE POLICY "Organisation members can view task comments"
  ON org_task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_tasks t
      INNER JOIN connection_groups cg ON t.organisation_id = cg.id
      WHERE t.id = task_id
      AND (
        cg.profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members gm
          INNER JOIN profile_graph pg ON gm.connection_id = pg.id
          WHERE gm.group_id = cg.id
          AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Organisation members can create task comments"
  ON org_task_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM org_tasks t
      INNER JOIN connection_groups cg ON t.organisation_id = cg.id
      WHERE t.id = task_id
      AND (
        cg.profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members gm
          INNER JOIN profile_graph pg ON gm.connection_id = pg.id
          WHERE gm.group_id = cg.id
          AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON org_task_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON org_task_comments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 3. ADD RLS POLICIES FOR ATTACHMENTS (if not already present)
-- ============================================================================

-- Enable RLS on attachments
ALTER TABLE org_task_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organisation members can view task attachments" ON org_task_attachments;
DROP POLICY IF EXISTS "Organisation members can upload task attachments" ON org_task_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON org_task_attachments;

-- Attachments policies
CREATE POLICY "Organisation members can view task attachments"
  ON org_task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_tasks t
      INNER JOIN connection_groups cg ON t.organisation_id = cg.id
      WHERE t.id = task_id
      AND (
        cg.profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members gm
          INNER JOIN profile_graph pg ON gm.connection_id = pg.id
          WHERE gm.group_id = cg.id
          AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Organisation members can upload task attachments"
  ON org_task_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM org_tasks t
      INNER JOIN connection_groups cg ON t.organisation_id = cg.id
      WHERE t.id = task_id
      AND (
        cg.profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members gm
          INNER JOIN profile_graph pg ON gm.connection_id = pg.id
          WHERE gm.group_id = cg.id
          AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON org_task_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- ============================================================================
-- 4. CREATE TRIGGER FOR COMMENT UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_task_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_comment_updated_at ON org_task_comments;

CREATE TRIGGER task_comment_updated_at
  BEFORE UPDATE ON org_task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comment_updated_at();

COMMIT;
