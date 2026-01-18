/**
 * Filename: apps/web/src/app/api/resources/listing-links/click/route.ts
 * Purpose: API for incrementing click_count on blog_listing_links
 * Created: 2026-01-16
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/resources/listing-links/click
 * Increment click_count when user clicks from blog article to listing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blogArticleId, listingId } = body;

    // Validate required fields
    if (!blogArticleId || !listingId) {
      return NextResponse.json(
        { error: 'Missing required fields: blogArticleId, listingId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Call the database function to increment click count
    const { error } = await supabase.rpc('increment_blog_link_click', {
      p_blog_article_id: blogArticleId,
      p_listing_id: listingId,
    });

    if (error) {
      console.error('[API] Error incrementing blog_link click:', error);
      return NextResponse.json({ error: 'Failed to increment click count' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error in POST /api/resources/listing-links/click:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
