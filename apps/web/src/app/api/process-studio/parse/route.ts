import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const genAI = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

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

interface ParsedNode {
  id: string;
  label: string;
  type: string;
  description: string;
  objective?: string | null;
  completionCriteria?: string[] | null;
  expectedOutputs?: string[] | null;
  assignee?: string | null;
  estimatedDuration?: string | null;
}

interface ParsedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

interface ParsedWorkflow {
  name: string;
  description: string;
  nodes: ParsedNode[];
  edges: ParsedEdge[];
}

const VALID_TYPES = new Set(['trigger', 'action', 'condition', 'approval', 'notification', 'end']);

function validateWorkflow(data: ParsedWorkflow): string | null {
  if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
    return 'No nodes found in AI response';
  }
  if (!data.edges || !Array.isArray(data.edges)) {
    return 'No edges found in AI response';
  }

  const nodeIds = new Set(data.nodes.map((n) => n.id));

  for (const node of data.nodes) {
    if (!node.id || !node.label || !node.type) {
      return `Node missing required fields: ${JSON.stringify(node)}`;
    }
    if (!VALID_TYPES.has(node.type)) {
      return `Invalid node type "${node.type}" for node "${node.label}"`;
    }
  }

  for (const edge of data.edges) {
    if (!nodeIds.has(edge.source)) {
      return `Edge references unknown source node "${edge.source}"`;
    }
    if (!nodeIds.has(edge.target)) {
      return `Edge references unknown target node "${edge.target}"`;
    }
  }

  const hasTrigger = data.nodes.some((n) => n.type === 'trigger');
  const hasEnd = data.nodes.some((n) => n.type === 'end');
  if (!hasTrigger) return 'Workflow must have a trigger node';
  if (!hasEnd) return 'Workflow must have an end node';

  return null;
}

function toReactFlowFormat(data: ParsedWorkflow) {
  const nodes = data.nodes.map((n) => ({
    id: n.id,
    type: 'processStep',
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      type: n.type,
      description: n.description || '',
      objective: n.objective || undefined,
      completionCriteria: n.completionCriteria || undefined,
      expectedOutputs: n.expectedOutputs || undefined,
      assignee: n.assignee || undefined,
      estimatedDuration: n.estimatedDuration || undefined,
      editable: n.type !== 'trigger' && n.type !== 'end',
    },
  }));

  const edges = data.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || undefined,
    animated: true,
  }));

  return { nodes, edges };
}

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

    if (!genAI) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service not configured',
          code: 'AI_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const sanitizedInput = input.trim().slice(0, 5000);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: `Process description:\n\n${sanitizedInput}` },
    ]);

    const responseText = result.response.text();
    let parsed: ParsedWorkflow;

    try {
      parsed = JSON.parse(responseText);
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
