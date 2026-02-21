-- Create cas_marketer_insights table for storing CAS Marketer Agent insights
-- These insights are generated daily from Sage/Lexi analytics and reviewed by CAS Planner

CREATE TABLE IF NOT EXISTS cas_marketer_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('opportunity', 'risk', 'milestone')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for quick filtering by status and priority
CREATE INDEX idx_cas_marketer_insights_status_priority ON cas_marketer_insights(status, priority);

-- Create index for time-based queries
CREATE INDEX idx_cas_marketer_insights_created_at ON cas_marketer_insights(created_at DESC);

-- Add RLS policies
ALTER TABLE cas_marketer_insights ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read insights
CREATE POLICY "Admins can read marketer insights"
ON cas_marketer_insights
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- Policy: System can insert insights (for Edge Functions)
CREATE POLICY "System can insert marketer insights"
ON cas_marketer_insights
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Admins can update insights (mark as reviewed/actioned)
CREATE POLICY "Admins can update marketer insights"
ON cas_marketer_insights
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- Add updated_at trigger
CREATE TRIGGER cas_marketer_insights_updated_at
BEFORE UPDATE ON cas_marketer_insights
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cas_marketer_insights IS 'CAS Marketer Agent insights generated from Sage/Lexi analytics';
COMMENT ON COLUMN cas_marketer_insights.type IS 'Insight type: opportunity, risk, or milestone';
COMMENT ON COLUMN cas_marketer_insights.priority IS 'Priority level for CAS Planner: critical, high, medium, or low';
COMMENT ON COLUMN cas_marketer_insights.message IS 'Human-readable insight message';
COMMENT ON COLUMN cas_marketer_insights.data IS 'Supporting data (metrics, trends, etc.)';
COMMENT ON COLUMN cas_marketer_insights.recommended_action IS 'Suggested action for CAS Planner';
COMMENT ON COLUMN cas_marketer_insights.status IS 'Review status: pending, reviewed, actioned, or dismissed';
