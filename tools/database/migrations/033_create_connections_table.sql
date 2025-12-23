-- Migration: 033_create_connections_table.sql
-- Purpose: Create connections table for user-to-user network relationships (SDD v4.3)
-- Date: 2025-11-06
-- Prerequisites: Profiles table exists
--
-- This table enables the "Referral Partner" feature where tutors can delegate
-- commissions to connected agents. It also supports the broader Network feature.

-- Create connection status enum
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');

-- Create connections table (many-to-many join table)
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who initiated the connection request
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- The user who received the connection request
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Status of the connection
  status connection_status NOT NULL DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure users can't connect to themselves
  CONSTRAINT no_self_connection CHECK (requester_id != receiver_id),

  -- Ensure only one connection record per pair (regardless of direction)
  CONSTRAINT unique_connection UNIQUE (requester_id, receiver_id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_connections_requester ON public.connections(requester_id) WHERE status = 'accepted';
CREATE INDEX idx_connections_receiver ON public.connections(receiver_id) WHERE status = 'accepted';
CREATE INDEX idx_connections_status ON public.connections(status);

-- Add comments for documentation
COMMENT ON TABLE public.connections IS 'Stores user-to-user network connections for the referral partner delegation feature and broader network functionality (SDD v4.3)';
COMMENT ON COLUMN public.connections.requester_id IS 'The profile ID of the user who initiated the connection';
COMMENT ON COLUMN public.connections.receiver_id IS 'The profile ID of the user who received the connection request';
COMMENT ON COLUMN public.connections.status IS 'Connection status: pending (awaiting acceptance), accepted (active connection), rejected (declined), blocked (user blocked)';

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER connections_updated_at
BEFORE UPDATE ON public.connections
FOR EACH ROW
EXECUTE FUNCTION update_connections_updated_at();

-- Grant permissions (adjust based on your RLS policies)
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own connections (both directions)
CREATE POLICY "Users can view their own connections"
ON public.connections
FOR SELECT
USING (
  auth.uid() = requester_id OR
  auth.uid() = receiver_id
);

-- RLS Policy: Users can create connection requests
CREATE POLICY "Users can create connection requests"
ON public.connections
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- RLS Policy: Receivers can update connection status
CREATE POLICY "Users can update connections they're part of"
ON public.connections
FOR UPDATE
USING (
  auth.uid() = requester_id OR
  auth.uid() = receiver_id
);

-- RLS Policy: Users can delete their own connections
CREATE POLICY "Users can delete their own connections"
ON public.connections
FOR DELETE
USING (
  auth.uid() = requester_id OR
  auth.uid() = receiver_id
);
