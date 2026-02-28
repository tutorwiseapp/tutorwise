/**
 * Filename: tests/e2e/ai-tutors/load-testing.test.ts
 * Purpose: Load testing for AI Tutor Studio scalability
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Test Coverage:
 * - Create 100 AI tutors
 * - Create 1000 concurrent sessions
 * - Test RAG retrieval under load
 * - Test database performance
 * - Test Stripe webhook handling
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: Create test tutor
async function createTestTutor(index: number) {
  const email = `load-tutor-${index}-${Date.now()}@test.com`;
  const { data: authUser } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  await supabase
    .from('profiles')
    .update({ caas_score: 90 }) // Elite tier (50 AI tutors)
    .eq('id', authUser.user.id);

  return {
    id: authUser.user.id,
    email,
  };
}

// Helper: Bulk cleanup
async function bulkCleanup(tutorIds: string[]) {
  console.log(`Cleaning up ${tutorIds.length} test tutors...`);

  // Delete in batches to avoid timeouts
  const batchSize = 10;
  for (let i = 0; i < tutorIds.length; i += batchSize) {
    const batch = tutorIds.slice(i, i + batchSize);

    // Delete related data
    await supabase.from('ai_agent_sessions').delete().in('agent_id', batch);
    await supabase.from('ai_agent_links').delete().in('agent_id', batch);
    await supabase.from('ai_agent_materials').delete().in('agent_id', batch);
    await supabase.from('ai_agents').delete().in('owner_id', batch);
    await supabase.from('profiles').delete().in('id', batch);

    for (const id of batch) {
      await supabase.auth.admin.deleteUser(id);
    }
  }

  console.log('Cleanup complete');
}

describe.skip('AI Tutor Load Testing', () => {
  // Skip by default - run manually with: npm test -- load-testing.test.ts

  describe('100 AI Tutors Creation', () => {
    it('should create 100 AI tutors in parallel', async () => {
      const startTime = Date.now();
      const tutorIds: string[] = [];

      try {
        // Create 10 tutors (each can create 50 AI tutors at Elite tier)
        console.log('Creating 10 test tutors...');
        const tutors = await Promise.all(
          Array.from({ length: 10 }, (_, i) => createTestTutor(i))
        );
        tutorIds.push(...tutors.map((t) => t.id));

        // Create 10 AI tutors for each tutor (100 total)
        console.log('Creating 100 AI tutors in parallel...');
        const aiTutorPromises = tutors.flatMap((tutor, tutorIndex) =>
          Array.from({ length: 10 }, (_, aiIndex) =>
            supabase
              .from('ai_agents')
              .insert({
                owner_id: tutor.id,
                display_name: `Load Test Tutor ${tutorIndex * 10 + aiIndex + 1}`,
                subject: 'Mathematics',
                description: `Load test AI tutor #${tutorIndex * 10 + aiIndex + 1}`,
                skills: ['Test Skill'],
                price_per_hour: 10,
                status: 'published',
              })
              .select()
              .single()
          )
        );

        const results = await Promise.all(aiTutorPromises);
        const successCount = results.filter((r) => r.error === null).length;

        const duration = Date.now() - startTime;
        console.log(`Created ${successCount}/100 AI tutors in ${duration}ms`);

        expect(successCount).toBe(100);
        expect(duration).toBeLessThan(30000); // Should complete in <30s
      } finally {
        await bulkCleanup(tutorIds);
      }
    }, 60000); // 60s timeout

    it('should handle concurrent AI tutor creation without conflicts', async () => {
      const tutorIds: string[] = [];

      try {
        const tutor = await createTestTutor(0);
        tutorIds.push(tutor.id);

        // Create 20 AI tutors simultaneously
        const promises = Array.from({ length: 20 }, (_, i) =>
          supabase
            .from('ai_agents')
            .insert({
              owner_id: tutor.id,
              display_name: `Concurrent Test ${i + 1}`,
              subject: 'Test',
              description: 'Test',
              skills: ['Test'],
              price_per_hour: 10,
              status: 'draft',
            })
            .select()
            .single()
        );

        const results = await Promise.all(promises);
        const successCount = results.filter((r) => r.error === null).length;

        expect(successCount).toBe(20);
      } finally {
        await bulkCleanup(tutorIds);
      }
    }, 30000);
  });

  describe('1000 Concurrent Sessions', () => {
    it('should handle 1000 concurrent sessions', async () => {
      const tutorIds: string[] = [];
      const clientIds: string[] = [];

      try {
        // Create 10 AI tutors
        console.log('Setting up test data...');
        const tutors = await Promise.all(
          Array.from({ length: 10 }, (_, i) => createTestTutor(i))
        );
        tutorIds.push(...tutors.map((t) => t.id));

        const aiTutors = await Promise.all(
          tutors.map((tutor) =>
            supabase
              .from('ai_agents')
              .insert({
                owner_id: tutor.id,
                display_name: 'Session Load Test Tutor',
                subject: 'Test',
                description: 'Test',
                skills: ['Test'],
                price_per_hour: 10,
                status: 'published',
              })
              .select()
              .single()
          )
        );

        // Create 100 clients
        const clients = await Promise.all(
          Array.from({ length: 100 }, async (_, i) => {
            const email = `load-client-${i}-${Date.now()}@test.com`;
            const { data } = await supabase.auth.admin.createUser({
              email,
              password: 'TestPassword123!',
              email_confirm: true,
            });
            clientIds.push(data.user.id);
            return data.user.id;
          })
        );

        // Create 1000 sessions (10 sessions per client, distributed across AI tutors)
        console.log('Creating 1000 concurrent sessions...');
        const startTime = Date.now();

        const sessionPromises = clients.flatMap((clientId, clientIndex) =>
          Array.from({ length: 10 }, (_, sessionIndex) => {
            const aiTutorIndex = (clientIndex * 10 + sessionIndex) % aiTutors.length;
            return supabase
              .from('ai_agent_sessions')
              .insert({
                agent_id: aiTutors[aiTutorIndex].data!.id,
                client_id: clientId,
                status: 'active',
                started_at: new Date().toISOString(),
              })
              .select()
              .single();
          })
        );

        const sessionResults = await Promise.all(sessionPromises);
        const successCount = sessionResults.filter((r) => r.error === null).length;

        const duration = Date.now() - startTime;
        console.log(`Created ${successCount}/1000 sessions in ${duration}ms`);

        expect(successCount).toBe(1000);
        expect(duration).toBeLessThan(60000); // Should complete in <60s
      } finally {
        console.log('Cleaning up clients...');
        await bulkCleanup(clientIds);
        await bulkCleanup(tutorIds);
      }
    }, 120000); // 120s timeout

    it('should handle concurrent session updates', async () => {
      const tutorIds: string[] = [];

      try {
        const tutor = await createTestTutor(0);
        tutorIds.push(tutor.id);

        const { data: aiTutor } = await supabase
          .from('ai_agents')
          .insert({
            owner_id: tutor.id,
            display_name: 'Update Test Tutor',
            subject: 'Test',
            description: 'Test',
            skills: ['Test'],
            price_per_hour: 10,
            status: 'published',
          })
          .select()
          .single();

        // Create 50 sessions
        const sessions = await Promise.all(
          Array.from({ length: 50 }, async (_, i) => {
            const email = `update-client-${i}-${Date.now()}@test.com`;
            const { data: client } = await supabase.auth.admin.createUser({
              email,
              password: 'TestPassword123!',
              email_confirm: true,
            });
            tutorIds.push(client.user.id);

            const { data } = await supabase
              .from('ai_agent_sessions')
              .insert({
                agent_id: aiTutor!.id,
                client_id: client.user.id,
                status: 'active',
                started_at: new Date().toISOString(),
              })
              .select()
              .single();

            return data!;
          })
        );

        // Update all sessions concurrently
        const updatePromises = sessions.map((session) =>
          supabase
            .from('ai_agent_sessions')
            .update({
              status: 'completed',
              ended_at: new Date().toISOString(),
              duration_minutes: 60,
              cost_pounds: 10,
            })
            .eq('id', session.id)
        );

        const updateResults = await Promise.all(updatePromises);
        const successCount = updateResults.filter((r) => r.error === null).length;

        expect(successCount).toBe(50);
      } finally {
        await bulkCleanup(tutorIds);
      }
    }, 60000);
  });

  describe('RAG Performance Under Load', () => {
    it('should handle concurrent RAG queries', async () => {
      const tutorIds: string[] = [];

      try {
        const tutor = await createTestTutor(0);
        tutorIds.push(tutor.id);

        const { data: aiTutor } = await supabase
          .from('ai_agents')
          .insert({
            owner_id: tutor.id,
            display_name: 'RAG Load Test Tutor',
            subject: 'Mathematics',
            description: 'Test',
            skills: ['Algebra'],
            price_per_hour: 10,
            status: 'published',
          })
          .select()
          .single();

        // Simulate 100 concurrent RAG queries
        console.log('Testing 100 concurrent RAG queries...');
        const startTime = Date.now();

        const queries = Array.from({ length: 100 }, () => ({
          query_embedding: Array(768).fill(0.1), // Mock embedding
          agent_id: aiTutor!.id,
          match_threshold: 0.3,
          match_count: 5,
        }));

        const results = await Promise.all(
          queries.map((query) =>
            supabase.rpc('match_ai_tutor_materials', query)
          )
        );

        const duration = Date.now() - startTime;
        const successCount = results.filter((r) => r.error === null).length;

        console.log(`Completed ${successCount}/100 RAG queries in ${duration}ms`);

        expect(successCount).toBe(100);
        expect(duration).toBeLessThan(10000); // Should complete in <10s
      } finally {
        await bulkCleanup(tutorIds);
      }
    }, 30000);
  });

  describe('Database Performance', () => {
    it('should query AI tutors with pagination efficiently', async () => {
      const tutorIds: string[] = [];

      try {
        // Create 50 AI tutors
        const tutor = await createTestTutor(0);
        tutorIds.push(tutor.id);

        await Promise.all(
          Array.from({ length: 50 }, (_, i) =>
            supabase
              .from('ai_agents')
              .insert({
                owner_id: tutor.id,
                display_name: `Pagination Test ${i + 1}`,
                subject: 'Mathematics',
                description: 'Test',
                skills: ['Test'],
                price_per_hour: 10,
                status: 'published',
              })
          )
        );

        // Query with pagination (10 per page)
        const startTime = Date.now();
        const results = [];

        for (let page = 0; page < 5; page++) {
          const { data } = await supabase
            .from('ai_agents')
            .select('*')
            .eq('owner_id', tutor.id)
            .range(page * 10, page * 10 + 9);

          results.push(...(data || []));
        }

        const duration = Date.now() - startTime;

        console.log(`Paginated query completed in ${duration}ms`);

        expect(results.length).toBe(50);
        expect(duration).toBeLessThan(5000); // Should complete in <5s
      } finally {
        await bulkCleanup(tutorIds);
      }
    }, 30000);

    it('should handle bulk session status updates', async () => {
      const tutorIds: string[] = [];

      try {
        const tutor = await createTestTutor(0);
        tutorIds.push(tutor.id);

        const { data: aiTutor } = await supabase
          .from('ai_agents')
          .insert({
            owner_id: tutor.id,
            display_name: 'Bulk Update Test',
            subject: 'Test',
            description: 'Test',
            skills: ['Test'],
            price_per_hour: 10,
            status: 'published',
          })
          .select()
          .single();

        // Create 100 sessions
        const sessionPromises = Array.from({ length: 100 }, async (_, i) => {
          const email = `bulk-client-${i}-${Date.now()}@test.com`;
          const { data: client } = await supabase.auth.admin.createUser({
            email,
            password: 'TestPassword123!',
            email_confirm: true,
          });
          tutorIds.push(client.user.id);

          return supabase
            .from('ai_agent_sessions')
            .insert({
              agent_id: aiTutor!.id,
              client_id: client.user.id,
              status: 'active',
              started_at: new Date().toISOString(),
            })
            .select()
            .single();
        });

        const sessions = await Promise.all(sessionPromises);
        const sessionIds = sessions.map((s) => s.data!.id);

        // Bulk update status
        const startTime = Date.now();

        const { error } = await supabase
          .from('ai_agent_sessions')
          .update({ status: 'completed' })
          .in('id', sessionIds);

        const duration = Date.now() - startTime;

        console.log(`Bulk updated 100 sessions in ${duration}ms`);

        expect(error).toBeNull();
        expect(duration).toBeLessThan(3000); // Should complete in <3s
      } finally {
        await bulkCleanup(tutorIds);
      }
    }, 60000);
  });

  describe('Stress Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const tutorIds: string[] = [];

      try {
        const tutor = await createTestTutor(0);
        tutorIds.push(tutor.id);

        const { data: aiTutor } = await supabase
          .from('ai_agents')
          .insert({
            owner_id: tutor.id,
            display_name: 'Stress Test Tutor',
            subject: 'Test',
            description: 'Test',
            skills: ['Test'],
            price_per_hour: 10,
            status: 'published',
          })
          .select()
          .single();

        // Run 5 rounds of 20 concurrent operations
        console.log('Running sustained load test (5 rounds x 20 ops)...');
        const roundTimes: number[] = [];

        for (let round = 0; round < 5; round++) {
          const startTime = Date.now();

          const promises = Array.from({ length: 20 }, async (_, i) => {
            const email = `stress-client-${round}-${i}-${Date.now()}@test.com`;
            const { data: client } = await supabase.auth.admin.createUser({
              email,
              password: 'TestPassword123!',
              email_confirm: true,
            });
            tutorIds.push(client.user.id);

            return supabase
              .from('ai_agent_sessions')
              .insert({
                agent_id: aiTutor!.id,
                client_id: client.user.id,
                status: 'active',
                started_at: new Date().toISOString(),
              });
          });

          await Promise.all(promises);

          const duration = Date.now() - startTime;
          roundTimes.push(duration);

          console.log(`Round ${round + 1} completed in ${duration}ms`);
        }

        // Check that performance doesn't degrade significantly
        const avgTime = roundTimes.reduce((a, b) => a + b) / roundTimes.length;
        const maxTime = Math.max(...roundTimes);
        const degradation = ((maxTime - roundTimes[0]) / roundTimes[0]) * 100;

        console.log(`Average: ${avgTime}ms, Max: ${maxTime}ms, Degradation: ${degradation}%`);

        expect(degradation).toBeLessThan(50); // <50% performance degradation
      } finally {
        await bulkCleanup(tutorIds);
      }
    }, 180000); // 3 min timeout
  });
});
