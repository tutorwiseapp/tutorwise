/**
 * Sage Feedback API
 *
 * POST /api/sage/feedback - Submit feedback for a Sage message
 *
 * Stores feedback in the database. CAS integration can be enabled
 * when the CAS message bus module is available.
 *
 * @module api/sage/feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/sage/feedback
 * Submit feedback (thumbs up/down) for a Sage message
 */
export async function POST(request: NextRequest) {
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

    // Get user's role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'student';

    // Parse request body
    const body = await request.json();
    const { messageId, sessionId, rating, comment, subject, topic, contentId } = body;

    // Validate rating
    if (rating !== 1 && rating !== -1) {
      return NextResponse.json(
        { error: 'Invalid rating - must be 1 (positive) or -1 (negative)', code: 'INVALID_RATING' },
        { status: 400 }
      );
    }

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required', code: 'MISSING_MESSAGE_ID' },
        { status: 400 }
      );
    }

    // Store feedback in sage_messages table (gracefully handle missing table)
    const { error: messageError } = await supabase
      .from('sage_messages')
      .update({
        feedback_rating: rating,
        feedback_comment: comment,
        feedback_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (messageError) {
      console.warn('[Sage Feedback] Could not update message feedback:', messageError.message);
    }

    // Store in unified ai_feedback table (gracefully handle missing table)
    const { data: feedbackRow, error: feedbackError } = await supabase
      .from('ai_feedback')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        message_id: messageId,
        agent_type: 'sage',
        rating: rating === 1 ? 'thumbs_up' : 'thumbs_down',
        comment,
        context: {
          user_role: userRole,
          subject,
          topic,
          content_id: contentId,
        },
      })
      .select('id')
      .single();

    if (feedbackError) {
      console.warn('[Sage Feedback] Could not store feedback:', feedbackError.message);
    }

    // TODO: Publish to CAS message bus for automated improvement
    // This requires fixing CAS message bus exports (createTaskEnvelope, createStatusEnvelope)
    // For now, feedback is stored in DB and can be processed by scheduled jobs
    //
    // try {
    //   const { sageBridge } = await import('@/../../cas/integration/sage-bridge');
    //   await sageBridge.handleFeedback({
    //     sessionId,
    //     messageId,
    //     userId: user.id,
    //     userRole,
    //     subject: subject || 'general',
    //     level: 'GCSE', // TODO: get from session context
    //     rating: rating === 1 ? 'thumbs_up' : 'thumbs_down',
    //     comment,
    //     topic,
    //   });
    // } catch (error) {
    //   console.warn('[Sage Feedback] Could not publish to CAS:', error);
    //   // Don't fail the request if CAS publish fails
    // }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedbackRow?.id,
    });
  } catch (error) {
    console.error('[Sage Feedback] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
