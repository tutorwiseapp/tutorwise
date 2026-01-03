-- =====================================================
-- Migration 158: Organisation Task Management System
-- Created: 2026-01-03
-- Purpose: Task management for organisation admins to handle client issues and workflows
-- Based on: Migration 156 (referral conversion flow) - adapted for tasks
-- =====================================================

-- =====================================================
-- PART 1: Organisation Tasks Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.org_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,

    -- Task Details
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    category TEXT NOT NULL DEFAULT 'general',

    -- Relationships
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- Link to specific client
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- Assigned tutor/admin
    created_by UUID NOT NULL REFERENCES public.profiles(id),  -- Who created task

    -- Approval Workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- Metadata
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraints
ALTER TABLE public.org_tasks
ADD CONSTRAINT check_task_status CHECK (
  status IN ('backlog', 'todo', 'in_progress', 'approved', 'done')
);

ALTER TABLE public.org_tasks
ADD CONSTRAINT check_task_priority CHECK (
  priority IN ('low', 'medium', 'high', 'urgent')
);

ALTER TABLE public.org_tasks
ADD CONSTRAINT check_task_category CHECK (
  category IN ('complaint', 'payment', 'tutor_switch', 'general')
);

-- Indexes for efficient querying
CREATE INDEX idx_org_tasks_organisation ON public.org_tasks(organisation_id);
CREATE INDEX idx_org_tasks_status ON public.org_tasks(status);
CREATE INDEX idx_org_tasks_org_status ON public.org_tasks(organisation_id, status);
CREATE INDEX idx_org_tasks_assigned_to ON public.org_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_org_tasks_client ON public.org_tasks(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_org_tasks_due_date ON public.org_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_org_tasks_priority ON public.org_tasks(priority);
CREATE INDEX idx_org_tasks_category ON public.org_tasks(category);

-- Comments
COMMENT ON TABLE public.org_tasks IS 'Task management for organisation admins to handle client issues and workflows';
COMMENT ON COLUMN public.org_tasks.status IS 'Task status: backlog, todo, in_progress, approved, done';
COMMENT ON COLUMN public.org_tasks.priority IS 'Task priority: low, medium, high, urgent';
COMMENT ON COLUMN public.org_tasks.category IS 'Task category: complaint, payment, tutor_switch, general';
COMMENT ON COLUMN public.org_tasks.requires_approval IS 'Whether task requires owner/senior admin approval before completion';
COMMENT ON COLUMN public.org_tasks.client_id IS 'Optional link to specific client this task relates to';
COMMENT ON COLUMN public.org_tasks.assigned_to IS 'Tutor or admin assigned to handle this task';

-- =====================================================
-- PART 2: Task Activity Log
-- =====================================================

CREATE TABLE IF NOT EXISTS public.org_task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.org_tasks(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity types: 'created', 'status_changed', 'assigned', 'comment', 'approved', 'completed'

CREATE INDEX idx_task_activities_task ON public.org_task_activities(task_id);
CREATE INDEX idx_task_activities_type ON public.org_task_activities(activity_type);
CREATE INDEX idx_task_activities_date ON public.org_task_activities(activity_date DESC);

COMMENT ON TABLE public.org_task_activities IS 'Timeline of activities and changes for organisation tasks';
COMMENT ON COLUMN public.org_task_activities.activity_type IS 'Type of activity: created, status_changed, assigned, comment, approved, completed';
COMMENT ON COLUMN public.org_task_activities.metadata IS 'Additional structured data (e.g., old/new values for status changes)';

-- =====================================================
-- PART 3: Auto-update Trigger
-- =====================================================

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_org_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();

    -- Auto-set completed_at when status changes to 'done'
    IF NEW.status = 'done' AND OLD.status != 'done' THEN
        NEW.completed_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_org_tasks_updated_at ON public.org_tasks;
CREATE TRIGGER trg_update_org_tasks_updated_at
    BEFORE UPDATE ON public.org_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_org_tasks_updated_at();

COMMENT ON FUNCTION update_org_tasks_updated_at IS 'Auto-update updated_at and completed_at timestamps for org_tasks';

-- =====================================================
-- PART 4: RPC Functions
-- =====================================================

-- Function: Update task status and log activity
CREATE OR REPLACE FUNCTION public.update_task_status(
    p_task_id UUID,
    p_new_status TEXT,
    p_performed_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status FROM org_tasks WHERE id = p_task_id;

    -- Update task status
    UPDATE org_tasks
    SET status = p_new_status
    WHERE id = p_task_id;

    -- Log activity
    INSERT INTO org_task_activities (
        task_id,
        activity_type,
        performed_by,
        notes,
        metadata
    ) VALUES (
        p_task_id,
        'status_changed',
        p_performed_by,
        COALESCE(p_notes, format('Status changed from %s to %s', v_old_status, p_new_status)),
        jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status) || p_metadata
    );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_task_status TO authenticated;

COMMENT ON FUNCTION public.update_task_status IS 'Update task status and automatically log the activity';

-- Function: Assign task to user
CREATE OR REPLACE FUNCTION public.assign_task(
    p_task_id UUID,
    p_assigned_to UUID,
    p_performed_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update task assignment
    UPDATE org_tasks
    SET assigned_to = p_assigned_to
    WHERE id = p_task_id;

    -- Log activity
    INSERT INTO org_task_activities (
        task_id,
        activity_type,
        performed_by,
        notes,
        metadata
    ) VALUES (
        p_task_id,
        'assigned',
        p_performed_by,
        p_notes,
        jsonb_build_object('assigned_to', p_assigned_to)
    );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.assign_task TO authenticated;

COMMENT ON FUNCTION public.assign_task IS 'Assign task to a user and log the activity';

-- =====================================================
-- PART 5: Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.org_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_task_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Organisation owners and admins can see all tasks
CREATE POLICY "Organisation owners/admins can view all tasks"
    ON public.org_tasks FOR SELECT
    USING (
        organisation_id IN (
            -- Owner check
            SELECT id FROM connection_groups
            WHERE type = 'organisation' AND profile_id = auth.uid()
            UNION
            -- Admin check
            SELECT gm.group_id
            FROM group_members gm
            JOIN profile_graph pg ON pg.id = gm.connection_id
            WHERE gm.role = 'admin'
              AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
        )
    );

-- Policy: Organisation owners/admins can insert tasks
CREATE POLICY "Organisation owners/admins can create tasks"
    ON public.org_tasks FOR INSERT
    WITH CHECK (
        organisation_id IN (
            SELECT id FROM connection_groups
            WHERE type = 'organisation' AND profile_id = auth.uid()
            UNION
            SELECT gm.group_id
            FROM group_members gm
            JOIN profile_graph pg ON pg.id = gm.connection_id
            WHERE gm.role = 'admin'
              AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
        )
    );

-- Policy: Organisation owners/admins can update tasks
CREATE POLICY "Organisation owners/admins can update tasks"
    ON public.org_tasks FOR UPDATE
    USING (
        organisation_id IN (
            SELECT id FROM connection_groups
            WHERE type = 'organisation' AND profile_id = auth.uid()
            UNION
            SELECT gm.group_id
            FROM group_members gm
            JOIN profile_graph pg ON pg.id = gm.connection_id
            WHERE gm.role = 'admin'
              AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
        )
    );

-- Policy: Organisation owners/admins can delete tasks
CREATE POLICY "Organisation owners/admins can delete tasks"
    ON public.org_tasks FOR DELETE
    USING (
        organisation_id IN (
            SELECT id FROM connection_groups
            WHERE type = 'organisation' AND profile_id = auth.uid()
            UNION
            SELECT gm.group_id
            FROM group_members gm
            JOIN profile_graph pg ON pg.id = gm.connection_id
            WHERE gm.role = 'admin'
              AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
        )
    );

-- Policy: Users can view activities for tasks they can see
CREATE POLICY "Users can view task activities"
    ON public.org_task_activities FOR SELECT
    USING (
        task_id IN (
            SELECT id FROM org_tasks
            WHERE organisation_id IN (
                SELECT id FROM connection_groups
                WHERE type = 'organisation' AND profile_id = auth.uid()
                UNION
                SELECT gm.group_id
                FROM group_members gm
                JOIN profile_graph pg ON pg.id = gm.connection_id
                WHERE gm.role = 'admin'
                  AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
            )
        )
    );

-- Policy: Users can insert activities for tasks they can see
CREATE POLICY "Users can create task activities"
    ON public.org_task_activities FOR INSERT
    WITH CHECK (
        task_id IN (
            SELECT id FROM org_tasks
            WHERE organisation_id IN (
                SELECT id FROM connection_groups
                WHERE type = 'organisation' AND profile_id = auth.uid()
                UNION
                SELECT gm.group_id
                FROM group_members gm
                JOIN profile_graph pg ON pg.id = gm.connection_id
                WHERE gm.role = 'admin'
                  AND (pg.source_profile_id = auth.uid() OR pg.target_profile_id = auth.uid())
            )
        )
    );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 158 complete: Organisation Task Management System';
  RAISE NOTICE '  ✓ Created org_tasks table with 5 status columns (backlog, todo, in_progress, approved, done)';
  RAISE NOTICE '  ✓ Created org_task_activities table for activity logging';
  RAISE NOTICE '  ✓ Added indexes for efficient querying';
  RAISE NOTICE '  ✓ Created RPC functions: update_task_status, assign_task';
  RAISE NOTICE '  ✓ Configured RLS policies for organisation owners and admins';
  RAISE NOTICE '  ✓ Added auto-update triggers for timestamps';
END $$;
