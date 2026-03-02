/**
 * Scanner Service Orchestrator
 *
 * Manages all source scanners and coordinates discovery scans.
 * Each source type is scanned independently (per-source API calls).
 */

import { CASWorkflowScanner } from './sources/cas-workflow-scanner';
import { StatusEnumScanner } from './sources/status-enum-scanner';
import { OnboardingScanner } from './sources/onboarding-scanner';
import { CronJobScanner } from './sources/cron-job-scanner';
import { APIRouteScanner } from './sources/api-route-scanner';
import { DBTriggerScanner } from './sources/db-trigger-scanner';
import type {
  SourceType,
  SourceScanner,
  RawDiscovery,
  DiscoveryAnalysisState,
} from './types';

const SCANNERS: Record<string, SourceScanner> = {
  cas_workflow: new CASWorkflowScanner(),
  status_enum: new StatusEnumScanner(),
  onboarding: new OnboardingScanner(),
  cron_job: new CronJobScanner(),
  api_route: new APIRouteScanner(),
  db_trigger: new DBTriggerScanner(),
};

/**
 * Get the list of currently available source types.
 */
export function getAvailableSourceTypes(): SourceType[] {
  return Object.keys(SCANNERS) as SourceType[];
}

/**
 * Pass 1: Scan a single source type.
 * Returns raw discoveries with analysis state set based on whether the scanner is structured.
 */
export async function scanSource(
  sourceType: SourceType
): Promise<{ discoveries: RawDiscovery[]; analysisState: DiscoveryAnalysisState }> {
  const scanner = SCANNERS[sourceType];
  if (!scanner) {
    throw new Error(`Unknown or unavailable source type: ${sourceType}`);
  }

  const discoveries = await scanner.scan();
  const analysisState: DiscoveryAnalysisState = scanner.isStructured
    ? 'direct_mapped'
    : 'preview';

  return { discoveries, analysisState };
}

/**
 * Scan multiple source types in sequence.
 * Used when scanning all sources from a single orchestrated call.
 */
export async function scanSources(
  sourceTypes: SourceType[]
): Promise<Map<SourceType, { discoveries: RawDiscovery[]; analysisState: DiscoveryAnalysisState }>> {
  const results = new Map<
    SourceType,
    { discoveries: RawDiscovery[]; analysisState: DiscoveryAnalysisState }
  >();

  for (const sourceType of sourceTypes) {
    try {
      const result = await scanSource(sourceType);
      results.set(sourceType, result);
    } catch (error) {
      console.error(`Scanner failed for ${sourceType}:`, error);
      // Continue with other sources
    }
  }

  return results;
}
