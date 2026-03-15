/*
 * Filename: src/app/api/admin/conductor/workflows/[id]/conformance/route.ts
 * Purpose: Process Mining — conformance checking and deviation management
 * Phase: Conductor 5 — Process Mining Enhancement
 * Created: 2026-03-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { ConformanceChecker } from '@/lib/process-studio/conformance/ConformanceChecker';

export const dynamic = 'force-dynamic';

// ============================================================================
// TYPES
// ============================================================================

interface StoredDeviation {
  id: string;
  execution_id: string;
  node_id: string;
  deviation_type: string;
  is_expected_path: boolean;
  expected_path_note: string | null;
  detected_at: string;
}

interface DeviationOutput {
  id: string | null;
  executionId: string;
  nodeId: string;
  type: string;
  detectedAt: string;
  isExpectedPath: boolean;
  expectedPathNote: string | null;
}

// ============================================================================
// GET /api/admin/conductor/workflows/[id]/conformance
// ============================================================================

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processId } = await props.params;

    // Auth check via anon/session client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Use service role for data queries
    const db = createServiceRoleClient();

    // Run batch conformance check and fetch stored deviations in parallel
    const [batchResult, storedDeviationsResult] = await Promise.all([
      ConformanceChecker.batchCheck(processId, db, 90),
      db
        .from('conformance_deviations')
        .select('id, execution_id, node_id, deviation_type, is_expected_path, expected_path_note, detected_at')
        .eq('process_id', processId)
        .order('detected_at', { ascending: false }),
    ]);

    if (storedDeviationsResult.error) throw storedDeviationsResult.error;

    const storedDeviations: StoredDeviation[] = storedDeviationsResult.data ?? [];

    // Count expected paths marked by admin
    const expectedPathCount = storedDeviations.filter((d) => d.is_expected_path).length;

    // Build a lookup key: executionId+nodeId → stored deviation
    const storedLookup = new Map<string, StoredDeviation>();
    for (const d of storedDeviations) {
      storedLookup.set(`${d.execution_id}:${d.node_id}`, d);
    }

    // Build merged deviations list:
    // Start with all stored deviations (they have IDs and admin flags)
    const mergedMap = new Map<string, DeviationOutput>();
    for (const d of storedDeviations) {
      const key = `${d.execution_id}:${d.node_id}`;
      mergedMap.set(key, {
        id: d.id,
        executionId: d.execution_id,
        nodeId: d.node_id,
        type: d.deviation_type,
        detectedAt: d.detected_at,
        isExpectedPath: d.is_expected_path,
        expectedPathNote: d.expected_path_note,
      });
    }

    // Add computed deviations from batchCheck that are not yet stored
    for (const result of batchResult.results) {
      if (result.conformant) continue;
      for (const dev of result.deviations) {
        const key = `${result.executionId}:${dev.nodeId}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            id: null,
            executionId: result.executionId,
            nodeId: dev.nodeId,
            type: dev.type,
            detectedAt: new Date().toISOString(),
            isExpectedPath: false,
            expectedPathNote: null,
          });
        }
      }
    }

    const deviations = Array.from(mergedMap.values());

    return NextResponse.json({
      conformanceRate: batchResult.conformanceRate,
      total: batchResult.total,
      conformant: batchResult.conformant,
      deviated: batchResult.deviated,
      byType: batchResult.byType,
      deviations,
      expectedPathCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/admin/conductor/workflows/[id]/conformance
// Body: { deviationId: string, markAsExpected: boolean, note?: string }
// ============================================================================

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // params not needed for the update but destructured to satisfy Next.js signature
    await props.params;

    // Auth check via anon/session client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { deviationId, markAsExpected, note } = body;

    if (!deviationId || typeof markAsExpected !== 'boolean') {
      return NextResponse.json(
        { error: 'deviationId and markAsExpected (boolean) are required' },
        { status: 400 }
      );
    }

    // Use service role for write
    const db = createServiceRoleClient();

    const { error } = await db
      .from('conformance_deviations')
      .update({
        is_expected_path: markAsExpected,
        expected_path_note: note ?? null,
      })
      .eq('id', deviationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
