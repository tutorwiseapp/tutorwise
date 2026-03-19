/**
 * POST /api/sage/virtualspace/copilot
 *
 * Generates a co-pilot whisper for the human tutor when Sage is in Co-pilot profile.
 * Called by the tutor's awareness loop — not by the student client.
 *
 * Generates one brief, actionable suggestion via LLM (non-streaming).
 * Persists to sage_canvas_events (write-ahead for disconnect recovery).
 * Returns the whisper object for the client to publish to the private Ably channel.
 *
 * Quiet-period guard: returns 204 if the tutor was active in the last 30s or has
 * dismissed the last 3 suggestions (Sage goes quiet).
 *
 * @module api/sage/virtualspace/copilot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';

export interface CopilotWhisper {
  id: string;
  urgency: 'low' | 'medium' | 'high';
  message: string;
  action: {
    type: 'stamp';
    shape: { type: string; props?: Record<string, unknown> };
  } | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      sageSessionId,
      sessionId,
      stuckSignal = 'none',
      conversationHistory = [],
      tutorLastActiveMs = 0,
      dismissedCount = 0,
    } = body as {
      sageSessionId?: string;
      sessionId?: string;
      stuckSignal?: 'none' | 'low' | 'medium' | 'high';
      conversationHistory?: Array<{ role: string; content: string }>;
      tutorLastActiveMs?: number;  // ms since tutor last drew/typed
      dismissedCount?: number;
    };

    if (!sageSessionId || !sessionId) {
      return NextResponse.json({ error: 'Missing fields', code: 'MISSING_FIELDS' }, { status: 400 });
    }

    // Verify session ownership and co-pilot eligibility
    const { data: sageSession } = await supabase
      .from('sage_sessions')
      .select('id, user_id, subject, level, status')
      .eq('id', sageSessionId)
      .single();

    if (!sageSession || sageSession.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied', code: 'FORBIDDEN' }, { status: 403 });
    }

    if (sageSession.status === 'ended') {
      return NextResponse.json({ error: 'Session ended', code: 'SESSION_ENDED' }, { status: 410 });
    }

    // Quiet-period guards (design §12)
    if (tutorLastActiveMs < 30_000) {
      // Tutor actively teaching — stay quiet
      return new NextResponse(null, { status: 204 });
    }
    if (dismissedCount >= 3) {
      // Tutor dismissed last 3 suggestions — Sage recalibrates
      return new NextResponse(null, { status: 204 });
    }
    if (stuckSignal === 'none') {
      // Student actively working — no need for intervention
      return new NextResponse(null, { status: 204 });
    }

    // Generate whisper via LLM
    const ai = getAIService();
    const recentHistory = (conversationHistory as Array<{ role: string; content: string }>)
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'Student' : 'Sage'}: ${m.content}`)
      .join('\n');

    const { data: whisperRaw } = await ai.generateJSON<CopilotWhisper>({
      systemPrompt: `You are a co-pilot AI tutor assistant. Generate ONE brief, actionable suggestion for a human tutor mid-session. Return only valid JSON.`,
      userPrompt: `Subject: ${sageSession.subject ?? 'general'} (${sageSession.level ?? 'GCSE'})
Student stuck signal: ${stuckSignal}
Recent session conversation:
${recentHistory || '(session just started)'}

Generate a co-pilot whisper for the tutor. Keep it under 20 words. Include a canvas shape suggestion if a visual aid would genuinely help.

Return JSON matching exactly:
{
  "id": "${crypto.randomUUID()}",
  "urgency": "low" | "medium" | "high",
  "message": "Brief actionable tip for the tutor",
  "action": {
    "type": "stamp",
    "shape": { "type": "math-equation", "props": { "latex": "..." } }
  }
}

Set "action" to null if no shape is needed. Use "high" urgency only for clear misconceptions.`,
      temperature: 0.4,
    });

    if (!whisperRaw || !whisperRaw.message) {
      return new NextResponse(null, { status: 204 });
    }

    const whisper: CopilotWhisper = {
      id: whisperRaw.id ?? crypto.randomUUID(),
      urgency: ['low', 'medium', 'high'].includes(whisperRaw.urgency) ? whisperRaw.urgency : 'low',
      message: String(whisperRaw.message).slice(0, 200),
      action: whisperRaw.action?.type === 'stamp' ? whisperRaw.action : null,
    };

    // Write-ahead to sage_canvas_events for disconnect recovery (service role — C1 fix)
    const adminDb = createServiceRoleClient();
    await adminDb.from('sage_canvas_events').insert({
      sage_session_id:          sageSessionId,
      virtualspace_session_id:  sessionId,
      event_type:               'copilot_suggestion',
      shape_type:               whisper.action?.shape?.type ?? null,
      shape_data:               whisper as unknown as Record<string, unknown>,
      observation_trigger:      stuckSignal,
    });

    return NextResponse.json({ whisper });

  } catch (error) {
    console.error('[Sage Copilot] Error:', error);
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
