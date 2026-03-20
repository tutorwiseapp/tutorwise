/**
 * POST /api/sage/virtualspace/activate
 *
 * Activates Sage for a VirtualSpace session.
 * - Authenticates user
 * - Checks Sage quota
 * - Infers subject/level from virtualspace_sessions record
 * - Creates a sage_sessions record with surface: 'virtualspace'
 * - Updates virtualspace_sessions.sage_config with activation info
 *
 * @module api/sage/virtualspace/activate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSageSubscription, checkAIAgentRateLimit } from '@/lib/ai-agents/rate-limiter';
import { randomUUID } from 'crypto';

type SageProfile = 'tutor' | 'copilot' | 'wingman' | 'observer';

/**
 * Infer initial Sage behaviour profile from session context (§4).
 *
 * - Human tutor activating Sage in a booked session → 'copilot'
 *   (Sage whispers suggestions; doesn't speak directly to the student)
 * - Student / owner in a standalone or solo session → 'tutor'
 *   (Sage is the primary AI tutor)
 *
 * Runtime profile switching (90s/3min idle thresholds) happens client-side
 * in useSageVirtualSpace — this sets the correct starting point.
 */
function inferProfile(options: { isTutor: boolean; hasBooking: boolean }): SageProfile {
  if (options.isTutor && options.hasBooking) return 'copilot';
  return 'tutor';
}

/**
 * Infer subject from virtualspace session and booking context.
 * Falls back to 'general' if no signal available.
 */
function inferSubject(session: {
  title: string;
  sage_config?: { subject?: string } | null;
  booking?: { service_name?: string } | null;
}): string {
  // If sage_config already has a subject (re-activation), reuse it
  if (session.sage_config?.subject) {
    return session.sage_config.subject;
  }

  // Infer from booking service name
  const serviceName = session.booking?.service_name?.toLowerCase() ?? '';
  if (serviceName.includes('math') || serviceName.includes('maths')) return 'maths';
  if (serviceName.includes('english') || serviceName.includes('writing') || serviceName.includes('literature')) return 'english';
  if (serviceName.includes('science') || serviceName.includes('physics') || serviceName.includes('chemistry') || serviceName.includes('biology')) return 'science';
  if (serviceName.includes('computing') || serviceName.includes('coding') || serviceName.includes('programming')) return 'computing';
  if (serviceName.includes('history') || serviceName.includes('geography') || serviceName.includes('humanities')) return 'humanities';
  if (serviceName.includes('french') || serviceName.includes('spanish') || serviceName.includes('german') || serviceName.includes('language')) return 'languages';
  if (serviceName.includes('business') || serviceName.includes('economics')) return 'business';

  // Infer from session title
  const title = session.title?.toLowerCase() ?? '';
  if (title.includes('math') || title.includes('maths')) return 'maths';
  if (title.includes('english')) return 'english';
  if (title.includes('science') || title.includes('physics') || title.includes('chemistry') || title.includes('biology')) return 'science';

  return 'general';
}

/**
 * Infer level from booking or session context.
 */
