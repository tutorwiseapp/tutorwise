/**
 * Shared validation and formatting utilities for Process Studio workflows.
 * Extracted from /api/workflow/parse/route.ts for reuse by the Discovery Engine scanners.
 */

import type { ProcessStepType } from '@/components/feature/workflow/types';

// --- Parsed types (AI output before conversion to ReactFlow) ---

export interface ParsedNode {
  id: string;
  label: string;
  type: string;
  description: string;
  objective?: string | null;
  completionCriteria?: string[] | null;
  expectedOutputs?: string[] | null;
  assignee?: string | null;
  estimatedDuration?: string | null;
  stepCount?: number | null;
  templateId?: string | null;
  templateName?: string | null;
}

export interface ParsedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface ParsedWorkflow {
  name: string;
  description: string;
  nodes: ParsedNode[];
  edges: ParsedEdge[];
}

// --- Validation ---

export const VALID_NODE_TYPES = new Set<string>([
  'trigger',
  'action',
  'condition',
  'approval',
  'notification',
  'end',
  'subprocess',
]);

/**
 * Validate a parsed workflow structure.
 * Returns null if valid, or an error message string.
 */
export function validateWorkflow(data: ParsedWorkflow): string | null {
  if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
    return 'No nodes found in AI response';
  }
  if (!data.edges || !Array.isArray(data.edges)) {
    return 'No edges found in AI response';
  }

  const nodeIds = new Set(data.nodes.map((n) => n.id));

  for (const node of data.nodes) {
    if (!node.id || !node.label || !node.type) {
      return `Node missing required fields: ${JSON.stringify(node)}`;
    }
    if (!VALID_NODE_TYPES.has(node.type)) {
      return `Invalid node type "${node.type}" for node "${node.label}"`;
    }
  }

  for (const edge of data.edges) {
    if (!nodeIds.has(edge.source)) {
      return `Edge references unknown source node "${edge.source}"`;
    }
    if (!nodeIds.has(edge.target)) {
      return `Edge references unknown target node "${edge.target}"`;
    }
  }

  const hasTrigger = data.nodes.some((n) => n.type === 'trigger');
  const hasEnd = data.nodes.some((n) => n.type === 'end');
  if (!hasTrigger) return 'Workflow must have a trigger node';
  if (!hasEnd) return 'Workflow must have an end node';

  return null;
}

// --- ReactFlow format conversion ---

const Y_START = 50;
const Y_INCREMENT = 120;
const X_CENTER = 300;

/**
 * Convert a ParsedWorkflow into ReactFlow-compatible nodes and edges,
 * with auto-layout positions (vertical, top-to-bottom).
 */
export function toReactFlowFormat(data: ParsedWorkflow) {
  const nodes = data.nodes.map((n, i) => ({
    id: n.id,
    type: 'processStep',
    position: { x: X_CENTER, y: Y_START + i * Y_INCREMENT },
    data: {
      label: n.label,
      type: n.type as ProcessStepType,
      description: n.description || '',
      objective: n.objective || undefined,
      completionCriteria: n.completionCriteria || undefined,
      expectedOutputs: n.expectedOutputs || undefined,
      assignee: n.assignee || undefined,
      estimatedDuration: n.estimatedDuration || undefined,
      editable: n.type !== 'trigger' && n.type !== 'end',
      stepCount: n.stepCount ?? undefined,
      templateId: n.templateId ?? undefined,
      templateName: n.templateName ?? undefined,
    },
  }));

  const edges = data.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || undefined,
    animated: true,
  }));

  return { nodes, edges };
}

/**
 * Extract preview step labels from a set of nodes (first 5).
 */
export function extractPreviewSteps(
  nodes: Array<{ data: { label: string; type: string } }>
): string[] {
  return nodes
    .filter((n) => n.data.type !== 'trigger' && n.data.type !== 'end')
    .slice(0, 5)
    .map((n) => n.data.label);
}
