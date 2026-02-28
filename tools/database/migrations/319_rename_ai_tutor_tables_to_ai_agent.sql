/**
 * Migration: 319_rename_ai_tutor_tables_to_ai_agent.sql
 * Purpose: Rename all ai_tutor_* tables, columns, indexes, functions, triggers, and RLS policies
 *          to ai_agent_* equivalents. Drop the empty ai_tutors table.
 * Created: 2026-02-28
 *
 * STRATEGY:
 * Phase 1: Drop RLS policies (they reference ai_tutors table and ai_tutor_id columns)
 * Phase 2: Drop triggers (they reference old table names)
 * Phase 3: Drop ai_tutors table (0 rows) and ai_tutors_view
 * Phase 4: Rename 12 child tables (ai_tutor_* → ai_agent_*)
 * Phase 5: Drop legacy ai_tutor_id columns, rename ai_tutor_session_id
 * Phase 6: Rename indexes
 * Phase 7: Recreate functions with new names and updated references
 * Phase 8: Recreate triggers on renamed tables
 * Phase 9: Recreate RLS policies referencing ai_agents and agent_id
 */

BEGIN;

-- ============================================
-- PHASE 1: DROP RLS POLICIES
-- ============================================

-- ai_tutor_links policies
DROP POLICY IF EXISTS "Users can delete links for own AI tutors" ON ai_tutor_links;
DROP POLICY IF EXISTS "Users can insert links for own AI tutors" ON ai_tutor_links;
DROP POLICY IF EXISTS "Users can update links for own AI tutors" ON ai_tutor_links;
DROP POLICY IF EXISTS "Users can view links for accessible AI tutors" ON ai_tutor_links;

-- ai_tutor_material_chunks policies
DROP POLICY IF EXISTS "Service role can manage chunks" ON ai_tutor_material_chunks;
DROP POLICY IF EXISTS "Users can view chunks for own AI tutors" ON ai_tutor_material_chunks;

-- ai_tutor_materials policies
DROP POLICY IF EXISTS "Users can delete materials for own AI tutors" ON ai_tutor_materials;
DROP POLICY IF EXISTS "Users can insert materials for own AI tutors" ON ai_tutor_materials;
DROP POLICY IF EXISTS "Users can update materials for own AI tutors" ON ai_tutor_materials;
DROP POLICY IF EXISTS "Users can view materials for own AI tutors" ON ai_tutor_materials;

-- ai_tutor_reviews policies
DROP POLICY IF EXISTS "Users can insert own reviews" ON ai_tutor_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON ai_tutor_reviews;
DROP POLICY IF EXISTS "Users can view reviews for published AI tutors" ON ai_tutor_reviews;

-- ai_tutor_sessions policies
DROP POLICY IF EXISTS "Service role can insert sessions" ON ai_tutor_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON ai_tutor_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON ai_tutor_sessions;

-- ai_tutor_skills policies
DROP POLICY IF EXISTS "Users can delete skills for own AI tutors" ON ai_tutor_skills;
DROP POLICY IF EXISTS "Users can insert skills for own AI tutors" ON ai_tutor_skills;
DROP POLICY IF EXISTS "Users can update skills for own AI tutors" ON ai_tutor_skills;
DROP POLICY IF EXISTS "Users can view skills for accessible AI tutors" ON ai_tutor_skills;

-- ai_tutor_subscriptions policies
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON ai_tutor_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON ai_tutor_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON ai_tutor_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON ai_tutor_subscriptions;

-- ai_tutors table policies
DROP POLICY IF EXISTS "Users can delete own AI tutors" ON ai_tutors;
DROP POLICY IF EXISTS "Users can insert own AI tutors" ON ai_tutors;
DROP POLICY IF EXISTS "Users can update own AI tutors" ON ai_tutors;
DROP POLICY IF EXISTS "Users can view own or published AI tutors" ON ai_tutors;
DROP POLICY IF EXISTS "ai_tutors_admin_manage_platform" ON ai_tutors;

