-- Migration 353: platform_notifications
-- Generic in-app notification table for users and admins.
-- Used by: nudge scheduler, send_notification agent tool, workflow handlers.

CREATE TABLE IF NOT EXISTS platform_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info'  -- 'info'|'warning'|'alert'|'nudge'
    CHECK (type IN ('info', 'warning', 'alert', 'nudge')),
  read_at    TIMESTAMPTZ,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_notifications ENABLE ROW LEVEL SECURITY;

-- Users read their own notifications
CREATE POLICY pn_owner_read ON platform_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Admins + service role have full access
CREATE POLICY pn_admin_all ON platform_notifications
  FOR ALL USING (is_admin());

CREATE POLICY pn_service_role ON platform_notifications
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_pn_user_unread ON platform_notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX idx_pn_created ON platform_notifications(created_at DESC);
