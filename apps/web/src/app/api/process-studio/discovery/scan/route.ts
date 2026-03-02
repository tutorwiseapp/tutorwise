import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { scanSource, getAvailableSourceTypes } from '@/lib/process-studio/scanner';
import { detectOverlap } from '@/lib/process-studio/scanner/overlap-detector';
import type { SourceType } from '@/lib/process-studio/scanner/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds max per source scan

/**
 * POST /api/process-studio/discovery/scan
 * Trigger Pass 1 scan for a specific source type.
 * Called once per source type — client sends parallel requests for full scan.
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
    const { sourceType } = body as { sourceType?: SourceType };

    if (!sourceType) {
      return NextResponse.json(
        { success: false, error: 'sourceType is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const available = getAvailableSourceTypes();
    if (!available.includes(sourceType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown source type: ${sourceType}. Available: ${available.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Create scan record
    const { data: scanRecord, error: scanError } = await supabase
      .from('workflow_discovery_scans')
      .insert({
        triggered_by: user.id,
        source_types: [sourceType],
        status: 'running',
      })
      .select()
      .single();

    if (scanError) {
      console.error('Failed to create scan record:', scanError);
    }

    const scanId = scanRecord?.id || null;

    // Run the scanner
    const { discoveries, analysisState } = await scanSource(sourceType);

    // Fetch existing templates for overlap detection
    const { data: templates } = await supabase
      .from('workflow_process_templates')
      .select('*');

    // Upsert results into the database
    let upsertedCount = 0;
    for (const discovery of discoveries) {
      const overlap = templates ? detectOverlap(discovery, templates) : null;

      const record = {
        name: discovery.name,
        description: discovery.description,
        source_type: discovery.sourceType,
        source_identifier: discovery.sourceIdentifier,
        source_file_paths: discovery.sourceFilePaths,
        category: discovery.category,
        nodes: discovery.nodes || [],
        edges: discovery.edges || [],
        preview_steps: discovery.previewSteps || null,
        step_count: discovery.stepCount,
        step_names: discovery.stepNames,
        raw_content: discovery.rawContent,
        confidence: discovery.confidence,
        confidence_reason: discovery.confidenceReason,
        analysis_state: analysisState,
        status: 'discovered',
        scan_id: scanId,
        scanned_at: new Date().toISOString(),
        scan_duration_ms: Date.now() - startTime,
        // Template overlap
        matched_template_id:
          overlap && overlap.state !== 'no_template' ? overlap.templateId : null,
        template_match_state:
          overlap && overlap.state !== 'no_template' ? overlap.state : null,
        template_match_score:
          overlap && overlap.state !== 'no_template' ? overlap.matchScore : null,
      };

      // Manual upsert: the unique index is partial (WHERE status <> 'dismissed'),
      // so ON CONFLICT targeting is not supported by Postgres for partial indexes.
      // Instead: find the existing non-dismissed record and update, or insert new.
      const { data: existing } = await supabase
        .from('workflow_discovery_results')
        .select('id')
        .eq('source_type', discovery.sourceType)
        .eq('source_identifier', discovery.sourceIdentifier)
        .neq('status', 'dismissed')
        .maybeSingle();

      const { error: writeError } = existing
        ? await supabase
            .from('workflow_discovery_results')
            .update(record)
            .eq('id', existing.id)
        : await supabase.from('workflow_discovery_results').insert(record);

      if (writeError) {
        console.error(
          `Failed to save discovery ${discovery.sourceIdentifier}:`,
          writeError
        );
      } else {
        upsertedCount++;
      }
    }

    const durationMs = Date.now() - startTime;

    // Update scan record
    if (scanId) {
      await supabase
        .from('workflow_discovery_scans')
        .update({
          status: 'completed',
          results_count: upsertedCount,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq('id', scanId);
    }

    return NextResponse.json({
      success: true,
      data: {
        scanId,
        sourceType,
        resultsCount: upsertedCount,
        analysisState,
        durationMs,
      },
    });
  } catch (error) {
    console.error('Discovery scan error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Scan failed',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
