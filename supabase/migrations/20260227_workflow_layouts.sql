-- Create workflow_layouts table for storing custom workflow layouts
-- Supports: Database persistence of ReactFlow node positions and edges

CREATE TABLE IF NOT EXISTS workflow_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one layout per workflow per user
  CONSTRAINT workflow_layouts_unique UNIQUE (workflow_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS workflow_layouts_workflow_id_idx ON workflow_layouts(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_layouts_user_id_idx ON workflow_layouts(user_id);
CREATE INDEX IF NOT EXISTS workflow_layouts_updated_at_idx ON workflow_layouts(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE workflow_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own layouts
CREATE POLICY "Users can view their own workflow layouts"
  ON workflow_layouts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflow layouts"
  ON workflow_layouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow layouts"
  ON workflow_layouts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflow layouts"
  ON workflow_layouts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE workflow_layouts IS 'Stores custom workflow visualization layouts for CAS Planning Graph. Each user can save personalized node positions and custom edges.';