-- ============================================
-- PHASE 2: DROP TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trigger_check_bundle_consumed ON ai_tutor_bundle_purchases;
DROP TRIGGER IF EXISTS trigger_ai_tutor_bundle_updated_at ON ai_tutor_bundles;
DROP TRIGGER IF EXISTS trigger_update_finetuned_model ON ai_tutor_finetuning_jobs;
DROP TRIGGER IF EXISTS on_material_ready_update_quality ON ai_tutor_materials;
DROP TRIGGER IF EXISTS on_ai_tutor_low_rating ON ai_tutor_reviews;
DROP TRIGGER IF EXISTS on_review_submission_update_quality ON ai_tutor_reviews;
DROP TRIGGER IF EXISTS on_ai_tutor_session_escalation ON ai_tutor_sessions;
DROP TRIGGER IF EXISTS on_session_completion_update_quality ON ai_tutor_sessions;
DROP TRIGGER IF EXISTS trigger_update_ai_tutor_video_stats ON ai_tutor_sessions;
DROP TRIGGER IF EXISTS update_ai_tutor_subscriptions_updated_at ON ai_tutor_subscriptions;
DROP TRIGGER IF EXISTS on_ai_tutor_quality_score_drop ON ai_tutors;
DROP TRIGGER IF EXISTS update_ai_tutors_updated_at ON ai_tutors;

-- ============================================
-- PHASE 3: DROP ai_tutors TABLE AND VIEW
-- ============================================

DROP VIEW IF EXISTS ai_tutors_view;
DROP TABLE IF EXISTS ai_tutors CASCADE;

-- ============================================
-- PHASE 4: RENAME 12 CHILD TABLES
-- ============================================

ALTER TABLE IF EXISTS ai_tutor_skills RENAME TO ai_agent_skills;
ALTER TABLE IF EXISTS ai_tutor_materials RENAME TO ai_agent_materials;
ALTER TABLE IF EXISTS ai_tutor_material_chunks RENAME TO ai_agent_material_chunks;
ALTER TABLE IF EXISTS ai_tutor_links RENAME TO ai_agent_links;
ALTER TABLE IF EXISTS ai_tutor_sessions RENAME TO ai_agent_sessions;
ALTER TABLE IF EXISTS ai_tutor_subscriptions RENAME TO ai_agent_subscriptions;
ALTER TABLE IF EXISTS ai_tutor_reviews RENAME TO ai_agent_reviews;
ALTER TABLE IF EXISTS ai_tutor_bundles RENAME TO ai_agent_bundles;
ALTER TABLE IF EXISTS ai_tutor_bundle_purchases RENAME TO ai_agent_bundle_purchases;
ALTER TABLE IF EXISTS ai_tutor_finetuning_jobs RENAME TO ai_agent_finetuning_jobs;
ALTER TABLE IF EXISTS ai_tutor_group_members RENAME TO ai_agent_group_members;
ALTER TABLE IF EXISTS ai_tutor_virtualspace_events RENAME TO ai_agent_virtualspace_events;

-- ============================================
-- PHASE 5: DROP/RENAME COLUMNS
-- ============================================

-- Tables with BOTH ai_tutor_id AND agent_id: drop the legacy ai_tutor_id
ALTER TABLE ai_agent_skills DROP COLUMN IF EXISTS ai_tutor_id;
ALTER TABLE ai_agent_materials DROP COLUMN IF EXISTS ai_tutor_id;
ALTER TABLE ai_agent_links DROP COLUMN IF EXISTS ai_tutor_id;
ALTER TABLE ai_agent_sessions DROP COLUMN IF EXISTS ai_tutor_id;
ALTER TABLE ai_agent_subscriptions DROP COLUMN IF EXISTS ai_tutor_id;
ALTER TABLE ai_agent_reviews DROP COLUMN IF EXISTS ai_tutor_id;

