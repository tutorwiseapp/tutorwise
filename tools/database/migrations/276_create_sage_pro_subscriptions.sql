-- ===================================================================
-- Migration: 276_create_sage_pro_subscriptions.sql
-- Purpose: Add Stripe subscription tracking for Sage AI Tutor Pro tier
-- Version: v1.0
-- Date: 2026-02-22
-- ===================================================================
-- This migration adds subscription tables for Sage Pro (£10/month):
-- - sage_pro_subscriptions: User subscription tracking
-- - sage_usage_log: Question usage tracking for billing
-- - sage_storage_files: File upload tracking for storage quota
--
-- Features:
-- - 14-day free trial (no credit card required)
-- - 5,000 questions/month quota
-- - 1 GB storage quota
-- - Subscription states: trialing, active, past_due, canceled
-- ===================================================================

-- ===================================================================
-- SECTION 1: CREATE SAGE PRO SUBSCRIPTIONS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.sage_pro_subscriptions (
  -- Primary key is user_id (one subscription per user)
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration fields
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Subscription status
  -- trialing: In 14-day free trial (no payment required yet)
  -- active: Paying customer with valid payment method
  -- past_due: Payment failed, grace period (3 days)
  -- canceled: User canceled subscription (access until period end)
  -- incomplete: Subscription created but payment incomplete
  -- incomplete_expired: Payment incomplete and trial expired
  -- unpaid: Payment failed after grace period (no access)
  status TEXT NOT NULL CHECK (status IN (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'unpaid'
  )) DEFAULT 'trialing',

  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Billing cycle
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Cancellation tracking
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Sage Pro-specific: Usage tracking
  questions_used_this_month INTEGER DEFAULT 0,
  questions_quota INTEGER DEFAULT 5000,
  storage_used_bytes BIGINT DEFAULT 0,
  storage_quota_bytes BIGINT DEFAULT 1073741824, -- 1 GB in bytes

  -- Reset tracking
  last_quota_reset TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.sage_pro_subscriptions IS 'v1.0: Stripe subscriptions for Sage AI Tutor Pro tier (£10/month, 5000 questions, 1GB storage)';

-- Add column comments
COMMENT ON COLUMN public.sage_pro_subscriptions.user_id IS 'FK to auth.users (one subscription per user)';
COMMENT ON COLUMN public.sage_pro_subscriptions.stripe_subscription_id IS 'Stripe subscription ID (sub_xxxxx)';
COMMENT ON COLUMN public.sage_pro_subscriptions.stripe_customer_id IS 'Stripe customer ID (cus_xxxxx)';
COMMENT ON COLUMN public.sage_pro_subscriptions.status IS 'Subscription status synced from Stripe';
COMMENT ON COLUMN public.sage_pro_subscriptions.trial_start IS 'When 14-day trial started';
COMMENT ON COLUMN public.sage_pro_subscriptions.trial_end IS 'When 14-day trial ends (user must add payment)';
COMMENT ON COLUMN public.sage_pro_subscriptions.questions_used_this_month IS 'Questions asked this month (resets on 1st)';
COMMENT ON COLUMN public.sage_pro_subscriptions.questions_quota IS 'Monthly question limit (5000 for Pro, 10 for free)';
COMMENT ON COLUMN public.sage_pro_subscriptions.storage_used_bytes IS 'Total storage used for uploaded files';
COMMENT ON COLUMN public.sage_pro_subscriptions.storage_quota_bytes IS 'Storage limit (1GB for Pro, 0 for free)';
COMMENT ON COLUMN public.sage_pro_subscriptions.last_quota_reset IS 'Last time question quota was reset';

-- ===================================================================
-- SECTION 2: CREATE SAGE USAGE LOG TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.sage_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,

  -- Usage details
  questions_count INTEGER DEFAULT 1,
  tokens_used INTEGER,
  model_used TEXT, -- 'gemini-1.5-flash', 'gemini-1.5-pro', etc.

  -- Cost tracking (for analytics)
  estimated_cost_usd DECIMAL(10, 6),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.sage_usage_log IS 'v1.0: Track Sage question usage for billing and analytics';

-- Add column comments
COMMENT ON COLUMN public.sage_usage_log.user_id IS 'User who asked the question';
COMMENT ON COLUMN public.sage_usage_log.session_id IS 'Sage session ID';
COMMENT ON COLUMN public.sage_usage_log.questions_count IS 'Number of questions in this interaction (usually 1)';
COMMENT ON COLUMN public.sage_usage_log.tokens_used IS 'Total tokens consumed (input + output)';
COMMENT ON COLUMN public.sage_usage_log.model_used IS 'AI model used for response';
COMMENT ON COLUMN public.sage_usage_log.estimated_cost_usd IS 'Estimated API cost in USD';

-- ===================================================================
-- SECTION 3: CREATE SAGE STORAGE FILES TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.sage_storage_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File details
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'audio', 'pdf'
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path

  -- OCR/Transcription results (cached)
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed'

  -- Associated session
  session_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.sage_storage_files IS 'v1.0: Track uploaded files for Sage Pro storage quota';

-- Add column comments
COMMENT ON COLUMN public.sage_storage_files.user_id IS 'User who uploaded the file';
COMMENT ON COLUMN public.sage_storage_files.file_type IS 'File type: image, audio, or pdf';
COMMENT ON COLUMN public.sage_storage_files.file_size_bytes IS 'File size in bytes (counts toward quota)';
COMMENT ON COLUMN public.sage_storage_files.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN public.sage_storage_files.extracted_text IS 'Cached OCR/transcription result';
COMMENT ON COLUMN public.sage_storage_files.processing_status IS 'Processing state: pending, processed, failed';
COMMENT ON COLUMN public.sage_storage_files.session_id IS 'Sage session ID where file was used';

-- ===================================================================
-- SECTION 4: CREATE INDEXES
-- ===================================================================

-- Indexes for sage_pro_subscriptions
CREATE INDEX idx_sage_pro_subscriptions_stripe_id
  ON public.sage_pro_subscriptions(stripe_subscription_id);

CREATE INDEX idx_sage_pro_subscriptions_status
  ON public.sage_pro_subscriptions(status);

CREATE INDEX idx_sage_pro_subscriptions_trial_end
  ON public.sage_pro_subscriptions(trial_end)
  WHERE trial_end IS NOT NULL;

CREATE INDEX idx_sage_pro_subscriptions_period_end
  ON public.sage_pro_subscriptions(current_period_end);

-- Indexes for sage_usage_log
CREATE INDEX idx_sage_usage_log_user_id
  ON public.sage_usage_log(user_id);

CREATE INDEX idx_sage_usage_log_created_at
  ON public.sage_usage_log(created_at);

CREATE INDEX idx_sage_usage_log_user_month
  ON public.sage_usage_log(user_id, created_at);

-- Indexes for sage_storage_files
CREATE INDEX idx_sage_storage_user_id
  ON public.sage_storage_files(user_id);

CREATE INDEX idx_sage_storage_created_at
  ON public.sage_storage_files(created_at);

CREATE INDEX idx_sage_storage_size
  ON public.sage_storage_files(file_size_bytes);

-- ===================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS for all tables
ALTER TABLE public.sage_pro_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sage_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sage_storage_files ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- RLS Policies: sage_pro_subscriptions
-- ===================================================================

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view own Sage Pro subscription"
  ON public.sage_pro_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Service role can insert subscriptions (via webhook)
CREATE POLICY "Service role can insert Sage Pro subscriptions"
  ON public.sage_pro_subscriptions FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
    OR user_id = auth.uid()
  );

