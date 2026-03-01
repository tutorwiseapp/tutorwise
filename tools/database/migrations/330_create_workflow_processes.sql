-- Migration 330: Create workflow_processes and workflow_process_templates tables
-- For Process Studio (visual workflow designer)

-- Workflow processes (user-created)
CREATE TABLE IF NOT EXISTS public.workflow_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled Process',
  description text,
  category text NOT NULL DEFAULT 'general',
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workflow process templates (system + user)
CREATE TABLE IF NOT EXISTS public.workflow_process_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  complexity varchar(20) NOT NULL DEFAULT 'simple' CHECK (complexity IN ('simple', 'medium', 'advanced')),
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_steps text[],
  tags text[],
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_processes_created_by ON public.workflow_processes(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_processes_category ON public.workflow_processes(category);
CREATE INDEX IF NOT EXISTS idx_workflow_processes_updated_at ON public.workflow_processes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_process_templates_category ON public.workflow_process_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_process_templates_is_system ON public.workflow_process_templates(is_system);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_workflow_processes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workflow_processes_updated_at
  BEFORE UPDATE ON public.workflow_processes
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_processes_updated_at();

-- RLS
ALTER TABLE public.workflow_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_process_templates ENABLE ROW LEVEL SECURITY;

-- workflow_processes: admins can do everything
CREATE POLICY wp_admin_all ON public.workflow_processes
  FOR ALL USING (public.is_admin());

-- workflow_process_templates: admins can read all, only superadmin can insert/update/delete
CREATE POLICY wpt_admin_select ON public.workflow_process_templates
  FOR SELECT USING (public.is_admin());

CREATE POLICY wpt_admin_insert ON public.workflow_process_templates
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY wpt_admin_update ON public.workflow_process_templates
  FOR UPDATE USING (public.is_admin());

CREATE POLICY wpt_admin_delete ON public.workflow_process_templates
  FOR DELETE USING (public.is_admin());

-- Seed system templates
INSERT INTO public.workflow_process_templates (name, description, category, complexity, nodes, edges, preview_steps, tags, is_system) VALUES
(
  'Student Onboarding',
  'Standard onboarding flow for new students joining the platform',
  'onboarding',
  'medium',
  '[
    {"id":"t1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Student Registers","type":"trigger","description":"New student signs up","editable":false}},
    {"id":"a1","type":"processStep","position":{"x":300,"y":180},"data":{"label":"Verify Email","type":"action","description":"Send verification email and confirm","editable":true}},
    {"id":"a2","type":"processStep","position":{"x":300,"y":310},"data":{"label":"Complete Profile","type":"action","description":"Student fills in profile details","editable":true}},
    {"id":"a3","type":"processStep","position":{"x":300,"y":440},"data":{"label":"Welcome Notification","type":"notification","description":"Send welcome email with getting started guide","editable":true}},
    {"id":"e1","type":"processStep","position":{"x":300,"y":570},"data":{"label":"Onboarding Complete","type":"end","description":"Student is fully onboarded","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e-t1-a1","source":"t1","target":"a1"},
    {"id":"e-a1-a2","source":"a1","target":"a2"},
    {"id":"e-a2-a3","source":"a2","target":"a3"},
    {"id":"e-a3-e1","source":"a3","target":"e1"}
  ]'::jsonb,
  ARRAY['Register', 'Verify Email', 'Complete Profile', 'Welcome'],
  ARRAY['onboarding', 'student', 'starter'],
  true
),
(
  'Tutor Approval',
  'Review and approve new tutor applications',
  'approval',
  'advanced',
  '[
    {"id":"t1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Application Received","type":"trigger","description":"Tutor submits application","editable":false}},
    {"id":"a1","type":"processStep","position":{"x":300,"y":180},"data":{"label":"Review Documents","type":"action","description":"Admin reviews submitted credentials","editable":true}},
    {"id":"c1","type":"processStep","position":{"x":300,"y":310},"data":{"label":"Meets Requirements?","type":"condition","description":"Check if tutor meets minimum requirements","editable":true}},
    {"id":"ap1","type":"processStep","position":{"x":150,"y":440},"data":{"label":"Approve Application","type":"approval","description":"Final approval by admin","editable":true}},
    {"id":"n1","type":"processStep","position":{"x":450,"y":440},"data":{"label":"Request More Info","type":"notification","description":"Notify tutor of missing requirements","editable":true}},
    {"id":"e1","type":"processStep","position":{"x":300,"y":570},"data":{"label":"Process Complete","type":"end","description":"Application processed","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e-t1-a1","source":"t1","target":"a1"},
    {"id":"e-a1-c1","source":"a1","target":"c1"},
    {"id":"e-c1-ap1","source":"c1","target":"ap1","sourceHandle":"yes"},
    {"id":"e-c1-n1","source":"c1","target":"n1","sourceHandle":"no"},
    {"id":"e-ap1-e1","source":"ap1","target":"e1"},
    {"id":"e-n1-e1","source":"n1","target":"e1"}
  ]'::jsonb,
  ARRAY['Application', 'Review', 'Decision', 'Approve/Reject'],
  ARRAY['approval', 'tutor', 'hr'],
  true
),
(
  'Simple Task Flow',
  'Basic task assignment and completion workflow',
  'general',
  'simple',
  '[
    {"id":"t1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Task Created","type":"trigger","description":"A new task is created","editable":false}},
    {"id":"a1","type":"processStep","position":{"x":300,"y":180},"data":{"label":"Assign Task","type":"action","description":"Assign to team member","editable":true}},
    {"id":"a2","type":"processStep","position":{"x":300,"y":310},"data":{"label":"Complete Task","type":"action","description":"Assignee completes the work","editable":true}},
    {"id":"e1","type":"processStep","position":{"x":300,"y":440},"data":{"label":"Done","type":"end","description":"Task is complete","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e-t1-a1","source":"t1","target":"a1"},
    {"id":"e-a1-a2","source":"a1","target":"a2"},
    {"id":"e-a2-e1","source":"a2","target":"e1"}
  ]'::jsonb,
  ARRAY['Create', 'Assign', 'Complete'],
  ARRAY['task', 'simple', 'starter'],
  true
);
