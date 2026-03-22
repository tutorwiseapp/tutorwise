/**
 * SessionPhaseBar (v1.0)
 *
 * Floating bar rendered above the tldraw canvas via InFrontOfTheCanvas.
 * Shows the active Learn Your Way workflow phase with navigation controls.
 *
 * Architecture:
 * - Subscribes to workflow:phase-changed on the Ably session channel (Sprint C sync)
 * - Calls API routes for advance/back/stop — never writes state directly
 * - Owns no business logic: pure display + API calls
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useChannel } from 'ably/react';
import {
  ChevronRight, ChevronLeft, Square, Brain, MoreHorizontal,
  Clock, BookOpen,
} from 'lucide-react';
import type { SessionWorkflow } from './types';
import { AI_INVOLVEMENT_LABELS, AI_INVOLVEMENT_COLOURS } from './types';
import { isSessionEvent } from '@/lib/virtualspace/events';
import { executeCanvasActions } from '@/lib/virtualspace/CanvasActionExecutor';
import type { Editor } from '@tldraw/editor';

// ── Types ──────────────────────────────────────────────────────────────────

interface PhaseBarState {
  workflowId: string;
  workflowName: string;
  currentPhaseIndex: number;
  totalPhases: number;
  currentPhaseName: string;
  currentPhaseIcon: string;
  currentSageMode: string;
  startedAt: string;
}

interface SessionPhaseBarProps {
  sessionId: string;
  /** Ably session channel name (session:virtualspace:<sessionId>) */
  channelName: string;
  /** Initial state resolved server-side on session load */
  initialPhaseState?: PhaseBarState | null;
  /** Full workflow — used for phase dots and next phase preview */
  workflow: SessionWorkflow | null;
  isTutor?: boolean;
  /** Called on phase change — carries the new phaseIndex */
  onPhaseChange?: (phaseIndex: number) => void;
  /** tldraw editor ref — used to execute canvas actions on phase entry */
  editorRef?: React.MutableRefObject<Editor | null>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    const tick = () => {
      const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#64748b' }}>
      <Clock size={10} />
      {elapsed}
    </span>
  );
}

// zIndex constants — keep in sync with toolbar pills (z:500)
const Z_PHASE_BAR = 450;

// ── Component ──────────────────────────────────────────────────────────────

