/**
 * CAS-Workflow Integration Bridge
 *
 * Connects the Platform Workflow Runtime with the CAS message bus.
 * Publishes workflow lifecycle events so CAS agents can observe and respond.
 *
 * @module cas/integration/workflow-bridge
 */

import { publish, createStatusEnvelope, createTaskEnvelope } from '../messages';

// --- Types ---

export interface WorkflowLifecycleEvent {
  executionId: string;
  processId: string;
  processName?: string;
}

export interface WorkflowCompletedEvent extends WorkflowLifecycleEvent {
  context: Record<string, unknown>;
  durationMs?: number;
}

export interface WorkflowPausedEvent extends WorkflowLifecycleEvent {
  reason: string;
  nodeId?: string;
}

export interface WorkflowFailedEvent extends WorkflowLifecycleEvent {
  error: string;
  nodeId?: string;
}

export interface ShadowDivergenceEvent extends WorkflowLifecycleEvent {
  divergenceData: Record<string, unknown>;
}

export interface WorkflowScanEvent {
  scanId: string;
  processCount: number;
  discoveredCount: number;
  completedAt: string;
}

// --- Bridge ---

export class WorkflowBridge {
  private agentId = 'workflow-runtime';

  async handleWorkflowStarted(executionId: string, processId: string): Promise<void> {
    try {
      const envelope = createStatusEnvelope(this.agentId, {
        type: 'workflow.started',
        executionId,
        processId,
        startedAt: new Date().toISOString(),
      });
      await publish(envelope);
    } catch (err) {
      console.error('[WorkflowBridge] handleWorkflowStarted error:', err);
    }
  }

  async handleWorkflowCompleted(event: WorkflowCompletedEvent): Promise<void> {
    try {
      const envelope = createStatusEnvelope(this.agentId, {
        type: 'workflow.completed',
        ...event,
        completedAt: new Date().toISOString(),
      });
      await publish(envelope);
    } catch (err) {
      console.error('[WorkflowBridge] handleWorkflowCompleted error:', err);
    }
  }

  async handleWorkflowPaused(event: WorkflowPausedEvent): Promise<void> {
    try {
      const envelope = createTaskEnvelope(this.agentId, {
        type: 'workflow.paused',
        ...event,
        pausedAt: new Date().toISOString(),
      });
      await publish(envelope);
    } catch (err) {
      console.error('[WorkflowBridge] handleWorkflowPaused error:', err);
    }
  }

  async handleWorkflowFailed(event: WorkflowFailedEvent): Promise<void> {
    try {
      const envelope = createStatusEnvelope(this.agentId, {
        type: 'workflow.failed',
        ...event,
        failedAt: new Date().toISOString(),
      });
      await publish(envelope);
    } catch (err) {
      console.error('[WorkflowBridge] handleWorkflowFailed error:', err);
    }
  }

  async handleShadowDivergence(event: ShadowDivergenceEvent): Promise<void> {
    try {
      const envelope = createStatusEnvelope(this.agentId, {
        type: 'workflow.shadow_divergence',
        ...event,
        detectedAt: new Date().toISOString(),
      });
      await publish(envelope);
    } catch (err) {
      console.error('[WorkflowBridge] handleShadowDivergence error:', err);
    }
  }

  async handleScanCompleted(event: WorkflowScanEvent): Promise<void> {
    try {
      const envelope = createStatusEnvelope(this.agentId, {
        type: 'workflow.scan_completed',
        ...event,
      });
      await publish(envelope);
    } catch (err) {
      console.error('[WorkflowBridge] handleScanCompleted error:', err);
    }
  }

  async handleTriggerDeduped(processId: string, entityId: string): Promise<void> {
    try {
      const envelope = createStatusEnvelope(this.agentId, {
        type: 'workflow.trigger_deduped',
        processId,
        entityId,
        dedupedAt: new Date().toISOString(),
      });
      await publish(envelope);
    } catch (err) {
      console.error('[WorkflowBridge] handleTriggerDeduped error:', err);
    }
  }

  async getStatus() {
    return { connected: true, bridge: 'workflow', pendingFeedback: 0 };
  }
}

export const workflowBridge = new WorkflowBridge();
