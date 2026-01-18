/**
 * Filename: apps/web/src/app/api/resources/saves/check/route.ts
 * Purpose: Check if a resource article is saved by the current user
 * Created: 2026-01-16
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/resources/saves/check?articleId=xxx
 * Check if article is saved by current user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json({ error: 'Missing required parameter: articleId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isSaved: false });
    }

    // Check if article is saved
    const { data: save } = await supabase
      .from('resource_article_saves')
      .select('id')
      .eq('article_id', articleId)
      .eq('profile_id', user.id)
      .single();

    return NextResponse.json({ isSaved: !!save });
  } catch (error) {
    console.error('[API] Error in GET /api/resources/saves/check:', error);
    return NextResponse.json({ isSaved: false });
  }
}
