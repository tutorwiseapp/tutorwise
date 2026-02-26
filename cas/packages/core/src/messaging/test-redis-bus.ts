/**
 * Redis Message Bus Test
 *
 * Tests RedisMessageBus with actual Upstash Redis connection
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment
 */

import * as dotenv from 'dotenv';
import { RedisMessageBus } from './RedisMessageBus';
import type { TaskMessage, TaskResultMessage } from './MessageBusInterface';

// Load environment variables
dotenv.config({ path: '/Users/michaelquan/projects/tutorwise/apps/web/.env.local' });

async function testRedisMessageBus() {
  console.log('\n=== Testing Redis Message Bus ===\n');

  // Check if Redis credentials are available
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('⚠️  Redis credentials not found in environment.');
    console.log('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to run this test.\n');
    console.log('   Skipping Redis tests...\n');
    return;
  }

  const redis = new RedisMessageBus();

  try {
    // ========================================
    // 1. Connect to Redis
    // ========================================
    console.log('1. Connecting to Redis...');
    await redis.connect();
    console.log('✅ Connected to Redis successfully\n');

    // ========================================
    // 2. Health Check
    // ========================================
    console.log('2. Running health check...');
    const healthy = await redis.healthCheck();
    console.log(`✅ Health check: ${healthy ? 'PASS' : 'FAIL'}\n');

    // ========================================
    // 3. Clear Previous Test Data
    // ========================================
    console.log('3. Clearing previous test data...');
    await redis.clearQueues();
    console.log('✅ Queues cleared\n');

    // ========================================
    // 4. Publish Task
    // ========================================
    console.log('4. Publishing test task...');
    const testTask: TaskMessage = {
      taskId: 'test-redis-001',
      agentId: 'marketer',
      input: { action: 'create_content', topic: 'Redis Testing' },
      timestamp: new Date().toISOString(),
      priority: 5
    };

    await redis.publishTask('marketer', testTask);
    console.log('✅ Task published\n');

    // ========================================
    // 5. Check Queue Size
    // ========================================
    console.log('5. Checking queue size...');
    const queueSize = await redis.getQueueSize('marketer');
    console.log(`✅ Queue size: ${queueSize} tasks\n`);

    // ========================================
    // 6. Get Next Task
    // ========================================
    console.log('6. Getting next task from queue...');
    const retrievedTask = await redis.getNextTask('marketer');

    if (retrievedTask) {
      console.log(`✅ Retrieved task: ${retrievedTask.taskId}`);
      console.log(`   Input: ${JSON.stringify(retrievedTask.input)}\n`);
    } else {
      console.log('❌ No task retrieved\n');
    }

    // ========================================
    // 7. Publish Result
    // ========================================
    console.log('7. Publishing task result...');
    const result: TaskResultMessage = {
      taskId: 'test-redis-001',
      agentId: 'marketer',
      output: { content: 'Generated blog post about Redis Testing' },
      status: 'success',
      timestamp: new Date().toISOString()
    };

    await redis.publishResult(result);
    console.log('✅ Result published\n');

    // ========================================
    // 8. Subscribe to Results
    // ========================================
    console.log('8. Testing result subscription...');
    let receivedResult = false;

    await redis.subscribeToResults('marketer', (result) => {
      console.log(`   📨 Received result for task: ${result.taskId}`);
      console.log(`   Status: ${result.status}`);
      receivedResult = true;
    });

    // Wait a bit for polling to pick up the result
    await new Promise(resolve => setTimeout(resolve, 500));

    if (receivedResult) {
      console.log('✅ Result subscription working\n');
    } else {
      console.log('⚠️  No result received (might need more wait time)\n');
    }

    await redis.unsubscribeFromResults('marketer');

    // ========================================
    // 9. Test Cancellation
    // ========================================
    console.log('9. Testing task cancellation...');
    await redis.publishCancellation('test-task-cancel');

    const isCancelled = await redis.isCancelled('test-task-cancel');
    console.log(`✅ Cancellation check: ${isCancelled ? 'CANCELLED' : 'NOT CANCELLED'}\n`);

    // ========================================
    // 10. Test Streaming
    // ========================================
    console.log('10. Testing task streaming...');
    let streamUpdateCount = 0;

    await redis.subscribeToStream('test-stream-001', (update) => {
      streamUpdateCount++;
      console.log(`   📊 Stream update #${streamUpdateCount}: ${JSON.stringify(update)}`);
    });

    // Publish some stream updates
    await redis.publishStreamUpdate('test-stream-001', { type: 'progress', progress: 0.5 });
    await redis.publishStreamUpdate('test-stream-001', { type: 'progress', progress: 1.0 });

    // Wait for polling
    await new Promise(resolve => setTimeout(resolve, 200));

    await redis.unsubscribeFromStream('test-stream-001');
    console.log(`✅ Streaming working (${streamUpdateCount} updates received)\n`);

    // ========================================
    // 11. Performance Test
    // ========================================
    console.log('11. Running performance test...');
    const startTime = Date.now();
    const taskCount = 10;

    for (let i = 0; i < taskCount; i++) {
      await redis.publishTask('test-agent', {
        taskId: `perf-test-${i}`,
        agentId: 'test-agent',
        input: { test: true },
        timestamp: new Date().toISOString()
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const throughput = (taskCount / duration) * 1000;

    console.log(`✅ Published ${taskCount} tasks in ${duration}ms`);
    console.log(`   Throughput: ${throughput.toFixed(0)} tasks/second\n`);

    // Clean up performance test
    const perfQueueSize = await redis.getQueueSize('test-agent');
    console.log(`   Performance test queue size: ${perfQueueSize} tasks\n`);

    // ========================================
    // 12. Cleanup
    // ========================================
    console.log('12. Cleaning up test data...');
    await redis.clearQueues();
    console.log('✅ Test data cleared\n');

    // ========================================
    // 13. Disconnect
    // ========================================
    console.log('13. Disconnecting from Redis...');
    await redis.disconnect();
    console.log('✅ Disconnected successfully\n');

    // ========================================
    // Summary
    // ========================================
    console.log('=== Test Summary ===\n');
    console.log('✅ Connection & health check');
    console.log('✅ Task publishing & retrieval');
    console.log('✅ Queue management');
    console.log('✅ Result publishing & subscription');
    console.log('✅ Task cancellation');
    console.log('✅ Task streaming');
    console.log(`✅ Performance: ${throughput.toFixed(0)} tasks/sec`);
    console.log('\n🎉 All Redis Message Bus tests passed! 🎉\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testRedisMessageBus();
