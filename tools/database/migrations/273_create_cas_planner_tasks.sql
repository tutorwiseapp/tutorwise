-- CAS Planner Tasks Table
-- Migration: 273_create_cas_planner_tasks.sql
--
-- Creates table for automated task generation by CAS Feedback Processor
-- Tasks are reviewed and executed by CAS Planner agent

-- ============================================
-- CAS PLANNER TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cas_planner_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Task metadata
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN (
        'curriculum_fix',        -- Fix curriculum content issue
        'feature_request',       -- Implement user-requested feature
        'bug_fix',              -- Fix reported bug
        'performance_issue',    -- Address performance problem
        'content_gap',          -- Add missing curriculum content
        'ux_improvement',       -- Improve user experience
        'analytics_review'      -- Review metrics and insights
    )),
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),

    -- Source tracking
    source TEXT NOT NULL CHECK (source IN ('feedback_processor', 'marketer_insights', 'security_scan', 'manual')),
    source_agent TEXT CHECK (source_agent IN ('sage', 'lexi', 'both')),
    source_data JSONB NOT NULL DEFAULT '{}', -- Original feedback IDs, session IDs, etc.

    -- Pattern analysis
    pattern_detected TEXT,  -- e.g., "repeated_negative_feedback_maths_gcse"
    occurrence_count INTEGER DEFAULT 1,
    affected_users_count INTEGER DEFAULT 0,
    first_occurrence_at TIMESTAMPTZ,

    -- Task status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Awaiting CAS Planner review
        'approved',     -- Approved for implementation
        'in_progress',  -- Being worked on
        'completed',    -- Task completed
        'dismissed'     -- Not actionable
    )),

    -- Execution tracking
    assigned_to TEXT, -- Which CAS agent will handle this
    estimated_impact TEXT CHECK (estimated_impact IN ('high', 'medium', 'low')),
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cas_planner_tasks_task_type ON cas_planner_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_cas_planner_tasks_priority ON cas_planner_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_cas_planner_tasks_source ON cas_planner_tasks(source);
CREATE INDEX IF NOT EXISTS idx_cas_planner_tasks_source_agent ON cas_planner_tasks(source_agent);
CREATE INDEX IF NOT EXISTS idx_cas_planner_tasks_status ON cas_planner_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cas_planner_tasks_created_at ON cas_planner_tasks(created_at DESC);

-- Combined index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_cas_planner_tasks_dashboard
    ON cas_planner_tasks(status, priority, created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_cas_planner_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();

    -- Auto-set completed_at when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cas_planner_tasks_updated_at ON cas_planner_tasks;
CREATE TRIGGER trigger_update_cas_planner_tasks_updated_at
    BEFORE UPDATE ON cas_planner_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_cas_planner_tasks_updated_at();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE cas_planner_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================
-- Admins can read all tasks
DROP POLICY IF EXISTS "Admins can read planner tasks" ON cas_planner_tasks;
CREATE POLICY "Admins can read planner tasks" ON cas_planner_tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND 'admin' = ANY(profiles.roles)
        )
    );

-- Admins can update tasks
DROP POLICY IF EXISTS "Admins can update planner tasks" ON cas_planner_tasks;
CREATE POLICY "Admins can update planner tasks" ON cas_planner_tasks
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND 'admin' = ANY(profiles.roles)
        )
    );

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to planner tasks" ON cas_planner_tasks;
CREATE POLICY "Service role full access to planner tasks" ON cas_planner_tasks
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE cas_planner_tasks IS 'Automated tasks generated by CAS Feedback Processor for CAS Planner execution';
COMMENT ON COLUMN cas_planner_tasks.source_data IS 'JSON containing feedback IDs, session IDs, user IDs that triggered this task';
COMMENT ON COLUMN cas_planner_tasks.pattern_detected IS 'Pattern identifier for deduplication and tracking';
COMMENT ON COLUMN cas_planner_tasks.occurrence_count IS 'Number of times this pattern was detected';
COMMENT ON COLUMN cas_planner_tasks.assigned_to IS 'Which CAS agent will handle: Analyst, Marketer, Security, or manual';
