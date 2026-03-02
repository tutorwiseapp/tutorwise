/**
 * Template Overlap Detector
 *
 * Compares discovered workflows against existing workflow_process_templates
 * to detect matches, outdated templates, and new (unmatched) discoveries.
 */

import type { WorkflowProcessTemplate } from '@/components/feature/process-studio/types';
import type { TemplateOverlap, RawDiscovery } from './types';

/**
 * Simple fuzzy string similarity (Sørensen–Dice coefficient on bigrams).
 * Returns 0–1 where 1 = identical.
 */
function fuzzyMatch(a: string, b: string): number {
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  if (sa === sb) return 1;
  if (sa.length < 2 || sb.length < 2) return 0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < sa.length - 1; i++) bigramsA.add(sa.substring(i, i + 2));

  const bigramsB = new Set<string>();
  for (let i = 0; i < sb.length - 1; i++) bigramsB.add(sb.substring(i, i + 2));

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Compute human-readable differences between two step lists.
 */
function computeDifferences(
  discoveredSteps: string[],
  templateSteps: string[]
): string[] {
  const diffs: string[] = [];

  // Steps in discovery but not in template
  for (const step of discoveredSteps) {
    const found = templateSteps.some((ts) => fuzzyMatch(step, ts) > 0.7);
    if (!found) diffs.push(`New step: "${step}" (not in template)`);
  }

  // Steps in template but not in discovery
  for (const step of templateSteps) {
    const found = discoveredSteps.some((ds) => fuzzyMatch(step, ds) > 0.7);
    if (!found) diffs.push(`Missing step: "${step}" (in template but not discovered)`);
  }

  // Step count difference
  if (discoveredSteps.length !== templateSteps.length) {
    diffs.push(
      `Step count: discovered ${discoveredSteps.length} vs template ${templateSteps.length}`
    );
  }

  return diffs;
}

/**
 * Detect overlap between a single discovery and all templates.
 */
export function detectOverlap(
  discovery: RawDiscovery,
  templates: WorkflowProcessTemplate[]
): TemplateOverlap {
  // 1. Find template with matching category + similar name
  let bestCandidate: WorkflowProcessTemplate | null = null;
  let bestNameScore = 0;

  for (const template of templates) {
    // Category match first
    if (template.category !== discovery.category) continue;

    const nameScore = fuzzyMatch(template.name, discovery.name);
    if (nameScore > bestNameScore && nameScore > 0.4) {
      bestNameScore = nameScore;
      bestCandidate = template;
    }
  }

  // Also try matching without category if no match found
  if (!bestCandidate) {
    for (const template of templates) {
      const nameScore = fuzzyMatch(template.name, discovery.name);
      if (nameScore > bestNameScore && nameScore > 0.6) {
        bestNameScore = nameScore;
        bestCandidate = template;
      }
    }
  }

  if (!bestCandidate) {
    return { templateId: '', templateName: '', matchScore: 0, state: 'no_template' };
  }

  // 2. Compare step labels
  const discoveredSteps = discovery.previewSteps || discovery.stepNames || [];
  const templateSteps = bestCandidate.preview_steps || [];

  if (discoveredSteps.length === 0 || templateSteps.length === 0) {
    // Can't compare steps — use name score only
    return {
      templateId: bestCandidate.id,
      templateName: bestCandidate.name,
      matchScore: bestNameScore,
      state: bestNameScore > 0.7 ? 'matches' : 'outdated',
    };
  }

  const matchingSteps = discoveredSteps.filter((s) =>
    templateSteps.some((ts) => fuzzyMatch(s, ts) > 0.7)
  );

  const matchScore =
    matchingSteps.length /
    Math.max(discoveredSteps.length, templateSteps.length, 1);

  // 3. Determine state
  if (matchScore > 0.7) {
    return {
      templateId: bestCandidate.id,
      templateName: bestCandidate.name,
      matchScore,
      state: 'matches',
    };
  }

  const differences = computeDifferences(discoveredSteps, templateSteps);
  return {
    templateId: bestCandidate.id,
    templateName: bestCandidate.name,
    matchScore,
    state: 'outdated',
    differences,
  };
}

/**
 * Batch detect overlaps for multiple discoveries.
 */
export function detectOverlaps(
  discoveries: RawDiscovery[],
  templates: WorkflowProcessTemplate[]
): Map<string, TemplateOverlap> {
  const results = new Map<string, TemplateOverlap>();

  for (const discovery of discoveries) {
    const overlap = detectOverlap(discovery, templates);
    results.set(discovery.sourceIdentifier, overlap);
  }

  return results;
}