-- Policy: Service role can update subscriptions (via webhook)
CREATE POLICY "Service role can update Sage Pro subscriptions"
  ON public.sage_pro_subscriptions FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR user_id = auth.uid()
  );

-- Policy: Users can delete their own subscription (cancel)
CREATE POLICY "Users can delete own Sage Pro subscription"
  ON public.sage_pro_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ===================================================================
-- RLS Policies: sage_usage_log
-- ===================================================================

-- Policy: Users can view their own usage logs
CREATE POLICY "Users can view own Sage usage logs"
  ON public.sage_usage_log FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Service role can insert usage logs
CREATE POLICY "Service role can insert Sage usage logs"
  ON public.sage_usage_log FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
    OR user_id = auth.uid()
  );

-- ===================================================================
-- RLS Policies: sage_storage_files
-- ===================================================================

-- Policy: Users can view their own files
CREATE POLICY "Users can view own Sage storage files"
  ON public.sage_storage_files FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own files
CREATE POLICY "Users can insert own Sage storage files"
  ON public.sage_storage_files FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own files
CREATE POLICY "Users can update own Sage storage files"
  ON public.sage_storage_files FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own Sage storage files"
  ON public.sage_storage_files FOR DELETE
  USING (user_id = auth.uid());

-- ===================================================================
-- SECTION 6: TRIGGERS
-- ===================================================================

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_sage_pro_subscriptions_updated_at
  BEFORE UPDATE ON public.sage_pro_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================================
-- SECTION 7: HELPER FUNCTIONS
-- ===================================================================

-- Function to check if user has active Pro subscription
CREATE OR REPLACE FUNCTION public.sage_has_active_pro_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sage_pro_subscriptions
    WHERE user_id = p_user_id
      AND status IN ('trialing', 'active')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sage_has_active_pro_subscription IS 'v1.0: Check if user has active or trialing Sage Pro subscription';

