-- ===================================================================
-- Migration: 266_create_virtualspace_artifacts_storage.sql
-- Purpose: Create storage bucket for standalone VirtualSpace session artifacts
-- Created: 2026-02-14
-- Author: Senior Architect
-- Prerequisites: Migration 265 (virtualspace_sessions table)
-- ===================================================================
-- This migration creates a storage bucket for standalone VirtualSpace sessions.
-- Booking-linked sessions continue to use the existing booking-artifacts bucket.
-- ===================================================================

-- Create storage bucket for VirtualSpace artifacts
INSERT INTO storage.buckets (id, name, public)
VALUES ('virtualspace-artifacts', 'virtualspace-artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- Storage Policies for virtualspace-artifacts bucket
-- ===================================================================

-- Policy 1: Session owners can upload artifacts
CREATE POLICY "VirtualSpace owners can upload artifacts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'virtualspace-artifacts' AND
    EXISTS (
        SELECT 1 FROM public.virtualspace_sessions
        WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
);

-- Policy 2: Session participants can upload artifacts
CREATE POLICY "VirtualSpace participants can upload artifacts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'virtualspace-artifacts' AND
    EXISTS (
        SELECT 1 FROM public.virtualspace_sessions vs
        JOIN public.virtualspace_participants vp ON vs.id = vp.session_id
        WHERE vs.id::text = (storage.foldername(name))[1]
        AND vp.user_id = auth.uid()
        AND vp.role IN ('owner', 'collaborator')
    )
);

-- Policy 3: Session participants can read artifacts
CREATE POLICY "VirtualSpace participants can read artifacts"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'virtualspace-artifacts' AND
    EXISTS (
        SELECT 1 FROM public.virtualspace_sessions vs
        LEFT JOIN public.virtualspace_participants vp ON vs.id = vp.session_id
        WHERE vs.id::text = (storage.foldername(name))[1]
        AND (vs.owner_id = auth.uid() OR vp.user_id = auth.uid())
    )
);

-- Policy 4: Public read access (for sharing snapshots via link)
CREATE POLICY "Public read access for virtualspace artifacts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'virtualspace-artifacts');

-- Policy 5: Session owners can delete artifacts
CREATE POLICY "VirtualSpace owners can delete artifacts"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'virtualspace-artifacts' AND
    EXISTS (
        SELECT 1 FROM public.virtualspace_sessions
        WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
);

-- ===================================================================
-- Validation
-- ===================================================================
DO $$
DECLARE
    v_bucket_exists BOOLEAN;
    v_policy_count INTEGER;
BEGIN
    -- Check if bucket exists
    SELECT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'virtualspace-artifacts'
    ) INTO v_bucket_exists;

    -- Count policies
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE '%VirtualSpace%'
    INTO v_policy_count;

    -- Report status
    RAISE NOTICE 'Migration 266 completed successfully';
    RAISE NOTICE 'virtualspace-artifacts bucket created: %', v_bucket_exists;
    RAISE NOTICE 'Storage policies created: %', v_policy_count;
    RAISE NOTICE 'Ready for VirtualSpace standalone artifact storage';
END $$;