function inferLevel(session: {
  sage_config?: { level?: string } | null;
  booking?: { service_name?: string } | null;
}): string {
  if (session.sage_config?.level) {
    return session.sage_config.level;
  }

  const serviceName = session.booking?.service_name?.toLowerCase() ?? '';
  if (serviceName.includes('gcse')) return 'GCSE';
  if (serviceName.includes('a-level') || serviceName.includes('a level')) return 'A-Level';
  if (serviceName.includes('ks1') || serviceName.includes('key stage 1')) return 'KS1';
  if (serviceName.includes('ks2') || serviceName.includes('key stage 2')) return 'KS2';
  if (serviceName.includes('ks3') || serviceName.includes('key stage 3')) return 'KS3';
  if (serviceName.includes('university') || serviceName.includes('degree')) return 'University';
  if (serviceName.includes('ib')) return 'IB';
  if (serviceName.includes('ap')) return 'AP';

  return 'GCSE';
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
    const { sessionId, topic } = body as { sessionId?: string; topic?: string };

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required', code: 'MISSING_SESSION_ID' },
        { status: 400 }
      );
    }

    // Fetch virtualspace session with booking context
    const { data: vsSession, error: vsError } = await supabase
      .from('virtualspace_sessions')
      .select(`
        id,
        session_type,
        title,
        owner_id,
        booking_id,
        sage_config,
        booking:booking_id (
          service_name,
          tutor_id,
          student_id
        )
      `)
      .eq('id', sessionId)
      .single();

    if (vsError || !vsSession) {
      return NextResponse.json(
        { error: 'VirtualSpace session not found', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check quota: determine who is charged
    // If the session has a booking with a tutor, and this user is the tutor → charge tutor
    // Otherwise → charge the current user (student)
    const booking = Array.isArray(vsSession.booking) ? vsSession.booking[0] : vsSession.booking;
    const isTutor = booking?.tutor_id === user.id;
    const quotaOwnerId = user.id; // Always charge the activating user in Phase 1
    const chargedTo: 'student' | 'tutor' = isTutor ? 'tutor' : 'student';

    // Check rate limit for the quota owner (admins bypass for testing)
    const { data: quotaProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', quotaOwnerId)
      .single();

    const isAdmin = quotaProfile?.is_admin === true;
    const subscription = await getSageSubscription(quotaOwnerId);
    const rateLimit = isAdmin
      ? { allowed: true, remaining: 9999, resetAt: new Date(Date.now() + 86400000), upsell: undefined }
      : await checkAIAgentRateLimit('sage', quotaOwnerId, subscription);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'quota_exhausted',
          code: 'QUOTA_EXHAUSTED',
          quotaRemaining: 0,
          resetAt: rateLimit.resetAt.toISOString(),
          upsell: rateLimit.upsell,
        },
        { status: 429 }
      );
    }

    // Infer subject and level
    const existingConfig = vsSession.sage_config as { subject?: string; level?: string; topic?: string } | null;
    const sessionWithBooking = {
      title: vsSession.title,
      sage_config: existingConfig,
      booking: booking ?? null,
    };

    // Resolve topic: prefer request body, fall back to previous sage_config (re-activation)
    const resolvedTopic: string | null = topic ?? existingConfig?.topic ?? null;
    const subject = inferSubject(sessionWithBooking);
    const level = inferLevel(sessionWithBooking);
    const profile = inferProfile({ isTutor, hasBooking: !!booking });

    // Get user profile for persona mapping
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('active_role')
      .eq('id', user.id)
      .single();

    const persona = (userProfile?.active_role === 'tutor')
      ? 'tutor'
      : (userProfile?.active_role === 'client')
        ? 'client'
        : 'student';

    // Create sage_sessions record with surface: 'virtualspace'
    const sageSessionId = `sage_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

    const { error: sageInsertError } = await supabase
      .from('sage_sessions')
      .insert({
        id: sageSessionId,
        user_id: user.id,
        persona,
        subject,
        level,
        session_goal: 'general',
        topics_covered: [],
        message_count: 0,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
        surface: 'virtualspace',
        virtualspace_session_id: sessionId,
      });

    if (sageInsertError) {
      console.warn('[Sage Virtualspace Activate] Could not create sage_sessions record:', sageInsertError.message);
      // Continue — don't fail activation for DB issues
    }

    // Update virtualspace_sessions.sage_config
    const sageConfig = {
      enabled: true,
      activatedAt: new Date().toISOString(),
      activatedBy: user.id,
      sageSessionId,
      profile,
      subject,
      level,
      topic: resolvedTopic,
      chargedTo,
      quotaOwnerId,
    };

    const { error: updateError } = await supabase
      .from('virtualspace_sessions')
      .update({ sage_config: sageConfig })
      .eq('id', sessionId);

    if (updateError) {
      console.warn('[Sage Virtualspace Activate] Could not update sage_config:', updateError.message);
    }

    return NextResponse.json({
      sageSessionId,
      profile,
      subject,
      level,
      topic: resolvedTopic,
      quotaRemaining: rateLimit.remaining,
      chargedTo,
    });
  } catch (error) {
    console.error('[Sage Virtualspace Activate] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
