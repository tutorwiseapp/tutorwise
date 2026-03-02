import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/process-studio/discovery
 * List all discovery results with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('source_type');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'discovered';
    const analysisState = searchParams.get('analysis_state');

    let query = supabase
      .from('workflow_discovery_results')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (sourceType) query = query.eq('source_type', sourceType);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (analysisState) query = query.eq('analysis_state', analysisState);

    const { data, error } = await query;

    if (error) {
      console.error('Discovery list error:', error);
      return NextResponse.json(
        { success: false, error: error.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Discovery list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list discoveries', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
