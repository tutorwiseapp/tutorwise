/**
 * POST /api/admin/cas/resume-workflow
 *
 * Phase 6D: Legacy CAS workflow resume — replaced by TeamRuntime v2 HITL.
 * New endpoint: POST /api/admin/teams/[id]/runs/[runId]/resume
 *
 * This stub returns a 410 Gone with migration instructions.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'This endpoint has been decommissioned.',
      migration: 'Use POST /api/admin/teams/{id}/runs/{runId}/resume with { approved: boolean }',
      docs: '/admin/conductor',
    },
    { status: 410 }
  );
}
