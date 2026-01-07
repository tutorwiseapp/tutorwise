-- Migration 159: Create Organisation CaaS Recalculation Queue
-- Purpose: Queue for organisation CaaS score recalculations (separate from profile queue)
-- Date: 2026-01-07
-- Reference: Agent CaaS Implementation (Organisation Scoring Infrastructure)

-- ============================================================================
-- PART 1: Create organisation_caas_queue table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organisation_caas_queue (
  id SERIAL PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organisation_id) -- Prevent duplicate queue entries
);

COMMENT ON TABLE public.organisation_caas_queue IS
  'Queue for organisation CaaS score recalculations. Similar to caas_recalculation_queue but for organisations.
   Processed by caas-worker to recalculate connection_groups.caas_score.';

-- ============================================================================
-- PART 2: Create index for efficient processing
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organisation_caas_queue_created_at
  ON public.organisation_caas_queue(created_at ASC);

-- ============================================================================
-- PART 3: RLS Policies
-- ============================================================================

ALTER TABLE public.organisation_caas_queue ENABLE ROW LEVEL SECURITY;

-- Organisation owners can queue their own organisations
CREATE POLICY "Organisation owners can queue their organisation"
  ON public.organisation_caas_queue FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT id FROM public.connection_groups
      WHERE profile_id = auth.uid()
        AND type = 'organisation'
    )
  );

-- Organisation owners can view their queue entries
CREATE POLICY "Organisation owners can view their queue entries"
  ON public.organisation_caas_queue FOR SELECT
  USING (
    organisation_id IN (
      SELECT id FROM public.connection_groups
      WHERE profile_id = auth.uid()
        AND type = 'organisation'
    )
  );

-- Service role can manage all queue entries (for worker processing)
CREATE POLICY "Service role can manage all queue entries"
  ON public.organisation_caas_queue
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- PART 4: Trigger to auto-queue organisation on member changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_organisation_caas_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a member joins or leaves an organisation, queue the org for recalc
  IF TG_OP = 'INSERT' THEN
    -- Get the organisation_id from the group_id
    INSERT INTO public.organisation_caas_queue (organisation_id)
    SELECT cg.id
    FROM public.connection_groups cg
    WHERE cg.id = NEW.group_id
      AND cg.type = 'organisation'
    ON CONFLICT (organisation_id) DO NOTHING; -- Ignore if already queued
  ELSIF TG_OP = 'DELETE' THEN
    -- Queue org when member leaves
    INSERT INTO public.organisation_caas_queue (organisation_id)
    SELECT cg.id
    FROM public.connection_groups cg
    WHERE cg.id = OLD.group_id
      AND cg.type = 'organisation'
    ON CONFLICT (organisation_id) DO NOTHING;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.queue_organisation_caas_recalc() IS
  'Auto-queues organisation for CaaS recalculation when members join or leave.
   Triggered by changes to group_members table.';

-- ============================================================================
-- PART 5: Attach trigger to group_members
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_queue_org_caas ON public.group_members;

CREATE TRIGGER trigger_queue_org_caas
  AFTER INSERT OR DELETE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_organisation_caas_recalc();

COMMENT ON TRIGGER trigger_queue_org_caas ON public.group_members IS
  'Automatically queues organisation for CaaS recalculation when team members join or leave.
   This ensures organisation scores stay current as team composition changes.';

-- ============================================================================
-- PART 6: Function to manually queue organisation for recalculation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_organisation_for_caas_recalc(p_organisation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify organisation exists and is of type 'organisation'
  IF NOT EXISTS (
    SELECT 1 FROM public.connection_groups
    WHERE id = p_organisation_id AND type = 'organisation'
  ) THEN
    RAISE EXCEPTION 'Organisation not found or invalid type';
  END IF;

  -- Queue for recalculation
  INSERT INTO public.organisation_caas_queue (organisation_id)
  VALUES (p_organisation_id)
  ON CONFLICT (organisation_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.queue_organisation_for_caas_recalc(UUID) IS
  'Manually queue an organisation for CaaS recalculation.
   Called from application code when organisation details change (verifications, etc.).';

-- ============================================================================
-- Example usage (commented out)
-- ============================================================================

-- Manually queue an organisation:
-- SELECT queue_organisation_for_caas_recalc('org-uuid-here');

-- View current queue:
-- SELECT * FROM organisation_caas_queue ORDER BY created_at ASC;

-- Process oldest entry (for worker):
-- DELETE FROM organisation_caas_queue WHERE id = (
--   SELECT id FROM organisation_caas_queue ORDER BY created_at ASC LIMIT 1
-- ) RETURNING organisation_id;
