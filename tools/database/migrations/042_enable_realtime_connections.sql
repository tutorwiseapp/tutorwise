-- Migration 042: Enable Realtime for connections table
-- Purpose: Allow real-time subscriptions to connection changes
-- Created: 2025-11-07

-- Enable realtime for connections table
ALTER PUBLICATION supabase_realtime ADD TABLE connections;

-- Verify realtime is enabled
-- You can check in Supabase Dashboard → Database → Publications → supabase_realtime