-- Function to get user's subscription status
CREATE OR REPLACE FUNCTION public.get_sage_subscription_status(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  sub_status TEXT;
BEGIN
  SELECT status INTO sub_status
  FROM public.sage_pro_subscriptions
  WHERE user_id = p_user_id;

  RETURN COALESCE(sub_status, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_sage_subscription_status IS 'v1.0: Get subscription status (trialing, active, past_due, canceled, none)';

-- Function to check if user has quota remaining
CREATE OR REPLACE FUNCTION public.sage_check_quota(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  quota INTEGER,
  used INTEGER
) AS $$
DECLARE
  v_subscription RECORD;
  v_quota INTEGER;
  v_used INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Get subscription details
  SELECT * INTO v_subscription
  FROM public.sage_pro_subscriptions
  WHERE user_id = p_user_id;

  -- Determine quota (Pro: 5000, Free: 10)
  IF v_subscription.user_id IS NOT NULL AND v_subscription.status IN ('trialing', 'active') THEN
    v_quota := v_subscription.questions_quota;
    v_used := v_subscription.questions_used_this_month;
  ELSE
    -- Free tier
    v_quota := 10;
    -- Count questions from usage log this month
    SELECT COALESCE(SUM(questions_count), 0)::INTEGER INTO v_used
    FROM public.sage_usage_log
    WHERE user_id = p_user_id
      AND created_at >= date_trunc('month', NOW());
  END IF;

  -- Allow 10% overage grace before hard block
  v_allowed := v_used < v_quota OR v_used < (v_quota * 1.1);

  RETURN QUERY SELECT
    v_allowed,
    GREATEST(0, v_quota - v_used),
    v_quota,
    v_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sage_check_quota IS 'v1.0: Check if user has question quota remaining (10% overage grace)';

-- Function to increment usage count
CREATE OR REPLACE FUNCTION public.sage_increment_usage(
  p_user_id UUID,
  p_session_id TEXT,
  p_questions_count INTEGER DEFAULT 1,
  p_tokens_used INTEGER DEFAULT NULL,
  p_model_used TEXT DEFAULT 'gemini-1.5-flash',
  p_estimated_cost_usd DECIMAL(10, 6) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Log usage
  INSERT INTO public.sage_usage_log (
    user_id,
    session_id,
    questions_count,
    tokens_used,
    model_used,
    estimated_cost_usd
  ) VALUES (
    p_user_id,
    p_session_id,
    p_questions_count,
    p_tokens_used,
    p_model_used,
    p_estimated_cost_usd
  );

  -- Update subscription counter if Pro user
  UPDATE public.sage_pro_subscriptions
  SET questions_used_this_month = questions_used_this_month + p_questions_count
  WHERE user_id = p_user_id
    AND status IN ('trialing', 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sage_increment_usage IS 'v1.0: Increment question usage count and log entry';

-- Function to update storage usage
CREATE OR REPLACE FUNCTION public.sage_update_storage_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.sage_pro_subscriptions
  SET storage_used_bytes = (
    SELECT COALESCE(SUM(file_size_bytes), 0)
    FROM public.sage_storage_files
    WHERE user_id = p_user_id
  )
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sage_update_storage_usage IS 'v1.0: Recalculate total storage usage for user';

-- Function to check storage quota
CREATE OR REPLACE FUNCTION public.sage_check_storage_quota(
  p_user_id UUID,
  p_new_file_size BIGINT
) RETURNS TABLE (
  allowed BOOLEAN,
  remaining BIGINT,
  quota BIGINT,
  used BIGINT
) AS $$
DECLARE
  v_subscription RECORD;
  v_quota BIGINT;
  v_used BIGINT;
  v_allowed BOOLEAN;
BEGIN
  -- Get subscription details
  SELECT * INTO v_subscription
  FROM public.sage_pro_subscriptions
  WHERE user_id = p_user_id;

  -- Determine quota (Pro: 1GB, Free: 0)
  IF v_subscription.user_id IS NOT NULL AND v_subscription.status IN ('trialing', 'active') THEN
    v_quota := v_subscription.storage_quota_bytes;
    v_used := v_subscription.storage_used_bytes;
  ELSE
    -- Free tier has no storage
    v_quota := 0;
    v_used := 0;
  END IF;

  -- Check if new file would exceed quota
  v_allowed := (v_used + p_new_file_size) <= v_quota;

  RETURN QUERY SELECT
    v_allowed,
    GREATEST(0, v_quota - v_used),
    v_quota,
    v_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sage_check_storage_quota IS 'v1.0: Check if user can upload file of given size';

-- ===================================================================
-- SECTION 8: VALIDATION
-- ===================================================================

-- Verify tables were created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'sage_pro_subscriptions'
  ) THEN
    RAISE EXCEPTION 'Table sage_pro_subscriptions was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'sage_usage_log'
  ) THEN
    RAISE EXCEPTION 'Table sage_usage_log was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'sage_storage_files'
  ) THEN
    RAISE EXCEPTION 'Table sage_storage_files was not created successfully';
  END IF;

  RAISE NOTICE 'Migration 276_create_sage_pro_subscriptions completed successfully';
  RAISE NOTICE '✓ Created sage_pro_subscriptions table';
  RAISE NOTICE '✓ Created sage_usage_log table';
  RAISE NOTICE '✓ Created sage_storage_files table';
  RAISE NOTICE '✓ Created indexes and RLS policies';
  RAISE NOTICE '✓ Created helper functions';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
