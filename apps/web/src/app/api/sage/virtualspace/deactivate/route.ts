/**
 * POST /api/sage/virtualspace/deactivate
 *
 * Deactivates a Sage session in VirtualSpace.
 * - Marks sage_sessions.status = 'ended'
 * - Generates a session recap synchronously via LLM (fast, non-streaming)
 * - Returns { success, recap } immediately
 *
 * Phase 5: Session Drive wrap-up. The recap JSON is persisted to
 * sage_sessions.recap_json and returned to the client for display.
 *
 * @module api/sage/virtualspace/deactivate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';

interface SessionRecap {
  topicsCovered: string[];
  misconceptionsLogged: string[];
  masteryDelta: number;
  timeSpent: number;
  strongMoments: string[];
  suggestedNextSteps: string[];
  lessonPlanPrompt?: string;
}

// M4 fix: persist recap + write mastery delta back to sage_student_profiles
async function persistRecapAndMastery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sageSessionId: string,
  userId: string,
  recap: SessionRecap,
  timeSpentMinutes: number,
): Promise<void> {
  try {
    // Persist recap_json on sage_sessions
    await supabase
      .from('sage_sessions')
      .update({ recap_json: recap })
      .eq('id', sageSessionId);

    // Write mastery delta to sage_student_profiles (service role — bypasses RLS for server upsert)
    if (recap.masteryDelta > 0) {
      const adminDb = createServiceRoleClient();
      const { data: existing } = await adminDb
        .from('sage_student_profiles')
        .select('total_study_minutes, last_session_summary')
        .eq('user_id', userId)
        .single();

      await adminDb
        .from('sage_student_profiles')
        .upsert({
          user_id:               userId,
          total_study_minutes:   (existing?.total_study_minutes ?? 0) + timeSpentMinutes,
          last_session_summary:  recap.topicsCovered.join(', ') || (existing?.last_session_summary ?? ''),
          last_session_at:       new Date().toISOString(),
          updated_at:            new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }
  } catch (err) {
    console.warn('[Sage Deactivate] persistRecapAndMastery failed:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { sageSessionId, sessionId, timeSpentMinutes = 0 } = body as {
      sageSessionId?: string;
      sessionId?: string;
      timeSpentMinutes?: number;
    };

    if (!sageSessionId) {
      return NextResponse.json(
        { error: 'sageSessionId is required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // Fetch sage session for context
    const { data: sageSession, error: sessionError } = await supabase
      .from('sage_sessions')
      .select('id, user_id, subject, level, topics_covered, status, message_count')
      .eq('id', sageSessionId)
      .single();

    if (sessionError || !sageSession) {
      return NextResponse.json(
        { error: 'Sage session not found', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (sageSession.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Mark session as ended
    await supabase
      .from('sage_sessions')
      .update({
        status: 'ended',
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', sageSessionId);

    // Generate recap — only if there was meaningful interaction
    let recap: SessionRecap | null = null;
    const messageCount = (sageSession.message_count as number | null) ?? 0;

    if (messageCount >= 2) {
      try {
        const ai = getAIService();
        const topicsCovered = Array.isArray(sageSession.topics_covered)
          ? (sageSession.topics_covered as string[])
          : [];

        const subject = (sageSession.subject as string | null) ?? 'general';
        const level   = (sageSession.level as string | null) ?? 'GCSE';
        const topicsLabel = topicsCovered.length > 0
          ? topicsCovered.join(', ')
          : subject;

        // H3 fix: race against a 5s timeout so deactivation never blocks >5s.
        // If the LLM is slow, we return null recap immediately and persist in the background.
        const generateRecap = ai.generateJSON<SessionRecap>({
          systemPrompt: 'You generate concise, encouraging tutoring session recaps as valid JSON. Return only the JSON object — no markdown fences, no extra text.',
          userPrompt:   `Session: ${timeSpentMinutes} min, subject: ${subject}, level: ${level}.
Topics covered: ${topicsLabel}.

Generate a session recap JSON:
{
  "topicsCovered": ["topic 1"],
  "misconceptionsLogged": [],
  "masteryDelta": 0.05,
  "timeSpent": ${timeSpentMinutes},
  "strongMoments": ["one strength"],
  "suggestedNextSteps": ["one next step"],
  "lessonPlanPrompt": "Create a follow-up lesson on [topic]"
}

masteryDelta between 0.02–0.15. Be specific and encouraging.`,
          temperature: 0.3,
        });

        const timeoutMs = 5_000;
        const timeout = new Promise<{ data: null }>(resolve =>
          setTimeout(() => resolve({ data: null }), timeoutMs)
        );

        const { data: recapRaw } = await Promise.race([generateRecap, timeout]);

        const sanitiseRecap = (raw: SessionRecap): SessionRecap => ({
          topicsCovered:        Array.isArray(raw.topicsCovered) ? raw.topicsCovered : [],
          misconceptionsLogged: Array.isArray(raw.misconceptionsLogged) ? raw.misconceptionsLogged : [],
          masteryDelta:         typeof raw.masteryDelta === 'number' ? raw.masteryDelta : 0.05,
          timeSpent:            typeof raw.timeSpent === 'number' ? raw.timeSpent : timeSpentMinutes,
          strongMoments:        Array.isArray(raw.strongMoments) ? raw.strongMoments : [],
          suggestedNextSteps:   Array.isArray(raw.suggestedNextSteps) ? raw.suggestedNextSteps : [],
          lessonPlanPrompt:     typeof raw.lessonPlanPrompt === 'string' ? raw.lessonPlanPrompt : undefined,
        });

        if (recapRaw && typeof recapRaw === 'object') {
          recap = sanitiseRecap(recapRaw);

          // Persist recap and write mastery delta to student profile (non-blocking)
          void persistRecapAndMastery(supabase, sageSessionId, user.id, recap, timeSpentMinutes);
        } else {
          // Timed out — persist in background when the LLM eventually responds
          void generateRecap.then(({ data }) => {
            if (data && typeof data === 'object') {
              void persistRecapAndMastery(supabase, sageSessionId, user.id, sanitiseRecap(data), timeSpentMinutes);
            }
          }).catch(() => {});
        }
      } catch (err) {
        // Non-fatal — return without recap
        console.warn('[Sage Deactivate] Recap generation failed:', err);
      }
    }

    // Update virtualspace_sessions.sage_config to reflect deactivation (non-blocking)
    if (sessionId) {
      void (async () => {
        try {
          const { data: vsRow } = await supabase
            .from('virtualspace_sessions')
            .select('sage_config')
            .eq('id', sessionId)
            .single();

          const current = (vsRow?.sage_config as Record<string, unknown>) ?? {};
          await supabase
            .from('virtualspace_sessions')
            .update({
              sage_config: {
                ...current,
                enabled: false,
                deactivatedAt: new Date().toISOString(),
              },
            })
            .eq('id', sessionId);
        } catch {
          // fire-and-forget — ignore errors
        }
      })();
    }

    return NextResponse.json({ success: true, recap });

  } catch (error) {
    console.error('[Sage Deactivate] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