export function SessionPhaseBar({
  sessionId,
  channelName,
  initialPhaseState,
  workflow,
  isTutor,
  onPhaseChange,
  editorRef,
}: SessionPhaseBarProps) {
  const [phaseState, setPhaseState] = useState<PhaseBarState | null>(initialPhaseState ?? null);
  const [loading, setLoading] = useState<'advance' | 'back' | 'stop' | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  // ── Execute canvas actions on initial mount (e.g. after page refresh) ────
  useEffect(() => {
    if (!initialPhaseState || !workflow || !editorRef?.current) return;
    const phase = workflow.phases[initialPhaseState.currentPhaseIndex];
    if (phase?.canvasActions?.length) {
      try {
        executeCanvasActions(editorRef.current, phase.canvasActions);
      } catch (err) {
        console.warn('[SessionPhaseBar] Initial canvas action failed:', err);
      }
    }
  // Only run on mount — intentionally omitting deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sprint C: Ably real-time sync ────────────────────────────────────────

  useChannel(channelName, (msg) => {
    // Validate event shape before consuming — malformed Ably events must not crash
    if (isSessionEvent<import('@/lib/virtualspace/events').WorkflowStartedEvent>(msg as any, 'workflow:started')) {
      const d = msg.data as import('@/lib/virtualspace/events').WorkflowStartedEvent['data'];
      if (typeof d?.currentPhaseIndex !== 'number' || !d?.workflowId) return;
      setPhaseState({
        workflowId: d.workflowId,
        workflowName: d.workflowName,
        currentPhaseIndex: d.currentPhaseIndex,
        totalPhases: d.totalPhases,
        currentPhaseName: d.currentPhaseName,
        currentPhaseIcon: workflow?.phases[0]?.icon ?? '',
        currentSageMode: workflow?.phases[0]?.sageMode ?? workflow?.ai_involvement ?? 'full',
        startedAt: d.startedAt,
      });
    }

    if (isSessionEvent<import('@/lib/virtualspace/events').WorkflowPhaseChangedEvent>(msg as any, 'workflow:phase-changed')) {
      const d = msg.data as import('@/lib/virtualspace/events').WorkflowPhaseChangedEvent['data'];
      if (typeof d?.currentPhaseIndex !== 'number') return;
      setPhaseState(prev => prev ? {
        ...prev,
        currentPhaseIndex: d.currentPhaseIndex,
        currentPhaseName: d.currentPhaseName,
        currentPhaseIcon: d.currentPhaseIcon,
        currentSageMode: d.currentSageMode,
      } : null);
      onPhaseChange?.(d.currentPhaseIndex);
      // Execute canvas actions for the new phase (Sprint D)
      const newPhase = workflow?.phases[d.currentPhaseIndex];
      if (newPhase?.canvasActions?.length && editorRef?.current) {
        try {
          executeCanvasActions(editorRef.current, newPhase.canvasActions);
        } catch (err) {
          console.warn('[SessionPhaseBar] Canvas action on phase change failed:', err);
        }
      }
    }

    if (isSessionEvent<import('@/lib/virtualspace/events').WorkflowStoppedEvent>(msg as any, 'workflow:stopped')) {
      setPhaseState(null);
    }
  });

  // ── API calls ────────────────────────────────────────────────────────────

  const callRoute = useCallback(async (route: string, body?: object) => {
    const res = await fetch(`/api/virtualspace/${sessionId}/workflow/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }, [sessionId]);

  const handleAdvance = useCallback(async () => {
    setLoading('advance');
    try {
      const result = await callRoute('advance', { exitTrigger: 'tutor' });
      if (result.done) {
        // Last phase — auto-stop
        await callRoute('stop');
      }
    } finally {
      setLoading(null);
    }
  }, [callRoute]);

  const handleBack = useCallback(async () => {
    setLoading('back');
    try { await callRoute('back'); }
    finally { setLoading(null); }
  }, [callRoute]);

  const handleStop = useCallback(async () => {
    setLoading('stop');
    try { await callRoute('stop'); }
    finally { setLoading(null); setOverflowOpen(false); }
  }, [callRoute]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (!phaseState) return null;

  const phases = workflow?.phases ?? [];
  const sageColour = AI_INVOLVEMENT_COLOURS[phaseState.currentSageMode] ?? '#006c67';
  const sageLabel = AI_INVOLVEMENT_LABELS[phaseState.currentSageMode] ?? phaseState.currentSageMode;
  const isFirst = phaseState.currentPhaseIndex === 0;
  const isLast = phaseState.currentPhaseIndex >= phaseState.totalPhases - 1;
  const nextPhase = !isLast && phases[phaseState.currentPhaseIndex + 1];

  return (
    <div
      style={{
        position: 'absolute',
        top: 64, // below the main toolbar pills
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'hsl(204, 16%, 94%)',
        borderRadius: 10,
        zIndex: Z_PHASE_BAR,
        pointerEvents: 'all',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Workflow icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <BookOpen size={13} color="#006c67" />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#006c67', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {phaseState.workflowName}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: '#cbd5e1' }} />

      {/* Phase dots */}
      {phases.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {phases.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === phaseState.currentPhaseIndex ? 14 : 6,
                height: 6,
                borderRadius: 99,
                background: i === phaseState.currentPhaseIndex
                  ? '#006c67'
                  : i < phaseState.currentPhaseIndex
                  ? '#006c6760'
                  : '#cbd5e1',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}

      {/* Current phase name */}
      <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {phaseState.currentPhaseName}
      </span>

      {/* Sage mode badge */}
      <span style={{
        display: 'flex', alignItems: 'center', gap: 3,
        fontSize: 10, fontWeight: 600,
        color: sageColour,
        background: `${sageColour}15`,
        padding: '2px 6px',
        borderRadius: 4,
      }}>
        <Brain size={9} />
        {sageLabel}
      </span>

      {/* Elapsed timer */}
      <ElapsedTimer startedAt={phaseState.startedAt} />

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: '#cbd5e1' }} />

      {/* Tutor controls */}
      {isTutor && (
        <>
          {/* Back */}
          <button
            onClick={handleBack}
            disabled={isFirst || loading !== null}
            title="Previous phase"
            style={{
              width: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', borderRadius: 5, cursor: isFirst ? 'not-allowed' : 'pointer',
              background: 'transparent',
              color: isFirst ? '#cbd5e1' : '#475569',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!isFirst) e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronLeft size={14} />
          </button>

          {/* Advance / next phase label */}
          <button
            onClick={handleAdvance}
            disabled={loading !== null}
            title={isLast ? 'Complete workflow' : `Next: ${nextPhase ? nextPhase.name : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              height: 26, padding: '0 8px',
              border: 'none', borderRadius: 5, cursor: 'pointer',
              background: isLast ? '#006c6715' : '#006c67',
              color: isLast ? '#006c67' : 'white',
              fontSize: 11, fontWeight: 600,
              transition: 'opacity 0.1s',
              opacity: loading !== null ? 0.6 : 1,
            }}
          >
            {loading === 'advance' ? '…' : isLast ? 'Finish' : (
              <>
                {nextPhase && <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextPhase.name}</span>}
                <ChevronRight size={12} />
              </>
            )}
          </button>

          {/* Overflow menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOverflowOpen(v => !v)}
              title="More options"
              style={{
                width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', borderRadius: 5, cursor: 'pointer',
                background: overflowOpen ? 'rgba(0,0,0,0.06)' : 'transparent',
                color: '#475569',
              }}
            >
              <MoreHorizontal size={14} />
            </button>

            {overflowOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: 'white', borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.08)',
                minWidth: 160, zIndex: 9999,
                overflow: 'hidden',
              }}>
                <button
                  onClick={handleStop}
                  disabled={loading !== null}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 12px',
                    border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 12, color: '#ef4444', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Square size={12} />
                  {loading === 'stop' ? 'Stopping…' : 'Stop workflow'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
