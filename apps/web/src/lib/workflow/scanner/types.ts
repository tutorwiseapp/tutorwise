/**
 * Scanner types for the Process Discovery Engine.
 * Defines the common interface for all source scanners and discovery results.
 */

import type { ProcessNode, ProcessEdge } from '@/components/feature/workflow/types';

// --- Source types ---

export type SourceType =
  | 'status_enum'
  | 'cron_job'
  | 'onboarding'
  | 'cas_workflow'
  | 'api_route'
  | 'db_trigger';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type DiscoveryAnalysisState = 'preview' | 'analysed' | 'direct_mapped';

export type DiscoveryStatus = 'discovered' | 'imported' | 'dismissed';

export type TemplateMatchState = 'matches' | 'outdated';

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  status_enum: 'Status Enum',
  cron_job: 'Cron Job',
  onboarding: 'Onboarding',
  cas_workflow: 'CAS Workflow',
  api_route: 'API Route',
  db_trigger: 'DB Trigger',
};

// --- Scanner interface ---

export interface SourceScanner {
  sourceType: SourceType;
  /** Does this scanner produce fully-structured output (skip AI)? */
  isStructured: boolean;
  /** Pass 1: Fast metadata extraction (no AI). Always called. */
  scan(): Promise<RawDiscovery[]>;
}

// --- Raw discovery (output of Pass 1) ---

export interface RawDiscovery {
  name: string;
  description: string;
  sourceType: SourceType;
  sourceIdentifier: string;
  sourceFilePaths: string[];
  category: string;
  rawContent: string;
  confidence: ConfidenceLevel;
  confidenceReason: string;
  stepCount: number;
  stepNames: string[];
  /** Present if scanner.isStructured = true */
  nodes?: ProcessNode[];
  /** Present if scanner.isStructured = true */
  edges?: ProcessEdge[];
  /** Present if scanner.isStructured = true */
  previewSteps?: string[];
}

// --- Discovery result (stored in DB) ---

export interface DiscoveryResult {
  id: string;
  name: string;
  description: string | null;
  source_type: SourceType;
  source_identifier: string;
  source_file_paths: string[] | null;
  category: string | null;
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  preview_steps: string[] | null;
  step_count: number;
  step_names: string[] | null;
  raw_content: string | null;
  confidence: ConfidenceLevel;
  confidence_reason: string | null;
  analysis_state: DiscoveryAnalysisState;
  status: DiscoveryStatus;
  imported_process_id: string | null;
  matched_template_id: string | null;
  template_match_state: TemplateMatchState | null;
  template_match_score: number | null;
  scan_id: string | null;
  scanned_at: string;
  scan_duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

// --- Template overlap ---

export interface TemplateOverlap {
  templateId: string;
  templateName: string;
  matchScore: number;
  state: TemplateMatchState | 'no_template';
  differences?: string[];
}

// --- Scan metadata ---

export interface ScanRecord {
  id: string;
  triggered_by: string | null;
  source_types: SourceType[];
  status: 'running' | 'completed' | 'failed';
  results_count: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}
