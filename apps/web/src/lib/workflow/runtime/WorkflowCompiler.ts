/**
 * WorkflowCompiler
 *
 * Compiles ProcessNode[] + ProcessEdge[] from a workflow_process record into a
 * LangGraph StateGraph<BusinessWorkflowState> at runtime.
 *
 * Key responsibilities:
 * - Filter trigger/end nodes (they don't become LangGraph nodes)
 * - Build node functions with task tracking, HITL interrupts, and handler calls
 * - Wire edges including conditional routing from condition nodes
 * - Return a compiled graph with the shared PostgresSaver checkpointer
 *
 * Design doc: fuchsia/process-execution-solution-design.md §4.2
 */

import { StateGraph, Annotation, interrupt, END } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { createServiceRoleClient } from '@/utils/supabase/server';
import type { ProcessNode, ProcessEdge } from '@/components/feature/workflow/types';
import { nodeHandlerRegistry, type HandlerContext } from './NodeHandlerRegistry';

// ---------------------------------------------------------------------------
// State definition
// ---------------------------------------------------------------------------

const BusinessWorkflowStateAnnotation = Annotation.Root({
  executionId: Annotation<string>(),
  processId: Annotation<string>(),
  executionMode: Annotation<string>(),
  context: Annotation<Record<string, unknown>>({
    // Merge updates into existing context (shallow merge)
    reducer: (current: Record<string, unknown>, update: Record<string, unknown>) => ({
      ...current,
      ...update,
    }),
    default: () => ({}),
  }),
  currentNodeId: Annotation<string>({
    reducer: (_: string, next: string) => next,
    default: () => '',
  }),
  completedNodes: Annotation<string[]>({
    reducer: (current: string[], next: string[]) => [...current, ...next],
    default: () => [],
  }),
  errors: Annotation<Array<{ nodeId: string; error: string; attemptCount: number }>>({
    reducer: (
      current: Array<{ nodeId: string; error: string; attemptCount: number }>,
      next: Array<{ nodeId: string; error: string; attemptCount: number }>
    ) => [...current, ...next],
    default: () => [],
  }),
});

export type BusinessWorkflowState = typeof BusinessWorkflowStateAnnotation.State;

// ---------------------------------------------------------------------------
// WorkflowCompiler class
// ---------------------------------------------------------------------------

export class WorkflowCompiler {
  constructor(private checkpointer: BaseCheckpointSaver) {}

  compile(
    nodes: ProcessNode[],
    edges: ProcessEdge[],
    executionMode: string
  ): ReturnType<StateGraph<typeof BusinessWorkflowStateAnnotation>['compile']> {
    const graph = new StateGraph(BusinessWorkflowStateAnnotation);

    // Identify trigger and end nodes — they don't become LangGraph nodes
    const triggerNodeIds = new Set(nodes.filter((n) => n.data.type === 'trigger').map((n) => n.id));
    const endNodeIds = new Set(nodes.filter((n) => n.data.type === 'end').map((n) => n.id));

    // Actionable nodes = all nodes except trigger and end
    const actionableNodes = nodes.filter(
      (n) => !triggerNodeIds.has(n.id) && !endNodeIds.has(n.id)
    );

    if (actionableNodes.length === 0) {
      throw new Error('WorkflowCompiler: workflow has no actionable nodes');
    }

    // Add each node to the graph
    for (const node of actionableNodes) {
      graph.addNode(node.id, this.buildNodeFn(node, executionMode));
    }

    // Determine graph entry: first node after trigger
    const firstEdge = edges.find((e) => triggerNodeIds.has(e.source));
    if (!firstEdge) {
      throw new Error('WorkflowCompiler: no edge from trigger node found');
    }
    const entryNodeId = firstEdge.target;

    if (endNodeIds.has(entryNodeId)) {
      throw new Error('WorkflowCompiler: trigger leads directly to end — no work to do');
    }

    graph.addEdge('__start__' as never, entryNodeId as never);

    // Add edges for each non-trigger, non-end source node
    const conditionNodeIds = new Set(
      nodes.filter((n) => n.data.type === 'condition').map((n) => n.id)
    );
    const approvalNodeIds = new Set(
      nodes.filter((n) => n.data.type === 'approval').map((n) => n.id)
    );

    for (const node of actionableNodes) {
      const outgoing = edges.filter((e) => e.source === node.id);

      if (outgoing.length === 0) continue;

      if (conditionNodeIds.has(node.id)) {
        // Build conditional routing map: sourceHandle → target node id (or END)
        const routingMap: Record<string, string> = {};
        for (const edge of outgoing) {
          const handle = edge.sourceHandle ?? 'default';
          routingMap[handle] = endNodeIds.has(edge.target) ? END : edge.target;
        }

        // Router function: reads _lastConditionPassed from context
        const nodeId = node.id;
        graph.addConditionalEdges(
          nodeId as never,
          (state: BusinessWorkflowState) => {
            const passed = Boolean(state.context._lastConditionPassed);
            // Try 'yes'/'no' first (standard condition handles), then 'true'/'false', then fallback
            if (passed) {
              return routingMap['yes'] ?? routingMap['true'] ?? Object.values(routingMap)[0];
            } else {
              return routingMap['no'] ?? routingMap['false'] ?? Object.values(routingMap)[1];
            }
          },
          routingMap as never
        );
      } else if (approvalNodeIds.has(node.id)) {
        // Approval nodes: 'approve' → activate path, 'reject' → reject path
        const approveEdge = outgoing.find((e) => e.sourceHandle === 'approve') ?? outgoing[0];
        const rejectEdge = outgoing.find((e) => e.sourceHandle === 'reject') ?? outgoing[1];

        if (approveEdge && rejectEdge) {
          const routingMap: Record<string, string> = {
            approve: endNodeIds.has(approveEdge.target) ? END : approveEdge.target,
            reject: endNodeIds.has(rejectEdge.target) ? END : rejectEdge.target,
          };

          const nodeId = node.id;
          graph.addConditionalEdges(
            nodeId as never,
            (state: BusinessWorkflowState) => {
              const decision = state.context._approvalDecision as string | undefined;
              return decision === 'reject' ? routingMap['reject'] : routingMap['approve'];
            },
            routingMap as never
          );
        } else if (outgoing.length === 1) {
          const target = endNodeIds.has(outgoing[0].target) ? END : outgoing[0].target;
          graph.addEdge(node.id as never, target as never);
        }
      } else {
        // Simple nodes: single outgoing edge
        const target = endNodeIds.has(outgoing[0].target) ? END : outgoing[0].target;
        graph.addEdge(node.id as never, target as never);
      }
    }

    return graph.compile({ checkpointer: this.checkpointer });
  }

