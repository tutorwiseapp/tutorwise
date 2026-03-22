/**
 * VirtualSpaceWorkflowRuntime (v1.0)
 *
 * Server-side class — the ONLY writer to virtualspace_sessions.workflow_state.
 * All phase transitions go through here. Broadcasts typed SessionEvents on Ably.
 *
 * Usage (in API route handlers):
 *   const runtime = await VirtualSpaceWorkflowRuntime.forSession(sessionId, userId);
 *   await runtime.start(workflowId);
 *   await runtime.advance('tutor');
 *   await runtime.stop();
 */

import { createClient } from '@/utils/supabase/server';
import Ably from 'ably';
import type {
  WorkflowStartedEvent,
  WorkflowPhaseChangedEvent,
  WorkflowStoppedEvent,
} from './events';

// ── Types ──────────────────────────────────────────────────────────────────

export type PhaseExitTrigger = 'auto' | 'tutor' | 'sage' | 'time';

export interface WorkflowTransition {
  phaseId: string;
  phaseName: string;
  enteredAt: string;
  exitedAt: string;
  exitTrigger: PhaseExitTrigger;
}

export interface WorkflowState {
  currentPhaseIndex: number;
  startedAt: string;
  transitions: WorkflowTransition[];
}

export class WorkflowRuntimeError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'WorkflowRuntimeError';
  }
}

// ── Runtime ────────────────────────────────────────────────────────────────

export class VirtualSpaceWorkflowRuntime {
  private constructor(
    private readonly supabase: Awaited<ReturnType<typeof createClient>>,
    private readonly sessionId: string,
    private readonly userId: string,
    private readonly ablyChannelName: string,
  ) {}

  /**
   * Factory — validates the user has owner/collaborator access to the session.
   */
  static async forSession(
    sessionId: string,
    userId: string,
  ): Promise<VirtualSpaceWorkflowRuntime> {
    const supabase = await createClient();

    const { data: session, error } = await supabase
      .from('virtualspace_sessions')
      .select('id, owner_id, status')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      throw new WorkflowRuntimeError('Session not found', 'NOT_FOUND');
    }
    if (session.status !== 'active') {
      throw new WorkflowRuntimeError('Session is not active', 'SESSION_INACTIVE');
    }
    if (session.owner_id !== userId) {
      throw new WorkflowRuntimeError('Only the session owner can control the workflow', 'FORBIDDEN');
    }

    const channelName = `session:virtualspace:${sessionId}`;
    return new VirtualSpaceWorkflowRuntime(supabase, sessionId, userId, channelName);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Start a workflow from phase 0.
   * Idempotent — re-starting the same workflow resets to phase 0.
   */
  async start(workflowId: string): Promise<WorkflowState> {
    const workflow = await this.fetchWorkflow(workflowId);

    const now = new Date().toISOString();
    const state: WorkflowState = {
      currentPhaseIndex: 0,
      startedAt: now,
      transitions: [],
    };

    await this.supabase
      .from('virtualspace_sessions')
      .update({ workflow_id: workflowId, workflow_state: state })
      .eq('id', this.sessionId);

    const firstPhase = workflow.phases[0];
    const event: WorkflowStartedEvent = {
      name: 'workflow:started',
      data: {
        workflowId,
        workflowName: workflow.name,
        totalPhases: workflow.phases.length,
        currentPhaseIndex: 0,
        currentPhaseName: firstPhase.name,
        startedAt: now,
      },
    };
    await this.publish(event);

    return state;
  }

  /**
   * Advance to the next phase. Logs the transition and broadcasts the event.
   * Returns null if already on the last phase.
   */
  async advance(exitTrigger: PhaseExitTrigger = 'tutor'): Promise<WorkflowState | null> {
    const { session, workflow } = await this.fetchSessionWithWorkflow();
    const state = session.workflow_state as WorkflowState;
    const currentPhase = workflow.phases[state.currentPhaseIndex];

    if (state.currentPhaseIndex >= workflow.phases.length - 1) {
      return null; // already on last phase — caller should call stop()
    }

    const now = new Date().toISOString();
    const nextIndex = state.currentPhaseIndex + 1;
    const nextPhase = workflow.phases[nextIndex];

    const transition: WorkflowTransition = {
      phaseId: currentPhase.id,
      phaseName: currentPhase.name,
      enteredAt: this.resolvePhaseEnteredAt(state),
      exitedAt: now,
      exitTrigger,
    };

    const nextState: WorkflowState = {
      ...state,
      currentPhaseIndex: nextIndex,
      transitions: [...state.transitions, transition],
    };

    // Optimistic lock: only update if currentPhaseIndex hasn't changed since we read it
    const { error: updateError } = await this.supabase
      .from('virtualspace_sessions')
      .update({ workflow_state: nextState })
      .eq('id', this.sessionId)
      .filter('workflow_state->>currentPhaseIndex', 'eq', String(state.currentPhaseIndex));

    if (updateError) {
      throw new WorkflowRuntimeError('Phase advance failed — concurrent modification detected', 'CONFLICT');
    }

    const event: WorkflowPhaseChangedEvent = {
      name: 'workflow:phase-changed',
      data: {
        workflowId: workflow.id,
        previousPhaseIndex: state.currentPhaseIndex,
        currentPhaseIndex: nextIndex,
        currentPhaseName: nextPhase.name,
        currentPhaseIcon: nextPhase.icon,
        currentSageMode: nextPhase.sageMode,
        exitTrigger,
        changedAt: now,
      },
    };
    const published = await this.publish(event);
    if (!published) {
      console.warn('[WorkflowRuntime] advance: Ably publish failed — participants may not see phase change');
    }

    return nextState;
  }

