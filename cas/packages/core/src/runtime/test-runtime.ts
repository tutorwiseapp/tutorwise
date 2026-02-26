/**
 * Test script for CustomRuntime Supabase integration
 * Run with: tsx src/runtime/test-runtime.ts
 */

import * as dotenv from 'dotenv';
import { CustomAgentRuntime } from './CustomRuntime';

// Load environment variables from apps/web/.env.local (use absolute path for reliability)
dotenv.config({ path: '/Users/michaelquan/projects/tutorwise/apps/web/.env.local' });

async function testCustomRuntime() {
  console.log('\n=== Testing CustomRuntime Supabase Integration ===\n');

  try {
    // 1. Initialize runtime
    console.log('1. Creating CustomRuntime instance...');
    const runtime = new CustomAgentRuntime();

    console.log('2. Initializing runtime...');
    await runtime.initialize();
    console.log('✅ Runtime initialized successfully\n');

    // 2. Health check
    console.log('3. Running health check...');
    const isHealthy = await runtime.healthCheck();
    console.log(`✅ Health check: ${isHealthy ? 'PASS' : 'FAIL'}\n`);

    // 3. Get agent status for all 8 agents
    console.log('4. Getting status for all agents...');
    const agentIds = ['marketer', 'analyst', 'planner', 'developer', 'tester', 'qa', 'engineer', 'security'];

    for (const agentId of agentIds) {
      const status = await runtime.getAgentStatus(agentId);
      console.log(`   - ${agentId}: ${status.status} (uptime: ${status.uptime_seconds}s)`);
    }
    console.log('✅ All agent statuses retrieved\n');

    // 4. Register an agent
    console.log('5. Registering test agent...');
    await runtime.registerAgent('marketer', {
      name: 'Marketer Agent',
      version: '1.0.0',
      capabilities: ['content_creation', 'seo_optimization']
    });
    console.log('✅ Agent registered successfully\n');

    // 5. Execute a test task
    console.log('6. Executing test task...');
    const result = await runtime.executeTask({
      id: 'test-task-001',
      agentId: 'marketer',
      input: {
        action: 'create_content',
        topic: 'AI tutoring'
      }
    });
    console.log(`✅ Task executed: ${result.status} (${result.metrics?.duration_ms}ms)\n`);

    // 6. Get metrics
    console.log('7. Getting agent metrics...');
    const metrics = await runtime.getMetrics('marketer');
    console.log(`   - Total runs: ${metrics.total_runs}`);
    console.log(`   - Avg duration: ${metrics.avg_duration_ms.toFixed(2)}ms`);
    console.log(`   - Success rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
    console.log(`   - Error rate: ${(metrics.error_rate * 100).toFixed(1)}%`);
    console.log('✅ Metrics retrieved successfully\n');

    // 7. Get event history
    console.log('8. Getting event history...');
    const events = await runtime.getEventHistory('marketer', 5);
    console.log(`   - Retrieved ${events.length} events`);
    events.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.event_type} at ${event.created_at}`);
    });
    console.log('✅ Event history retrieved\n');

    // 8. State management
    console.log('9. Testing state management...');
    await runtime.updateAgentState('marketer', {
      last_topic: 'AI tutoring',
      content_count: 1
    });
    console.log('   - State updated');

    const state = await runtime.getAgentState('marketer');
    console.log(`   - State retrieved: ${JSON.stringify(state)}`);
    console.log('✅ State management working\n');

    // 9. Shutdown
    console.log('10. Shutting down runtime...');
    await runtime.shutdown();
    console.log('✅ Runtime shutdown complete\n');

    console.log('=== All tests passed! ✅ ===\n');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testCustomRuntime();
