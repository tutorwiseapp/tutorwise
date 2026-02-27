/**
 * Planning Graph Tests
 *
 * Tests for the LangGraph Planning Graph workflow
 */

import { describe, it, expect } from 'vitest';
import { buildPlanningGraph, executePlanningWorkflow } from './PlanningGraph';

describe('PlanningGraph', () => {
  it('should build the planning graph successfully', () => {
    const graph = buildPlanningGraph();
    expect(graph).toBeDefined();
  });

  it('should execute Phase 1 workflow (Analyst → Developer → Tester)', async () => {
    const result = await executePlanningWorkflow({
      featureName: 'User Profile Avatar Upload',
      featureQuery: 'Add ability for users to upload custom avatar images to their profile',
    });

    // Verify workflow completed successfully
    expect(result).toBeDefined();
    expect(result.completedSteps).toContain('analyst');
    expect(result.completedSteps).toContain('developer');
    expect(result.completedSteps).toContain('tester');

    // Verify each stage produced output
    expect(result.featureBrief).toBeDefined();
    expect(result.developmentPlan).toBeDefined();
    expect(result.testResults).toBeDefined();

    // Verify final state
    expect(result.currentStep).toBe('tester_complete');
    expect(result.metadata.errors).toHaveLength(0);

    console.log('\n=== Phase 1 Workflow Results ===');
    console.log('Feature:', result.featureName);
    console.log('Completed Steps:', result.completedSteps);
    console.log('Final Step:', result.currentStep);
    console.log('Errors:', result.metadata.errors);
  }, 30000); // 30s timeout for full workflow

  it('should execute Phase 2 workflow (all 6 agents)', async () => {
    const result = await executePlanningWorkflow({
      featureName: 'Two-Factor Authentication',
      featureQuery: 'Implement 2FA using TOTP for user accounts',
    });

    // Verify all agents executed
    expect(result.completedSteps).toContain('analyst');
    expect(result.completedSteps).toContain('developer');
    expect(result.completedSteps).toContain('tester');
    expect(result.completedSteps).toContain('qa');
    expect(result.completedSteps).toContain('security');
    expect(result.completedSteps).toContain('marketer');

    // Verify outputs from each agent
    expect(result.featureBrief).toBeDefined();
    expect(result.developmentPlan).toBeDefined();
    expect(result.testResults).toBeDefined();
    expect(result.qaReport).toBeDefined();
    expect(result.securityReport).toBeDefined();
    expect(result.productionMetrics).toBeDefined();

    // Verify security scan passed
    expect(result.securityReport?.passed).toBe(true);

    console.log('\n=== Phase 2 Workflow Results ===');
    console.log('Feature:', result.featureName);
    console.log('Completed Steps:', result.completedSteps);
    console.log('Security Scan Passed:', result.securityReport?.passed);
    console.log('Test Coverage:', result.testResults?.coverage, '%');
  }, 60000); // 60s timeout for full workflow
});

describe('PlanningGraph - Conditional Routing', () => {
  it('should route correctly when tests pass', async () => {
    const result = await executePlanningWorkflow({
      featureName: 'Test Feature',
      featureQuery: 'A simple test feature',
    });

    // Tests should pass and route to QA
    expect(result.testResults?.passed).toBe(true);
    expect(result.completedSteps).toContain('qa');
  });

  // TODO: Add test for failed tests scenario
  // TODO: Add test for security scan failure scenario
});
