import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';
import {
  validateWorkflow,
  toReactFlowFormat,
  type ParsedWorkflow,
} from '@/lib/process-studio/validation';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a process mapping expert. Given a description of a business or educational process, extract the steps, decisions, and connections into a structured workflow graph.

For each step, identify:
- id: A unique identifier (e.g., "step-1", "step-2")
- label: Short name (3-5 words)
- type: One of: trigger | action | condition | approval | notification | end
- description: What happens in this step (1-2 sentences)
- objective: The goal of this step (optional)
- completionCriteria: Array of criteria for when this step is complete (optional)
- expectedOutputs: Array of outputs this step produces (optional)
- assignee: Who is responsible (optional)
- estimatedDuration: How long it takes, e.g. "30 minutes", "2 hours" (optional)

Rules:
- Every workflow MUST start with exactly one "trigger" node and end with exactly one "end" node
- Use "condition" type for decision points (yes/no branches)
- Use "approval" type for steps requiring human sign-off
- Use "notification" type for email/alert steps
- Edges connect nodes via source and target IDs
- For condition nodes, edges should have sourceHandle "yes" or "no"
- Aim for 4-12 nodes total for most processes

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
      "objective": "string or null",
      "completionCriteria": ["string"] or null,
      "expectedOutputs": ["string"] or null,
      "assignee": "string or null",
      "estimatedDuration": "string or null"
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string (node id)",
      "target": "string (node id)",
      "sourceHandle": "string or null (use 'yes' or 'no' for condition branches)"
    }
  ]
}`;

/**
 * POST /api/process-studio/parse
 * Parse a text description into a structured workflow graph using Gemini AI
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== 'string' || input.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide a process description (at least 10 characters)',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const sanitizedInput = input.trim().slice(0, 5000);

    const aiService = getAIService();
    let parsed: ParsedWorkflow;

    try {
      const { data } = await aiService.generateJSON<ParsedWorkflow>({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Process description:\n\n${sanitizedInput}`,
        temperature: 0.2,
      });
      parsed = data;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned invalid JSON. Try rephrasing your description.',
          code: 'AI_PARSE_ERROR',
        },
        { status: 422 }
      );
    }

    const validationError = validateWorkflow(parsed);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: `AI output validation failed: ${validationError}`,
          code: 'AI_VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    const { nodes, edges } = toReactFlowFormat(parsed);

    return NextResponse.json({
      success: true,
      data: {
        workflow: {
          name: parsed.name || 'Untitled Process',
          description: parsed.description || '',
          nodes,
          edges,
        },
        metadata: {
          stepCount: nodes.length,
          hasConditions: nodes.some((n) => n.data.type === 'condition'),
          estimatedTotalDuration: null,
        },
      },
    });
  } catch (error) {
    console.error('Process parse error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to parse process description',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
