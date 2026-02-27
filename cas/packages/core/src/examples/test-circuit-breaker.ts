/**
 * Circuit Breaker Test Example
 *
 * Demonstrates circuit breaker pattern with LangGraphRuntime
 */

import { LangGraphRuntime } from '../runtime/LangGraphRuntime';
import type { AgentTask } from '../runtime/AgentRuntimeInterface';

async function testCircuitBreaker() {
  console.log('='.repeat(80));
  console.log('Circuit Breaker Test - LangGraphRuntime');
  console.log('='.repeat(80));

  const runtime = new LangGraphRuntime();

  try {
    // Initialize runtime
    console.log('\n[1/4] Initializing runtime...');
    await runtime.initialize();
    console.log('✓ Runtime initialized successfully');

    // Check initial circuit breaker stats
    console.log('\n[2/4] Checking initial circuit breaker stats...');
    const initialStats = runtime.getCircuitBreakerStats();
    console.log('Circuit Breaker Stats (Initial):');
    console.log(JSON.stringify(initialStats, null, 2));

    // Execute a successful task
    console.log('\n[3/4] Executing a successful task...');
    const successTask: AgentTask = {
      id: 'test-task-1',
      agentId: 'analyst',
      input: {
        action: 'analyze_metrics',
        period: 'weekly',
        metrics_data: {
          test_metric: { current: 100, previous: 90 }
        }
      },
      priority: 'normal',
      createdAt: new Date(),
      status: 'pending'
    };

    const result = await runtime.executeTask(successTask);
    console.log('✓ Task executed successfully');
    console.log('Result status:', result.status);

    // Check circuit breaker stats after success
    console.log('\n[4/4] Circuit breaker stats after successful execution:');
    const afterSuccessStats = runtime.getCircuitBreakerStats();
    console.log(JSON.stringify(afterSuccessStats, null, 2));

    // Test with invalid agent (should fail)
    console.log('\n[BONUS] Testing with invalid agent (should fail)...');
    const failTask: AgentTask = {
      id: 'test-task-2',
      agentId: 'nonexistent-agent',
      input: { action: 'test' },
      priority: 'normal',
      createdAt: new Date(),
      status: 'pending'
    };

    try {
      await runtime.executeTask(failTask);
    } catch (error: any) {
      console.log('✓ Task failed as expected:', error.message);
    }

    // Check circuit breaker stats after failure
    console.log('\nCircuit breaker stats after failed execution:');
    const afterFailureStats = runtime.getCircuitBreakerStats();
    console.log(JSON.stringify(afterFailureStats, null, 2));

    // Health check
    console.log('\n[HEALTH CHECK] Running health check...');
    const isHealthy = await runtime.healthCheck();
    console.log('Runtime healthy:', isHealthy);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Circuit Breaker Test Complete!');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    await runtime.shutdown();
    console.log('\n✓ Runtime shutdown complete');
  }
}

// Run the test
testCircuitBreaker().catch(console.error);
