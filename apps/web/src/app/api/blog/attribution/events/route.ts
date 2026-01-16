/**
 * Filename: apps/web/src/app/api/blog/attribution/events/route.ts
 * Purpose: API endpoint for recording blog attribution events (source of truth)
 * Created: 2026-01-16
 *
 * This endpoint writes immutable events to blog_attribution_events table.
 * Events represent evidence of influence, not attribution conclusions.
 * Attribution models are derived at query time from this event stream.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/blog/attribution/events
 *
 * Record a blog attribution event (immutable event stream)
 *
 * Request body:
 * {
 *   blog_article_id: string;    // UUID of blog article
 *   event_type: string;         // 'impression' | 'click' | 'save' | 'refer' | 'convert'
 *   target_type: string;        // 'article' | 'tutor' | 'listing' | 'booking' | 'referral' | 'wiselist_item'
 *   target_id: string;          // UUID of target object
 *   source_component: string;   // 'listing_grid' | 'tutor_embed' | etc.
 *   session_id: string;         // Client-generated session UUID
 *   metadata?: object;          // Additional context
 * }
 *
 * Response:
 * {
 *   success: true;
 *   event_id: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blog_article_id, event_type, target_type, target_id, source_component, session_id, metadata } = body;

    // Validate required fields
    if (!blog_article_id || !event_type || !target_type || !target_id || !source_component) {
      return NextResponse.json(
        { error: 'Missing required fields: blog_article_id, event_type, target_type, target_id, source_component' },
        { status: 400 }
      );
    }

    // Validate event taxonomy
    const validEventTypes = ['impression', 'click', 'save', 'refer', 'convert'];
    const validTargetTypes = ['article', 'tutor', 'listing', 'booking', 'referral', 'wiselist_item'];
    const validSourceComponents = [
      'listing_grid',
      'tutor_embed',
      'tutor_carousel',
      'cta_button',
      'inline_link',
      'floating_save',
      'article_header',
    ];

    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validTargetTypes.includes(target_type)) {
      return NextResponse.json(
        { error: `Invalid target_type. Must be one of: ${validTargetTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validSourceComponents.includes(source_component)) {
      return NextResponse.json(
        { error: `Invalid source_component. Must be one of: ${validSourceComponents.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user (if authenticated)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Insert event into blog_attribution_events table
    const { data: event, error: insertError } = await supabase
      .from('blog_attribution_events')
      .insert({
        blog_article_id,
        user_id: user?.id || null,
        session_id: session_id || null,
        target_type,
        target_id,
        event_type,
        source_component,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[API] Error inserting attribution event:', insertError);
      return NextResponse.json({ error: 'Failed to record attribution event', details: insertError.message }, { status: 500 });
    }

    if (!event) {
      return NextResponse.json({ error: 'No event returned after insert' }, { status: 500 });
    }

    // Success response
    return NextResponse.json({
      success: true,
      event_id: event.id,
    });
  } catch (error) {
    console.error('[API] Error in POST /api/blog/attribution/events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/blog/attribution/events?article_id=xxx&session_id=xxx
 *
 * Query attribution events (for analytics and debugging)
 *
 * Query parameters:
 * - article_id: Filter by blog article ID
 * - session_id: Filter by session ID
 * - user_id: Filter by user ID (requires auth)
 * - event_type: Filter by event type
 * - target_type: Filter by target type
 * - limit: Number of events to return (default: 100, max: 1000)
 *
 * Response:
 * {
 *   events: Event[];
 *   count: number;
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const article_id = searchParams.get('article_id');
    const session_id = searchParams.get('session_id');
    const user_id = searchParams.get('user_id');
    const event_type = searchParams.get('event_type');
    const target_type = searchParams.get('target_type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

    const supabase = await createClient();

    // Get current user (for permission checks)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Build query
    let query = supabase.from('blog_attribution_events').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(limit);

    // Apply filters
    if (article_id) {
      query = query.eq('blog_article_id', article_id);
    }

    if (session_id) {
      query = query.eq('session_id', session_id);
    }

    if (user_id) {
      // Only allow filtering by user_id if it's the current user or they're an admin
      if (user?.id !== user_id) {
        // Check if admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();

        if (!profile || profile.role !== 'admin') {
          return NextResponse.json({ error: 'Unauthorized: Cannot query events for other users' }, { status: 403 });
        }
      }

      query = query.eq('user_id', user_id);
    }

    if (event_type) {
      query = query.eq('event_type', event_type);
    }

    if (target_type) {
      query = query.eq('target_type', target_type);
    }

    // Execute query
    const { data: events, error: queryError, count } = await query;

    if (queryError) {
      console.error('[API] Error querying attribution events:', queryError);
      return NextResponse.json({ error: 'Failed to query attribution events' }, { status: 500 });
    }

    return NextResponse.json({
      events: events || [],
      count: count || 0,
    });
  } catch (error) {
    console.error('[API] Error in GET /api/blog/attribution/events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
