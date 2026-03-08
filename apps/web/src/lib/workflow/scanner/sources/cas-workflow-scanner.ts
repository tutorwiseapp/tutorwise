/**
 * CAS Workflow Scanner
 *
 * Scans CAS WorkflowDefinition objects and directly maps them to ProcessNode[]/ProcessEdge[].
 * This is a structured scanner — no AI needed. Produces high-confidence results.
 */

import type { ProcessNode, ProcessEdge } from '@/components/feature/workflow/types';
import type { SourceScanner, RawDiscovery } from '../types';

// CAS workflow type definitions (mirrored from cas/packages/core)
interface WorkflowTask {
  agentId: string;
  input: Record<string, unknown>;
  outputKey?: string;
}

interface WorkflowStep {
  name: string;
  type: 'sequential' | 'parallel';
  tasks: WorkflowTask[];
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  expectedDuration?: string;
  requiredAgents: string[];
}

const SOURCE_FILE =
  'cas/packages/core/src/workflows/TutorWiseWorkflows.ts';

/**
 * Convert a CAS WorkflowDefinition into ProcessNode[] and ProcessEdge[].
 */
function mapWorkflowToGraph(workflow: WorkflowDefinition): {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  previewSteps: string[];
} {
  const nodes: ProcessNode[] = [];
  const edges: ProcessEdge[] = [];
  let y = 50;

  // Trigger node
  const triggerId = 'trigger-1';
  nodes.push({
    id: triggerId,
    type: 'processStep',
    position: { x: 300, y },
    data: {
      label: 'Workflow Started',
      type: 'trigger',
      description: `${workflow.name} initiated`,
      editable: false,
    },
  });
  y += 120;

  let prevNodeId = triggerId;

  for (let si = 0; si < workflow.steps.length; si++) {
    const step = workflow.steps[si];
    const stepLabel = step.name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    if (step.type === 'parallel' && step.tasks.length > 1) {
      // Condition node for parallel branch
      const condId = `condition-${si + 1}`;
      nodes.push({
        id: condId,
        type: 'processStep',
        position: { x: 300, y },
        data: {
          label: stepLabel,
          type: 'condition',
          description: `Parallel execution: ${step.tasks.map((t) => t.agentId).join(', ')}`,
          editable: true,
        },
      });
      edges.push({
        id: `e-${prevNodeId}-${condId}`,
        source: prevNodeId,
        target: condId,
        animated: true,
      });
      y += 120;

      // Parallel task nodes
      const parallelNodeIds: string[] = [];
      const xOffsets = step.tasks.length === 2 ? [100, 500] : [50, 300, 550];

      for (let ti = 0; ti < step.tasks.length; ti++) {
        const task = step.tasks[ti];
        const taskId = `action-${si + 1}-${ti + 1}`;
        nodes.push({
          id: taskId,
          type: 'processStep',
          position: { x: xOffsets[ti] || 300, y },
          data: {
            label: `${task.agentId} agent`,
            type: 'action',
            description: `${task.agentId} executes ${task.input?.action || 'task'}`,
            assignee: task.agentId,
            editable: true,
          },
        });
        edges.push({
          id: `e-${condId}-${taskId}`,
          source: condId,
          target: taskId,
          animated: true,
        });
        parallelNodeIds.push(taskId);
      }
      y += 120;

      // Merge node after parallel
      const mergeId = `action-merge-${si + 1}`;
      nodes.push({
        id: mergeId,
        type: 'processStep',
        position: { x: 300, y },
        data: {
          label: `${stepLabel} Complete`,
          type: 'action',
          description: `All parallel tasks for "${stepLabel}" completed`,
          editable: true,
        },
      });
      for (const pId of parallelNodeIds) {
        edges.push({
          id: `e-${pId}-${mergeId}`,
          source: pId,
          target: mergeId,
          animated: true,
        });
      }
      prevNodeId = mergeId;
    } else {
      // Sequential step
      const task = step.tasks[0];
      const nodeId = `action-${si + 1}`;
      nodes.push({
        id: nodeId,
        type: 'processStep',
        position: { x: 300, y },
        data: {
          label: stepLabel,
          type: 'action',
          description: `${task.agentId} executes ${task.input?.action || 'task'}`,
          assignee: task.agentId,
          estimatedDuration: undefined,
          editable: true,
        },
      });
      edges.push({
        id: `e-${prevNodeId}-${nodeId}`,
        source: prevNodeId,
        target: nodeId,
        animated: true,
      });
      prevNodeId = nodeId;
    }
    y += 120;
  }

  // End node
  const endId = 'end-1';
  nodes.push({
    id: endId,
    type: 'processStep',
    position: { x: 300, y },
    data: {
      label: 'Workflow Complete',
      type: 'end',
      description: `${workflow.name} completed`,
      editable: false,
    },
  });
  edges.push({
    id: `e-${prevNodeId}-${endId}`,
    source: prevNodeId,
    target: endId,
    animated: true,
  });

  const previewSteps = nodes
    .filter((n) => n.data.type !== 'trigger' && n.data.type !== 'end')
    .slice(0, 5)
    .map((n) => n.data.label);

  return { nodes, edges, previewSteps };
}

