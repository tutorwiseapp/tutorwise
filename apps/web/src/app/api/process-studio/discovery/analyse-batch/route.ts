import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { analyzeToWorkflow } from '@/lib/process-studio/scanner/ai-analyzer';
import { detectOverlap } from '@/lib/process-studio/scanner/overlap-detector';
import type { ConfidenceLevel, SourceType } from '@/lib/process-studio/scanner/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH_SIZE = 3; // Process 3 at a time to respect AI rate limits

/**
 * POST /api/process-studio/discovery/analyse-batch
 *
 * Pass 2 (batch): Runs AI analysis for multiple discovery results in 'preview' state.
 * Processes in batches of 3 to respect AI rate limits.
 * Returns a summary of processed / skipped / failed counts.
 *
 * Body: { ids: string[] }
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

    if (ids.length > 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 20 items per batch',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Fetch all requested discovery records
    const { data: discoveries, error: fetchError } = await supabase
      .from('workflow_discovery_results')
      .select('*')
      .in('id', ids);

    if (fetchError || !discoveries) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch discovery results', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Fetch templates for overlap detection (once, shared across batch)
    const { data: templates } = await supabase
      .from('workflow_process_templates')
      .select('*');

    // Filter to only preview-state results with raw_content
    const toAnalyse = discoveries.filter(
      (d) => d.analysis_state === 'preview' && d.raw_content
    );
    const skipped = ids.length - toAnalyse.length;

    let processed = 0;
    let failed = 0;
    const results: Array<{
      id: string;
      success: boolean;
      confidence?: ConfidenceLevel;
      error?: string;
    }> = [];

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < toAnalyse.length; i += BATCH_SIZE) {
      const batch = toAnalyse.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (discovery) => {
          const context = `${discovery.source_type}: ${discovery.source_identifier}`;
          const analysis = await analyzeToWorkflow(
            discovery.raw_content,
            context,
            (discovery.confidence as ConfidenceLevel) || 'medium',
            discovery.source_type as SourceType
          );

          const updatedDiscovery = {
            ...discovery,
            nodes: analysis.nodes,
            edges: analysis.edges,
            preview_steps: analysis.previewSteps,
          };

          const overlap = templates
            ? detectOverlap(updatedDiscovery, templates)
            : null;

          await supabase
            .from('workflow_discovery_results')
            .update({
              nodes: analysis.nodes,
              edges: analysis.edges,
              preview_steps: analysis.previewSteps,
              confidence: analysis.confidence,
              confidence_reason: analysis.confidenceReason,
              analysis_state: 'analysed',
              matched_template_id:
                overlap && overlap.state !== 'no_template' ? overlap.templateId : null,
              template_match_state:
                overlap && overlap.state !== 'no_template' ? overlap.state : null,
              template_match_score:
                overlap && overlap.state !== 'no_template' ? overlap.matchScore : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', discovery.id);

          return { id: discovery.id, confidence: analysis.confidence };
        })
      );

      for (let j = 0; j < batch.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          processed++;
          results.push({ id: result.value.id, success: true, confidence: result.value.confidence });
        } else {
          failed++;
          results.push({
            id: batch[j].id,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Analysis failed',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed,
        skipped,
        failed,
        results,
      },
    });
  } catch (error) {
    console.error('Analyse-batch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Batch analysis failed',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
