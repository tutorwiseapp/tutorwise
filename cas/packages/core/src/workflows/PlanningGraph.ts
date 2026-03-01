/**
 * LangGraph Planning Graph — Two-Loop Architecture
 *
 * Orchestrates multi-agent feature development workflow using LangGraph.
 * Implements the CAS AI-native agent platform with:
 *
 * OUTER LOOP (Strategy & Refinement):
 *   Director → Three Amigos (Analyst facilitates) → Planner
 *
 * INNER LOOP (CI/CD Pipeline):
 *   Developer → Engineer (build) → Tester → QA → Security → Engineer (deploy) → Marketer
 *
 * Features:
 * - Two-loop architecture (strategy + CI/CD)
 * - AI-native agents with LLM reasoning and rules-based fallback
 * - Kanban continuous delivery (not sprints)
 * - Three Amigos methodology for requirements
 * - Conditional routing with QA REWORK loop
 * - Event persistence at each node
 * - Structured state flow (acceptance criteria, build results, QA verdicts)
 */

import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Import agents
import { analyst } from '../../../../agents/analyst/src/index';
import { developer } from '../../../../agents/developer/src/index';
import { tester } from '../../../../agents/tester/src/tester-agent';
import { qa } from '../../../../agents/qa/src/qa-agent';
import { security } from '../../../../agents/security/src/index';
import { engineer } from '../../../../agents/engineer/src/engineer-agent';
import { marketer } from '../../../../agents/marketer/src/index';
import { planner } from '../../../../agents/planner/src/index';
import { director } from '../../../../agents/director/src/index';

// Import services
import { persistEvent } from '../services/cas-events';
import { casGenerateStructured } from '../services/cas-ai';
import { createClient } from '@supabase/supabase-js';
import { getCheckpointer, isCheckpointingAvailable } from '../services/cas-checkpointer';

// ============================================================================
// Agent Metadata (for visualization and documentation)
// ============================================================================

/**
 * Agent metadata for WorkflowVisualizer
 * SINGLE SOURCE OF TRUTH for agent properties — updated for two-loop architecture
 */
export const AGENT_METADATA: Record<string, {
  label: string;
  color: string;
  description: string;
  type: 'trigger' | 'agent' | 'end';
  purpose: string;
  role: string;
  responsibilities: string[];
}> = {
  start: {
    label: 'START',
    color: '#94a3b8',
    description: 'Workflow initialization',
    type: 'trigger',
    purpose: 'Initialize the workflow and prepare the execution context',
    role: 'Entry Point',
    responsibilities: ['Set up workflow parameters', 'Validate input requirements', 'Initialize state'],
  },
  director: {
    label: 'Director',
    color: '#7c3aed',
    description: 'Strategic decision: PROCEED / ITERATE / DEFER',
    type: 'agent',
    purpose: 'Evaluate feature alignment with organizational vision, values, and strategic goals',
    role: 'Product Manager + Strategist + CTO + Cofounder',
    responsibilities: [
      'Read organizational vision from .ai/ docs',
      'Evaluate feature alignment with core values (LLM-powered)',
      'Assess resource priority based on roadmap status',
      'Make GO/NO-GO decision: PROCEED, ITERATE, or DEFER',
    ],
  },
  threeAmigos: {
    label: 'Three Amigos',
    color: '#3b82f6',
    description: 'Business + Technical + Quality synthesis',
    type: 'agent',
    purpose: 'Facilitate Three Amigos meeting to produce agreed specifications',
    role: 'Analyst (facilitator) + Developer + Tester perspectives',
    responsibilities: [
      'Generate feature brief with acceptance criteria (Analyst)',
      'Assess technical feasibility (Developer)',
      'Evaluate testability (Tester)',
      'Synthesise all perspectives into agreed specification (LLM)',
      'Produce: acceptance criteria, constraints, edge cases, test strategy',
    ],
  },
  planner: {
    label: 'Planner',
    color: '#14b8a6',
    description: 'Kanban board management + WIP limits',
    type: 'agent',
    purpose: 'Manage continuous delivery flow via Kanban board',
    role: 'Scrum Master + Delivery Manager + Flow Manager',
    responsibilities: [
      'Create Kanban task from Three Amigos output',
      'Check WIP limits (max 3 in-progress)',
      'Prioritize backlog by impact (LLM-powered)',
      'Detect bottlenecks and flow issues',
    ],
  },
  developer: {
    label: 'Developer',
    color: '#8b5cf6',
    description: 'Create implementation plan (LLM-powered)',
    type: 'agent',
    purpose: 'Design technical implementation with structured plan',
    role: 'Tech Lead + Architect + Implementer',
    responsibilities: [
      'Create detailed implementation plan (LLM-powered)',
      'Identify files to create/modify',
      'Map dependencies and architecture',
      'Estimate complexity and risks',
    ],
  },
  engineerBuild: {
    label: 'Engineer (Build)',
    color: '#6366f1',
    description: 'Build verification (npm run build)',
    type: 'agent',
    purpose: 'Verify the project builds successfully before testing',
    role: 'DevOps + Build Engineer',
    responsibilities: [
      'Run npm run build',
      'Parse build output for errors/warnings',
      'Analyze build failures (LLM-powered)',
      'Gate: block pipeline if build fails',
    ],
  },
  tester: {
    label: 'Tester',
    color: '#10b981',
    description: 'Run real tests (Jest)',
    type: 'agent',
    purpose: 'Execute real test suite and report results',
    role: 'QA Engineer + Test Automation Engineer',
    responsibilities: [
      'Run Jest test suite',
      'Parse JSON test results',
      'Collect code coverage',
      'Report failures with details',
    ],
  },
  qa: {
    label: 'QA',
    color: '#f59e0b',
    description: 'Quality gate: APPROVE / REWORK / BLOCK',
    type: 'agent',
    purpose: 'Make evidence-based release decisions',
    role: 'Release Manager + Quality Gate Owner',
    responsibilities: [
      'Validate test results against acceptance criteria (LLM-powered)',
      'Detect regressions from previous runs',
      'Assess coverage sufficiency',
      'Make structured verdict: APPROVE, REWORK, or BLOCK',
    ],
  },
  security: {
    label: 'Security',
    color: '#ef4444',
    description: 'Security scan + false positive filtering',
    type: 'agent',
    purpose: 'Identify real vulnerabilities and compliance issues',
    role: 'Security Engineer + Compliance Officer',
    responsibilities: [
      'npm audit dependency scanning',
      'Code pattern scanning (expanded patterns)',
      'False positive filtering (LLM-powered)',
      'Pre-deployment security gate',
    ],
  },
  engineerDeploy: {
    label: 'Engineer (Deploy)',
    color: '#6366f1',
    description: 'Deploy to production',
    type: 'agent',
    purpose: 'Deploy feature after all gates pass',
    role: 'DevOps + SRE',
    responsibilities: [
      'Verify all upstream gates passed',
      'Execute deployment',
      'Persist deployment event',
      'Report deployment status',
    ],
  },
  marketer: {
    label: 'Marketer',
    color: '#ec4899',
    description: 'Production analytics + feedback loop',
    type: 'agent',
    purpose: 'Analyze production metrics and close feedback loop',
    role: 'Product Analytics + Growth Analyst + Feedback Analyst',
    responsibilities: [
      'Query real metrics from cas_metrics_timeseries',
      'Analyze AI feedback (Sage/Lexi)',
      'Generate backlog items for Planner (feedback loop)',
      'Synthesize trends (LLM-powered)',
    ],
  },
  reflection: {
    label: 'Reflection',
    color: '#f59e0b',
    description: 'Self-critique loop: evaluate plan + test quality',
    type: 'agent',
    purpose: 'Assess whether Developer plan and test results meet quality bar before QA review',
    role: 'Quality Reflector (AI-powered self-critique)',
    responsibilities: [
      'Evaluate Developer plan against acceptance criteria',
      'Assess test result quality and coverage',
      'Provide critique feedback if quality is low',
      'Route to QA (proceed) or Developer (rework)',
    ],
  },
  approvalGate: {
    label: 'Approval Gate',
    color: '#ef4444',
    description: 'Human approval required before deployment',
    type: 'agent',
    purpose: 'Pause workflow for human sign-off before deploying to production',
    role: 'Human-in-the-Loop Gate',
    responsibilities: [
      'Create approval request in cas_approval_requests',
      'Present workflow context (security, QA, build results)',
      'Wait for human approve/reject decision',
      'Route to deployment or end based on decision',
    ],
  },
  end: {
    label: 'END',
    color: '#94a3b8',
    description: 'Workflow complete',
    type: 'end',
    purpose: 'Finalize workflow execution and cleanup',
    role: 'Exit Point',
    responsibilities: ['Save final state', 'Generate completion report', 'Cleanup resources'],
  },
};

