/**
 * POST /api/admin/process-studio/execute/command
 * NLI command bar — parse natural language and route to an action.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { command } = await request.json() as { command: string };
    if (!command?.trim()) {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    // Fetch brief execution summary to give AI context
    const { data: executions } = await supabase
      .from('workflow_executions')
      .select('id, status, process:process_id(name)')
      .in('status', ['running', 'paused'])
      .limit(20);

    const context = (executions ?? [])
      .map((e) => {
        const proc = (e.process as unknown as { name: string } | null);
        return `- ${proc?.name ?? 'Unknown'} (${e.status}) id:${e.id}`;
      })
      .join('\n');

    const ai = getAIService();
    const result = await ai.generate({
      systemPrompt: `You are the Execution Engine assistant for TutorWise Process Studio.
Active executions:
${context || 'None'}

Interpret the user's command and respond with a JSON action object:
{
  "action": "list" | "cancel" | "resume" | "info" | "unknown",
  "executionId": "<id if targeting a specific execution>",
  "message": "<friendly explanation of what you're doing or what you found>"
}`,
      userPrompt: command,
      jsonMode: true,
    });

    const cleaned = result.content
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned) as {
      action: string;
      executionId?: string;
      message: string;
    };

    return NextResponse.json({ result: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
