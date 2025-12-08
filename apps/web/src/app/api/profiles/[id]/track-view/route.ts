import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * POST /api/profiles/[id]/track-view
 * Tracks a profile view with deduplication (max 1 view per session per 24 hours)
 * Body: { session_id: string, referrer_source?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const profileId = params.id;

    // Get current user (may be null for anonymous viewers)
    const { data: { user } } = await supabase.auth.getUser();
    const viewerId = user?.id || null;

    // Parse request body
    const body = await request.json();
    const { session_id, referrer_source } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    // Verify profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if this session already viewed this profile in the last 24 hours (deduplication)
    const { data: recentView } = await supabase
      .from('profile_views')
      .select('id')
      .eq('profile_id', profileId)
      .eq('session_id', session_id)
      .gte('viewed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recentView) {
      // Already tracked within 24 hours - don't create duplicate
      return NextResponse.json({
        tracked: false,
        reason: 'Already tracked within 24 hours'
      });
    }

    // Get user agent and IP for analytics
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || null;
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0].trim()
      || headersList.get('x-real-ip')
      || null;

    // Insert view record
    const { error: insertError } = await supabase
      .from('profile_views')
      .insert({
        profile_id: profileId,
        viewer_id: viewerId,
        session_id: session_id,
        referrer_source: referrer_source || null,
        user_agent: userAgent,
        ip_address: ipAddress,
        viewed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error tracking profile view:', insertError);
      throw insertError;
    }

    return NextResponse.json({
      tracked: true,
      message: 'Profile view tracked successfully'
    });
  } catch (error) {
    console.error('Error in track-view endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