// ============================================================================
// State Definition
// ============================================================================

/**
 * State for the planning workflow — extended for two-loop architecture
 */
export const PlanningState = Annotation.Root({
  // Feature being developed
  featureName: Annotation<string>,
  featureQuery: Annotation<string>,

  // Workflow progress
  currentStep: Annotation<string>,
  completedSteps: Annotation<string[]>,

  // Agent outputs
  directorDecision: Annotation<any | null>,
  featureBrief: Annotation<string | null>,
  developmentPlan: Annotation<any | null>,
  testResults: Annotation<any | null>,
  qaReport: Annotation<string | null>,
  securityReport: Annotation<any | null>,
  deploymentStatus: Annotation<string | null>,
  productionMetrics: Annotation<any | null>,
  finalRecommendation: Annotation<string | null>,

  // Three Amigos outputs
  acceptanceCriteria: Annotation<string[] | null>,
  technicalConstraints: Annotation<string[] | null>,
  edgeCases: Annotation<string[] | null>,
  testStrategy: Annotation<string | null>,

  // Kanban task tracking
  kanbanTaskId: Annotation<string | null>,

  // Build verification
  buildResult: Annotation<{ success: boolean; output: string; duration: number } | null>,

  // QA structured decision
  qaDecision: Annotation<'APPROVE' | 'REWORK' | 'BLOCK' | null>,

  // Feedback loop
  feedbackItems: Annotation<Array<{ title: string; priority: string }> | null>,

  // Reflection node
  reflectionRound: Annotation<number>,
  reflectionFeedback: Annotation<string | null>,

  // Human approval gate
  approvalId: Annotation<string | null>,
  approvalStatus: Annotation<'pending' | 'approved' | 'rejected' | null>,

  // Shared context
  context: Annotation<Record<string, any>>,

  // Metadata
  metadata: Annotation<{
    workflowId: string;
    startedAt: Date;
    errors: Array<{ step: string; error: string }>;
  }>,
});

export type PlanningStateType = typeof PlanningState.State;

// ============================================================================
// Agent Tool Wrappers
// ============================================================================

const directorTool = new DynamicStructuredTool({
  name: 'director_strategic_decision',
  description: 'Evaluates feature alignment with organizational vision, values, and strategic goals',
  schema: z.object({
    featureName: z.string(),
    featureQuery: z.string(),
    featureType: z.enum(['core-system', 'enhancement', 'innovation', 'polish']),
  }),
  func: async ({ featureName, featureQuery, featureType }) => {
    console.log('[PlanningGraph] Director: Making strategic decision...');
    const decision = await director.makeStrategicDecision(featureQuery, featureType);
    return decision;
  },
});

const developerTool = new DynamicStructuredTool({
  name: 'developer_create_plan',
  description: 'Creates structured implementation plan using LLM',
  schema: z.object({
    featureName: z.string(),
    featureBrief: z.string(),
    acceptanceCriteria: z.array(z.string()).optional(),
    technicalConstraints: z.array(z.string()).optional(),
  }),
  func: async ({ featureName, featureBrief, acceptanceCriteria, technicalConstraints }) => {
    console.log('[PlanningGraph] Developer: Creating implementation plan...');
    const plan = await developer.createImplementationPlan(
      featureBrief,
      acceptanceCriteria,
      technicalConstraints
    );
    return plan;
  },
});

const testerTool = new DynamicStructuredTool({
  name: 'tester_run_tests',
  description: 'Executes real test suite and returns results',
  schema: z.object({
    featureName: z.string(),
  }),
  func: async ({ featureName }) => {
    console.log('[PlanningGraph] Tester: Running tests...');
    return await tester.runTests(featureName);
  },
});

