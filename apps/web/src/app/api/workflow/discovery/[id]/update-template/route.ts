import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workflow/discovery/[id]/update-template
 *
 * Auto-sync integration: replaces the matched template's nodes, edges, and preview_steps
 * with the discovery result's current workflow graph. Called after the user confirms
 * the "Replace template" dialog in the UI.
 *
 * Updates:
 *   - workflow_process_templates: nodes, edges, preview_steps
 *   - workflow_discovery_results: template_match_state → 'matches', template_match_score → 1.0
 *
 * Returns previous and new step counts for the success toast.
 */
export async function POST(
  _request: NextRequest,
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
        { success: false, error: 'Discovery result not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!discovery.matched_template_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'No matched template for this discovery result',
          code: 'NO_TEMPLATE_MATCH',
        },
        { status: 400 }
      );
    }

    if (discovery.analysis_state === 'preview') {
      return NextResponse.json(
        {
          success: false,
          error: 'Discovery result must be analysed before updating a template',
          code: 'INVALID_STATE',
        },
        { status: 400 }
      );
    }

    // Fetch the matched template for the step count diff in the response
    const { data: template, error: templateError } = await supabase
      .from('workflow_process_templates')
      .select('id, name, nodes, preview_steps')
      .eq('id', discovery.matched_template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { success: false, error: 'Matched template not found', code: 'TEMPLATE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const previousStepCount = Array.isArray(template.nodes) ? template.nodes.length : 0;
    const newStepCount = Array.isArray(discovery.nodes) ? discovery.nodes.length : 0;

    // Replace template content with discovery graph
    const { error: updateTemplateError } = await supabase
      .from('workflow_process_templates')
      .update({
        nodes: discovery.nodes,
        edges: discovery.edges,
        preview_steps: discovery.preview_steps || [],
      })
      .eq('id', discovery.matched_template_id);

    if (updateTemplateError) {
      console.error('Failed to update template:', updateTemplateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update template', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Mark the discovery result as in sync with the template
    await supabase
      .from('workflow_discovery_results')
      .update({
        template_match_state: 'matches',
        template_match_score: 1.0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      data: {
        templateId: discovery.matched_template_id,
        templateName: template.name,
        previousStepCount,
        newStepCount,
      },
    });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update template',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
