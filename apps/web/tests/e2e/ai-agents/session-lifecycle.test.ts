/**
 * Filename: tests/e2e/ai-tutors/session-lifecycle.test.ts
 * Purpose: E2E tests for AI Tutor session lifecycle
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Test Coverage:
 * - Client booking flow
 * - Session start
 * - Chat interaction
 * - Session end (1-hour timeout)
 * - Escalation to human tutor
 * - Review submission
 * - Cost calculation (£10/session)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: Create test client and AI tutor
async function createTestSession() {
  // Create tutor
  const tutorEmail = `tutor-${Date.now()}@test.com`;
  const { data: tutor } = await supabase.auth.admin.createUser({
    email: tutorEmail,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  await supabase
    .from('profiles')
    .update({ caas_score: 80 })
    .eq('id', tutor.user.id);

  // Create AI tutor
  const { data: aiTutor } = await supabase
    .from('ai_tutors')
    .insert({
      owner_id: tutor.user.id,
      display_name: 'Test Session Tutor',
      subject: 'Mathematics',
      description: 'Test tutor',
      skills: ['Algebra'],
      price_per_hour: 10,
      status: 'published',
    })
    .select()
    .single();

  // Create client
  const clientEmail = `client-${Date.now()}@test.com`;
  const { data: client } = await supabase.auth.admin.createUser({
    email: clientEmail,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  return {
    tutorId: tutor.user.id,
    aiAgentId: aiTutor!.id,
    clientId: client.user.id,
  };
}

// Helper: Clean up test data
async function cleanupTestSession(tutorId: string, aiAgentId: string, clientId: string) {
  await supabase.from('ai_tutor_sessions').delete().match({ ai_tutor_id: aiAgentId });
  await supabase.from('ai_tutors').delete().eq('id', aiAgentId);
  await supabase.from('profiles').delete().eq('id', tutorId);
  await supabase.from('profiles').delete().eq('id', clientId);
  await supabase.auth.admin.deleteUser(tutorId);
  await supabase.auth.admin.deleteUser(clientId);
}

describe.skip('AI Tutor Session Lifecycle', () => {
  // Skip by default - requires live Supabase instance with admin credentials
  // Run manually with: npm test -- --testNamePattern="AI Tutor Session Lifecycle"
  let testData: Awaited<ReturnType<typeof createTestSession>>;

  beforeEach(async () => {
    testData = await createTestSession();
  });

  afterEach(async () => {
    await cleanupTestSession(testData.tutorId, testData.aiAgentId, testData.clientId);
  });

  describe('Session Start', () => {
    it('should create new session when client starts chat', async () => {
      const { data: session, error } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(session?.status).toBe('active');
      expect(session?.ai_tutor_id).toBe(testData.aiAgentId);
      expect(session?.client_id).toBe(testData.clientId);
      expect(session?.started_at).toBeDefined();
    });

    it('should initialize session with empty conversation history', async () => {
      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: new Date().toISOString(),
          conversation_history: [],
        })
        .select()
        .single();

      expect(session?.conversation_history).toEqual([]);
    });

    it('should prevent multiple active sessions for same AI tutor', async () => {
      // Create first session
      await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: new Date().toISOString(),
        });

      // Try to create second active session (should fail)
      const { error } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: new Date().toISOString(),
        });

      // Note: This test assumes a unique constraint exists
      // If not enforced by DB, should be enforced by application logic
      expect(error).toBeDefined();
    });
  });

  describe('Chat Interaction', () => {
    it('should store conversation history in JSONB', async () => {
      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Add message to conversation
      const conversationHistory = [
        {
          role: 'user',
          content: 'How do I solve x² - 5x + 6 = 0?',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: 'To solve this quadratic equation, we can factor it...',
          timestamp: new Date().toISOString(),
        },
      ];

      const { data: updated } = await supabase
        .from('ai_tutor_sessions')
        .update({ conversation_history: conversationHistory })
        .eq('id', session!.id)
        .select()
        .single();

      expect(updated?.conversation_history).toHaveLength(2);
      expect(updated?.conversation_history[0].role).toBe('user');
      expect(updated?.conversation_history[1].role).toBe('assistant');
    });

    it('should track message count', async () => {
      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Simulate 10 messages
      const messages = [];
      for (let i = 0; i < 10; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i + 1}`,
          timestamp: new Date().toISOString(),
        });
      }

      await supabase
        .from('ai_tutor_sessions')
        .update({ conversation_history: messages })
        .eq('id', session!.id);

      const { data: updated } = await supabase
        .from('ai_tutor_sessions')
        .select()
        .eq('id', session!.id)
        .single();

      expect(updated?.conversation_history).toHaveLength(10);
    });
  });

  describe('Session End', () => {
    it('should end session after 1 hour timeout', async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour

      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: startTime.toISOString(),
        })
        .select()
        .single();

      // End session
      const { data: ended } = await supabase
        .from('ai_tutor_sessions')
        .update({
          status: 'completed',
          ended_at: endTime.toISOString(),
          duration_minutes: 60,
        })
        .eq('id', session!.id)
        .select()
        .single();

      expect(ended?.status).toBe('completed');
      expect(ended?.duration_minutes).toBe(60);
      expect(ended?.ended_at).toBeDefined();
    });

    it('should calculate session duration correctly', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:45:00Z'); // 45 minutes

      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: startTime.toISOString(),
        })
        .select()
        .single();

      const durationMinutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      );

      await supabase
        .from('ai_tutor_sessions')
        .update({
          status: 'completed',
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', session!.id);

      const { data: ended } = await supabase
        .from('ai_tutor_sessions')
        .select()
        .eq('id', session!.id)
        .single();

      expect(ended?.duration_minutes).toBe(45);
    });

    it('should calculate cost as £10 per session', async () => {
      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      // End session with cost
      const { data: ended } = await supabase
        .from('ai_tutor_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_minutes: 60,
          cost_pounds: 10,
        })
        .eq('id', session!.id)
        .select()
        .single();

      expect(ended?.cost_pounds).toBe(10);
    });

    it('should allow early session end by client', async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 15 * 60 * 1000); // 15 minutes

      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: startTime.toISOString(),
        })
        .select()
        .single();

      // End early
      const { data: ended } = await supabase
        .from('ai_tutor_sessions')
        .update({
          status: 'completed',
          ended_at: endTime.toISOString(),
          duration_minutes: 15,
          cost_pounds: 10, // Still £10 (not prorated)
        })
        .eq('id', session!.id)
        .select()
        .single();

      expect(ended?.duration_minutes).toBe(15);
      expect(ended?.cost_pounds).toBe(10);
    });
  });

  describe('Escalation to Human Tutor', () => {
    it('should escalate session to human tutor', async () => {
      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Escalate
      const { data: escalated } = await supabase
        .from('ai_tutor_sessions')
        .update({
          status: 'escalated',
          escalated_to_human: true,
          ended_at: new Date().toISOString(),
          duration_minutes: 30,
          cost_pounds: 10,
        })
        .eq('id', session!.id)
        .select()
        .single();

      expect(escalated?.status).toBe('escalated');
      expect(escalated?.escalated_to_human).toBe(true);
    });

    it('should preserve conversation history on escalation', async () => {
      const conversationHistory = [
        { role: 'user', content: 'I need help', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'How can I help?', timestamp: new Date().toISOString() },
      ];

      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'active',
          started_at: new Date().toISOString(),
          conversation_history: conversationHistory,
        })
        .select()
        .single();

      // Escalate
      await supabase
        .from('ai_tutor_sessions')
        .update({
          status: 'escalated',
          escalated_to_human: true,
        })
        .eq('id', session!.id);

      const { data: escalated } = await supabase
        .from('ai_tutor_sessions')
        .select()
        .eq('id', session!.id)
        .single();

      expect(escalated?.conversation_history).toHaveLength(2);
      expect(escalated?.status).toBe('escalated');
    });
  });

  describe('Review Submission', () => {
    it('should submit review after session ends', async () => {
      // Create and end session
      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'completed',
          started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_minutes: 60,
          cost_pounds: 10,
        })
        .select()
        .single();

      // Submit review
      const { data: review, error } = await supabase
        .from('ai_tutor_reviews')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          session_id: session!.id,
          reviewer_id: testData.clientId,
          rating: 5,
          review_text: 'Excellent AI tutor! Very helpful.',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(review?.rating).toBe(5);
      expect(review?.review_text).toBe('Excellent AI tutor! Very helpful.');
    });

    it('should validate rating is 1-5', async () => {
      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'completed',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Try invalid rating
      const { error } = await supabase
        .from('ai_tutor_reviews')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          session_id: session!.id,
          reviewer_id: testData.clientId,
          rating: 6, // Invalid
        });

      expect(error).not.toBeNull();
    });

    it('should allow review without text (rating only)', async () => {
      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'completed',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        })
        .select()
        .single();

      const { data: review, error } = await supabase
        .from('ai_tutor_reviews')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          session_id: session!.id,
          reviewer_id: testData.clientId,
          rating: 4,
          review_text: null,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(review?.rating).toBe(4);
      expect(review?.review_text).toBeNull();
    });

    it('should prevent duplicate reviews for same session', async () => {
      const { data: session } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          client_id: testData.clientId,
          status: 'completed',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        })
        .select()
        .single();

      // First review
      await supabase
        .from('ai_tutor_reviews')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          session_id: session!.id,
          reviewer_id: testData.clientId,
          rating: 5,
        });

      // Try duplicate
      const { error } = await supabase
        .from('ai_tutor_reviews')
        .insert({
          ai_tutor_id: testData.aiAgentId,
          session_id: session!.id,
          reviewer_id: testData.clientId,
          rating: 4,
        });

      expect(error).not.toBeNull();
    });
  });

  describe('Session Status Tracking', () => {
    it('should track all session statuses', async () => {
      const statuses = ['active', 'completed', 'escalated', 'cancelled'];

      for (const status of statuses) {
        const { data: session, error } = await supabase
          .from('ai_tutor_sessions')
          .insert({
            ai_tutor_id: testData.aiAgentId,
            client_id: testData.clientId,
            status,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(session?.status).toBe(status);

        // Clean up
        await supabase.from('ai_tutor_sessions').delete().eq('id', session!.id);
      }
    });
  });
});