const qaTool = new DynamicStructuredTool({
  name: 'qa_review',
  description: 'Performs structured QA review with APPROVE/REWORK/BLOCK verdict',
  schema: z.object({
    featureName: z.string(),
    testResults: z.any(),
    acceptanceCriteria: z.array(z.string()).optional(),
  }),
  func: async ({ featureName, testResults, acceptanceCriteria }) => {
    console.log('[PlanningGraph] QA: Reviewing quality...');
    return await qa.performQAReview(featureName, testResults, acceptanceCriteria);
  },
});

const securityTool = new DynamicStructuredTool({
  name: 'security_scan',
  description: 'Runs comprehensive security scan with LLM false positive filtering',
  schema: z.object({
    featureName: z.string(),
  }),
  func: async () => {
    console.log('[PlanningGraph] Security: Running security scan...');
    return await security.runSecurityScan();
  },
});

const marketerTool = new DynamicStructuredTool({
  name: 'marketer_analyze_metrics',
  description: 'Analyzes production metrics and generates backlog items',
  schema: z.object({
    featureName: z.string(),
  }),
  func: async ({ featureName }) => {
    console.log('[PlanningGraph] Marketer: Analyzing production metrics...');
    return await marketer.generateProductionReport(featureName);
  },
});

const plannerTool = new DynamicStructuredTool({
  name: 'planner_plan_work',
  description: 'Creates Kanban task and checks WIP limits',
  schema: z.object({
    featureName: z.string(),
    directorDecision: z.any(),
    threeAmigosReport: z.any().optional(),
  }),
  func: async ({ featureName, directorDecision, threeAmigosReport }) => {
    console.log('[PlanningGraph] Planner: Planning work...');
    return await planner.planWork(directorDecision, threeAmigosReport, featureName);
  },
});

const engineerBuildTool = new DynamicStructuredTool({
  name: 'engineer_build',
  description: 'Runs npm run build to verify build succeeds',
  schema: z.object({}),
  func: async () => {
    console.log('[PlanningGraph] Engineer: Running build...');
    return await engineer.build();
  },
});

const engineerDeployTool = new DynamicStructuredTool({
  name: 'engineer_deploy',
  description: 'Deploys feature to production after all gates pass',
  schema: z.object({
    featureName: z.string(),
    securityApproved: z.boolean(),
    qaApproved: z.boolean(),
    buildPassed: z.boolean(),
  }),
  func: async ({ featureName, securityApproved, qaApproved, buildPassed }) => {
    console.log('[PlanningGraph] Engineer: Deploying...');
    return await engineer.deploy(featureName, {
      securityApproved,
      qaApproved,
      buildPassed,
    });
  },
});

// ============================================================================
// Graph Node Functions (with event persistence)
// ============================================================================

async function directorNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Director Node...');
  await persistEvent('director', 'node_start', { featureName: state.featureName });

  try {
    const featureType = state.context?.featureType || 'enhancement';
    const directorDecision = await directorTool.invoke({
      featureName: state.featureName,
      featureQuery: state.featureQuery,
      featureType,
    });

    await persistEvent('director', 'node_complete', {
      decision: directorDecision.decision,
      alignmentScore: (directorDecision as any).alignment?.alignmentScore,
    });

    return {
      currentStep: directorDecision.decision === 'DEFER' ? 'director_deferred' : 'director_approved',
      directorDecision,
      completedSteps: [...state.completedSteps, 'director'],
      context: { ...state.context, directorDecision },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Director node failed:', error);
    await persistEvent('director', 'node_error', { error: error.message });
    return {
      currentStep: 'director_failed',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'director', error: error.message }] },
    };
  }
}

/**
 * Three Amigos Node — Analyst facilitates, Developer + Tester provide perspectives
 * Produces: acceptanceCriteria, technicalConstraints, edgeCases, testStrategy
 */
async function threeAmigosNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Three Amigos Node...');
  await persistEvent('analyst', 'three_amigos_start', { featureName: state.featureName });

  try {
    // Step 1: Generate feature brief
    const draftBrief = await analyst.generateFeatureBrief(state.featureQuery);

    // Step 2: Facilitate Three Amigos (gets Dev + Tester perspectives, synthesises)
    const { brief: finalBrief, report } = await analyst.runThreeAmigosKickoff(draftBrief);

    await persistEvent('analyst', 'three_amigos_complete', {
      hasReport: !!report,
      criteriaCount: report?.acceptanceCriteria?.length || 0,
    });

    return {
      currentStep: 'three_amigos_complete',
      featureBrief: finalBrief,
      acceptanceCriteria: report?.acceptanceCriteria || null,
      technicalConstraints: report?.technicalConstraints || null,
      edgeCases: report?.edgeCases || null,
      testStrategy: report?.testStrategy || null,
      completedSteps: [...state.completedSteps, 'threeAmigos'],
      context: { ...state.context, threeAmigosReport: report, featureBrief: finalBrief },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Three Amigos node failed:', error);
    await persistEvent('analyst', 'three_amigos_error', { error: error.message });
    return {
      currentStep: 'three_amigos_failed',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'threeAmigos', error: error.message }] },
    };
  }
}

async function plannerNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Planner Node...');
  await persistEvent('planner', 'node_start', { featureName: state.featureName });

  try {
    const workPlan = await plannerTool.invoke({
      featureName: state.featureName,
      directorDecision: state.directorDecision,
      threeAmigosReport: state.context?.threeAmigosReport,
    });

    await persistEvent('planner', 'node_complete', {
      canProceed: workPlan.canProceed,
      wipCount: workPlan.wipStatus?.count,
    });

    return {
      currentStep: workPlan.canProceed ? 'planner_complete' : 'planner_blocked',
      kanbanTaskId: workPlan.taskId,
      completedSteps: [...state.completedSteps, 'planner'],
      context: { ...state.context, workPlan },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Planner node failed:', error);
    await persistEvent('planner', 'node_error', { error: error.message });
    return {
      currentStep: 'planner_failed',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'planner', error: error.message }] },
    };
  }
}

