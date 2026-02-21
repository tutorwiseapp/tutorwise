-- Create cas_security_scans table for storing CAS Security Agent scan results
-- These scans run weekly and store results for CAS Planner review

CREATE TABLE IF NOT EXISTS cas_security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL CHECK (scan_type IN ('weekly_automated', 'manual', 'pre_deployment')),
  passed BOOLEAN NOT NULL DEFAULT false,
  critical_count INTEGER NOT NULL DEFAULT 0,
  high_count INTEGER NOT NULL DEFAULT 0,
  moderate_count INTEGER NOT NULL DEFAULT 0,
  low_count INTEGER NOT NULL DEFAULT 0,
  recommendations TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  details JSONB NOT NULL DEFAULT '{}',
  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for quick filtering by scan type and pass/fail
CREATE INDEX idx_cas_security_scans_type_passed ON cas_security_scans(scan_type, passed);

-- Create index for time-based queries
CREATE INDEX idx_cas_security_scans_created_at ON cas_security_scans(created_at DESC);

-- Add RLS policies
ALTER TABLE cas_security_scans ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and developers can read scan results
CREATE POLICY "Admins and developers can read security scans"
ON cas_security_scans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND ('admin' = ANY(profiles.roles) OR 'developer' = ANY(profiles.roles))
  )
);

-- Policy: System can insert scan results (for Edge Functions)
CREATE POLICY "System can insert security scans"
ON cas_security_scans
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMENT ON TABLE cas_security_scans IS 'CAS Security Agent scan results - weekly automated and manual scans';
COMMENT ON COLUMN cas_security_scans.scan_type IS 'Type of scan: weekly_automated, manual, or pre_deployment';
COMMENT ON COLUMN cas_security_scans.passed IS 'Whether scan passed (no critical/high vulnerabilities)';
COMMENT ON COLUMN cas_security_scans.critical_count IS 'Number of critical severity issues found';
COMMENT ON COLUMN cas_security_scans.high_count IS 'Number of high severity issues found';
COMMENT ON COLUMN cas_security_scans.moderate_count IS 'Number of moderate severity issues found';
COMMENT ON COLUMN cas_security_scans.low_count IS 'Number of low severity issues found';
COMMENT ON COLUMN cas_security_scans.recommendations IS 'Array of recommended actions';
COMMENT ON COLUMN cas_security_scans.details IS 'Detailed scan results (vulnerabilities, code issues, etc.)';
COMMENT ON COLUMN cas_security_scans.triggered_by IS 'User who triggered manual scan (NULL for automated)';
