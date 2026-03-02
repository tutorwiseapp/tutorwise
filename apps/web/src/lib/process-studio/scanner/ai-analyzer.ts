/**
 * AI Analyzer — Process Discovery Engine
 *
 * Converts raw source code / configuration content into ProcessNode[]/ProcessEdge[] graphs.
 * Used for Pass 2 analysis of unstructured sources (cron jobs, API routes, DB triggers).
 *
 * Uses the shared AI service (6-tier fallback chain) with the same system prompt structure
 * as /api/process-studio/parse/route.ts. Source content is truncated to 10 KB max.
 */

import { getAIService } from '@/lib/ai';
import {
  validateWorkflow,
  toReactFlowFormat,
  extractPreviewSteps,
  type ParsedWorkflow,
} from '@/lib/process-studio/validation';
import type { ProcessNode, ProcessEdge } from '@/components/feature/process-studio/types';
import type { ConfidenceLevel } from './types';

// --- System prompt (mirrors parse/route.ts — same output format) ---

const SYSTEM_PROMPT = `You are a business process analyst. Given source code, API route definitions, or database configuration that defines a workflow, extract it into a structured process graph.

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

// --- Analyzer ---

/**
 * Analyse raw source code / content and convert it to a ProcessNode[]/ProcessEdge[] graph.
 *
 * @param rawContent  - Source code or configuration content (truncated to 10 KB)
 * @param context     - Human-readable context string (e.g. "cron job: complete-sessions")
 * @param confidence  - Confidence hint for this source type ('high' | 'medium' | 'low')
 */
export async function analyzeToWorkflow(
  rawContent: string,
  context: string,
  confidence: ConfidenceLevel = 'medium'
): Promise<AIAnalysisResult> {
  const aiService = getAIService();

  // Truncate to 10 KB to avoid excessive tokens and prevent prompt injection
  const safeContent = rawContent.slice(0, 10_000);

  const { data: parsed } = await aiService.generateJSON<ParsedWorkflow>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Context: ${context}\n\nSource code:\n${safeContent}`,
    temperature: 0.2,
  });

  const validationError = validateWorkflow(parsed);
  if (validationError) {
    throw new Error(`AI output validation failed: ${validationError}`);
  }

  const { nodes, edges } = toReactFlowFormat(parsed);
  const previewSteps = extractPreviewSteps(nodes);

  return {
    nodes,
    edges,
    previewSteps,
    confidence,
    confidenceReason: `AI-analysed from ${context}`,
    name: parsed.name || 'Untitled Process',
    description: parsed.description || '',
  };
}
