/**
 * Growth Agent History API
 *
 * GET /api/growth/history — Session history aggregated from growth_usage_log
 *
 * @module api/growth/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Aggregate usage_log rows by session_id to reconstruct session history
    const { data: rows, error } = await supabase
      .from('growth_usage_log')
      .select('session_id, question_count, model_used, created_at')
      .eq('user_id', user.id)
      .not('session_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Growth History] DB error:', error.message);
      return NextResponse.json({ sessions: [], total: 0, limit, offset });
    }

    // Group by session_id
    const sessionMap = new Map<string, {
      sessionId: string;
      questionCount: number;
      startedAt: string;
      lastActivityAt: string;
      modelUsed: string | null;
    }>();

    for (const row of rows ?? []) {
      if (!row.session_id) continue;
      const existing = sessionMap.get(row.session_id);
      if (!existing) {
        sessionMap.set(row.session_id, {
          sessionId: row.session_id,
          questionCount: row.question_count ?? 1,
          startedAt: row.created_at,
          lastActivityAt: row.created_at,
          modelUsed: row.model_used ?? null,
        });
      } else {
        existing.questionCount += row.question_count ?? 1;
        if (row.created_at < existing.startedAt) existing.startedAt = row.created_at;
        if (row.created_at > existing.lastActivityAt) {
          existing.lastActivityAt = row.created_at;
          existing.modelUsed = row.model_used ?? existing.modelUsed;
        }
      }
    }

    // Sort by lastActivityAt desc (already ordered from DB but grouping may reorder)
    const allSessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    const total = allSessions.length;
    const sessions = allSessions.slice(offset, offset + limit);

    return NextResponse.json({ sessions, total, limit, offset });
  } catch (error) {
    console.error('[Growth History] Error:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