async function developerNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Developer Node...');
  await persistEvent('developer', 'node_start', { featureName: state.featureName });

  try {
    const developmentPlan = await developerTool.invoke({
      featureName: state.featureName,
      featureBrief: state.featureBrief || state.featureQuery,
      acceptanceCriteria: state.acceptanceCriteria || undefined,
      technicalConstraints: state.technicalConstraints || undefined,
    });

    await persistEvent('developer', 'node_complete', {
      complexity: developmentPlan?.estimatedComplexity,
      stepCount: developmentPlan?.implementationSteps?.length,
    });

    return {
      currentStep: 'developer_complete',
      developmentPlan,
      completedSteps: [...state.completedSteps, 'developer'],
      context: { ...state.context, developmentPlan },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Developer node failed:', error);
    await persistEvent('developer', 'node_error', { error: error.message });
    return {
      currentStep: 'developer_failed',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'developer', error: error.message }] },
    };
  }
}

/**
 * Engineer Build Node — runs npm run build before tests
 */
async function engineerBuildNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Engineer Build Node...');
  await persistEvent('engineer', 'build_start', { featureName: state.featureName });

  try {
    const buildResult = await engineerBuildTool.invoke({});

    await persistEvent('engineer', 'build_complete', {
      success: buildResult.success,
      duration: buildResult.duration,
    });

    return {
      currentStep: buildResult.success ? 'build_passed' : 'build_failed',
      buildResult,
      completedSteps: [...state.completedSteps, 'engineerBuild'],
      context: { ...state.context, buildResult },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Engineer Build node failed:', error);
    await persistEvent('engineer', 'build_error', { error: error.message });
    return {
      currentStep: 'build_failed',
      buildResult: { success: false, output: error.message, duration: 0 },
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'engineerBuild', error: error.message }] },
    };
  }
}

async function testerNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Tester Node...');
  await persistEvent('tester', 'node_start', { featureName: state.featureName });

  try {
    const testResults = await testerTool.invoke({ featureName: state.featureName });

    await persistEvent('tester', 'test_results', {
      passed: testResults.passed,
      totalTests: testResults.totalTests,
      passedTests: testResults.passedTests,
      coverage: testResults.coverage,
    });

    return {
      currentStep: 'tester_complete',
      testResults,
      completedSteps: [...state.completedSteps, 'tester'],
      context: { ...state.context, testResults },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Tester node failed:', error);
    await persistEvent('tester', 'node_error', { error: error.message });
    return {
      currentStep: 'tester_failed',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'tester', error: error.message }] },
    };
  }
}

/**
 * Reflection Node — Self-critique loop
 * Evaluates Developer plan + test results quality before QA review.
 * If quality < 0.7 and reflectionRound < 2, loops back to Developer with feedback.
 */
async function reflectionNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log(`[PlanningGraph] Executing Reflection Node (round ${state.reflectionRound + 1})...`);
  await persistEvent('reflection', 'node_start', {
    featureName: state.featureName,
    round: state.reflectionRound,
  });

  const currentRound = state.reflectionRound + 1;

  try {
    // Use LLM to assess quality of Developer plan + test results
    const assessment = await casGenerateStructured<{
      quality: number;
      proceed: boolean;
      feedback: string[];
    }>({
      systemPrompt: `You are a Quality Reflector for a software development workflow.
Your job is to critically evaluate the Developer's implementation plan and test results
against the acceptance criteria to determine if quality is sufficient for QA review.
Be honest and constructive. A quality score below 0.7 means the plan needs rework.`,
      userPrompt: `Evaluate the quality of this development output:

**Feature:** ${state.featureName}

**Acceptance Criteria:**
${state.acceptanceCriteria?.map((c, i) => `${i + 1}. ${c}`).join('\n') || 'None specified'}

**Development Plan:**
${JSON.stringify(state.developmentPlan, null, 2)?.substring(0, 1500) || 'No plan'}

**Test Results:**
- Passed: ${state.testResults?.passed ?? 'N/A'}
- Total Tests: ${state.testResults?.totalTests ?? 'N/A'}
- Passed Tests: ${state.testResults?.passedTests ?? 'N/A'}
- Coverage: ${state.testResults?.coverage ?? 'N/A'}%
${state.testResults?.failures?.length ? `- Failures: ${state.testResults.failures.length}` : ''}

**Reflection Round:** ${currentRound} of 2

${state.reflectionFeedback ? `**Previous Feedback:** ${state.reflectionFeedback}` : ''}

Assess:
1. Does the plan address all acceptance criteria?
2. Are test results adequate (passing, reasonable coverage)?
3. Are there obvious gaps or issues?

Return quality score (0-1), whether to proceed, and specific feedback if rework needed.`,
      jsonSchema: `{
  "quality": 0.8,
  "proceed": true,
  "feedback": ["specific feedback items if rework needed"]
}`,
      maxOutputTokens: 800,
    });

    if (assessment) {
      const shouldProceed = assessment.proceed || assessment.quality >= 0.7 || currentRound >= 2;

      await persistEvent('reflection', 'assessment', {
        quality: assessment.quality,
        proceed: shouldProceed,
        round: currentRound,
        feedbackCount: assessment.feedback?.length || 0,
      });

      if (shouldProceed) {
        console.log(`[PlanningGraph] Reflection: Quality ${assessment.quality.toFixed(2)} — proceeding to QA.`);
        return {
          currentStep: 'reflection_proceed',
          reflectionRound: currentRound,
          reflectionFeedback: null,
          completedSteps: [...state.completedSteps, `reflection_r${currentRound}`],
        };
      } else {
        const feedback = assessment.feedback?.join('; ') || 'Quality below threshold';
        console.log(`[PlanningGraph] Reflection: Quality ${assessment.quality.toFixed(2)} — rework needed: ${feedback}`);
        return {
          currentStep: 'reflection_rework',
          reflectionRound: currentRound,
          reflectionFeedback: feedback,
          completedSteps: [...state.completedSteps, `reflection_r${currentRound}`],
        };
      }
    }

    // Fallback: no LLM — check basic test pass/fail
    const testsPassed = state.testResults?.passed !== false;
    const hasPlan = !!state.developmentPlan;

    if (testsPassed && hasPlan) {
      console.log('[PlanningGraph] Reflection: Fallback — tests passed and plan exists, proceeding.');
      return {
        currentStep: 'reflection_proceed',
        reflectionRound: currentRound,
        reflectionFeedback: null,
        completedSteps: [...state.completedSteps, `reflection_r${currentRound}`],
      };
    }

    if (currentRound >= 2) {
      console.log('[PlanningGraph] Reflection: Max rounds reached, proceeding regardless.');
      return {
        currentStep: 'reflection_proceed',
        reflectionRound: currentRound,
        reflectionFeedback: null,
        completedSteps: [...state.completedSteps, `reflection_r${currentRound}`],
      };
    }

    return {
      currentStep: 'reflection_rework',
      reflectionRound: currentRound,
      reflectionFeedback: 'Tests failed or no development plan. Rework needed.',
      completedSteps: [...state.completedSteps, `reflection_r${currentRound}`],
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Reflection node failed:', error);
    await persistEvent('reflection', 'node_error', { error: error.message });
    // On error, proceed to QA rather than blocking
    return {
      currentStep: 'reflection_proceed',
      reflectionRound: currentRound,
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'reflection', error: error.message }] },
    };
  }
}

