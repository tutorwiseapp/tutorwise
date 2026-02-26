/**
 * Phase 5 Integration Test
 * Tests: registerAgent(), deregisterAgent(), getAgentStatus()
 *
 * Run: npx tsx src/runtime/test-phase5-integration.ts
 */

import * as dotenv from 'dotenv';
import { LangGraphRuntime } from './LangGraphRuntime';
import { AgentConfig } from './AgentRuntimeInterface';

// Load environment variables
dotenv.config({ path: '/Users/michaelquan/projects/tutorwise/apps/web/.env.local' });

async function testPhase5Integration() {
  console.log('='.repeat(60));
  console.log('Phase 5 Integration Test - Agent Management');
  console.log('='.repeat(60));

  let runtime: LangGraphRuntime;
  const testAgentIds: string[] = [];

  try {
    // Initialize runtime
    console.log('\n[TEST] Initializing LangGraphRuntime...');
    runtime = new LangGraphRuntime();
    await runtime.initialize();
    console.log('✅ Runtime initialized');

    // Test 1: Register a new agent
    console.log('\n' + '='.repeat(60));
    console.log('Test 1: Register Agent');
    console.log('='.repeat(60));

    const agent1Config: AgentConfig = {
      id: 'test-agent-1',
      name: 'Phase 5 Test Agent',
      role: 'tester',
      capabilities: ['unit-testing', 'integration-testing'],
      metadata: {
        version: '1.0.0',
        testRun: new Date().toISOString()
      }
    };

    await runtime.registerAgent('test-agent-1', agent1Config);
    testAgentIds.push('test-agent-1');
    console.log('✅ Agent registered: test-agent-1');

    // Test 2: Get agent status (should be 'running')
    console.log('\n' + '='.repeat(60));
    console.log('Test 2: Get Agent Status (should be "running")');
    console.log('='.repeat(60));

    const status1 = await runtime.getAgentStatus('test-agent-1');
    console.log('Agent Status:', JSON.stringify(status1, null, 2));

    // Verify status
    if (status1.agent_id !== 'test-agent-1') {
      throw new Error(`Expected agent_id='test-agent-1', got '${status1.agent_id}'`);
    }
    if (status1.status !== 'running') {
      throw new Error(`Expected status='running', got '${status1.status}'`);
    }
    if (!status1.metadata || status1.metadata.metadata?.version !== '1.0.0') {
      throw new Error('Metadata not persisted correctly');
    }
    console.log('✅ Agent status verified: running');

    // Test 3: Register multiple agents
    console.log('\n' + '='.repeat(60));
    console.log('Test 3: Register Multiple Agents');
    console.log('='.repeat(60));

    const agent2Config: AgentConfig = {
      id: 'test-agent-2',
      name: 'Analyzer Agent',
      role: 'analyzer',
      capabilities: ['data-analysis', 'reporting']
    };

    const agent3Config: AgentConfig = {
      id: 'test-agent-3',
      name: 'Monitor Agent',
      role: 'monitor',
      capabilities: ['health-check', 'alerting']
    };

    await runtime.registerAgent('test-agent-2', agent2Config);
    testAgentIds.push('test-agent-2');
    console.log('✅ Agent registered: test-agent-2');

    await runtime.registerAgent('test-agent-3', agent3Config);
    testAgentIds.push('test-agent-3');
    console.log('✅ Agent registered: test-agent-3');

    // Test 4: Verify all agents are running
    console.log('\n' + '='.repeat(60));
    console.log('Test 4: Verify All Agents Running');
    console.log('='.repeat(60));

    for (const agentId of testAgentIds) {
      const status = await runtime.getAgentStatus(agentId);
      console.log(`- ${agentId}: ${status.status}`);
      if (status.status !== 'running') {
        throw new Error(`Agent ${agentId} should be running, got ${status.status}`);
      }
    }
    console.log('✅ All 3 agents verified as running');

    // Test 5: Deregister first agent
    console.log('\n' + '='.repeat(60));
    console.log('Test 5: Deregister Agent');
    console.log('='.repeat(60));

    await runtime.deregisterAgent('test-agent-1');
    console.log('✅ Agent deregistered: test-agent-1');

    // Test 6: Verify deregistered agent status is 'stopped'
    console.log('\n' + '='.repeat(60));
    console.log('Test 6: Verify Deregistered Status');
    console.log('='.repeat(60));

    const stoppedStatus = await runtime.getAgentStatus('test-agent-1');
    console.log('Stopped Agent Status:', JSON.stringify(stoppedStatus, null, 2));

    if (stoppedStatus.status !== 'stopped') {
      throw new Error(`Expected status='stopped', got '${stoppedStatus.status}'`);
    }
    console.log('✅ Deregistered agent status verified: stopped');

    // Test 7: Verify other agents still running
    console.log('\n' + '='.repeat(60));
    console.log('Test 7: Verify Other Agents Still Running');
    console.log('='.repeat(60));

    const status2 = await runtime.getAgentStatus('test-agent-2');
    const status3 = await runtime.getAgentStatus('test-agent-3');

    console.log(`- test-agent-2: ${status2.status}`);
    console.log(`- test-agent-3: ${status3.status}`);

    if (status2.status !== 'running' || status3.status !== 'running') {
      throw new Error('Other agents should still be running');
    }
    console.log('✅ Other agents still running after deregister');

    // Test 8: Test UPSERT (re-register same agent)
    console.log('\n' + '='.repeat(60));
    console.log('Test 8: Test UPSERT (Re-register Agent)');
    console.log('='.repeat(60));

    const updatedConfig: AgentConfig = {
      id: 'test-agent-1',
      name: 'Updated Test Agent',
      role: 'tester',
      capabilities: ['unit-testing', 'e2e-testing'], // Updated capability
      metadata: {
        version: '2.0.0', // Updated version
        testRun: new Date().toISOString()
      }
    };

    await runtime.registerAgent('test-agent-1', updatedConfig);
    console.log('✅ Agent re-registered with updated config');

    const reregisteredStatus = await runtime.getAgentStatus('test-agent-1');
    console.log('Re-registered Status:', JSON.stringify(reregisteredStatus, null, 2));

    if (reregisteredStatus.status !== 'running') {
      throw new Error('Re-registered agent should be running');
    }
    if (reregisteredStatus.metadata.metadata?.version !== '2.0.0') {
      throw new Error('Metadata should be updated to version 2.0.0');
    }
    console.log('✅ UPSERT verified: config updated successfully');

    // Test 9: Error handling - get non-existent agent
    console.log('\n' + '='.repeat(60));
    console.log('Test 9: Error Handling - Non-existent Agent');
    console.log('='.repeat(60));

    try {
      await runtime.getAgentStatus('non-existent-agent');
      throw new Error('Should have thrown error for non-existent agent');
    } catch (error: any) {
      if (error.message.includes('Agent non-existent-agent not found')) {
        console.log('✅ Correctly throws error for non-existent agent');
      } else {
        throw error;
      }
    }

    // Test 10: Shutdown (should deregister all agents)
    console.log('\n' + '='.repeat(60));
    console.log('Test 10: Shutdown (Deregister All)');
    console.log('='.repeat(60));

    console.log('Calling runtime.shutdown()...');
    await runtime.shutdown();
    console.log('✅ Runtime shutdown complete');

    // Re-initialize to check final states
    console.log('\nRe-initializing runtime to verify shutdown...');
    runtime = new LangGraphRuntime();
    await runtime.initialize();

    console.log('\nVerifying all agents are stopped after shutdown:');
    for (const agentId of testAgentIds) {
      const finalStatus = await runtime.getAgentStatus(agentId);
      console.log(`- ${agentId}: ${finalStatus.status}`);
      if (finalStatus.status !== 'stopped') {
        throw new Error(`Agent ${agentId} should be stopped after shutdown, got ${finalStatus.status}`);
      }
    }
    console.log('✅ All agents correctly stopped after shutdown');

    // Final cleanup
    await runtime.shutdown();

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nPhase 5 Integration Test Summary:');
    console.log('- ✅ registerAgent(): Works with DB persistence');
    console.log('- ✅ getAgentStatus(): Returns correct DB data');
    console.log('- ✅ deregisterAgent(): Soft delete (UPDATE status)');
    console.log('- ✅ UPSERT: Re-registration updates existing records');
    console.log('- ✅ Error handling: Throws for non-existent agents');
    console.log('- ✅ shutdown(): Deregisters all agents');
    console.log('- ✅ Metadata persistence: Config stored in JSONB');
    console.log('- ✅ Multiple agents: Can manage concurrent agents');
    console.log('\n🎉 Phase 5 implementation verified and working!\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error.message);
    console.error('\nStack trace:', error.stack);

    // Cleanup on failure
    if (runtime!) {
      try {
        console.log('\nCleaning up test agents...');
        for (const agentId of testAgentIds) {
          try {
            await runtime.deregisterAgent(agentId);
            console.log(`Cleaned up: ${agentId}`);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        await runtime.shutdown();
      } catch (e) {
        // Ignore shutdown errors
      }
    }

    process.exit(1);
  }
}

// Run the test
testPhase5Integration();