-- Tables with ONLY ai_tutor_id: rename to agent_id
ALTER TABLE ai_agent_bundles RENAME COLUMN ai_tutor_id TO agent_id;
ALTER TABLE ai_agent_bundle_purchases RENAME COLUMN ai_tutor_id TO agent_id;
ALTER TABLE ai_agent_finetuning_jobs RENAME COLUMN ai_tutor_id TO agent_id;
ALTER TABLE ai_agent_group_members RENAME COLUMN ai_tutor_id TO agent_id;

-- material_chunks also only has ai_tutor_id (no agent_id was added by migration 318)
ALTER TABLE ai_agent_material_chunks RENAME COLUMN ai_tutor_id TO agent_id;

-- virtualspace_events: rename ai_tutor_session_id → session_id
ALTER TABLE ai_agent_virtualspace_events RENAME COLUMN ai_tutor_session_id TO session_id;

-- Add FK constraints for newly renamed columns (old FKs pointed to ai_tutors which is dropped)
ALTER TABLE ai_agent_bundles
  ADD CONSTRAINT ai_agent_bundles_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;

ALTER TABLE ai_agent_bundle_purchases
  ADD CONSTRAINT ai_agent_bundle_purchases_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;

ALTER TABLE ai_agent_finetuning_jobs
  ADD CONSTRAINT ai_agent_finetuning_jobs_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;

ALTER TABLE ai_agent_group_members
  ADD CONSTRAINT ai_agent_group_members_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;

ALTER TABLE ai_agent_material_chunks
  ADD CONSTRAINT ai_agent_material_chunks_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;

ALTER TABLE ai_agent_virtualspace_events
  ADD CONSTRAINT ai_agent_virtualspace_events_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES ai_agent_sessions(id) ON DELETE CASCADE;

-- ============================================
-- PHASE 6: RENAME INDEXES
-- ============================================

-- ai_agent_bundle_purchases indexes
ALTER INDEX IF EXISTS ai_tutor_bundle_purchases_pkey RENAME TO ai_agent_bundle_purchases_pkey;
ALTER INDEX IF EXISTS idx_bundle_purchases_ai_tutor RENAME TO idx_bundle_purchases_agent;
ALTER INDEX IF EXISTS idx_bundle_purchases_bundle RENAME TO idx_agent_bundle_purchases_bundle;
ALTER INDEX IF EXISTS idx_bundle_purchases_client RENAME TO idx_agent_bundle_purchases_client;
ALTER INDEX IF EXISTS idx_bundle_purchases_expires RENAME TO idx_agent_bundle_purchases_expires;

-- ai_agent_bundles indexes
ALTER INDEX IF EXISTS ai_tutor_bundles_pkey RENAME TO ai_agent_bundles_pkey;
ALTER INDEX IF EXISTS idx_ai_tutor_bundles_display RENAME TO idx_ai_agent_bundles_display;
ALTER INDEX IF EXISTS idx_ai_tutor_bundles_tutor RENAME TO idx_ai_agent_bundles_agent;

-- ai_agent_finetuning_jobs indexes
ALTER INDEX IF EXISTS ai_tutor_finetuning_jobs_pkey RENAME TO ai_agent_finetuning_jobs_pkey;
ALTER INDEX IF EXISTS idx_finetuning_jobs_status RENAME TO idx_ai_agent_finetuning_jobs_status;
ALTER INDEX IF EXISTS idx_finetuning_jobs_tutor RENAME TO idx_ai_agent_finetuning_jobs_agent;

-- ai_agent_group_members indexes
ALTER INDEX IF EXISTS ai_tutor_group_members_pkey RENAME TO ai_agent_group_members_pkey;
ALTER INDEX IF EXISTS idx_ai_tutor_group_members_group RENAME TO idx_ai_agent_group_members_group;
ALTER INDEX IF EXISTS idx_ai_tutor_group_members_role RENAME TO idx_ai_agent_group_members_role;
ALTER INDEX IF EXISTS idx_ai_tutor_group_members_tutor RENAME TO idx_ai_agent_group_members_agent;

