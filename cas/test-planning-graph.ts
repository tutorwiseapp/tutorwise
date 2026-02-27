/**
 * Manual test for Planning Graph
 * Run with: npm run build && node dist/test-planning-graph.js
 */

import { executePlanningWorkflow } from './packages/core/src/workflows/PlanningGraph.js';

async function testPlanningGraph() {
  console.log('='.repeat(80));
  console.log('Testing LangGraph Planning Graph - Security Feature Test');
  console.log('='.repeat(80));
  console.log('');

  try {
    const result = await executePlanningWorkflow({
      featureName: 'Two-Factor Authentication',
      featureQuery: 'Implement two-factor authentication for user login with SMS and authenticator app support',
    });

    console.log('\n' + '='.repeat(80));
    console.log('WORKFLOW RESULTS');
    console.log('='.repeat(80));
    console.log('');
    console.log('Feature Name:', result.featureName);
    console.log('Completed Steps:', result.completedSteps);
    console.log('Final Step:', result.currentStep);
    console.log('Errors:', result.metadata.errors.length);
    console.log('');

    if (result.featureBrief) {
      console.log('Feature Brief (first 200 chars):');
      console.log(result.featureBrief.substring(0, 200) + '...');
      console.log('');
    }

    if (result.developmentPlan) {
      console.log('Development Plan:');
      console.log(JSON.stringify(result.developmentPlan, null, 2));
      console.log('');
    }

    if (result.testResults) {
      console.log('Test Results:');
      console.log(`- Tests Passed: ${result.testResults.passedTests}/${result.testResults.totalTests}`);
      console.log(`- Coverage: ${result.testResults.coverage}%`);
      console.log('');
    }

    if (result.qaReport) {
      console.log('QA Report (first 200 chars):');
      console.log(result.qaReport.substring(0, 200) + '...');
      console.log('');
    }

    if (result.securityReport) {
      console.log('Security Report:');
      console.log(`- Passed: ${result.securityReport.passed}`);
      console.log(`- Vulnerabilities: ${result.securityReport.vulnerabilities?.length || 0}`);
      console.log(`- Code Issues: ${result.securityReport.codeIssues?.length || 0}`);
      console.log('');
    }

    if (result.productionMetrics) {
      console.log('Production Metrics:');
      console.log(JSON.stringify(result.productionMetrics, null, 2));
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ SECURITY FEATURE TEST COMPLETE');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPlanningGraph();
