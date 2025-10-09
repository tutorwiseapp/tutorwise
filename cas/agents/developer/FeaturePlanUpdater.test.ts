/**
 * Tests for FeaturePlanUpdater
 *
 * Run with: npx ts-node cas/agents/developer/FeaturePlanUpdater.test.ts
 */

import { FeaturePlanUpdater, FeatureStatus } from './FeaturePlanUpdater.js';

async function testFeaturePlanUpdater() {
  console.log('🧪 Testing FeaturePlanUpdater...\n');

  const updater = new FeaturePlanUpdater(2);

  try {
    // Test 1: Update timestamp
    console.log('Test 1: Update timestamp');
    await updater.updateTimestamp();
    console.log('✅ Timestamp updated\n');

    // Test 2: Update todos for ClientProfessionalInfoForm
    console.log('Test 2: Update todos for ClientProfessionalInfoForm');
    await updater.updateFromTodos(
      [
        {
          content: 'Study TutorProfessionalInfoForm pattern',
          status: 'completed',
          activeForm: 'Studying pattern',
        },
        {
          content: 'Define client-specific fields',
          status: 'completed',
          activeForm: 'Defining fields',
        },
        {
          content: 'Implement form component',
          status: 'completed',
          activeForm: 'Implementing component',
        },
        {
          content: 'Write unit tests (target: 15 tests, >80% coverage)',
          status: 'completed',
          activeForm: 'Writing tests',
        },
        {
          content: 'Create Storybook stories (12 stories)',
          status: 'completed',
          activeForm: 'Creating stories',
        },
      ],
      'ClientProfessionalInfoForm'
    );
    console.log('✅ Todos updated for ClientProfessionalInfoForm\n');

    // Test 3: Update test results
    console.log('Test 3: Update test results for ClientProfessionalInfoForm');
    await updater.updateTestResults('ClientProfessionalInfoForm', {
      unitTests: '✅ Unit Tests: 21/21 passing (100%)',
      coverage: '✅ Coverage: 94.66%',
      status: 'Excellent - Production ready',
    });
    console.log('✅ Test results updated\n');

    // Test 4: Update QA review
    console.log('Test 4: Update QA review for ClientProfessionalInfoForm');
    await updater.updateQAReview('ClientProfessionalInfoForm', {
      accessibility: 'Passed',
      visualRegression: '14 stories created',
      codeQuality: 'Clean, well-structured',
    });
    console.log('✅ QA review updated\n');

    // Test 5: Update todos for AgentProfessionalInfoForm
    console.log('Test 5: Update todos for AgentProfessionalInfoForm');
    await updater.updateFromTodos(
      [
        {
          content: 'Study TutorProfessionalInfoForm pattern',
          status: 'completed',
          activeForm: 'Studying pattern',
        },
        {
          content: 'Define agent-specific fields',
          status: 'completed',
          activeForm: 'Defining fields',
        },
        {
          content: 'Implement form component',
          status: 'completed',
          activeForm: 'Implementing component',
        },
        {
          content: 'Write unit tests (target: 15 tests, >80% coverage)',
          status: 'completed',
          activeForm: 'Writing tests',
        },
        {
          content: 'Create Storybook stories (12 stories)',
          status: 'completed',
          activeForm: 'Creating stories',
        },
      ],
      'AgentProfessionalInfoForm'
    );
    console.log('✅ Todos updated for AgentProfessionalInfoForm\n');

    // Test 6: Update test results for Agent form
    console.log('Test 6: Update test results for AgentProfessionalInfoForm');
    await updater.updateTestResults('AgentProfessionalInfoForm', {
      unitTests: '✅ Unit Tests: 27/27 passing (100%)',
      coverage: '✅ Coverage: 90.52%',
      status: 'Excellent - Production ready',
    });
    console.log('✅ Test results updated\n');

    // Test 7: Update QA review for Agent form
    console.log('Test 7: Update QA review for AgentProfessionalInfoForm');
    await updater.updateQAReview('AgentProfessionalInfoForm', {
      accessibility: 'Passed',
      visualRegression: '15 stories created',
      codeQuality: 'Clean, well-structured',
    });
    console.log('✅ QA review updated\n');

    // Test 8: Final timestamp update
    console.log('Test 8: Final timestamp update');
    await updater.updateTimestamp();
    console.log('✅ Final timestamp updated\n');

    console.log('🎉 All tests passed! Feature plan has been updated with Week 2 data.\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testFeaturePlanUpdater();