-- ai_agent_links indexes
ALTER INDEX IF EXISTS ai_tutor_links_pkey RENAME TO ai_agent_links_pkey;
ALTER INDEX IF EXISTS idx_ai_tutor_links_agent_id RENAME TO idx_ai_agent_links_agent_id;
ALTER INDEX IF EXISTS idx_ai_tutor_links_status RENAME TO idx_ai_agent_links_status;
ALTER INDEX IF EXISTS idx_ai_tutor_links_tutor RENAME TO idx_ai_agent_links_agent;

-- ai_agent_material_chunks indexes
ALTER INDEX IF EXISTS ai_tutor_material_chunks_pkey RENAME TO ai_agent_material_chunks_pkey;
ALTER INDEX IF EXISTS idx_ai_tutor_chunks_embedding RENAME TO idx_ai_agent_chunks_embedding;
ALTER INDEX IF EXISTS idx_ai_tutor_chunks_material RENAME TO idx_ai_agent_chunks_material;
ALTER INDEX IF EXISTS idx_ai_tutor_chunks_tutor RENAME TO idx_ai_agent_chunks_agent;

-- ai_agent_materials indexes
ALTER INDEX IF EXISTS ai_tutor_materials_pkey RENAME TO ai_agent_materials_pkey;
ALTER INDEX IF EXISTS idx_ai_tutor_materials_agent_id RENAME TO idx_ai_agent_materials_agent_id;
ALTER INDEX IF EXISTS idx_ai_tutor_materials_content_type RENAME TO idx_ai_agent_materials_content_type;
ALTER INDEX IF EXISTS idx_ai_tutor_materials_extracted_text_fts RENAME TO idx_ai_agent_materials_extracted_text_fts;
ALTER INDEX IF EXISTS idx_ai_tutor_materials_status RENAME TO idx_ai_agent_materials_status;
ALTER INDEX IF EXISTS idx_ai_tutor_materials_tutor RENAME TO idx_ai_agent_materials_agent;
ALTER INDEX IF EXISTS idx_ai_tutor_materials_vision_embedding RENAME TO idx_ai_agent_materials_vision_embedding;

-- ai_agent_reviews indexes
ALTER INDEX IF EXISTS ai_tutor_reviews_pkey RENAME TO ai_agent_reviews_pkey;
ALTER INDEX IF EXISTS idx_ai_tutor_reviews_agent_id RENAME TO idx_ai_agent_reviews_agent_id;
ALTER INDEX IF EXISTS idx_ai_tutor_reviews_client RENAME TO idx_ai_agent_reviews_client;
ALTER INDEX IF EXISTS idx_ai_tutor_reviews_rating RENAME TO idx_ai_agent_reviews_rating;
ALTER INDEX IF EXISTS idx_ai_tutor_reviews_tutor RENAME TO idx_ai_agent_reviews_agent;

-- ai_agent_sessions indexes
ALTER INDEX IF EXISTS ai_tutor_sessions_pkey RENAME TO ai_agent_sessions_pkey;
ALTER INDEX IF EXISTS idx_ai_tutor_sessions_agent_id RENAME TO idx_ai_agent_sessions_agent_id;
ALTER INDEX IF EXISTS idx_ai_tutor_sessions_bundle RENAME TO idx_ai_agent_sessions_bundle;
ALTER INDEX IF EXISTS idx_ai_tutor_sessions_client RENAME TO idx_ai_agent_sessions_client;
ALTER INDEX IF EXISTS idx_ai_tutor_sessions_mode RENAME TO idx_ai_agent_sessions_mode;
ALTER INDEX IF EXISTS idx_ai_tutor_sessions_reviewed RENAME TO idx_ai_agent_sessions_reviewed;
ALTER INDEX IF EXISTS idx_ai_tutor_sessions_started RENAME TO idx_ai_agent_sessions_started;
ALTER INDEX IF EXISTS idx_ai_tutor_sessions_tutor RENAME TO idx_ai_agent_sessions_agent;
ALTER INDEX IF EXISTS idx_ai_tutor_sessions_virtualspace RENAME TO idx_ai_agent_sessions_virtualspace;

