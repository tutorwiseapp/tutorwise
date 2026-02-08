/*
 * Migration 247: Add Row Level Security Policies to Bookings Table
 * Purpose: Implement RLS policies to prevent unauthorized access to booking data
 * Created: 2026-02-07
 * Security: CRITICAL - Fixes missing RLS on bookings table
 */

-- Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own bookings (as client or tutor)
CREATE POLICY "Users can view their own bookings"
ON bookings
FOR SELECT
USING (
  auth.uid() = client_id OR
  auth.uid() = tutor_id
);

-- Policy 2: Clients can create bookings (as the client)
CREATE POLICY "Clients can create bookings"
ON bookings
FOR INSERT
WITH CHECK (
  auth.uid() = client_id
);

-- Policy 3: Clients and tutors can update their own bookings (status changes, completion, etc.)
CREATE POLICY "Clients and tutors can update their own bookings"
ON bookings
FOR UPDATE
USING (
  auth.uid() = client_id OR
  auth.uid() = tutor_id
)
WITH CHECK (
  auth.uid() = client_id OR
  auth.uid() = tutor_id
);

-- Policy 4: Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- Policy 5: Admins can update all bookings
CREATE POLICY "Admins can update all bookings"
ON bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- Policy 6: Nobody can delete bookings (soft delete only via status)
-- No DELETE policy created - deletes should only be done via admin operations

-- Add index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_id ON bookings(tutor_id);

-- Verification query (to be run after migration)
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'bookings';
