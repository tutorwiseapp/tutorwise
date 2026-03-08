/**
 * Onboarding Scanner
 *
 * Scans the onboarding directory structure to discover role-based onboarding flows.
 * Structured scanner — maps directory names to workflow steps.
 */

import fs from 'fs/promises';
import path from 'path';
import type { ProcessNode, ProcessEdge } from '@/components/feature/workflow/types';
import type { SourceScanner, RawDiscovery } from '../types';

const ONBOARDING_DIR = path.join(
  process.cwd(),
  'src/app/(authenticated)/onboarding'
);

// Known onboarding step order (from codebase convention)
const STEP_ORDER = [
  'personal-info',
  'professional-details',
  'verification',
  'availability',
];

interface OnboardingRole {
  role: string;
  steps: string[];
  dirPath: string;
}

function humanizeStep(step: string): string {
  return step
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function humanizeRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Build a workflow graph from onboarding steps.
 */
function buildOnboardingGraph(
  role: OnboardingRole
): { nodes: ProcessNode[]; edges: ProcessEdge[]; previewSteps: string[] } {
  const nodes: ProcessNode[] = [];
  const edges: ProcessEdge[] = [];
  let y = 50;

  // Trigger
  const triggerId = 'trigger-1';
  nodes.push({
    id: triggerId,
    type: 'processStep',
    position: { x: 300, y },
    data: {
      label: `${humanizeRole(role.role)} Signs Up`,
      type: 'trigger',
      description: `New ${role.role} account created, onboarding begins`,
      editable: false,
    },
  });
  y += 120;

  let prevId = triggerId;

  for (let i = 0; i < role.steps.length; i++) {
    const step = role.steps[i];
    const nodeId = `step-${i + 1}`;
    const label = humanizeStep(step);

    nodes.push({
      id: nodeId,
      type: 'processStep',
      position: { x: 300, y },
      data: {
        label,
        type: 'action',
        description: `${humanizeRole(role.role)} completes ${label.toLowerCase()} step`,
        editable: true,
      },
    });
    edges.push({
      id: `e-${prevId}-${nodeId}`,
      source: prevId,
      target: nodeId,
      animated: true,
    });
    prevId = nodeId;
    y += 120;
  }

  // End node
  const endId = 'end-1';
  nodes.push({
    id: endId,
    type: 'processStep',
    position: { x: 300, y },
    data: {
      label: 'Onboarding Complete',
      type: 'end',
      description: `${humanizeRole(role.role)} onboarding finished — account fully set up`,
      editable: false,
    },
  });
  edges.push({
    id: `e-${prevId}-${endId}`,
    source: prevId,
    target: endId,
    animated: true,
  });

  const previewSteps = role.steps.map(humanizeStep).slice(0, 5);

  return { nodes, edges, previewSteps };
}

export class OnboardingScanner implements SourceScanner {
  sourceType = 'onboarding' as const;
  isStructured = true;

  async scan(): Promise<RawDiscovery[]> {
    const results: RawDiscovery[] = [];

    let entries: string[];
    try {
      entries = await fs.readdir(ONBOARDING_DIR);
    } catch {
      return results;
    }

    for (const entry of entries) {
      const entryPath = path.join(ONBOARDING_DIR, entry);
      const stat = await fs.stat(entryPath).catch(() => null);
      if (!stat?.isDirectory()) continue;

      // Each directory is a role (tutor, client, agent)
      const role = entry;

      // Read step subdirectories
      let stepEntries: string[];
      try {
        stepEntries = await fs.readdir(entryPath);
      } catch {
        continue;
      }

      // Filter to directories only and sort by known order
      const steps: string[] = [];
      for (const stepEntry of stepEntries) {
        const stepPath = path.join(entryPath, stepEntry);
        const stepStat = await fs.stat(stepPath).catch(() => null);
        if (stepStat?.isDirectory()) {
          steps.push(stepEntry);
        }
      }

      // Sort by known step order, unknowns go to end
      steps.sort((a, b) => {
        const ai = STEP_ORDER.indexOf(a);
        const bi = STEP_ORDER.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });

      if (steps.length === 0) continue;

      const roleInfo: OnboardingRole = {
        role,
        steps,
        dirPath: `apps/web/src/app/(authenticated)/onboarding/${role}/`,
      };

      const { nodes, edges, previewSteps } = buildOnboardingGraph(roleInfo);

      results.push({
        name: `${humanizeRole(role)} Onboarding Flow`,
        description: `${steps.length}-step onboarding wizard for ${role} role: ${steps.map(humanizeStep).join(' → ')}`,
        sourceType: this.sourceType,
        sourceIdentifier: `onboarding-${role}`,
        sourceFilePaths: [roleInfo.dirPath],
        category: 'onboarding',
        rawContent: `Role: ${role}\nSteps: ${steps.join(', ')}`,
        confidence: 'high',
        confidenceReason:
          'Directly mapped from onboarding directory structure — each subdirectory is a step',
        stepCount: nodes.length,
        stepNames: steps.map(humanizeStep),
        nodes,
        edges,
        previewSteps,
      });
    }

    return results;
  }
}
