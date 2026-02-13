/**
 * Lexi Conversation History API
 *
 * GET /api/lexi/history - Get user's conversation history
 * GET /api/lexi/history/[id] - Get specific conversation with messages
 *
 * @module api/lexi/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { conversationStore } from '@lexi/services/conversation-store';

/**
 * GET /api/lexi/history
 * Get user's conversation history
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') as 'active' | 'ended' | 'archived' | null;
    const conversationId = searchParams.get('id');

    // If specific conversation requested
    if (conversationId) {
      const conversation = await conversationStore.getConversation(conversationId, user.id);

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json({ conversation });
    }

    // Get user's conversation list
    const conversations = await conversationStore.getUserConversations(user.id, {
      limit,
      offset,
      status: status || undefined,
    });

    return NextResponse.json({
      conversations,
      pagination: {
        limit,
        offset,
        hasMore: conversations.length === limit,
      },
    });
  } catch (error) {
    console.error('[Lexi API] History error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