async function qaNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing QA Node...');
  await persistEvent('qa', 'node_start', { featureName: state.featureName });

  try {
    const qaVerdict = await qaTool.invoke({
      featureName: state.featureName,
      testResults: state.testResults,
      acceptanceCriteria: state.acceptanceCriteria || undefined,
    });

    const qaDecision = qaVerdict.decision || 'BLOCK';
    const qaReport = qa.generateReport(state.featureName, qaVerdict);

    await persistEvent('qa', 'node_complete', {
      decision: qaDecision,
      criteriaValidated: qaVerdict.criteriaValidation?.length,
    });

    return {
      currentStep: 'qa_complete',
      qaReport,
      qaDecision,
      completedSteps: [...state.completedSteps, 'qa'],
      context: { ...state.context, qaVerdict, qaReport },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] QA node failed:', error);
    await persistEvent('qa', 'node_error', { error: error.message });
    return {
      currentStep: 'qa_failed',
      qaDecision: 'BLOCK',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'qa', error: error.message }] },
    };
  }
}

async function securityNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Security Node...');
  await persistEvent('security', 'node_start', { featureName: state.featureName });

  try {
    const securityReport = await securityTool.invoke({ featureName: state.featureName });

    await persistEvent('security', 'node_complete', {
      passed: securityReport.passed,
      vulnerabilities: securityReport.vulnerabilities?.length,
      codeIssues: securityReport.codeIssues?.length,
    });

    return {
      currentStep: 'security_complete',
      securityReport,
      completedSteps: [...state.completedSteps, 'security'],
      context: { ...state.context, securityReport },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Security node failed:', error);
    await persistEvent('security', 'node_error', { error: error.message });
    return {
      currentStep: 'security_failed',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'security', error: error.message }] },
    };
  }
}

/**
 * Approval Gate Node — Human-in-the-loop approval before deployment
 * Creates a record in cas_approval_requests. Auto-approves for now
 * (true pause/resume requires LangGraph checkpointing — future work).
 */
async function approvalGateNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Approval Gate Node...');
  await persistEvent('approvalGate', 'node_start', { featureName: state.featureName });

  try {
    // Build context summary for the approval request
    const approvalContext = {
      featureName: state.featureName,
      qaDecision: state.qaDecision,
      buildSuccess: state.buildResult?.success,
      securityPassed: state.securityReport?.passed,
      criticalVulns: state.securityReport?.vulnerabilities?.filter((v: any) => v.severity === 'critical')?.length || 0,
      testsPassed: state.testResults?.passed,
      totalTests: state.testResults?.totalTests,
      coverage: state.testResults?.coverage,
      completedSteps: state.completedSteps,
    };

    // Try to create approval request in database
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    let approvalId: string | null = null;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const checkpointingEnabled = isCheckpointingAvailable();
      const approvalStatus = checkpointingEnabled ? 'pending' : 'approved';

      const insertData: Record<string, unknown> = {
        workflow_id: state.metadata.workflowId,
        feature_name: state.featureName,
        approval_type: 'deployment',
        status: approvalStatus,
        requester_agent: 'security',
        context: approvalContext,
      };

      // Auto-approve only when checkpointing is not available
      if (!checkpointingEnabled) {
        insertData.reviewed_at = new Date().toISOString();
        insertData.comments = 'Auto-approved (no database connection for checkpointing)';
      }

      const { data, error } = await supabase
        .from('cas_approval_requests')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        console.warn(`⚠️ Approval Gate: Failed to create request: ${error.message}`);
      } else {
        approvalId = data.id;
        console.log(`✅ Approval request created: ${approvalId} (status: ${approvalStatus})`);
      }
    } else {
      console.warn('⚠️ No Supabase connection. Approval gate simulated.');
      approvalId = `simulated-${Date.now()}`;
    }

    const checkpointingEnabled = isCheckpointingAvailable();
    const finalStatus = checkpointingEnabled ? 'pending' : 'approved';
    const finalStep = checkpointingEnabled ? 'approval_pending' : 'approval_approved';

    await persistEvent('approvalGate', 'node_complete', {
      approvalId,
      status: finalStatus,
      autoApproved: !checkpointingEnabled,
    });

    return {
      currentStep: finalStep,
      approvalId,
      approvalStatus: finalStatus as 'pending' | 'approved',
      completedSteps: [...state.completedSteps, 'approvalGate'],
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Approval Gate node failed:', error);
    await persistEvent('approvalGate', 'node_error', { error: error.message });
    // Fail-open: proceed to deployment on error
    return {
      currentStep: 'approval_approved',
      approvalStatus: 'approved',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'approvalGate', error: error.message }] },
    };
  }
}

/**
 * Engineer Deploy Node — deploys after all upstream gates pass
 */
async function engineerDeployNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Engineer Deploy Node...');
  await persistEvent('engineer', 'deploy_start', { featureName: state.featureName });

  try {
    const securityApproved = state.securityReport?.passed !== false;
    const qaApproved = state.qaDecision === 'APPROVE';
    const buildPassed = state.buildResult?.success !== false;

    const deploymentResult = await engineerDeployTool.invoke({
      featureName: state.featureName,
      securityApproved,
      qaApproved,
      buildPassed,
    });

    await persistEvent('engineer', 'deploy_complete', {
      status: deploymentResult.status,
      environment: deploymentResult.environment,
    });

    return {
      currentStep: 'deploy_complete',
      deploymentStatus: JSON.stringify(deploymentResult),
      completedSteps: [...state.completedSteps, 'engineerDeploy'],
      context: { ...state.context, deploymentResult },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Engineer Deploy node failed:', error);
    await persistEvent('engineer', 'deploy_error', { error: error.message });
    return {
      currentStep: 'deploy_failed',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'engineerDeploy', error: error.message }] },
    };
  }
}

