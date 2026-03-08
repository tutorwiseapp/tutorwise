/**
 * AI Analyzer — Process Discovery Engine
 *
 * Converts raw source code / configuration content into ProcessNode[]/ProcessEdge[] graphs.
 * Used for Pass 2 analysis of unstructured sources (cron jobs, API routes, DB triggers).
 *
 * Uses the shared AI service (6-tier fallback chain) with the same system prompt structure
 * as /api/workflow/parse/route.ts. Source content is truncated to 10 KB max.
 *
 * Phase 3 enhancement: source-type-aware prompts for improved confidence accuracy.
 */

import { getAIService } from '@/lib/ai';
import {
  validateWorkflow,
  toReactFlowFormat,
  extractPreviewSteps,
  type ParsedWorkflow,
} from '@/lib/workflow/validation';
import type { ProcessNode, ProcessEdge } from '@/components/feature/workflow/types';
import type { SourceType, ConfidenceLevel } from './types';

// --- Base system prompt (shared output format) ---

const BASE_SYSTEM_PROMPT = `You are a business process analyst. Given source code, API route definitions, or database configuration that defines a workflow, extract it into a structured process graph.

For each step, identify:
- id: A unique identifier (e.g., "trigger-1", "step-1", "condition-1", "end-1")
- label: Short name (3-5 words)
- type: One of: trigger | action | condition | approval | notification | end
- description: What happens in this step (1-2 sentences)
- objective: The goal of this step (optional, null if not applicable)
- completionCriteria: Array of criteria for completion (optional, null if not applicable)
- expectedOutputs: Array of outputs this step produces (optional, null if not applicable)
- assignee: Who is responsible (optional, null if not applicable)
- estimatedDuration: How long it takes (optional, null if not applicable)

Rules:
- Every workflow MUST start with exactly one "trigger" node and end with exactly one "end" node
- Use "condition" for decision points (yes/no branches)
- Use "notification" for email/alert/messaging steps
- Use "approval" for steps requiring human sign-off
- Aim for 4-12 nodes total for most processes
- For condition nodes, edges should have sourceHandle "yes" or "no"

Return a JSON object with this exact structure:
{
  "name": "Process name",
  "description": "Brief process description",
  "nodes": [
    {
      "id": "string",
      "label": "string",
      "type": "trigger|action|condition|approval|notification|end",
      "description": "string",
      "objective": null,
      "completionCriteria": null,
      "expectedOutputs": null,
      "assignee": null,
      "estimatedDuration": null
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string (node id)",
      "target": "string (node id)",
      "sourceHandle": null
    }
  ]
}`;

// --- Source-type-specific prompt suffixes for better accuracy ---

const SOURCE_TYPE_HINTS: Partial<Record<SourceType, string>> = {
  cron_job: `
Focus areas for cron job analysis:
- The "trigger" node should describe the schedule (e.g., "Hourly schedule trigger", "Daily 3am trigger")
- Look for: validation checks, database queries, conditional branching (error handling), data mutations, and notification/email dispatch steps
- Error handling try/catch blocks represent "condition" nodes (success/failure branches)
- Final steps are often "notification" (emails sent) or "end" (records updated)
- estimatedDuration should reflect the cron interval (e.g., "runs every hour")`,

  api_route: `
Focus areas for API route group analysis:
- The "trigger" node should be the user or system action that initiates the flow (e.g., "User submits booking request")
- Group related routes into a cohesive end-to-end workflow rather than listing each route separately
- Look for: authentication, validation, business logic decisions, database operations, webhook/event dispatch
- HTTP error responses (400, 401, 403, 404, 409) represent "condition" nodes
- Consider the full user journey across the routes: what comes first, what depends on what
- "approval" nodes for routes that require admin intervention`,

  db_trigger: `
Focus areas for database trigger analysis:
- The "trigger" node should be the database event (e.g., "Booking status updated to Completed", "New profile created")
- Each trigger function body represents an automated server-side action
- Look for: conditional logic (IF/CASE), INSERT/UPDATE operations on related tables, function calls, notifications via pg_notify
- Multiple trigger functions on the same table should be combined into one workflow showing the full event chain
- "action" nodes for database writes, "notification" for pg_notify/queue insertions
- Show the cascading effects: what data changes, what downstream processes are triggered`,
};

