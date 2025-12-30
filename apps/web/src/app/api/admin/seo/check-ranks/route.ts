/**
 * Filename: src/app/api/admin/seo/check-ranks/route.ts
 * Purpose: API endpoint to manually trigger rank tracking
 * Created: 2025-12-29
 *
 * Allows admins to manually check keyword rankings
 * Uses best available method (SerpApi → GSC fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { trackMultipleKeywords, updateKeywordPositions } from '@/services/seo/rank-tracking';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const keywordIds = body.keyword_ids || [];

    // If no specific keywords, get all priority keywords
    let keywords: string[] = [];
    if (keywordIds.length === 0) {
      const { data: priorityKeywords } = await supabase
        .from('seo_keywords')
        .select('keyword')
        .in('priority', ['critical', 'high'])
        .order('priority', { ascending: false })
        .limit(20);

      keywords = priorityKeywords?.map((k) => k.keyword) || [];
    } else {
      const { data: selectedKeywords } = await supabase
        .from('seo_keywords')
        .select('keyword')
        .in('id', keywordIds);

      keywords = selectedKeywords?.map((k) => k.keyword) || [];
    }

    if (keywords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No keywords to track',
      });
    }

    // Track rankings
    const results = await trackMultipleKeywords(keywords);

    // Update database
    const updated = await updateKeywordPositions(results);

    // Calculate stats
    const tracked = results.length;
    const successful = results.filter((r) => r.position !== null).length;
    const sources = results.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      tracked,
      successful,
      updated,
      sources,
      message: `Tracked ${tracked} keywords, updated ${updated} positions`,
    });
  } catch (error) {
    console.error('Rank tracking API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