  /**
   * Go back to the previous phase. Replays canvas actions on the client side.
   * Returns null if already on phase 0.
   */
  async back(): Promise<WorkflowState | null> {
    const { session, workflow } = await this.fetchSessionWithWorkflow();
    const state = session.workflow_state as WorkflowState;

    if (state.currentPhaseIndex === 0) return null;

    const now = new Date().toISOString();
    const prevIndex = state.currentPhaseIndex - 1;
    const prevPhase = workflow.phases[prevIndex];
    const currentPhase = workflow.phases[state.currentPhaseIndex];

    const transition: WorkflowTransition = {
      phaseId: currentPhase.id,
      phaseName: currentPhase.name,
      enteredAt: this.resolvePhaseEnteredAt(state),
      exitedAt: now,
      exitTrigger: 'tutor',
    };

    const prevState: WorkflowState = {
      ...state,
      currentPhaseIndex: prevIndex,
      transitions: [...state.transitions, transition],
    };

    // Optimistic lock: only update if currentPhaseIndex hasn't changed since we read it
    const { error: updateError } = await this.supabase
      .from('virtualspace_sessions')
      .update({ workflow_state: prevState })
      .eq('id', this.sessionId)
      .filter('workflow_state->>currentPhaseIndex', 'eq', String(state.currentPhaseIndex));

    if (updateError) {
      throw new WorkflowRuntimeError('Phase back failed — concurrent modification detected', 'CONFLICT');
    }

    const event: WorkflowPhaseChangedEvent = {
      name: 'workflow:phase-changed',
      data: {
        workflowId: workflow.id,
        previousPhaseIndex: state.currentPhaseIndex,
        currentPhaseIndex: prevIndex,
        currentPhaseName: prevPhase.name,
        currentPhaseIcon: prevPhase.icon,
        currentSageMode: prevPhase.sageMode,
        exitTrigger: 'tutor',
        changedAt: now,
      },
    };
    const published = await this.publish(event);
    if (!published) {
      console.warn('[WorkflowRuntime] back: Ably publish failed — participants may not see phase change');
    }

    return prevState;
  }

  /**
   * Stop the active workflow. Clears workflow_state, keeps workflow_id for analytics.
   */
  async stop(): Promise<void> {
    const { session, workflow } = await this.fetchSessionWithWorkflow();
    const state = session.workflow_state as WorkflowState;

    const phasesCompleted = state.transitions.length;

    await this.supabase
      .from('virtualspace_sessions')
      .update({ workflow_state: null })
      .eq('id', this.sessionId);

    const event: WorkflowStoppedEvent = {
      name: 'workflow:stopped',
      data: {
        workflowId: workflow.id,
        phasesCompleted,
        stoppedAt: new Date().toISOString(),
      },
    };
    await this.publish(event);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async fetchWorkflow(workflowId: string) {
    const { data, error } = await this.supabase
      .from('session_workflows')
      .select('id, name, phases')
      .eq('id', workflowId)
      .single();

    if (error || !data) {
      throw new WorkflowRuntimeError(`Workflow ${workflowId} not found`, 'WORKFLOW_NOT_FOUND');
    }
    return data as { id: string; name: string; phases: Array<{ id: string; name: string; icon: string; sageMode: string }> };
  }

  private async fetchSessionWithWorkflow() {
    const { data: session, error } = await this.supabase
      .from('virtualspace_sessions')
      .select('workflow_id, workflow_state')
      .eq('id', this.sessionId)
      .single();

    if (error || !session?.workflow_id || !session?.workflow_state) {
      throw new WorkflowRuntimeError('No active workflow on this session', 'NO_ACTIVE_WORKFLOW');
    }

    const workflow = await this.fetchWorkflow(session.workflow_id);
    return { session, workflow };
  }

  private resolvePhaseEnteredAt(state: WorkflowState): string {
    // The current phase was entered either at session start or at the last transition
    if (state.transitions.length === 0) return state.startedAt;
    return state.transitions[state.transitions.length - 1].exitedAt;
  }

  private async publish(event: { name: string; data: unknown }): Promise<boolean> {
    try {
      const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
      const channel = ably.channels.get(this.ablyChannelName);
      await channel.publish(event.name, event.data);
      return true;
    } catch (err) {
      // Non-fatal — DB state is already written, but callers should warn users
      console.error('[WorkflowRuntime] Ably publish failed:', err);
      return false;
    }
  }
}
