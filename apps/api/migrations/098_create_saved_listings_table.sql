-- Migration: 098_create_saved_listings_table.sql
-- Purpose: Create table to store user's saved/favorited listings
-- Created: 2025-12-09
-- Author: Claude Code

-- Create saved_listings table
CREATE TABLE IF NOT EXISTS saved_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure a user can only save a listing once
  UNIQUE(user_id, listing_id)
);

-- Create indexes for performance
CREATE INDEX idx_saved_listings_user_id ON saved_listings(user_id);
CREATE INDEX idx_saved_listings_listing_id ON saved_listings(listing_id);
CREATE INDEX idx_saved_listings_created_at ON saved_listings(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own saved listings
CREATE POLICY "Users can view their own saved listings"
  ON saved_listings
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own saved listings
CREATE POLICY "Users can save listings"
  ON saved_listings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own saved listings
CREATE POLICY "Users can unsave listings"
  ON saved_listings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comment for documentation
COMMENT ON TABLE saved_listings IS 'Stores user-saved/favorited listings for quick access';
COMMENT ON COLUMN saved_listings.user_id IS 'ID of the user who saved the listing';
COMMENT ON COLUMN saved_listings.listing_id IS 'ID of the saved listing';