// Hard-coded CAS workflow definitions (avoids cross-package import issues at runtime)
const CAS_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'tutorwise-content-strategy',
    name: 'Content Strategy Workflow',
    description:
      'Analyze platform metrics, generate content topics, create optimized blog post',
    expectedDuration: '5-10 minutes',
    requiredAgents: ['analyst', 'marketer'],
    steps: [
      {
        name: 'analyze_platform_metrics',
        type: 'sequential',
        tasks: [{ agentId: 'analyst', input: { action: 'analyze_metrics' } }],
      },
      {
        name: 'identify_content_opportunities',
        type: 'sequential',
        tasks: [{ agentId: 'analyst', input: { action: 'identify_insights' } }],
      },
      {
        name: 'create_blog_content',
        type: 'sequential',
        tasks: [{ agentId: 'marketer', input: { action: 'create_content' } }],
      },
      {
        name: 'optimize_for_seo',
        type: 'sequential',
        tasks: [{ agentId: 'marketer', input: { action: 'seo_optimize' } }],
      },
    ],
  },
  {
    id: 'tutorwise-feature-development',
    name: 'Feature Development Workflow',
    description:
      'Analyze user data, plan, develop, test, and review new platform feature',
    expectedDuration: '15-20 minutes',
    requiredAgents: ['analyst', 'planner', 'developer', 'tester', 'qa'],
    steps: [
      {
        name: 'analyze_user_data',
        type: 'sequential',
        tasks: [{ agentId: 'analyst', input: { action: 'identify_insights' } }],
      },
      {
        name: 'create_project_plan',
        type: 'sequential',
        tasks: [{ agentId: 'planner', input: { action: 'create_plan' } }],
      },
      {
        name: 'break_down_tasks',
        type: 'sequential',
        tasks: [{ agentId: 'planner', input: { action: 'breakdown_tasks' } }],
      },
      {
        name: 'generate_code',
        type: 'parallel',
        tasks: [
          { agentId: 'developer', input: { action: 'generate_code' } },
          { agentId: 'developer', input: { action: 'generate_code' } },
        ],
      },
      {
        name: 'quality_assurance',
        type: 'parallel',
        tasks: [
          { agentId: 'tester', input: { action: 'generate_tests' } },
          { agentId: 'qa', input: { action: 'quality_audit' } },
        ],
      },
    ],
  },
  {
    id: 'tutorwise-user-onboarding',
    name: 'User Onboarding Workflow',
    description:
      'Create personalized onboarding experience for all user roles',
    expectedDuration: '8-12 minutes',
    requiredAgents: ['planner', 'analyst', 'marketer', 'developer'],
    steps: [
      {
        name: 'plan_onboarding_journey',
        type: 'sequential',
        tasks: [{ agentId: 'planner', input: { action: 'create_plan' } }],
      },
      {
        name: 'analyze_user_segment',
        type: 'sequential',
        tasks: [
          { agentId: 'analyst', input: { action: 'identify_insights' } },
        ],
      },
      {
        name: 'create_welcome_content',
        type: 'parallel',
        tasks: [
          { agentId: 'marketer', input: { action: 'create_content' } },
          { agentId: 'marketer', input: { action: 'create_content' } },
        ],
      },
      {
        name: 'implement_automation',
        type: 'sequential',
        tasks: [{ agentId: 'developer', input: { action: 'generate_code' } }],
      },
    ],
  },
  {
    id: 'tutorwise-health-check',
    name: 'Platform Health Check Workflow',
    description:
      'Comprehensive platform health analysis with recommendations',
    expectedDuration: '10-15 minutes',
    requiredAgents: ['analyst', 'engineer', 'security', 'qa'],
    steps: [
      {
        name: 'analyze_platform_metrics',
        type: 'sequential',
        tasks: [
          { agentId: 'analyst', input: { action: 'analyze_metrics' } },
        ],
      },
      {
        name: 'technical_review',
        type: 'parallel',
        tasks: [
          { agentId: 'engineer', input: { action: 'review_scalability' } },
          { agentId: 'engineer', input: { action: 'optimize_performance' } },
        ],
      },
      {
        name: 'security_and_quality',
        type: 'parallel',
        tasks: [
          { agentId: 'security', input: { action: 'security_audit' } },
          { agentId: 'security', input: { action: 'scan_vulnerabilities' } },
          { agentId: 'qa', input: { action: 'quality_audit' } },
        ],
      },
    ],
  },
];

export class CASWorkflowScanner implements SourceScanner {
  sourceType = 'cas_workflow' as const;
  isStructured = true;

  async scan(): Promise<RawDiscovery[]> {
    return CAS_WORKFLOWS.map((workflow) => {
      const { nodes, edges, previewSteps } = mapWorkflowToGraph(workflow);

      return {
        name: workflow.name,
        description: workflow.description,
        sourceType: this.sourceType,
        sourceIdentifier: workflow.id,
        sourceFilePaths: [SOURCE_FILE],
        category: 'cas',
        rawContent: JSON.stringify(workflow, null, 2),
        confidence: 'high' as const,
        confidenceReason:
          'Directly mapped from structured CAS WorkflowDefinition — no AI inference needed',
        stepCount: nodes.length,
        stepNames: workflow.steps.map((s) =>
          s.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        ),
        nodes,
        edges,
        previewSteps,
      };
    });
  }
}
