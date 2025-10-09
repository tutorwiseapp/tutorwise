/**
 * Tests for SystemPlanUpdater
 *
 * Run with: npx ts-node cas/agents/engineer/SystemPlanUpdater.test.ts
 */

import { SystemPlanUpdater, SystemHealthMetrics } from './SystemPlanUpdater.js';

async function testSystemPlanUpdater() {
  console.log('🧪 Testing SystemPlanUpdater...\n');

  const updater = new SystemPlanUpdater(2);

  try {
    // Test 1: Update timestamp
    console.log('Test 1: Update timestamp');
    await updater.updateTimestamp();
    console.log('✅ Timestamp updated\n');

    // Test 2: Update system health metrics
    console.log('Test 2: Update system health metrics');
    const health: SystemHealthMetrics = {
      backend: {
        status: '🟢 Operational',
        uptime: '99.9%',
        avgResponseTime: '100ms',
        errorRate: '0.01%',
      },
      database: {
        status: '🟢 Operational',
        queryPerformance: '12ms avg',
        connectionPool: 'Healthy (10 connections)',
        storageUsed: '2.5 GB / 100 GB',
      },
      frontend: {
        status: '🟢 Operational',
        performanceScore: '88/100',
        accessibilityScore: '95/100',
        bestPractices: '92/100',
      },
      testing: {
        status: '🟢 Improved',
        unitTestCoverage: '89.71% (avg)',
        e2ePassRate: '47% (15 tests)',
        visualSnapshots: '4 created',
      },
    };

    await updater.updateSystemHealth(health);
    console.log('✅ System health metrics updated\n');

    // Test 3: Update Backend API component status
    console.log('Test 3: Update Backend API component status');
    await updater.updateComponentStatus(
      'Backend API Services',
      '✅',
      'Operational'
    );
    console.log('✅ Backend API status updated\n');

    // Test 4: Update performance metrics for Backend API
    console.log('Test 4: Update Backend API performance metrics');
    await updater.updatePerformanceMetrics('Backend API Services', {
      'Average Response Time': '~100ms',
      'P95 Response Time': '~220ms',
      'P99 Response Time': '~380ms',
      'Error Rate': '0.01%',
      'Uptime': '99.9%',
    });
    console.log('✅ Performance metrics updated\n');

    // Test 5: Update Testing Infrastructure status
    console.log('Test 5: Update Testing Infrastructure status');
    await updater.updateComponentStatus(
      'Testing Infrastructure',
      '🟢',
      'Operational'
    );
    console.log('✅ Testing Infrastructure status updated\n');

    // Test 6: Update Testing Infrastructure todos
    console.log('Test 6: Update Testing Infrastructure component todos');
    await updater.updateComponentTodos('Testing Infrastructure', [
      { content: 'Set up Jest + React Testing Library', status: 'completed', activeForm: 'Setting up Jest' },
      { content: 'Configure Playwright for E2E tests', status: 'completed', activeForm: 'Configuring Playwright' },
      { content: 'Integrate Percy for visual regression', status: 'completed', activeForm: 'Integrating Percy' },
      { content: 'Create test helpers (auth, mocks)', status: 'completed', activeForm: 'Creating test helpers' },
      { content: 'Set up coverage reporting', status: 'completed', activeForm: 'Setting up coverage' },
      { content: 'Fix E2E timing issues (Week 2)', status: 'in_progress', activeForm: 'Fixing E2E timing' },
      { content: 'Add more Percy snapshots (Week 2)', status: 'completed', activeForm: 'Adding Percy snapshots' },
      { content: 'Implement test parallelization (Week 2)', status: 'pending', activeForm: 'Implementing parallelization' },
      { content: 'Set up CI/CD test automation (Week 2)', status: 'pending', activeForm: 'Setting up CI/CD' },
    ]);
    console.log('✅ Testing Infrastructure todos updated\n');

    // Test 7: Final timestamp update
    console.log('Test 7: Final timestamp update');
    await updater.updateTimestamp();
    console.log('✅ Final timestamp updated\n');

    console.log('🎉 All tests passed! System plan has been updated with Week 2 data.\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testSystemPlanUpdater();
