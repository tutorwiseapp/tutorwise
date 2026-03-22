/**
 * PhaseContextResolver (v1.0)
 *
 * Pure function — no DB, no side effects, fully testable.
 *
 * Resolves the active workflow phase into a typed PhaseContext that Sage
 * and the canvas action system consume. Nothing else needs to know about
 * the workflow schema.
 *
 * Usage:
 *   const ctx = resolvePhaseContext(workflow, 2, 'collaborator', { senFocus: true });
 *   // Inject ctx.sageSystemBlock into extraSystemContext for /api/sage/virtualspace/message
 *   // Pass ctx.canvasActions to CanvasActionExecutor on phase entry
 */

import type { SessionWorkflow, WorkflowPhase } from '@/components/feature/virtualspace/workflow/types';

// ── Types ──────────────────────────────────────────────────────────────────

export type SessionRole = 'owner' | 'collaborator' | 'viewer';

export interface SenFlags {
  senFocus?: boolean;
  /** Any additional SEN/SEND adaptations requested at session level */
  adaptations?: string[];
}

/**
 * The resolved, ready-to-consume phase context.
 * Consumers never touch the raw WorkflowPhase schema.
 */
export interface PhaseContext {
  /** Workflow metadata */
  workflowId: string;
  workflowName: string;
  workflowSubject: string;
  workflowLevel: string;

  /** Current phase */
  phaseIndex: number;
  totalPhases: number;
  phaseId: string;
  phaseName: string;
  phaseIcon: string;
  phaseNarrative: string;
  durationMins: number;

  /** Sage configuration for this phase */
  sageMode: WorkflowPhase['sageMode'];
  sagePersona: string;

  /** Canvas actions to execute on phase entry */
  canvasActions: WorkflowPhase['canvasActions'];

  /** Exit conditions for this phase */
  exitConditions: WorkflowPhase['exitConditions'];

  /** Whether this phase enables homework creation */
  homeworkEnabled: boolean;

  /** Navigation helpers */
  isFirstPhase: boolean;
  isLastPhase: boolean;
  nextPhaseName: string | null;

  /**
   * Pre-rendered system prompt block ready to append to extraSystemContext.
   * Sage consumes this directly — no conditional logic needed in the stream route.
   */
  sageSystemBlock: string;
}

// ── Resolver ───────────────────────────────────────────────────────────────

/**
 * Resolves a workflow + phase index into a PhaseContext.
 *
 * @param workflow   - The full SessionWorkflow (loaded from DB or cache)
 * @param phaseIndex - Zero-based index of the current phase
 * @param role       - The current user's session role (affects Sage persona framing)
 * @param senFlags   - Optional SEN/SEND flags for accessibility adaptations
 */
export function resolvePhaseContext(
  workflow: SessionWorkflow,
  phaseIndex: number,
  role: SessionRole,
  senFlags: SenFlags = {}
): PhaseContext {
  const phase = workflow.phases[phaseIndex];

  if (!phase) {
    console.error('[PhaseContextResolver] Phase index out of bounds', {
      phaseIndex,
      totalPhases: workflow.phases.length,
      workflowId: workflow.id,
      workflowSlug: workflow.slug,
    });
    throw new Error(
      `Phase index ${phaseIndex} out of bounds for workflow "${workflow.slug}" (${workflow.phases.length} phases)`
    );
  }

  const isFirstPhase = phaseIndex === 0;
  const isLastPhase = phaseIndex === workflow.phases.length - 1;
  const nextPhase = isLastPhase ? null : workflow.phases[phaseIndex + 1];

  const sagePersona = phase.sagePersona ?? defaultPersonaForMode(phase.sageMode, role);

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowSubject: workflow.subject,
    workflowLevel: workflow.level,

    phaseIndex,
    totalPhases: workflow.phases.length,
    phaseId: phase.id,
    phaseName: phase.name,
    phaseIcon: phase.icon,
    phaseNarrative: phase.narrative,
    durationMins: phase.durationMins,

    sageMode: phase.sageMode,
    sagePersona,
    canvasActions: phase.canvasActions,
    exitConditions: phase.exitConditions,
    homeworkEnabled: phase.homeworkEnabled ?? false,

    isFirstPhase,
    isLastPhase,
    nextPhaseName: nextPhase?.name ?? null,

    sageSystemBlock: buildSageSystemBlock(workflow, phase, phaseIndex, sagePersona, senFlags),
  };
}

// ── Private helpers ────────────────────────────────────────────────────────

function defaultPersonaForMode(mode: WorkflowPhase['sageMode'], role: SessionRole): string {
  if (role === 'owner') {
    // Tutor-facing persona
    switch (mode) {
      case 'full':     return 'Lead Tutor';
      case 'co-teach': return 'Co-Educator';
      case 'hints':    return 'Prompt Guide';
      case 'silent':   return 'Silent Observer';
    }
  }
  // Student-facing persona
  switch (mode) {
    case 'full':     return 'Sage';
    case 'co-teach': return 'Sage';
    case 'hints':    return 'Hint Guide';
    case 'silent':   return 'Silent Sage';
    default:         return 'Sage';
  }
}

function buildSageSystemBlock(
  workflow: SessionWorkflow,
  phase: WorkflowPhase,
  phaseIndex: number,
  sagePersona: string,
  senFlags: SenFlags
): string {
  const lines: string[] = [
    '## Active Session Phase',
    '',
    `Workflow: ${workflow.name} (${workflow.subject}, ${workflow.level})`,
    `Phase: ${phaseIndex + 1} of ${workflow.phases.length} — ${phase.name}`,
    `Sage Mode: ${phase.sageMode}`,
    `Persona: ${sagePersona}`,
    '',
    '### Phase Instructions',
    phase.sagePromptTemplate,
    '',
    '### Phase Narrative (student context)',
    phase.narrative,
  ];

  if (senFlags.senFocus || workflow.sen_focus) {
    lines.push('', '### SEN/SEND Adaptation Active');
    lines.push('Use shorter sentences, concrete examples, and check for understanding frequently.');
    if (senFlags.adaptations?.length) {
      lines.push(`Additional adaptations: ${senFlags.adaptations.join(', ')}`);
    }
  }

  return lines.join('\n');
}