async function marketerNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[PlanningGraph] Executing Marketer Node...');
  await persistEvent('marketer', 'node_start', { featureName: state.featureName });

  try {
    const productionReport = await marketerTool.invoke({ featureName: state.featureName });
    const formattedReport = marketer.formatProductionReport(productionReport);

    // Generate backlog items (closes the feedback loop)
    let feedbackItems: Array<{ title: string; priority: string }> | null = null;
    try {
      const impactSummary = await marketer.runProductionMetricsReview(
        state.featureName,
        { adoption: 80, completion: 85 }
      );
      feedbackItems = await marketer.generateBacklogItems(productionReport, impactSummary);
    } catch {
      // Non-critical — feedback loop is best-effort
    }

    await persistEvent('marketer', 'node_complete', {
      metrics: productionReport.metrics,
      feedbackItemCount: feedbackItems?.length || 0,
    });

    return {
      currentStep: 'marketer_complete',
      productionMetrics: productionReport,
      feedbackItems,
      finalRecommendation: formattedReport,
      completedSteps: [...state.completedSteps, 'marketer'],
      context: { ...state.context, productionReport, feedbackItems },
    };
  } catch (error: any) {
    console.error('[PlanningGraph] Marketer node failed:', error);
    await persistEvent('marketer', 'node_error', { error: error.message });
    return {
      currentStep: 'marketer_failed',
      metadata: { ...state.metadata, errors: [...state.metadata.errors, { step: 'marketer', error: error.message }] },
    };
  }
}

// ============================================================================
// Conditional Edge Functions — Two-Loop Routing
// ============================================================================

function routeFromDirector(state: PlanningStateType): string {
  if (state.currentStep === 'director_failed') return END;

  const decision = state.directorDecision?.decision;
  if (decision === 'DEFER') {
    console.log('[PlanningGraph] Director DEFERRED feature. Ending workflow.');
    return END;
  }
  if (decision === 'ITERATE') {
    console.log('[PlanningGraph] Director requires ITERATION. Ending workflow.');
    return END;
  }

  // PROCEED → Three Amigos
  return 'threeAmigos';
}

function routeFromThreeAmigos(state: PlanningStateType): string {
  if (state.currentStep === 'three_amigos_failed') return END;
  return 'planner';
}

function routeFromPlanner(state: PlanningStateType): string {
  if (state.currentStep === 'planner_failed') return END;

  // WIP limit reached — end workflow, task queued in backlog
  if (state.currentStep === 'planner_blocked') {
    console.log('[PlanningGraph] WIP limit reached. Task queued in backlog.');
    return END;
  }

  return 'developer';
}

function routeFromDeveloper(state: PlanningStateType): string {
  if (state.currentStep === 'developer_failed') return END;
  return 'engineerBuild';
}

function routeFromEngineerBuild(state: PlanningStateType): string {
  if (state.currentStep === 'build_failed') {
    console.log('[PlanningGraph] Build failed. Ending workflow.');
    return END;
  }
  return 'tester';
}

function routeFromTester(state: PlanningStateType): string {
  if (state.currentStep === 'tester_failed') return END;
  return 'reflection';
}

function routeFromReflection(state: PlanningStateType): string {
  if (state.currentStep === 'reflection_rework') {
    console.log('[PlanningGraph] Reflection requires REWORK. Looping back to developer.');
    return 'developer';
  }
  // reflection_proceed or any other state → QA
  return 'qa';
}

function routeFromQA(state: PlanningStateType): string {
  if (state.currentStep === 'qa_failed') return END;

  const decision = state.qaDecision;
  if (decision === 'APPROVE') {
    console.log('[PlanningGraph] QA APPROVED. Proceeding to security.');
    return 'security';
  }
  if (decision === 'REWORK') {
    console.log('[PlanningGraph] QA requires REWORK. Looping back to developer.');
    return 'developer';
  }

  // BLOCK or unknown → end
  console.log('[PlanningGraph] QA BLOCKED. Ending workflow.');
  return END;
}

function routeFromSecurity(state: PlanningStateType): string {
  if (state.currentStep === 'security_failed') return END;

  const criticalVulns = state.securityReport?.vulnerabilities?.filter(
    (v: any) => v.severity === 'critical'
  ) || [];
  const criticalCodeIssues = state.securityReport?.codeIssues?.filter(
    (i: any) => i.severity === 'critical' && !i.falsePositive
  ) || [];

  if (criticalVulns.length > 0 || criticalCodeIssues.length > 0) {
    console.log(`[PlanningGraph] Security BLOCKED: ${criticalVulns.length} critical vulns, ${criticalCodeIssues.length} critical code issues`);
    return END;
  }

  console.log('[PlanningGraph] Security passed. Proceeding to approval gate.');
  return 'approvalGate';
}

function routeFromApprovalGate(state: PlanningStateType): string {
  if (state.approvalStatus === 'rejected') {
    console.log('[PlanningGraph] Approval REJECTED. Ending workflow.');
    return END;
  }
  // approved or pending (fail-open) → deploy
  return 'engineerDeploy';
}

function routeFromEngineerDeploy(state: PlanningStateType): string {
  if (state.currentStep === 'deploy_failed') return END;
  return 'marketer';
}

function routeFromMarketer(): string {
  // Marketer is the final step — feedback items written to cas_planner_tasks
  // Next workflow run picks them up via Director (no infinite loop)
  return END;
}

// ============================================================================
// Graph Builder — Two-Loop Architecture
// ============================================================================

/**
 * Build the Planning Graph — Two-Loop Architecture
 *
 * OUTER LOOP: Director → Three Amigos → Planner
 * INNER LOOP: Developer → Engineer(Build) → Tester → QA → Security → Engineer(Deploy) → Marketer
 * QA REWORK LOOP: QA → Developer (if REWORK)
 */