-- ai_agent_skills indexes
ALTER INDEX IF EXISTS ai_tutor_skills_pkey RENAME TO ai_agent_skills_pkey;
ALTER INDEX IF EXISTS idx_ai_tutor_skills_agent_id RENAME TO idx_ai_agent_skills_agent_id;
ALTER INDEX IF EXISTS idx_ai_tutor_skills_name RENAME TO idx_ai_agent_skills_name;
ALTER INDEX IF EXISTS idx_ai_tutor_skills_skill_name RENAME TO idx_ai_agent_skills_skill_name;
ALTER INDEX IF EXISTS idx_ai_tutor_skills_tutor RENAME TO idx_ai_agent_skills_agent;
ALTER INDEX IF EXISTS unique_ai_tutor_skill RENAME TO unique_ai_agent_skill;

-- ai_agent_subscriptions indexes
ALTER INDEX IF EXISTS ai_tutor_subscriptions_ai_tutor_id_key RENAME TO ai_agent_subscriptions_agent_id_key;
ALTER INDEX IF EXISTS ai_tutor_subscriptions_pkey RENAME TO ai_agent_subscriptions_pkey;
ALTER INDEX IF EXISTS ai_tutor_subscriptions_stripe_subscription_id_key RENAME TO ai_agent_subscriptions_stripe_subscription_id_key;
ALTER INDEX IF EXISTS idx_ai_tutor_subscriptions_agent_id RENAME TO idx_ai_agent_subscriptions_agent_id;
ALTER INDEX IF EXISTS idx_ai_tutor_subscriptions_owner RENAME TO idx_ai_agent_subscriptions_owner;
ALTER INDEX IF EXISTS idx_ai_tutor_subscriptions_status RENAME TO idx_ai_agent_subscriptions_status;
ALTER INDEX IF EXISTS idx_ai_tutor_subscriptions_stripe RENAME TO idx_ai_agent_subscriptions_stripe;

-- ai_agent_virtualspace_events indexes
ALTER INDEX IF EXISTS ai_tutor_virtualspace_events_pkey RENAME TO ai_agent_virtualspace_events_pkey;
ALTER INDEX IF EXISTS idx_ai_virtualspace_events_ai_session RENAME TO idx_ai_agent_virtualspace_events_session;
ALTER INDEX IF EXISTS idx_ai_virtualspace_events_created RENAME TO idx_ai_agent_virtualspace_events_created;
ALTER INDEX IF EXISTS idx_ai_virtualspace_events_type RENAME TO idx_ai_agent_virtualspace_events_type;
ALTER INDEX IF EXISTS idx_ai_virtualspace_events_vs_session RENAME TO idx_ai_agent_virtualspace_events_vs_session;

-- ============================================
-- PHASE 7: DROP AND RECREATE FUNCTIONS
-- ============================================
-- Strategy: Use dynamic SQL to get each function's definition,
-- replace ai_tutor references, and recreate with new names.

