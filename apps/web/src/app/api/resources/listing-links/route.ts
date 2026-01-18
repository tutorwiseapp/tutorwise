/**
 * Filename: apps/web/src/app/api/resources/listing-links/route.ts
 * Purpose: API for managing resource_listing_links (create links between resource articles and listings)
 * Created: 2026-01-16
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/resources/listing-links
 * Create or update a resource_listing_link entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, listingId, linkType = 'manual_embed', positionInArticle } = body;

    // Validate required fields
    if (!articleId || !listingId) {
      return NextResponse.json(
        { error: 'Missing required fields: articleId, listingId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('resource_listing_links')
      .select('id, click_count')
      .eq('article_id', articleId)
      .eq('listing_id', listingId)
      .eq('link_type', linkType)
      .single();

    if (existingLink) {
      // Link already exists, return it
      return NextResponse.json({
        success: true,
        link: existingLink,
        created: false,
      });
    }

    // Create new link
    const { data: newLink, error } = await supabase
      .from('resource_listing_links')
      .insert({
        article_id: articleId,
        listing_id: listingId,
        link_type: linkType,
        position_in_article: positionInArticle,
        click_count: 0,
        conversion_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating resource_listing_link:', error);
      return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      link: newLink,
      created: true,
    });
  } catch (error) {
    console.error('[API] Error in POST /api/resources/listing-links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
