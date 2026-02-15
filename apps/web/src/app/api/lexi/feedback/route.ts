/**
 * Lexi Feedback API
 *
 * POST /api/lexi/feedback - Submit feedback for a message
 *
 * Stores feedback in two places:
 * 1. lexi_messages table (for conversation-level tracking)
 * 2. ai_feedback table + CAS message bus (for DSPy optimization)
 *
 * @module api/lexi/feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { conversationStore } from '@lexi/services/conversation-store';
import { feedbackService } from '@lexi/services/feedback-service';

/**
 * POST /api/lexi/feedback
 * Submit feedback (thumbs up/down) for a message
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

    // Parse request body
    const body = await request.json();
    const { messageId, sessionId, rating, comment, context } = body;

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

    // 1. Submit feedback to lexi_messages table (conversation tracking)
    const conversationSuccess = await conversationStore.submitFeedback(messageId, rating, comment);

    // 2. Submit feedback to ai_feedback table + CAS message bus (DSPy optimization)
    // Initialize feedback service if not already done
    feedbackService.initialize(supabase);

    const feedbackResult = await feedbackService.submitFeedback(user.id, {
      sessionId: sessionId || 'unknown',
      messageId,
      rating: rating === 1 ? 'thumbs_up' : 'thumbs_down',
      comment,
      context: context || {},
    });

    // Log if CAS message bus publish failed (non-critical)
    if (!feedbackResult.success) {
      console.warn('[Lexi API] CAS feedback publish failed:', feedbackResult.error);
    }

    if (!conversationSuccess) {
      return NextResponse.json(
        { error: 'Failed to submit feedback', code: 'FEEDBACK_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedbackResult.feedbackId,
    });
  } catch (error) {
    console.error('[Lexi API] Feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
