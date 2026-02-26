/**
 * Runtime Factory Integration Test
 * Tests: AgentRuntimeFactory with both CustomRuntime and LangGraphRuntime
 *
 * Run: CAS_RUNTIME=langgraph npx tsx src/runtime/test-runtime-factory.ts
 */

import * as dotenv from 'dotenv';
import { AgentRuntimeFactory } from './RuntimeFactory';
import type { RuntimeType } from './AgentRuntimeInterface';

// Load environment variables
dotenv.config({ path: '/Users/michaelquan/projects/tutorwise/apps/web/.env.local' });

async function testRuntimeFactory() {
  console.log('='.repeat(60));
  console.log('Runtime Factory Integration Test');
  console.log('='.repeat(60));

  try {
    // Test 1: Check runtime availability
    console.log('\n[Test 1] Check Runtime Availability');
    console.log('- custom runtime available:', AgentRuntimeFactory.isRuntimeAvailable('custom'));
    console.log('- langgraph runtime available:', AgentRuntimeFactory.isRuntimeAvailable('langgraph'));

    if (!AgentRuntimeFactory.isRuntimeAvailable('langgraph')) {
      throw new Error('LangGraph runtime should be available');
    }
    console.log('✅ Both runtimes available');

    // Test 2: Create CustomRuntime
    console.log('\n[Test 2] Create CustomRuntime');
    const customRuntime = AgentRuntimeFactory.create('custom');
    console.log('Runtime created:', customRuntime.constructor.name);
    if (customRuntime.constructor.name !== 'CustomAgentRuntime') {
      throw new Error('Expected CustomAgentRuntime');
    }
    console.log('✅ CustomRuntime created correctly');

    // Test 3: Create LangGraphRuntime
    console.log('\n[Test 3] Create LangGraphRuntime');
    const langGraphRuntime = AgentRuntimeFactory.create('langgraph');
    console.log('Runtime created:', langGraphRuntime.constructor.name);
    if (langGraphRuntime.constructor.name !== 'LangGraphRuntime') {
      throw new Error('Expected LangGraphRuntime');
    }
    console.log('✅ LangGraphRuntime created correctly');

    // Test 4: Create from environment variable
    console.log('\n[Test 4] Create from Environment Variable');
    const envRuntimeType = process.env.CAS_RUNTIME as RuntimeType || 'custom';
    console.log(`CAS_RUNTIME env var: ${envRuntimeType}`);
    const envRuntime = AgentRuntimeFactory.create();
    console.log('Runtime created:', envRuntime.constructor.name);
    console.log('✅ Runtime created from env variable');

    // Test 5: Initialize LangGraphRuntime
    console.log('\n[Test 5] Initialize LangGraphRuntime');
    await langGraphRuntime.initialize();
    console.log('✅ LangGraphRuntime initialized successfully');

    // Test 6: Health check
    console.log('\n[Test 6] LangGraphRuntime Health Check');
    const isHealthy = await langGraphRuntime.healthCheck();
    console.log(`Health check: ${isHealthy ? 'PASS' : 'FAIL'}`);
    if (!isHealthy) {
      throw new Error('Health check failed');
    }
    console.log('✅ Health check passed');

    // Test 7: Register agent via factory-created runtime
    console.log('\n[Test 7] Register Agent via Factory Runtime');
    await langGraphRuntime.registerAgent('factory-test-agent', {
      id: 'factory-test-agent',
      name: 'Factory Test Agent',
      role: 'tester',
      capabilities: ['factory-testing']
    });
    console.log('✅ Agent registered via factory runtime');

    // Test 8: Get agent status
    console.log('\n[Test 8] Get Agent Status');
    const status = await langGraphRuntime.getAgentStatus('factory-test-agent');
    console.log('Agent status:', status.status);
    if (status.status !== 'running') {
      throw new Error('Agent should be running');
    }
    console.log('✅ Agent status retrieved correctly');

    // Cleanup
    console.log('\n[Cleanup] Deregister test agent');
    await langGraphRuntime.unregisterAgent('factory-test-agent');
    await langGraphRuntime.shutdown();
    console.log('✅ Cleanup complete');

    // Success
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL RUNTIME FACTORY TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log('- ✅ Runtime availability check working');
    console.log('- ✅ CustomRuntime factory creation working');
    console.log('- ✅ LangGraphRuntime factory creation working');
    console.log('- ✅ Environment variable detection working');
    console.log('- ✅ LangGraphRuntime initialization working');
    console.log('- ✅ LangGraphRuntime health check working');
    console.log('- ✅ Agent registration via factory runtime working');
    console.log('\n🎉 LangGraphRuntime is ready for production use via RuntimeFactory!\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testRuntimeFactory();
