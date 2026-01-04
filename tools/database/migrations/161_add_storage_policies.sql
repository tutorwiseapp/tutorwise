-- Migration 161: Add Storage Policies for Task Attachments
-- Created: 2026-01-04
-- Description: Adds RLS policies for task-attachments storage bucket

BEGIN;

-- ============================================================================
-- STORAGE POLICIES FOR task-attachments BUCKET
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organisation members can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Organisation members can download task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task attachments" ON storage.objects;

-- Allow organisation members to upload files
-- Files are organized by: organisationId/taskId/timestamp.ext
CREATE POLICY "Organisation members can upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT cg.id::text
    FROM connection_groups cg
    WHERE cg.profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      INNER JOIN profile_graph pg ON gm.connection_id = pg.id
      WHERE gm.group_id = cg.id
      AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
    )
  )
);

-- Allow organisation members to download files
CREATE POLICY "Organisation members can download task attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT cg.id::text
    FROM connection_groups cg
    WHERE cg.profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      INNER JOIN profile_graph pg ON gm.connection_id = pg.id
      WHERE gm.group_id = cg.id
      AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
    )
  )
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own task attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND owner = auth.uid()
);

COMMIT;
