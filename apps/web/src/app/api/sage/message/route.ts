/**
 * Sage Message API
 *
 * POST /api/sage/message - Send a message and receive non-streaming response
 *
 * @module api/sage/message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface MessageRequestBody {
  sessionId: string;
  message: string;
}

/**
 * POST /api/sage/message
 * Send a message to Sage and receive a complete response (non-streaming)
 */
export async function POST(request: NextRequest) {
  try {
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

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body: MessageRequestBody = await request.json();

    if (!body.sessionId || !body.message) {
      return NextResponse.json(
        { error: 'Session ID and message are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // For now, return a placeholder response
    // TODO: Integrate with actual AI provider when ready
    const messageId = `msg_${Date.now()}`;
    const response = getPlaceholderResponse(body.message);

    // Try to store message (gracefully handle missing table)
    const { error: insertError } = await supabase.from('sage_messages').insert([
      {
        id: `msg_user_${Date.now()}`,
        session_id: body.sessionId,
        role: 'user',
        content: body.message,
        timestamp: new Date().toISOString(),
      },
      {
        id: messageId,
        session_id: body.sessionId,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      console.warn('[Sage Message] Could not store message:', insertError.message);
    } else {
      // Update session message count (async, don't block response)
      supabase
        .from('sage_sessions')
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', body.sessionId)
        .then(() => {});
    }

    return NextResponse.json({
      response: {
        id: messageId,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        metadata: {
          persona: 'sage',
        },
      },
      suggestions: getSuggestions(body.message),
    });
  } catch (error) {
    console.error('[Sage Message] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Get a placeholder response based on the message
 */
function getPlaceholderResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm Sage, your AI tutor. I'm here to help you learn and understand any subject. What would you like to explore today?";
  }

  if (lowerMessage.includes('help')) {
    return "I'd be happy to help! I can assist with:\n\n- **Mathematics**: Algebra, geometry, calculus, and more\n- **English**: Writing, grammar, literature analysis\n- **Science**: Physics, chemistry, biology concepts\n- **Study skills**: Exam prep, note-taking, time management\n\nWhat subject would you like to focus on?";
  }

  if (lowerMessage.includes('math') || lowerMessage.includes('algebra') || lowerMessage.includes('equation')) {
    return "Great question about maths! To help you effectively, could you share the specific problem or concept you're working on? I can:\n\n- Walk through problems step-by-step\n- Explain underlying concepts\n- Provide practice questions\n- Check your work\n\nPaste your question or problem and I'll help break it down!";
  }

  if (lowerMessage.includes('english') || lowerMessage.includes('essay') || lowerMessage.includes('writing')) {
    return "I'd love to help with English! Whether it's essay writing, grammar, or literature, I'm here to guide you. Could you tell me more about what you're working on?\n\n- Need help structuring an essay?\n- Working on grammar and punctuation?\n- Analyzing a text or poem?\n\nShare more details and let's get started!";
  }

  if (lowerMessage.includes('science') || lowerMessage.includes('physics') || lowerMessage.includes('chemistry') || lowerMessage.includes('biology')) {
    return "Science is fascinating! I can help explain concepts in physics, chemistry, and biology. What specific topic are you curious about?\n\n- Need help understanding a concept?\n- Working through a problem?\n- Preparing for an exam?\n\nTell me more and I'll help make it clear!";
  }

  return "That's a great question! Let me help you think through this.\n\nTo give you the best guidance, could you share a bit more context about what you're working on? I can:\n\n- Explain concepts step-by-step\n- Work through problems with you\n- Provide examples and practice questions\n- Give feedback on your work\n\nWhat would be most helpful right now?";
}

/**
 * Get follow-up suggestions based on the conversation
 */
function getSuggestions(message: string): string[] {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('math')) {
    return ['Show me an example', 'Practice problems', 'Explain the concept'];
  }

  if (lowerMessage.includes('english') || lowerMessage.includes('essay')) {
    return ['Help with structure', 'Check my grammar', 'Give me feedback'];
  }

  if (lowerMessage.includes('science')) {
    return ['Explain further', 'Show a diagram', 'Practice questions'];
  }

  return ['Tell me more', 'Practice questions', 'Explain differently'];
}
