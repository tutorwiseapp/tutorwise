/**
 * Create VirtualSpace Session API (v5.9)
 *
 * @path POST /api/virtualspace/session
 * @description Creates a new standalone VirtualSpace session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createVirtualSpaceResolver, VirtualSpaceAccessError } from '@/lib/virtualspace';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { title, description } = body as { title?: string; description?: string };

    // 3. Create session
    const resolver = await createVirtualSpaceResolver();
    const { sessionId, inviteToken } = await resolver.createStandaloneSession(
      user.id,
      title,
      description
    );

    // 4. Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const inviteUrl = `${baseUrl}/virtualspace/join/${inviteToken}`;

    return NextResponse.json({
      success: true,
      sessionId,
      inviteUrl,
      inviteToken,
    });
  } catch (error) {
    if (error instanceof VirtualSpaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
