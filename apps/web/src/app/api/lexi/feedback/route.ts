/**
 * Lexi Feedback API
 *
 * POST /api/lexi/feedback - Submit feedback for a message
 *
 * @module api/lexi/feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { conversationStore } from '@lexi/services/conversation-store';

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
    const { messageId, rating, comment } = body;

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

    // Submit feedback
    const success = await conversationStore.submitFeedback(messageId, rating, comment);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to submit feedback', code: 'FEEDBACK_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('[Lexi API] Feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
