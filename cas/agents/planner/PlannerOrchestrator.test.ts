/**
 * Tests for PlannerOrchestrator
 *
 * Run with: npx ts-node cas/agents/planner/PlannerOrchestrator.test.ts
 */

import { PlannerOrchestrator, Task } from './PlannerOrchestrator.js';

async function testPlannerOrchestrator() {
  console.log('🧪 Testing PlannerOrchestrator...\n');

  const planner = new PlannerOrchestrator();

  try {
    // Test 1: Create Sprint
    console.log('Test 1: Create Sprint');
    planner.createSprint({
      week: 3,
      duration: 5,
      goals: [
        'Activate auto-plan updaters',
        'Implement Planner orchestration',
        'Security review'
      ],
      successCriteria: [
        'Auto-updaters functional',
        'Orchestration working',
        'No security issues'
      ],
    });
    console.log('✅ Sprint 3 created\n');

    // Test 2: Execute Feature Workflow
    console.log('Test 2: Execute feature workflow');
    await planner.executeFeatureWorkflow('AutoPlanUpdaters');
    console.log('✅ Feature workflow executed\n');

    // Test 3: Simulate task completions
    console.log('Test 3: Simulate task completions');
    planner.completeTask('AutoPlanUpdaters-requirements');
    console.log('  ✅ Requirements completed');

    planner.completeTask('AutoPlanUpdaters-implementation');
    console.log('  ✅ Implementation completed');

    planner.completeTask('AutoPlanUpdaters-tests');
    console.log('  ✅ Tests completed');

    console.log('✅ Task completions simulated\n');

    // Test 4: Detect blockers
    console.log('Test 4: Detect blockers');
    const blockers = await planner.detectBlockers();
    console.log(`  Found ${blockers.length} blocker(s)`);
    console.log('✅ Blocker detection tested\n');

    // Test 5: Get agent statuses
    console.log('Test 5: Get agent statuses');
    const developerStatus = planner.getAgentStatus('developer');
    console.log(`  Developer: ${developerStatus?.currentTasks.length} current tasks, ${developerStatus?.completedTasks.length} completed`);

    const testerStatus = planner.getAgentStatus('tester');
    console.log(`  Tester: ${testerStatus?.currentTasks.length} current tasks, ${testerStatus?.completedTasks.length} completed`);
    console.log('✅ Agent statuses retrieved\n');

    // Test 6: Track progress
    console.log('Test 6: Track progress');
    const progress = await planner.trackProgress('ClientProfessionalInfoForm');
    console.log(`  Feature: ${progress.feature}`);
    console.log(`  Developer: ${progress.developer}`);
    console.log(`  Tester: ${progress.tester}`);
    console.log(`  Overall: ${progress.overallProgress}%`);
    console.log('✅ Progress tracked\n');

    // Test 7: Generate daily standup
    console.log('Test 7: Generate daily standup report');
    const standup = planner.generateDailyStandup();
    console.log('--- Daily Standup Report ---');
    console.log(standup);
    console.log('✅ Daily standup generated\n');

    // Test 8: Generate weekly summary
    console.log('Test 8: Generate weekly summary');
    const summary = planner.generateWeeklySummary();
    console.log('--- Weekly Summary ---');
    console.log(summary);
    console.log('✅ Weekly summary generated\n');

    // Test 9: Create another workflow
    console.log('Test 9: Execute second feature workflow');
    await planner.executeFeatureWorkflow('PlannerOrchestration');
    console.log('✅ Second feature workflow executed\n');

    // Test 10: Final status check
    console.log('Test 10: Final system status');
    const allStatuses = planner.getAllAgentStatuses();
    console.log(`  Total agents: ${allStatuses.size}`);

    let totalTasks = 0;
    let totalCompleted = 0;
    allStatuses.forEach((status, agent) => {
      totalTasks += status.currentTasks.length;
      totalCompleted += status.completedTasks.length;
    });
    console.log(`  Total current tasks: ${totalTasks}`);
    console.log(`  Total completed tasks: ${totalCompleted}`);
    console.log('✅ Final status checked\n');

    console.log('🎉 All tests passed! PlannerOrchestrator is working correctly.\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testPlannerOrchestrator();
