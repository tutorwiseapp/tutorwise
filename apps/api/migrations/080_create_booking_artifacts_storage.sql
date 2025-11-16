-- ===================================================================
-- Migration: 080_create_booking_artifacts_storage.sql
-- Purpose: Create storage bucket for WiseSpace session artifacts (v5.8)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: Supabase Storage enabled
-- ===================================================================
-- This migration creates a public storage bucket for session artifacts
-- (whiteboard snapshots, recordings, etc.) and configures RLS policies.
-- ===================================================================

-- Create storage bucket for booking artifacts
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-artifacts', 'booking-artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to upload artifacts for their own bookings
CREATE POLICY "Users can upload artifacts for their bookings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'booking-artifacts' AND
  -- Verify user is participant in the booking
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id::text = (storage.foldername(name))[1]
    AND (
      bookings.tutor_id = auth.uid() OR
      bookings.student_id = auth.uid()
    )
  )
);

-- Policy 2: Allow authenticated users to read artifacts for their own bookings
CREATE POLICY "Users can read artifacts for their bookings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'booking-artifacts' AND
  -- Verify user is participant in the booking
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id::text = (storage.foldername(name))[1]
    AND (
      bookings.tutor_id = auth.uid() OR
      bookings.student_id = auth.uid()
    )
  )
);

-- Policy 3: Allow public read access (for sharing snapshots)
CREATE POLICY "Public read access for booking artifacts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'booking-artifacts');

-- Policy 4: Allow users to delete their own artifacts
CREATE POLICY "Users can delete artifacts for their bookings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'booking-artifacts' AND
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id::text = (storage.foldername(name))[1]
    AND (
      bookings.tutor_id = auth.uid() OR
      bookings.student_id = auth.uid()
    )
  )
);

-- Add comment
COMMENT ON COLUMN storage.buckets.id IS
'v5.8: booking-artifacts bucket stores WiseSpace session artifacts (whiteboard snapshots, recordings).
Public access enabled for sharing. RLS policies ensure only participants can upload/delete.';

-- Validation
DO $$
DECLARE
  v_bucket_exists BOOLEAN;
  v_policy_count INTEGER;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'booking-artifacts'
  ) INTO v_bucket_exists;

  -- Count policies
  SELECT COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%booking%'
  INTO v_policy_count;

  -- Report status
  RAISE NOTICE 'Migration 080 completed successfully';
  RAISE NOTICE 'booking-artifacts bucket created: %', v_bucket_exists;
  RAISE NOTICE 'Storage policies created: %', v_policy_count;
  RAISE NOTICE 'Ready for WiseSpace (v5.8) - Session artifacts storage';
END $$;