DO $$
DECLARE
  func_def TEXT;
  new_def TEXT;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND (
      p.proname LIKE '%ai_tutor%'
      OR p.proname = 'calculate_storage_used'
      OR p.proname = 'recalculate_all_quality_scores'
      OR p.proname = 'get_client_active_bundles'
      OR p.proname = 'redeem_bundle_session'
      OR p.proname = 'expire_old_bundles'
      OR p.proname = 'get_active_virtualspace_sessions'
      OR p.proname = 'get_bundle_stats'
      OR p.proname = 'get_finetuning_stats'
      OR p.proname = 'get_content_type_stats'
      -- Trigger functions that reference ai_tutor tables
      OR p.proname = 'check_bundle_purchase_consumed'
      OR p.proname = 'notify_owner_on_low_rating'
      OR p.proname = 'notify_owner_on_quality_drop'
      OR p.proname = 'notify_owner_on_session_escalation'
      OR p.proname = 'trigger_update_quality_score_on_material'
      OR p.proname = 'trigger_update_quality_score_on_review'
      OR p.proname = 'trigger_update_quality_score_on_session_end'
    )
  LOOP
    -- Get the full CREATE FUNCTION statement
    func_def := pg_get_functiondef(rec.oid);

    -- Replace table names (order matters - longer patterns first)
    new_def := func_def;
    new_def := replace(new_def, 'ai_tutor_virtualspace_events', 'ai_agent_virtualspace_events');
    new_def := replace(new_def, 'ai_tutor_bundle_purchases', 'ai_agent_bundle_purchases');
    new_def := replace(new_def, 'ai_tutor_material_chunks', 'ai_agent_material_chunks');
    new_def := replace(new_def, 'ai_tutor_finetuning_jobs', 'ai_agent_finetuning_jobs');
    new_def := replace(new_def, 'ai_tutor_group_members', 'ai_agent_group_members');
    new_def := replace(new_def, 'ai_tutor_subscriptions', 'ai_agent_subscriptions');
    new_def := replace(new_def, 'ai_tutor_materials', 'ai_agent_materials');
    new_def := replace(new_def, 'ai_tutor_sessions', 'ai_agent_sessions');
    new_def := replace(new_def, 'ai_tutor_reviews', 'ai_agent_reviews');
    new_def := replace(new_def, 'ai_tutor_bundles', 'ai_agent_bundles');
    new_def := replace(new_def, 'ai_tutor_skills', 'ai_agent_skills');
    new_def := replace(new_def, 'ai_tutor_links', 'ai_agent_links');
    new_def := replace(new_def, 'ai_tutors', 'ai_agents');

    -- Replace column and parameter names
    new_def := replace(new_def, 'ai_tutor_session_id', 'session_id');
    new_def := replace(new_def, 'p_ai_tutor_id', 'p_agent_id');
    new_def := replace(new_def, 'ai_tutor_id_filter', 'agent_id_filter');
    new_def := replace(new_def, 'ai_tutor_id', 'agent_id');
    new_def := replace(new_def, 'tutor_id', 'p_agent_id');

    -- Replace function names in the definition
    new_def := replace(new_def, 'add_skill_to_ai_tutor', 'add_skill_to_ai_agent');
    new_def := replace(new_def, 'remove_skill_from_ai_tutor', 'remove_skill_from_ai_agent');
    new_def := replace(new_def, 'aggregate_ai_tutor_statistics', 'aggregate_ai_agent_statistics');
    new_def := replace(new_def, 'ai_tutor_check_storage_quota', 'ai_agent_check_storage_quota');
    new_def := replace(new_def, 'ai_tutor_increment_session_stats', 'ai_agent_increment_session_stats');
    new_def := replace(new_def, 'ai_tutor_update_rating', 'ai_agent_update_rating');
    new_def := replace(new_def, 'calculate_ai_tutor_quality_score', 'calculate_ai_agent_quality_score');
    new_def := replace(new_def, 'check_ai_tutor_limit', 'check_ai_agent_limit');
    new_def := replace(new_def, 'get_ai_tutor_limit', 'get_ai_agent_limit');
    new_def := replace(new_def, 'get_ai_tutor_skill_analytics', 'get_ai_agent_skill_analytics');
    new_def := replace(new_def, 'get_ai_tutor_skills', 'get_ai_agent_skills');
    new_def := replace(new_def, 'get_ai_tutor_video_analytics', 'get_ai_agent_video_analytics');
    new_def := replace(new_def, 'get_organisation_members_with_ai_tutors', 'get_organisation_members_with_ai_agents');
    new_def := replace(new_def, 'match_ai_tutor_chunks', 'match_ai_agent_chunks');
    new_def := replace(new_def, 'search_ai_tutor_materials_multimodal', 'search_ai_agent_materials_multimodal');
    new_def := replace(new_def, 'search_ai_tutors_hybrid', 'search_ai_agents_hybrid');
    new_def := replace(new_def, 'update_ai_tutor_bundle_updated_at', 'update_ai_agent_bundle_updated_at');
    new_def := replace(new_def, 'update_ai_tutor_finetuned_model', 'update_ai_agent_finetuned_model');
    new_def := replace(new_def, 'update_ai_tutor_video_stats', 'update_ai_agent_video_stats');

    -- pg_get_functiondef returns "CREATE OR REPLACE FUNCTION" so we can execute directly
    -- But we need to change it to use the new name in the CREATE statement
    -- The replacements above already handle the function name in the body

    -- Drop the old function using OID (handles overloaded functions)
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', rec.oid::regprocedure);

    -- Create the new function
    EXECUTE new_def;

    RAISE NOTICE 'Migrated function: % → %',
      rec.proname,
      replace(replace(replace(replace(replace(
        rec.proname,
        'ai_tutor_', 'ai_agent_'),
        'ai_tutors', 'ai_agents'),
        'add_skill_to_ai_tutor', 'add_skill_to_ai_agent'),
        'remove_skill_from_ai_tutor', 'remove_skill_from_ai_agent'),
        'check_ai_tutor_limit', 'check_ai_agent_limit');
  END LOOP;
