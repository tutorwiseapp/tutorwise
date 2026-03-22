-- Migration 425: Tutor third-party integrations (Google Classroom, etc.)

CREATE TABLE IF NOT EXISTS tutor_integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id      UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,          -- 'google_classroom'
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tutor_id, provider)
);

-- RLS: tutors can only see/manage their own integrations
ALTER TABLE tutor_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tutor_integrations_owner ON tutor_integrations
  USING (tutor_id = auth.uid());

-- Index for fast lookup by tutor + provider
CREATE INDEX IF NOT EXISTS idx_tutor_integrations_tutor_provider
  ON tutor_integrations (tutor_id, provider);
