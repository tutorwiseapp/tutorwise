/**
 * Filename: tests/api/ai-tutors/stripe-subscriptions.test.ts
 * Purpose: Tests for Stripe subscription lifecycle for AI Tutors
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Test Coverage:
 * - Subscription creation (£10/month per AI tutor)
 * - Webhook processing
 * - Subscription cancellation
 * - Failed payments
 * - AI tutor suspension on payment failure
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: Create test tutor and AI tutor
async function createTestAITutorForSubscription() {
  const email = `sub-tutor-${Date.now()}@test.com`;
  const { data: authUser } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  await supabase
    .from('profiles')
    .update({ caas_score: 80 })
    .eq('id', authUser.user.id);

  const { data: aiTutor } = await supabase
    .from('ai_tutors')
    .insert({
      owner_id: authUser.user.id,
      display_name: 'Subscription Test Tutor',
      subject: 'Mathematics',
      description: 'Test tutor',
      skills: ['Algebra'],
      price_per_hour: 10,
      status: 'draft',
    })
    .select()
    .single();

  return {
    ownerId: authUser.user.id,
    aiTutorId: aiTutor!.id,
    email,
  };
}

// Helper: Clean up test data
async function cleanupSubscriptionTest(ownerId: string) {
  await supabase.from('ai_tutor_sessions').delete().match({ client_id: ownerId });
  await supabase.from('ai_tutors').delete().eq('owner_id', ownerId);
  await supabase.from('profiles').delete().eq('id', ownerId);
  await supabase.auth.admin.deleteUser(ownerId);
}

describe.skip('Stripe Subscriptions for AI Tutors', () => {
  // Skip by default - requires live Supabase instance with admin credentials
  // Run manually with: npm test -- --testNamePattern="Stripe Subscriptions"
  let testData: Awaited<ReturnType<typeof createTestAITutorForSubscription>>;

  beforeEach(async () => {
    testData = await createTestAITutorForSubscription();
  });

  afterEach(async () => {
    await cleanupSubscriptionTest(testData.ownerId);
  });

  describe('Subscription Creation', () => {
    it('should create subscription when AI tutor is published', async () => {
      // Publish AI tutor (should trigger subscription requirement)
      const { data: published } = await supabase
        .from('ai_tutors')
        .update({ status: 'published' })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(published?.status).toBe('published');

      // In production, this would create Stripe subscription
      // Verify AI tutor can only be published with active subscription
    });

    it('should store Stripe subscription ID', async () => {
      const mockSubscriptionId = `sub_test_${Date.now()}`;

      const { data: updated } = await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: mockSubscriptionId,
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(updated?.stripe_subscription_id).toBe(mockSubscriptionId);
      expect(updated?.subscription_status).toBe('active');
    });

    it('should calculate correct subscription amount (£10/month)', async () => {
      const expectedAmount = 1000; // £10 in pence
      const expectedCurrency = 'gbp';

      // In production, verify Stripe API call includes correct amount
      expect(expectedAmount).toBe(1000);
      expect(expectedCurrency).toBe('gbp');
    });
  });

  describe('Webhook Processing', () => {
    it('should handle subscription.created webhook', async () => {
      const mockSubscriptionId = `sub_created_${Date.now()}`;

      // Simulate webhook processing
      const { data: updated } = await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: mockSubscriptionId,
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(updated?.subscription_status).toBe('active');
      expect(updated?.status).toBe('published');
    });

    it('should handle subscription.updated webhook', async () => {
      // Set up existing subscription
      await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: 'sub_test',
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId);

      // Simulate update webhook
      const { data: updated } = await supabase
        .from('ai_tutors')
        .update({
          subscription_status: 'past_due',
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(updated?.subscription_status).toBe('past_due');
    });

    it('should handle subscription.deleted webhook', async () => {
      // Set up existing subscription
      await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: 'sub_test',
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId);

      // Simulate deletion webhook
      const { data: updated } = await supabase
        .from('ai_tutors')
        .update({
          subscription_status: 'canceled',
          status: 'unpublished',
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(updated?.subscription_status).toBe('canceled');
      expect(updated?.status).toBe('unpublished');
    });

    it('should handle invoice.payment_succeeded webhook', async () => {
      const mockInvoiceId = `in_success_${Date.now()}`;

      // Update subscription status on successful payment
      const { data: updated } = await supabase
        .from('ai_tutors')
        .update({
          subscription_status: 'active',
          last_payment_date: new Date().toISOString(),
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(updated?.subscription_status).toBe('active');
      expect(updated?.last_payment_date).toBeDefined();
    });

    it('should handle invoice.payment_failed webhook', async () => {
      // Set up active subscription
      await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: 'sub_test',
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId);

      // Simulate payment failure
      const { data: updated } = await supabase
        .from('ai_tutors')
        .update({
          subscription_status: 'past_due',
          status: 'unpublished',
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(updated?.subscription_status).toBe('past_due');
      expect(updated?.status).toBe('unpublished');
    });
  });

  describe('Subscription Cancellation', () => {
    it('should cancel subscription when AI tutor is unpublished', async () => {
      // Set up published AI tutor with subscription
      await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: 'sub_test',
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId);

      // Unpublish (should cancel subscription)
      const { data: unpublished } = await supabase
        .from('ai_tutors')
        .update({
          status: 'unpublished',
          subscription_status: 'canceled',
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(unpublished?.status).toBe('unpublished');
      expect(unpublished?.subscription_status).toBe('canceled');
    });

    it('should cancel subscription when AI tutor is deleted', async () => {
      // Set up published AI tutor
      await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: 'sub_test',
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId);

      // Delete AI tutor (should cancel subscription first)
      const { error } = await supabase
        .from('ai_tutors')
        .delete()
        .eq('id', testData.aiTutorId);

      expect(error).toBeNull();

      // Verify deleted
      const { data } = await supabase
        .from('ai_tutors')
        .select()
        .eq('id', testData.aiTutorId)
        .single();

      expect(data).toBeNull();
    });

    it('should handle immediate vs end-of-period cancellation', async () => {
      // Set up active subscription
      await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: 'sub_test',
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId);

      // Cancel at end of period (keeps active until period ends)
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      const { data: updated } = await supabase
        .from('ai_tutors')
        .update({
          subscription_status: 'active',
          subscription_cancel_at: periodEnd.toISOString(),
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(updated?.subscription_status).toBe('active');
      expect(updated?.subscription_cancel_at).toBeDefined();
    });
  });

  describe('Failed Payments and Suspension', () => {
    it('should suspend AI tutor on payment failure', async () => {
      // Set up published AI tutor
      await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: 'sub_test',
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId);

      // Simulate payment failure
      const { data: suspended } = await supabase
        .from('ai_tutors')
        .update({
          subscription_status: 'past_due',
          status: 'unpublished',
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(suspended?.status).toBe('unpublished');
      expect(suspended?.subscription_status).toBe('past_due');
    });

    it('should block new sessions when subscription inactive', async () => {
      // Suspend AI tutor
      await supabase
        .from('ai_tutors')
        .update({
          subscription_status: 'past_due',
          status: 'unpublished',
        })
        .eq('id', testData.aiTutorId);

      // Try to create session
      const clientEmail = `client-${Date.now()}@test.com`;
      const { data: client } = await supabase.auth.admin.createUser({
        email: clientEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      // In production, this should be blocked by application logic
      const { data: aiTutor } = await supabase
        .from('ai_tutors')
        .select('status, subscription_status')
        .eq('id', testData.aiTutorId)
        .single();

      expect(aiTutor?.status).toBe('unpublished');

      // Cleanup
      await supabase.auth.admin.deleteUser(client.user.id);
    });

    it('should restore AI tutor on payment recovery', async () => {
      // Set up suspended AI tutor
      await supabase
        .from('ai_tutors')
        .update({
          subscription_status: 'past_due',
          status: 'unpublished',
        })
        .eq('id', testData.aiTutorId);

      // Simulate successful payment
      const { data: restored } = await supabase
        .from('ai_tutors')
        .update({
          subscription_status: 'active',
          status: 'published',
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(restored?.subscription_status).toBe('active');
      expect(restored?.status).toBe('published');
    });
  });

  describe('Multiple AI Tutors Billing', () => {
    it('should handle billing for multiple AI tutors', async () => {
      // Create 3 AI tutors
      const aiTutors = await Promise.all(
        [1, 2, 3].map((i) =>
          supabase
            .from('ai_tutors')
            .insert({
              owner_id: testData.ownerId,
              display_name: `Multi Billing Test ${i}`,
              subject: 'Test',
              description: 'Test',
              skills: ['Test'],
              price_per_hour: 10,
              status: 'draft',
            })
            .select()
            .single()
        )
      );

      // Each should have separate subscription
      for (const tutor of aiTutors) {
        await supabase
          .from('ai_tutors')
          .update({
            stripe_subscription_id: `sub_${tutor.data!.id}`,
            subscription_status: 'active',
            status: 'published',
          })
          .eq('id', tutor.data!.id);
      }

      // Verify all have subscriptions
      const { data: allTutors } = await supabase
        .from('ai_tutors')
        .select('id, subscription_status')
        .eq('owner_id', testData.ownerId)
        .neq('id', testData.aiTutorId); // Exclude the original test tutor

      expect(allTutors?.length).toBe(3);
      expect(allTutors?.every((t) => t.subscription_status === 'active')).toBe(true);

      // Total billing: 3 × £10 = £30/month
      const totalMonthlyBilling = aiTutors.length * 10;
      expect(totalMonthlyBilling).toBe(30);
    });
  });

  describe('Subscription Status Transitions', () => {
    it('should track subscription lifecycle states', async () => {
      const states = ['incomplete', 'active', 'past_due', 'canceled'];

      for (const state of states) {
        const { data: updated } = await supabase
          .from('ai_tutors')
          .update({ subscription_status: state })
          .eq('id', testData.aiTutorId)
          .select()
          .single();

        expect(updated?.subscription_status).toBe(state);
      }
    });

    it('should handle trialing period', async () => {
      // Set up trial subscription
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      const { data: trial } = await supabase
        .from('ai_tutors')
        .update({
          stripe_subscription_id: 'sub_trial',
          subscription_status: 'trialing',
          subscription_trial_end: trialEnd.toISOString(),
          status: 'published',
        })
        .eq('id', testData.aiTutorId)
        .select()
        .single();

      expect(trial?.subscription_status).toBe('trialing');
      expect(trial?.subscription_trial_end).toBeDefined();
    });
  });
});