END $$;

-- ============================================
-- PHASE 8: RECREATE TRIGGERS ON RENAMED TABLES
-- ============================================

-- Bundle purchase consumed check
CREATE TRIGGER trigger_check_bundle_consumed
  BEFORE UPDATE ON ai_agent_bundle_purchases
  FOR EACH ROW
  WHEN (NEW.ai_sessions_remaining = 0 AND NEW.human_sessions_remaining = 0)
  EXECUTE FUNCTION check_bundle_purchase_consumed();

-- Bundle updated_at
CREATE TRIGGER trigger_ai_agent_bundle_updated_at
  BEFORE UPDATE ON ai_agent_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_agent_bundle_updated_at();

-- Finetuning job completion
CREATE TRIGGER trigger_update_finetuned_model
  AFTER UPDATE ON ai_agent_finetuning_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_ai_agent_finetuned_model();

-- Material quality score update
CREATE TRIGGER on_material_ready_update_quality
  AFTER INSERT OR UPDATE ON ai_agent_materials
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_quality_score_on_material();

-- Review quality score + low rating notification
CREATE TRIGGER on_review_submission_update_quality
  AFTER INSERT OR UPDATE ON ai_agent_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_quality_score_on_review();

CREATE TRIGGER on_ai_agent_low_rating
  AFTER INSERT ON ai_agent_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_low_rating();

-- Session escalation + quality score
CREATE TRIGGER on_ai_agent_session_escalation
  AFTER UPDATE ON ai_agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_session_escalation();

CREATE TRIGGER on_session_completion_update_quality
  AFTER UPDATE ON ai_agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_quality_score_on_session_end();

-- Video stats update
CREATE TRIGGER trigger_update_ai_agent_video_stats
  AFTER UPDATE OF video_duration_seconds ON ai_agent_sessions
  FOR EACH ROW
  WHEN (NEW.video_duration_seconds > 0)
  EXECUTE FUNCTION update_ai_agent_video_stats();

