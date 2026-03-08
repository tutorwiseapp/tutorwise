import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workflow/discovery/[id]/import
 * Import a single discovery result as a saved workflow process.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Fetch the discovery result
    const { data: discovery, error: fetchError } = await supabase
      .from('workflow_discovery_results')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !discovery) {
      return NextResponse.json(
        { success: false, error: 'Discovery not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (
      discovery.analysis_state === 'preview' ||
      (!discovery.nodes?.length && discovery.analysis_state !== 'direct_mapped')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Discovery must be analysed before importing',
          code: 'NOT_ANALYSED',
        },
        { status: 400 }
      );
    }

    // Create a new workflow_processes entry
    const { data: process, error: createError } = await supabase
      .from('workflow_processes')
      .insert({
        name: discovery.name,
        description: discovery.description,
        category: discovery.category || 'other',
        nodes: discovery.nodes,
        edges: discovery.edges,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create process:', createError);
      return NextResponse.json(
        { success: false, error: createError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Update discovery status to imported
    await supabase
      .from('workflow_discovery_results')
      .update({
        status: 'imported',
        imported_process_id: process.id,
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      data: {
        processId: process.id,
        process,
      },
    });
  } catch (error) {
    console.error('Discovery import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import discovery', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