// --- Types ---

export interface AIAnalysisResult {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  previewSteps: string[];
  confidence: ConfidenceLevel;
  confidenceReason: string;
  name: string;
  description: string;
}

// --- Confidence calibration based on source type and content quality ---

function calibrateConfidence(
  sourceType: SourceType | undefined,
  rawContentLength: number,
  nodeCount: number
): { confidence: ConfidenceLevel; reason: string } {
  // DB triggers are inherently lower confidence due to SQL complexity
  if (sourceType === 'db_trigger') {
    if (rawContentLength > 2_000 && nodeCount >= 4) {
      return { confidence: 'medium', reason: 'AI-inferred from database trigger SQL with sufficient function bodies' };
    }
    return { confidence: 'low', reason: 'AI-inferred from limited trigger function bodies' };
  }

  // API routes are lower confidence — AI infers workflow from grouped endpoint list
  if (sourceType === 'api_route') {
    if (rawContentLength > 3_000 && nodeCount >= 5) {
      return { confidence: 'medium', reason: 'AI-inferred from API route handler code with good coverage' };
    }
    return { confidence: 'low', reason: 'AI-inferred from API route patterns — workflow may be incomplete' };
  }

  // Cron jobs are medium confidence — handler code is direct and imperative
  if (sourceType === 'cron_job') {
    if (nodeCount >= 5) {
      return { confidence: 'medium', reason: 'AI-analysed from cron handler code with good step coverage' };
    }
    return { confidence: 'medium', reason: 'AI-analysed from cron job handler code' };
  }

  return { confidence: 'medium', reason: 'AI-analysed from source code' };
}

// --- Analyzer ---

/**
 * Analyse raw source code / content and convert it to a ProcessNode[]/ProcessEdge[] graph.
 *
 * @param rawContent  - Source code or configuration content (truncated to 10 KB)
 * @param context     - Human-readable context string (e.g. "cron job: complete-sessions")
 * @param confidenceHint - Initial confidence level from the scanner (may be upgraded by calibration)
 * @param sourceType  - Source type for selecting the appropriate prompt hint
 */
export async function analyzeToWorkflow(
  rawContent: string,
  context: string,
  confidenceHint: ConfidenceLevel = 'medium',
  sourceType?: SourceType
): Promise<AIAnalysisResult> {
  const aiService = getAIService();

  // Truncate to 10 KB to avoid excessive tokens and prevent prompt injection
  const safeContent = rawContent.slice(0, 10_000);

  // Build source-type-aware system prompt
  const sourceHint = sourceType ? (SOURCE_TYPE_HINTS[sourceType] ?? '') : '';
  const systemPrompt = sourceHint
    ? `${BASE_SYSTEM_PROMPT}\n\n${sourceHint.trim()}`
    : BASE_SYSTEM_PROMPT;

  const { data: parsed } = await aiService.generateJSON<ParsedWorkflow>({
    systemPrompt,
    userPrompt: `Context: ${context}\n\nSource code:\n${safeContent}`,
    temperature: 0.2,
  });

  const validationError = validateWorkflow(parsed);
  if (validationError) {
    throw new Error(`AI output validation failed: ${validationError}`);
  }

  const { nodes, edges } = toReactFlowFormat(parsed);
  const previewSteps = extractPreviewSteps(nodes);

  // Calibrate confidence based on actual output quality
  const calibrated = calibrateConfidence(sourceType, safeContent.length, nodes.length);
  // Use the higher of the hinted and calibrated confidence
  const confidenceRank: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };
  const finalConfidence =
    confidenceRank[confidenceHint] >= confidenceRank[calibrated.confidence]
      ? confidenceHint
      : calibrated.confidence;

  return {
    nodes,
    edges,
    previewSteps,
    confidence: finalConfidence,
    confidenceReason: calibrated.reason,
    name: parsed.name || 'Untitled Process',
    description: parsed.description || '',
  };
}
