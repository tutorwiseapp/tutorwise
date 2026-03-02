import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { analyzeToWorkflow } from '@/lib/process-studio/scanner/ai-analyzer';
import { detectOverlap } from '@/lib/process-studio/scanner/overlap-detector';
import type { ConfidenceLevel, SourceType } from '@/lib/process-studio/scanner/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/process-studio/discovery/[id]/analyse
 *
 * Pass 2: Runs AI analysis on a single discovery result that is in 'preview' state.
 * Converts the stored rawContent into a full ProcessNode[]/ProcessEdge[] graph.
 * Updates the discovery record with nodes, edges, preview_steps, confidence,
 * and re-runs template overlap detection.
 *
 * Only admins can call this endpoint.
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

    // Fetch the discovery record
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

    if (discovery.analysis_state !== 'preview') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot analyse: result is already in state '${discovery.analysis_state}'`,
          code: 'INVALID_STATE',
        },
        { status: 400 }
      );
    }

    if (!discovery.raw_content) {
      return NextResponse.json(
        {
          success: false,
          error: 'No raw content available for AI analysis',
          code: 'NO_RAW_CONTENT',
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Run AI analysis (Pass 2)
    const context = `${discovery.source_type}: ${discovery.source_identifier}`;
    const analysis = await analyzeToWorkflow(
      discovery.raw_content,
      context,
      (discovery.confidence as ConfidenceLevel) || 'medium',
      discovery.source_type as SourceType
    );

    // Re-run template overlap detection with the full graph now available
    const { data: templates } = await supabase
      .from('workflow_process_templates')
      .select('*');

    const updatedDiscovery = {
      ...discovery,
      nodes: analysis.nodes,
      edges: analysis.edges,
      preview_steps: analysis.previewSteps,
    };

    const overlap = templates
      ? detectOverlap(updatedDiscovery, templates)
      : null;

    const durationMs = Date.now() - startTime;

    // Update the discovery record
    const { error: updateError } = await supabase
      .from('workflow_discovery_results')
      .update({
        nodes: analysis.nodes,
        edges: analysis.edges,
        preview_steps: analysis.previewSteps,
        confidence: analysis.confidence,
        confidence_reason: analysis.confidenceReason,
        analysis_state: 'analysed',
        // Update overlap if detected
        matched_template_id:
          overlap && overlap.state !== 'no_template' ? overlap.templateId : null,
        template_match_state:
          overlap && overlap.state !== 'no_template' ? overlap.state : null,
        template_match_score:
          overlap && overlap.state !== 'no_template' ? overlap.matchScore : null,
        scan_duration_ms: durationMs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update discovery result after analysis:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save analysis results', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        discoveryId: id,
        nodes: analysis.nodes,
        edges: analysis.edges,
        previewSteps: analysis.previewSteps,
        confidence: analysis.confidence,
        confidenceReason: analysis.confidenceReason,
        templateOverlap: overlap,
        durationMs,
      },
    });
  } catch (error) {
    console.error('Discovery analyse error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