  // ---------------------------------------------------------------------------
  // Build individual node function
  // ---------------------------------------------------------------------------

  private buildNodeFn(node: ProcessNode, executionMode: string) {
    return async (state: BusinessWorkflowState): Promise<Partial<BusinessWorkflowState>> => {
      const { executionId } = state;
      const supabase = createServiceRoleClient();
      const completionMode = node.data.completion_mode ?? 'sync';

      // Create workflow_tasks record
      const { data: task, error: taskError } = await supabase
        .from('workflow_tasks')
        .insert({
          execution_id: executionId,
          node_id: node.id,
          name: node.data.label,
          type: node.data.type,
          handler: node.data.handler ?? null,
          completion_mode: completionMode,
          status: 'running',
          assigned_role: node.data.assigned_role ?? null,
          attempt_count: 1,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (taskError || !task) {
        throw new Error(`WorkflowCompiler: failed to create task record for node ${node.id} — ${taskError?.message}`);
      }

      const taskId = task.id;

      // Update execution's current node
      await supabase
        .from('workflow_executions')
        .update({ execution_context: { ...state.context, _currentNodeId: node.id } })
        .eq('id', executionId);

      try {
        let result: Record<string, unknown> = {};

        if (completionMode === 'hitl' || completionMode === 'ai_session') {
          // Pause execution — human or AI session signals resume
          await supabase
            .from('workflow_tasks')
            .update({ status: 'paused' })
            .eq('id', taskId);

          await supabase
            .from('workflow_executions')
            .update({ status: 'paused' })
            .eq('id', executionId);

          // LangGraph interrupt — execution suspends here until resume() is called
          const resumePayload = interrupt({
            taskId,
            nodeId: node.id,
            nodeLabel: node.data.label,
            completionMode,
            assignedRole: node.data.assigned_role,
            executionId,
          }) as Record<string, unknown>;

          // Store the decision for conditional routing
          if (completionMode === 'hitl') {
            const decision = resumePayload.decision as string | undefined;
            result = { ...resumePayload, _approvalDecision: decision };
          } else {
            result = resumePayload;
          }

          await supabase
            .from('workflow_executions')
            .update({ status: 'running' })
            .eq('id', executionId);
        } else if (node.data.handler) {
          // Sync or webhook — call the handler
          const idempotencyKey = `${executionId}:${node.id}:1`;

          result = await nodeHandlerRegistry.execute(node.data.handler, state.context, {
            executionId,
            nodeId: node.id,
            executionMode,
            idempotencyKey,
            handlerConfig: node.data.handler_config,
          });

          if (completionMode === 'webhook') {
            // Store webhook reference and pause for external callback
            await supabase
              .from('workflow_tasks')
              .update({ status: 'paused', result_data: result })
              .eq('id', taskId);

            await supabase
              .from('workflow_executions')
              .update({ status: 'paused' })
              .eq('id', executionId);

            const webhookResume = interrupt({
              taskId,
              nodeId: node.id,
              pendingWebhookRef: result,
            }) as Record<string, unknown>;

            result = { ...result, ...webhookResume };

            await supabase
              .from('workflow_executions')
              .update({ status: 'running' })
              .eq('id', executionId);
          }
        }

        // Mark task completed
        await supabase
          .from('workflow_tasks')
          .update({
            status: 'completed',
            result_data: result,
            completed_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        return {
          currentNodeId: node.id,
          completedNodes: [node.id],
          context: result,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        await supabase
          .from('workflow_tasks')
          .update({
            status: 'failed',
            result_data: { error: message },
            completed_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        import('@/lib/workflow/exception-writer').then(({ writeException }) =>
          writeException({
            supabase,
            source: 'workflow_failure',
            severity: 'medium',
            title: `Task failed: ${node.data.label ?? node.id}`,
            description: message,
            sourceEntityType: 'workflow_task',
            sourceEntityId: taskId,
            context: { error: message, node_id: node.id, execution_id: state.executionId },
          })
        ).catch(() => {});

        return {
          currentNodeId: node.id,
          errors: [{ nodeId: node.id, error: message, attemptCount: 1 }],
        };
      }
    };
  }
}
