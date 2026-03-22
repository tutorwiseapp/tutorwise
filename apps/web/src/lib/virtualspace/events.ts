/**
 * VirtualSpace Session Events (v1.0)
 *
 * Canonical typed union for every message that flows through the Ably
 * session channel (`session:virtualspace:<sessionId>`).
 *
 * Rules:
 * - Every Ably publish MUST use one of these event names.
 * - Every Ably subscribe MUST type-narrow via the `name` discriminant.
 * - No raw string payloads — always use the typed data shapes below.
 */

// ── Participant events ─────────────────────────────────────────────────────

export interface SessionJoinedEvent {
  name: 'session:joined';
  data: { userId: string; displayName: string; role: 'owner' | 'collaborator' | 'viewer' };
}

export interface SessionLeftEvent {
  name: 'session:left';
  data: { userId: string };
}

// ── Cursor events ──────────────────────────────────────────────────────────

export interface CursorMovedEvent {
  name: 'cursor';
  data: { userId: string; displayName: string; x: number; y: number };
}

// ── Draw events ────────────────────────────────────────────────────────────

export interface DrawEvent {
  name: 'draw';
  data: { records: unknown[] };
}

// ── Chat events ────────────────────────────────────────────────────────────

export interface ChatMessageEvent {
  name: 'chat';
  data: { userId: string; displayName: string; message: string; timestamp: string };
}

// ── Reaction events ────────────────────────────────────────────────────────

export interface ReactionEvent {
  name: 'reaction';
  data: { userId: string; displayName: string; emoji: string };
}

// ── Hand raise events ──────────────────────────────────────────────────────

export interface RaiseHandEvent {
  name: 'raise-hand';
  data: { userId: string; displayName: string; raised: boolean };
}

// ── Timer events ───────────────────────────────────────────────────────────

export interface TimerStartedEvent {
  name: 'timer:started';
  data: { durationSecs: number; startedAt: string };
}

export interface TimerStoppedEvent {
  name: 'timer:stopped';
  data: Record<string, never>;
}

// ── Draw lock events ───────────────────────────────────────────────────────

export interface DrawLockChangedEvent {
  name: 'draw-lock';
  data: { locked: boolean };
}

// ── Workflow events ────────────────────────────────────────────────────────

export interface WorkflowStartedEvent {
  name: 'workflow:started';
  data: {
    workflowId: string;
    workflowName: string;
    totalPhases: number;
    currentPhaseIndex: number;
    currentPhaseName: string;
    startedAt: string;
  };
}

export interface WorkflowPhaseChangedEvent {
  name: 'workflow:phase-changed';
  data: {
    workflowId: string;
    previousPhaseIndex: number;
    currentPhaseIndex: number;
    currentPhaseName: string;
    currentPhaseIcon: string;
    currentSageMode: string;
    exitTrigger: 'auto' | 'tutor' | 'sage' | 'time';
    changedAt: string;
  };
}

export interface WorkflowStoppedEvent {
  name: 'workflow:stopped';
  data: {
    workflowId: string;
    phasesCompleted: number;
    stoppedAt: string;
  };
}

// ── Union ──────────────────────────────────────────────────────────────────

export type SessionEvent =
  | SessionJoinedEvent
  | SessionLeftEvent
  | CursorMovedEvent
  | DrawEvent
  | ChatMessageEvent
  | ReactionEvent
  | RaiseHandEvent
  | TimerStartedEvent
  | TimerStoppedEvent
  | DrawLockChangedEvent
  | WorkflowStartedEvent
  | WorkflowPhaseChangedEvent
  | WorkflowStoppedEvent;

export type SessionEventName = SessionEvent['name'];

/** Type-narrow a raw Ably message to a specific SessionEvent by name */
export function isSessionEvent<T extends SessionEvent>(
  msg: { name: string; data: unknown },
  name: T['name']
): msg is T {
  return msg.name === name;
}