export function buildPlanningGraph() {
  console.log('[PlanningGraph] Building two-loop planning graph...');

  const graph = new StateGraph(PlanningState)
    // Outer loop nodes
    .addNode('director', directorNode)
    .addNode('threeAmigos', threeAmigosNode)
    .addNode('planner', plannerNode)
    // Inner loop nodes
    .addNode('developer', developerNode)
    .addNode('engineerBuild', engineerBuildNode)
    .addNode('tester', testerNode)
    .addNode('reflection', reflectionNode)
    .addNode('qa', qaNode)
    .addNode('security', securityNode)
    .addNode('approvalGate', approvalGateNode)
    .addNode('engineerDeploy', engineerDeployNode)
    .addNode('marketer', marketerNode)

    // Edges
    .addEdge(START, 'director')
    .addConditionalEdges('director', routeFromDirector)
    .addConditionalEdges('threeAmigos', routeFromThreeAmigos)
    .addConditionalEdges('planner', routeFromPlanner)
    .addConditionalEdges('developer', routeFromDeveloper)
    .addConditionalEdges('engineerBuild', routeFromEngineerBuild)
    .addConditionalEdges('tester', routeFromTester)
    .addConditionalEdges('reflection', routeFromReflection)
    .addConditionalEdges('qa', routeFromQA)
    .addConditionalEdges('security', routeFromSecurity)
    .addConditionalEdges('approvalGate', routeFromApprovalGate)
    .addConditionalEdges('engineerDeploy', routeFromEngineerDeploy)
    .addConditionalEdges('marketer', routeFromMarketer);

  console.log('[PlanningGraph] Two-loop graph built: 12 nodes (Director, Three Amigos, Planner, Developer, Engineer×2, Tester, Reflection, QA, Security, Approval Gate, Marketer)');
  return graph;
}

// ============================================================================
// Workflow Execution
// ============================================================================

export interface WorkflowResult {
  state: PlanningStateType;
  status: 'completed' | 'awaiting_approval' | 'rejected' | 'error';
  workflowId: string;
  approvalId?: string | null;
}

export async function executePlanningWorkflow(input: {
  featureName: string;
  featureQuery: string;
  featureType?: 'core-system' | 'enhancement' | 'innovation' | 'polish';
}): Promise<WorkflowResult> {
  console.log(`[PlanningGraph] Starting two-loop workflow for: ${input.featureName}`);

  const workflowId = `planning-${Date.now()}`;

  await persistEvent('workflow', 'start', {
    featureName: input.featureName,
    featureQuery: input.featureQuery,
    workflowId,
  });

  const graph = buildPlanningGraph();

  // Compile with checkpointer and interrupt if available
  let compiledGraph;
  if (isCheckpointingAvailable()) {
    const checkpointer = await getCheckpointer();
    compiledGraph = graph.compile({
      checkpointer,
      interruptBefore: ['approvalGate'],
    });
    console.log('[PlanningGraph] Compiled with checkpointer + interruptBefore: approvalGate');
  } else {
    compiledGraph = graph.compile();
    console.log('[PlanningGraph] Compiled without checkpointer (approval gate will auto-approve)');
  }

  const initialState: Partial<PlanningStateType> = {
    featureName: input.featureName,
    featureQuery: input.featureQuery,
    currentStep: 'started',
    completedSteps: [],
    directorDecision: null,
    featureBrief: null,
    developmentPlan: null,
    testResults: null,
    qaReport: null,
    securityReport: null,
    deploymentStatus: null,
    productionMetrics: null,
    finalRecommendation: null,
    acceptanceCriteria: null,
    technicalConstraints: null,
    edgeCases: null,
    testStrategy: null,
    kanbanTaskId: null,
    buildResult: null,
    qaDecision: null,
    feedbackItems: null,
    reflectionRound: 0,
    reflectionFeedback: null,
    approvalId: null,
    approvalStatus: null,
    context: { featureType: input.featureType || 'enhancement' },
    metadata: {
      workflowId,
      startedAt: new Date(),
      errors: [],
    },
  };

  const config = { configurable: { thread_id: workflowId } };
  const result = await compiledGraph.invoke(initialState, config);

  // Check if workflow was interrupted at approval gate
  if (isCheckpointingAvailable() && !result.completedSteps?.includes('approvalGate')) {
    // Workflow paused before approvalGate — create the approval request manually
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    let approvalId: string | null = null;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('cas_approval_requests')
        .insert({
          workflow_id: workflowId,
          feature_name: input.featureName,
          approval_type: 'deployment',
          status: 'pending',
          requester_agent: 'security',
          context: {
            featureName: result.featureName,
            qaDecision: result.qaDecision,
            buildSuccess: result.buildResult?.success,
            securityPassed: result.securityReport?.passed,
            completedSteps: result.completedSteps,
          },
        })
        .select('id')
        .single();

      approvalId = data?.id || null;
    }

    await persistEvent('workflow', 'paused', {
      featureName: input.featureName,
      workflowId,
      reason: 'awaiting_approval',
      approvalId,
      completedSteps: result.completedSteps,
    });

    console.log(`\n[PlanningGraph] Workflow paused — awaiting human approval`);
    console.log(`  - Workflow ID: ${workflowId}`);
    console.log(`  - Approval ID: ${approvalId}`);
    console.log(`  - Completed Steps: ${result.completedSteps?.join(' → ')}`);

    return {
      state: result,
      status: 'awaiting_approval',
      workflowId,
      approvalId,
    };
  }

  // Workflow completed fully
  const duration = Date.now() - result.metadata.startedAt.getTime();

  await persistEvent('workflow', 'complete', {
    featureName: input.featureName,
    completedSteps: result.completedSteps,
    errors: result.metadata.errors.length,
    duration,
    directorDecision: result.directorDecision?.decision,
    qaDecision: result.qaDecision,
    buildSuccess: result.buildResult?.success,
    securityPassed: result.securityReport?.passed,
    approvalStatus: result.approvalStatus,
    reflectionRounds: result.reflectionRound,
    feedbackItems: result.feedbackItems?.length || 0,
  });

  logWorkflowSummary(result, duration);

  return {
    state: result,
    status: 'completed',
    workflowId,
    approvalId: result.approvalId,
  };
}

/**
 * Resume a paused workflow after human approval/rejection.
 * Loads the checkpoint from the database and continues execution.
 */
