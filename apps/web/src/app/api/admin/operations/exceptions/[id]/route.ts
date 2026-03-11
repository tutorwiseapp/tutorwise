/**
 * GET/PATCH /api/admin/operations/exceptions/[id]
 * @deprecated Use /api/admin/workflow/exceptions/[id] instead (canonical endpoint).
 * Thin wrapper kept for backward compatibility.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(`/api/admin/workflow/exceptions/${id}`, request.url);
  return NextResponse.rewrite(url);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(`/api/admin/workflow/exceptions/${id}`, request.url);
  return NextResponse.rewrite(url);
}
