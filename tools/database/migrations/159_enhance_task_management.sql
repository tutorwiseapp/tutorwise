-- =====================================================
-- Migration 159: Enhance Task Management System
-- Created: 2026-01-03
-- Purpose: Add platform-specific categories, entity relationships, and file attachments
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting Migration 159: Enhance Task Management System';

  -- =====================================================
  -- PART 1: Update Task Categories (Platform-Specific)
  -- =====================================================

  RAISE NOTICE '  → Updating task categories to be platform-specific...';

  -- Drop old constraint
  ALTER TABLE public.org_tasks DROP CONSTRAINT IF EXISTS check_task_category;

  -- Add new platform-aligned categories
  ALTER TABLE public.org_tasks ADD CONSTRAINT check_task_category CHECK (
    category IN (
      'client_issue',      -- Parent complaints, requests, issues
      'tutor_issue',       -- Tutor problems, performance, concerns
      'booking_issue',     -- Scheduling conflicts, cancellations
      'payment_issue',     -- Payment disputes, refunds, billing
      'safeguarding',      -- DBS checks, safety concerns, child protection
      'admin',             -- General administrative work
      'other'              -- Miscellaneous tasks
    )
  );

  COMMENT ON CONSTRAINT check_task_category ON public.org_tasks IS 'Platform-specific task categories aligned to tutoring/education context';

  -- =====================================================
  -- PART 2: Add Platform Entity Relationships
  -- =====================================================

  RAISE NOTICE '  → Adding platform entity relationship columns...';

  -- Bookings & Listings
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL;

  -- User Types (tutor, agent, student)
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

  -- Referrals & Transactions
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL;
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

  -- Reviews (using actual table names: listing_reviews, profile_reviews)
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS listing_review_id UUID REFERENCES public.listing_reviews(id) ON DELETE SET NULL;
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS profile_review_id UUID REFERENCES public.profile_reviews(id) ON DELETE SET NULL;

  -- Wiselists
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS wiselist_id UUID REFERENCES public.wiselists(id) ON DELETE SET NULL;

  -- Communication & Network
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS chat_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;
  ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.profile_graph(id) ON DELETE SET NULL;

  -- Financial (tables may not exist yet - will add when created)
  -- ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL;
  -- ALTER TABLE public.org_tasks ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL;

  -- =====================================================
  -- PART 3: Add Indexes for Performance
  -- =====================================================

  RAISE NOTICE '  → Creating indexes for entity relationships...';

  CREATE INDEX IF NOT EXISTS idx_org_tasks_booking ON public.org_tasks(booking_id) WHERE booking_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_listing ON public.org_tasks(listing_id) WHERE listing_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_tutor ON public.org_tasks(tutor_id) WHERE tutor_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_agent ON public.org_tasks(agent_id) WHERE agent_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_student ON public.org_tasks(student_id) WHERE student_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_referral ON public.org_tasks(referral_id) WHERE referral_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_transaction ON public.org_tasks(transaction_id) WHERE transaction_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_listing_review ON public.org_tasks(listing_review_id) WHERE listing_review_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_profile_review ON public.org_tasks(profile_review_id) WHERE profile_review_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_wiselist ON public.org_tasks(wiselist_id) WHERE wiselist_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_chat_message ON public.org_tasks(chat_message_id) WHERE chat_message_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_org_tasks_connection ON public.org_tasks(connection_id) WHERE connection_id IS NOT NULL;

  -- =====================================================
  -- PART 4: Add File Attachments Support
  -- =====================================================

  RAISE NOTICE '  → Creating file attachments table...';

  CREATE TABLE IF NOT EXISTS public.org_task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.org_tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT,
    storage_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_file_size CHECK (file_size > 0 AND file_size <= 10485760) -- 10MB limit
  );

  CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.org_task_attachments(task_id);
  CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON public.org_task_attachments(uploaded_by) WHERE uploaded_by IS NOT NULL;

  COMMENT ON TABLE public.org_task_attachments IS 'File attachments for organisation tasks (screenshots, documents, evidence)';
  COMMENT ON COLUMN public.org_task_attachments.storage_path IS 'Path in Supabase Storage: org-task-attachments/{org_id}/{task_id}/{file_id}-{filename}';
  COMMENT ON COLUMN public.org_task_attachments.file_size IS 'File size in bytes (max 10MB)';

  -- =====================================================
  -- PART 5: Add Column Comments for Documentation
  -- =====================================================

  RAISE NOTICE '  → Adding documentation comments...';

  -- Entity relationship comments
  COMMENT ON COLUMN public.org_tasks.booking_id IS 'Related booking (scheduling conflicts, cancellations, issues)';
  COMMENT ON COLUMN public.org_tasks.listing_id IS 'Related listing (updates, inaccuracies, complaints)';
  COMMENT ON COLUMN public.org_tasks.tutor_id IS 'Related tutor (performance issues, DBS checks, concerns)';
  COMMENT ON COLUMN public.org_tasks.agent_id IS 'Related agent (performance, onboarding, commission issues)';
  COMMENT ON COLUMN public.org_tasks.student_id IS 'Related student (safeguarding concerns, progress checks)';
  COMMENT ON COLUMN public.org_tasks.referral_id IS 'Related referral (commission disputes, follow-ups)';
  COMMENT ON COLUMN public.org_tasks.transaction_id IS 'Related transaction (payment failures, refund requests)';
  COMMENT ON COLUMN public.org_tasks.listing_review_id IS 'Related listing review (disputes, inappropriate content, moderation)';
  COMMENT ON COLUMN public.org_tasks.profile_review_id IS 'Related profile review (disputes, inappropriate content, moderation)';
  COMMENT ON COLUMN public.org_tasks.wiselist_id IS 'Related wiselist (moderation, updates, spam)';
  COMMENT ON COLUMN public.org_tasks.chat_message_id IS 'Related chat message (harassment complaints, issues)';
  COMMENT ON COLUMN public.org_tasks.connection_id IS 'Related network connection (spam reports, suspicious activity)';

  -- Category comments
  COMMENT ON COLUMN public.org_tasks.category IS 'Task category: client_issue, tutor_issue, booking_issue, payment_issue, safeguarding, admin, other';

  -- =====================================================
  -- PART 6: RLS Policies for Attachments
  -- =====================================================

  RAISE NOTICE '  → Setting up RLS policies for attachments...';

  ALTER TABLE public.org_task_attachments ENABLE ROW LEVEL SECURITY;

  -- Policy: Organisation owners/admins can view attachments
  CREATE POLICY "Organisation owners/admins can view attachments"
    ON public.org_task_attachments FOR SELECT
    USING (
      task_id IN (
        SELECT id FROM org_tasks
        WHERE organisation_id IN (
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
      )
    );

  -- Policy: Organisation owners/admins can upload attachments
  CREATE POLICY "Organisation owners/admins can upload attachments"
    ON public.org_task_attachments FOR INSERT
    WITH CHECK (
      task_id IN (
        SELECT id FROM org_tasks
        WHERE organisation_id IN (
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
      )
    );

  -- Policy: Organisation owners/admins can delete attachments
  CREATE POLICY "Organisation owners/admins can delete attachments"
    ON public.org_task_attachments FOR DELETE
    USING (
      task_id IN (
        SELECT id FROM org_tasks
        WHERE organisation_id IN (
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
      )
    );

  -- =====================================================
  -- PART 7: Summary
  -- =====================================================

  RAISE NOTICE '  ✓ Updated task categories to platform-specific values';
  RAISE NOTICE '  ✓ Added 12 entity relationship columns (booking, listing, tutor, agent, student, referral, transaction, listing_review, profile_review, wiselist, chat_message, connection)';
  RAISE NOTICE '  ✓ Created indexes for all entity relationships';
  RAISE NOTICE '  ✓ Created org_task_attachments table with 10MB file limit';
  RAISE NOTICE '  ✓ Configured RLS policies for file attachments';
  RAISE NOTICE '  ✓ Added documentation comments for all new columns';
  RAISE NOTICE 'Migration 159 completed successfully!';

END $$;