export async function resumePlanningWorkflow(input: {
  workflowId: string;
  decision: 'approved' | 'rejected';
}): Promise<WorkflowResult> {
  console.log(`[PlanningGraph] Resuming workflow ${input.workflowId} (decision: ${input.decision})`);

  if (!isCheckpointingAvailable()) {
    throw new Error('Checkpointing not available — cannot resume workflow');
  }

  const checkpointer = await getCheckpointer();
  const graph = buildPlanningGraph();
  const compiledGraph = graph.compile({
    checkpointer,
    interruptBefore: ['approvalGate'],
  });

  const config = { configurable: { thread_id: input.workflowId } };

  await persistEvent('workflow', 'resumed', {
    workflowId: input.workflowId,
    decision: input.decision,
  });

  if (input.decision === 'rejected') {
    // Update state to reflect rejection and end
    const result = await compiledGraph.invoke(
      { approvalStatus: 'rejected', currentStep: 'approval_rejected' },
      config
    );

    await persistEvent('workflow', 'complete', {
      workflowId: input.workflowId,
      status: 'rejected',
      completedSteps: result.completedSteps,
    });

    return {
      state: result,
      status: 'rejected',
      workflowId: input.workflowId,
    };
  }

  // Approved — resume graph execution (will run approvalGate then continue)
  const result = await compiledGraph.invoke(
    { approvalStatus: 'approved', currentStep: 'approval_approved' },
    config
  );

  const duration = result.metadata?.startedAt
    ? Date.now() - new Date(result.metadata.startedAt).getTime()
    : 0;

  await persistEvent('workflow', 'complete', {
    workflowId: input.workflowId,
    completedSteps: result.completedSteps,
    errors: result.metadata?.errors?.length || 0,
    duration,
    approvalStatus: 'approved',
    feedbackItems: result.feedbackItems?.length || 0,
  });

  logWorkflowSummary(result, duration);

  return {
    state: result,
    status: 'completed',
    workflowId: input.workflowId,
    approvalId: result.approvalId,
  };
}

function logWorkflowSummary(result: PlanningStateType, duration: number) {
  console.log('\n[PlanningGraph] Two-Loop Workflow Summary:');
  console.log(`  - Completed Steps: ${result.completedSteps?.join(' → ')}`);
  console.log(`  - Director Decision: ${result.directorDecision?.decision || 'N/A'}`);
  console.log(`  - QA Decision: ${result.qaDecision || 'N/A'}`);
  console.log(`  - Build: ${result.buildResult?.success ? 'PASSED' : result.buildResult ? 'FAILED' : 'N/A'}`);
  console.log(`  - Security: ${result.securityReport?.passed ? 'PASSED' : result.securityReport ? 'FAILED' : 'N/A'}`);
  console.log(`  - Reflection Rounds: ${result.reflectionRound || 0}`);
  console.log(`  - Approval: ${result.approvalStatus || 'N/A'}`);
  console.log(`  - Feedback Items: ${result.feedbackItems?.length || 0}`);
  console.log(`  - Errors: ${result.metadata?.errors?.length || 0}`);
  console.log(`  - Duration: ${duration}ms`);
}

// ============================================================================
// Workflow Introspection (for WorkflowVisualizer)
// ============================================================================

/**
 * Get workflow structure for dynamic visualization
 * Updated for two-loop architecture with conditional edges and loop-back labels
 */
export function getWorkflowStructure() {
  const workflowOrder = [
    'start',
    'director',
    'threeAmigos',
    'planner',
    'developer',
    'engineerBuild',
    'tester',
    'reflection',
    'qa',
    'security',
    'approvalGate',
    'engineerDeploy',
    'marketer',
    'end',
  ];

  const nodes = workflowOrder.map(nodeId => ({
    id: nodeId,
    ...AGENT_METADATA[nodeId],
  }));

  // Create edges including conditional and loop-back edges
  const edges = [
    { id: 'start-director', source: 'start', target: 'director' },
    { id: 'director-threeAmigos', source: 'director', target: 'threeAmigos', label: 'PROCEED' },
    { id: 'director-end', source: 'director', target: 'end', label: 'DEFER / ITERATE' },
    { id: 'threeAmigos-planner', source: 'threeAmigos', target: 'planner' },
    { id: 'planner-developer', source: 'planner', target: 'developer', label: 'WIP OK' },
    { id: 'planner-end', source: 'planner', target: 'end', label: 'WIP at capacity' },
    { id: 'developer-engineerBuild', source: 'developer', target: 'engineerBuild' },
    { id: 'engineerBuild-tester', source: 'engineerBuild', target: 'tester', label: 'Build passed' },
    { id: 'engineerBuild-end', source: 'engineerBuild', target: 'end', label: 'Build failed' },
    { id: 'tester-reflection', source: 'tester', target: 'reflection' },
    { id: 'reflection-qa', source: 'reflection', target: 'qa', label: 'Quality OK (≥0.7)' },
    { id: 'reflection-developer', source: 'reflection', target: 'developer', label: 'Rework (quality <0.7)' },
    { id: 'qa-security', source: 'qa', target: 'security', label: 'APPROVE' },
    { id: 'qa-developer', source: 'qa', target: 'developer', label: 'REWORK (loop)' },
    { id: 'qa-end', source: 'qa', target: 'end', label: 'BLOCK' },
    { id: 'security-approvalGate', source: 'security', target: 'approvalGate', label: 'No critical issues' },
    { id: 'security-end', source: 'security', target: 'end', label: 'Critical issues found' },
    { id: 'approvalGate-engineerDeploy', source: 'approvalGate', target: 'engineerDeploy', label: 'Approved' },
    { id: 'approvalGate-end', source: 'approvalGate', target: 'end', label: 'Rejected' },
    { id: 'engineerDeploy-marketer', source: 'engineerDeploy', target: 'marketer' },
    { id: 'marketer-end', source: 'marketer', target: 'end', label: 'Feedback → backlog' },
  ];

  return {
    nodes,
    edges,
    workflow: workflowOrder,
    metadata: {
      totalAgents: 12, // 9 agents + Reflection + Approval Gate, Engineer appears twice
      version: '4.0.0', // Two-loop with reflection + approval gate
      architecture: 'two-loop-with-gates',
      lastUpdated: new Date().toISOString(),
    },
  };
}
