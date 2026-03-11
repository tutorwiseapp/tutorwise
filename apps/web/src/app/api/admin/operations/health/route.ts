/**
 * GET /api/admin/operations/health
 * @deprecated Use GET /api/admin/workflow/health instead (canonical endpoint).
 * Thin wrapper kept for backward compatibility.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL('/api/admin/workflow/health', request.url);
  return NextResponse.rewrite(url);
}
