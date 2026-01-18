/**
 * Filename: apps/web/src/app/api/resources/attribution/route.ts
 * Purpose: Record resource attribution when conversion happens (booking, referral, wiselist save)
 * Created: 2026-01-16
 * Updated: 2026-01-16 - Added dual-write pattern (event + cache)
 *
 * DUAL-WRITE PATTERN:
 * 1. Write event to resource_attribution_events (source of truth)
 * 2. Update cache field in target table (denormalized for performance)
 *
 * Cache fields are "last-touch attribution cache" for fast queries.
 * For multi-touch attribution, query resource_attribution_events table.
 *
 * Called from:
 * - Booking confirmation page
 * - Referral signup page
 * - Wiselist save actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface AttributionRequest {
  articleId: string;
  targetType: 'booking' | 'referral' | 'wiselist';
  targetId: string; // booking_id, referral_id, or wiselist_item_id
  context: string; // 'direct_embed', 'related_widget', 'social_share', etc.
  sessionId?: string; // Client session ID for event tracking
  sourceComponent?: string; // Component that triggered conversion
  attributionTimestamp?: string; // ISO timestamp of when user first interacted with blog
}

/**
 * POST /api/resources/attribution
 * Record attribution when user converts after viewing blog content
 *
 * DUAL-WRITE IMPLEMENTATION:
 * 1. Write 'convert' event to resource_attribution_events (immutable truth)
 * 2. Update cache field in target table (denormalized performance optimization)
 */
export async function POST(request: NextRequest) {
  try {
    const body: AttributionRequest = await request.json();
    const { articleId, targetType, targetId, context, sessionId, sourceComponent, attributionTimestamp } = body;

    // Validate required fields
    if (!articleId || !targetType || !targetId || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: articleId, targetType, targetId, context' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user (if authenticated)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // STEP 1: Write conversion event (source of truth)
    const eventTargetType = targetType === 'wiselist' ? 'wiselist_item' : targetType;
    const { error: eventError } = await supabase.from('resource_attribution_events').insert({
      article_id: articleId,
      user_id: user?.id || null,
      session_id: sessionId || null,
      target_type: eventTargetType,
      target_id: targetId,
      event_type: 'convert',
      source_component: sourceComponent || 'direct_save',
      metadata: {
        context,
        attribution_timestamp: attributionTimestamp || new Date().toISOString(),
      },
    });

    if (eventError) {
      console.error('[Attribution] Error writing conversion event:', eventError);
      // Continue to cache update even if event fails (graceful degradation)
    }

    // STEP 2: Update cache field in target table
    switch (targetType) {
      case 'booking':
        await recordBookingAttribution(supabase, articleId, targetId, context, attributionTimestamp);
        break;

      case 'referral':
        await recordReferralAttribution(supabase, articleId, targetId);
        break;

      case 'wiselist':
        await recordWiselistAttribution(supabase, articleId, targetId, context);
        break;

      default:
        return NextResponse.json({ error: 'Invalid targetType' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Attribution recorded successfully (dual-write: event + cache)',
    });
  } catch (error) {
    console.error('[API] Error in POST /api/resources/attribution:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Record attribution for bookings (CACHE UPDATE)
 *
 * Updates bookings.source_article_id (last-touch cache).
 * Source of truth is resource_attribution_events table.
 */
async function recordBookingAttribution(
  supabase: any,
  articleId: string,
  bookingId: string,
  context: string,
  attributionTimestamp?: string
) {
  // Direct update to bookings table
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      source_article_id: articleId,
      attribution_timestamp: attributionTimestamp || new Date().toISOString(),
      attribution_context: context,
    })
    .eq('id', bookingId);

  if (updateError) {
    console.error('[Attribution] Error recording booking attribution (cache):', updateError);
    throw new Error('Failed to record booking attribution');
  }
}

/**
 * Record attribution for referrals (CACHE UPDATE)
 *
 * Updates referrals.source_article_id (last-touch cache).
 * Source of truth is resource_attribution_events table.
 */
async function recordReferralAttribution(supabase: any, articleId: string, referralId: string) {
  const { error } = await supabase
    .from('referrals')
    .update({
      source_article_id: articleId,
    })
    .eq('id', referralId);

  if (error) {
    console.error('[Attribution] Error recording referral attribution (cache):', error);
    throw new Error('Failed to record referral attribution');
  }
}

/**
 * Record attribution for wiselist saves (CACHE UPDATE)
 *
 * Updates wiselist_items.source_article_id (last-touch cache).
 * Source of truth is resource_attribution_events table.
 */
async function recordWiselistAttribution(
  supabase: any,
  articleId: string,
  wiselistItemId: string,
  context: string
) {
  const { error } = await supabase
    .from('wiselist_items')
    .update({
      source_article_id: articleId,
      save_context: context,
    })
    .eq('id', wiselistItemId);

  if (error) {
    console.error('[Attribution] Error recording wiselist attribution (cache):', error);
    throw new Error('Failed to record wiselist attribution');
  }
}
