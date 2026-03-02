import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/process-studio/discovery/import-batch
 * Import multiple selected discovery results as saved workflow processes.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { ids } = body as { ids?: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids array is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 imports at once', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Fetch all selected discoveries
    const { data: discoveries, error: fetchError } = await supabase
      .from('workflow_discovery_results')
      .select('*')
      .in('id', ids);

    if (fetchError || !discoveries) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch discoveries', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Filter to only analysed / direct_mapped
    const importable = discoveries.filter(
      (d) => d.analysis_state !== 'preview' && d.nodes?.length > 0
    );

    if (importable.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No importable discoveries found (must be analysed first)',
          code: 'NOT_ANALYSED',
        },
        { status: 400 }
      );
    }

    // Create workflow processes
    const processes = importable.map((d) => ({
      name: d.name,
      description: d.description,
      category: d.category || 'other',
      nodes: d.nodes,
      edges: d.edges,
      created_by: user.id,
      updated_by: user.id,
    }));

    const { data: created, error: createError } = await supabase
      .from('workflow_processes')
      .insert(processes)
      .select();

    if (createError) {
      console.error('Failed to create processes:', createError);
      return NextResponse.json(
        { success: false, error: createError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Update discovery statuses
    if (created) {
      for (let i = 0; i < importable.length; i++) {
        const processRecord = created[i];
        if (processRecord) {
          await supabase
            .from('workflow_discovery_results')
            .update({
              status: 'imported',
              imported_process_id: processRecord.id,
            })
            .eq('id', importable[i].id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        importedCount: created?.length || 0,
        skippedCount: discoveries.length - importable.length,
        processes: created,
      },
    });
  } catch (error) {
    console.error('Batch import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to batch import', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