-- Subscription updated_at
CREATE TRIGGER update_ai_agent_subscriptions_updated_at
  BEFORE UPDATE ON ai_agent_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 9: RECREATE RLS POLICIES
-- ============================================

-- ai_agent_links
ALTER TABLE ai_agent_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view links for accessible AI agents" ON ai_agent_links
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_links.agent_id
    AND (ai_agents.owner_id = auth.uid() OR ai_agents.status = 'published')
  ));

CREATE POLICY "Users can insert links for own AI agents" ON ai_agent_links
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_links.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update links for own AI agents" ON ai_agent_links
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_links.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete links for own AI agents" ON ai_agent_links
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_links.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

-- ai_agent_material_chunks
ALTER TABLE ai_agent_material_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage chunks" ON ai_agent_material_chunks
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Users can view chunks for own AI agents" ON ai_agent_material_chunks
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_material_chunks.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

-- ai_agent_materials
ALTER TABLE ai_agent_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view materials for own AI agents" ON ai_agent_materials
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_materials.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert materials for own AI agents" ON ai_agent_materials
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_materials.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update materials for own AI agents" ON ai_agent_materials
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_materials.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete materials for own AI agents" ON ai_agent_materials
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_materials.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

-- ai_agent_reviews
ALTER TABLE ai_agent_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews for published AI agents" ON ai_agent_reviews
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_reviews.agent_id
    AND (ai_agents.status = 'published' OR ai_agents.owner_id = auth.uid())
  ));

CREATE POLICY "Users can insert own reviews" ON ai_agent_reviews
  FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update own reviews" ON ai_agent_reviews
  FOR UPDATE
  USING (client_id = auth.uid());

-- ai_agent_sessions
ALTER TABLE ai_agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert sessions" ON ai_agent_sessions
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Users can view own sessions" ON ai_agent_sessions
  FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM ai_agents
      WHERE ai_agents.id = ai_agent_sessions.agent_id
      AND ai_agents.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sessions" ON ai_agent_sessions
  FOR UPDATE
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM ai_agents
      WHERE ai_agents.id = ai_agent_sessions.agent_id
      AND ai_agents.owner_id = auth.uid()
    )
  );

-- ai_agent_skills
ALTER TABLE ai_agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view skills for accessible AI agents" ON ai_agent_skills
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_skills.agent_id
    AND (ai_agents.owner_id = auth.uid() OR ai_agents.status = 'published')
  ));

CREATE POLICY "Users can insert skills for own AI agents" ON ai_agent_skills
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_skills.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update skills for own AI agents" ON ai_agent_skills
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_skills.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete skills for own AI agents" ON ai_agent_skills
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM ai_agents
    WHERE ai_agents.id = ai_agent_skills.agent_id
    AND ai_agents.owner_id = auth.uid()
  ));

-- ai_agent_subscriptions
ALTER TABLE ai_agent_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage subscriptions" ON ai_agent_subscriptions
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Users can view own subscriptions" ON ai_agent_subscriptions
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own subscriptions" ON ai_agent_subscriptions
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own subscriptions" ON ai_agent_subscriptions
  FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================
-- PHASE 10: BACKWARD-COMPAT WRAPPER FUNCTIONS
-- ============================================
-- Keep old function names as thin wrappers during transition

CREATE OR REPLACE FUNCTION check_ai_tutor_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$ SELECT check_ai_agent_limit(p_user_id); $$ LANGUAGE sql;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  old_table_count INTEGER;
  new_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'ai_tutor%';

  SELECT COUNT(*) INTO new_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'ai_agent%';

  IF old_table_count > 0 THEN
    RAISE WARNING 'Still have % ai_tutor_* tables remaining!', old_table_count;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 319: ai_tutor → ai_agent';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Old ai_tutor_* tables remaining: %', old_table_count;
  RAISE NOTICE 'New ai_agent_* tables: %', new_table_count;
  RAISE NOTICE '========================================';
END $$;

COMMIT;
