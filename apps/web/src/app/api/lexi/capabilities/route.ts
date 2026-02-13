/**
 * Lexi Capabilities API
 *
 * GET /api/lexi/capabilities - Get capabilities for a session
 *
 * @module api/lexi/capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { lexiOrchestrator } from '@lexi/core/orchestrator';
import { sessionStore } from '@lexi/services/session-store';
import { getPersona } from '@lexi/personas';

/**
 * GET /api/lexi/capabilities
 * Get available capabilities for a Lexi session
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required', code: 'MISSING_SESSION_ID' },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to user
    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Session does not belong to user', code: 'SESSION_MISMATCH' },
        { status: 403 }
      );
    }

    // Get capabilities from orchestrator
    const capabilities = lexiOrchestrator.getCapabilities(sessionId);

    // Get persona info
    const persona = getPersona(session.persona);
    const personaConfig = persona.config;

    return NextResponse.json({
      persona: session.persona,
      displayName: personaConfig.displayName,
      tone: personaConfig.tone,
      capabilities,
      greeting: lexiOrchestrator.getGreeting(sessionId),
    });
  } catch (error) {
    console.error('[Lexi API] Capabilities error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
