/*
 * Filename: src/lib/process-studio/conformance/ConformanceChecker.ts
 * Purpose: Compare actual workflow_tasks execution paths against the defined process graph
 * Phase: Conductor 5 — Process Mining Enhancement
 * Created: 2026-03-10
 */

import type { ProcessNode, ProcessEdge } from '@/components/feature/workflow/types';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowTaskLike {
  id: string;
  node_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ConformanceDeviation {
  nodeId: string;
  type: 'skipped' | 'unexpected_path' | 'stuck';
  expectedNextIds: string[];
  actualNextId: string | null;
}

export interface ConformanceResult {
  executionId: string;
  conformant: boolean;
  path: string[];                // ordered node IDs visited
  deviations: ConformanceDeviation[];
}

export interface BatchConformanceResult {
  conformanceRate: number;       // 0–100 percentage
  total: number;
  conformant: number;
  deviated: number;
  byType: Record<string, number>;
  results: ConformanceResult[];
}

// ============================================================================
// CONFORMANCE CHECKER
// ============================================================================

const STUCK_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class ConformanceChecker {
  /**
   * Build adjacency map from process graph: nodeId → Set of valid next nodeIds
   */
  static buildAdjacencyMap(
    nodes: ProcessNode[],
    edges: ProcessEdge[]
  ): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    for (const node of nodes) {
      adj.set(node.id, new Set<string>());
    }
    for (const edge of edges) {
      const neighbors = adj.get(edge.source) ?? new Set<string>();
      neighbors.add(edge.target);
      adj.set(edge.source, neighbors);
    }
    return adj;
  }

  /**
   * Check a single execution's task sequence against the process graph.
   * Tasks must be pre-sorted by started_at ASC.
   */
  static checkExecution(
    executionId: string,
    processGraph: { nodes: ProcessNode[]; edges: ProcessEdge[] },
    tasks: WorkflowTaskLike[]
  ): ConformanceResult {
    const adj = this.buildAdjacencyMap(processGraph.nodes, processGraph.edges);
    const graphNodeIds = new Set(processGraph.nodes.map((n) => n.id));
    const visitedNodeIds = new Set(tasks.map((t) => t.node_id));

    const path = tasks.map((t) => t.node_id);
    const deviations: ConformanceDeviation[] = [];

    // 1. Detect skipped nodes (in graph but no task)
    //    Only flag non-end nodes that have outgoing edges (i.e., are expected to execute)
    for (const node of processGraph.nodes) {
      const hasOutgoing = (adj.get(node.id)?.size ?? 0) > 0;
      const isEndType = node.data?.type === 'end';
      if (!isEndType && hasOutgoing && !visitedNodeIds.has(node.id)) {
        // Check if this node is reachable from visited nodes — only flag if reachable
        // (simple heuristic: flag if any predecessor was visited)
        const hasPredecessorVisited = processGraph.edges.some(
          (e) => e.target === node.id && visitedNodeIds.has(e.source)
        );
        if (hasPredecessorVisited) {
          deviations.push({
            nodeId: node.id,
            type: 'skipped',
            expectedNextIds: [],
            actualNextId: null,
          });
        }
      }
    }

    // 2. Detect unexpected path transitions
    for (let i = 0; i < tasks.length - 1; i++) {
      const current = tasks[i];
      const next = tasks[i + 1];
      const validNextIds = adj.get(current.node_id) ?? new Set();
      if (graphNodeIds.has(current.node_id) && !validNextIds.has(next.node_id)) {
        deviations.push({
          nodeId: current.node_id,
          type: 'unexpected_path',
          expectedNextIds: Array.from(validNextIds),
          actualNextId: next.node_id,
        });
      }
    }

    // 3. Detect stuck tasks (paused for > 7 days)
    const now = Date.now();
    for (const task of tasks) {
      if (task.status === 'paused' && task.started_at) {
        const startedAt = new Date(task.started_at).getTime();
        if (now - startedAt > STUCK_THRESHOLD_MS) {
          deviations.push({
            nodeId: task.node_id,
            type: 'stuck',
            expectedNextIds: Array.from(adj.get(task.node_id) ?? []),
            actualNextId: null,
          });
        }
      }
    }

    return {
      executionId,
      conformant: deviations.length === 0,
      path,
      deviations,
    };
  }

  /**
   * Batch conformance check for all executions of a process.
   * Returns aggregate statistics.
   */
  static async batchCheck(
    processId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    limitDays = 90
  ): Promise<BatchConformanceResult> {
    const since = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString();

    // Load process graph
    const { data: process } = await supabase
      .from('workflow_processes')
      .select('nodes, edges')
      .eq('id', processId)
      .single();

    if (!process) {
      return { conformanceRate: 0, total: 0, conformant: 0, deviated: 0, byType: {}, results: [] };
    }

    // Load executions (non-shadow, completed)
    const { data: executions } = await supabase
      .from('workflow_executions')
      .select('id')
      .eq('process_id', processId)
      .eq('is_shadow', false)
      .eq('status', 'completed')
      .gte('completed_at', since);

    if (!executions || executions.length === 0) {
      return { conformanceRate: 100, total: 0, conformant: 0, deviated: 0, byType: {}, results: [] };
    }

    const executionIds = executions.map((e: { id: string }) => e.id);

    // Load all tasks for these executions
    const { data: allTasks } = await supabase
      .from('workflow_tasks')
      .select('id, execution_id, node_id, status, started_at, completed_at')
      .in('execution_id', executionIds)
      .order('started_at', { ascending: true });

    // Group tasks by execution_id
    const tasksByExecution = new Map<string, WorkflowTaskLike[]>();
    for (const task of allTasks ?? []) {
      const list = tasksByExecution.get(task.execution_id) ?? [];
      list.push(task);
      tasksByExecution.set(task.execution_id, list);
    }

    // Run conformance check per execution
    const results: ConformanceResult[] = [];
    const byType: Record<string, number> = {};

    for (const exec of executions) {
      const tasks = tasksByExecution.get(exec.id) ?? [];
      const result = this.checkExecution(
        exec.id,
        { nodes: process.nodes ?? [], edges: process.edges ?? [] },
        tasks
      );
      results.push(result);
      for (const dev of result.deviations) {
        byType[dev.type] = (byType[dev.type] ?? 0) + 1;
      }
    }

    const conformantCount = results.filter((r) => r.conformant).length;
    const total = results.length;

    return {
      conformanceRate: total > 0 ? Math.round((conformantCount / total) * 100) : 100,
      total,
      conformant: conformantCount,
      deviated: total - conformantCount,
      byType,
      results,
    };
  }
}
