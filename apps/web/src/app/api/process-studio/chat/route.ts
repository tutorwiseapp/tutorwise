import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a process workflow editing assistant. You help users modify workflow process diagrams through natural language instructions.

The workflow is represented as nodes and edges:
- Each node has: id, type (processStep), position ({x,y}), data ({label, type, description, objective?, completionCriteria?, expectedOutputs?, assignee?, estimatedDuration?, editable})
- Node data.type is one of: trigger | action | condition | approval | notification | end
- Each edge has: id, source (node id), target (node id), sourceHandle? ("yes"|"no" for conditions), animated (boolean)

Given the current workflow state and the user's request, return a JSON object with:
{
  "response": "Natural language description of what you did or a clarifying question",
  "clarificationNeeded": false,
  "mutation": {
    "type": "add_node | remove_node | update_node | add_edge | remove_edge | reorder | bulk",
    "description": "Short description of the change",
    "nodes": [/* full updated nodes array */],
    "edges": [/* full updated edges array */]
  }
}

Rules:
- ALWAYS return the COMPLETE nodes and edges arrays (not just the changed ones)
- Preserve existing node IDs when not removing them
- When adding a node, generate a unique ID like "node-chat-1", "node-chat-2" etc
- When removing a node, reconnect its incoming edges to its outgoing edges to maintain flow
- When reordering, update all affected edges
- New nodes should have position {x: 0, y: 0} (auto-layout will reposition them)
- New nodes should have editable: true (except trigger and end nodes)
- New edges should have animated: true
- Keep trigger and end nodes — never remove them
- If the request is ambiguous, set clarificationNeeded to true and ask a question in response (with mutation as null)
- If describing what exists (e.g. "what does this step do?"), respond with information and set mutation to null`;

interface ChatRequest {
  message: string;
  currentWorkflow: {
    nodes: unknown[];
    edges: unknown[];
  };
  chatHistory?: { role: string; content: string }[];
}

interface ChatResponse {
  response: string;
  clarificationNeeded: boolean;
  mutation: {
    type: string;
    description: string;
    nodes: unknown[];
    edges: unknown[];
  } | null;
}

/**
 * POST /api/process-studio/chat
 * Chat-based workflow editing — AI interprets user intent and returns updated workflow
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

    const body: ChatRequest = await request.json();
    const { message, currentWorkflow, chatHistory } = body;

    if (!message || typeof message !== 'string' || message.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide a message',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (!currentWorkflow?.nodes || !currentWorkflow?.edges) {
      return NextResponse.json(
        {
          success: false,
          error: 'Current workflow state is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const sanitizedMessage = message.trim().slice(0, 2000);

    // Build conversation context (last 10 messages)
    const recentHistory = (chatHistory || []).slice(-10);
    const historyContext = recentHistory.length > 0
      ? `\n\nRecent conversation:\n${recentHistory.map((m) => `${m.role}: ${m.content}`).join('\n')}`
      : '';

    const workflowContext = JSON.stringify({
      nodes: currentWorkflow.nodes,
      edges: currentWorkflow.edges,
    });

    const aiService = getAIService();
    let parsed: ChatResponse;

    try {
      const { data } = await aiService.generateJSON<ChatResponse>({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Current workflow state:\n${workflowContext}${historyContext}\n\nUser request: ${sanitizedMessage}`,
        temperature: 0.3,
      });
      parsed = data;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned invalid response. Try rephrasing your request.',
          code: 'AI_PARSE_ERROR',
        },
        { status: 422 }
      );
    }

    if (!parsed.response) {
      parsed.response = 'I made the requested changes to your workflow.';
    }

    // Validate mutation if present
    if (parsed.mutation) {
      if (!Array.isArray(parsed.mutation.nodes) || !Array.isArray(parsed.mutation.edges)) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI returned invalid workflow structure. Try again.',
            code: 'AI_VALIDATION_ERROR',
          },
          { status: 422 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: parsed.response,
        clarificationNeeded: parsed.clarificationNeeded || false,
        mutation: parsed.mutation || null,
      },
    });
  } catch (error) {
    console.error('Process chat error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process your request',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
