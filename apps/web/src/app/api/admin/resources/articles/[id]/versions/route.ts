/**
 * Filename: apps/web/src/app/api/admin/resources/articles/[id]/versions/route.ts
 * Purpose: API routes for article version history
 * Created: 2026-02-02
 *
 * Endpoints:
 * - GET: Fetch version history for an article
 * - POST: Restore article to a specific version
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/resources/articles/[id]/versions
 * Fetch version history for an article
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const { id } = params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get limit from query params (default 20)
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Use the RPC function to get version history
    const { data: versions, error } = await supabase.rpc('get_article_version_history', {
      p_article_id: id,
      p_limit: limit,
    });

    if (error) {
      console.error('Error fetching version history:', error);
      return NextResponse.json({ error: 'Failed to fetch version history' }, { status: 500 });
    }

    return NextResponse.json({ versions: versions || [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/resources/articles/[id]/versions
 * Restore article to a specific version
 *
 * Body: { versionId: string }
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const { id } = params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    }

    // Use the RPC function to restore the version
    const { data: article, error } = await supabase.rpc('restore_article_version', {
      p_article_id: id,
      p_version_id: versionId,
    });

    if (error) {
      console.error('Error restoring version:', error);
      return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: 'Article restored successfully',
        article,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
