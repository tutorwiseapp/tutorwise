/**
 * GET /api/admin/operations/brief
 * @deprecated Use GET /api/admin/workflow/briefing instead (canonical endpoint).
 * Thin wrapper kept for backward compatibility.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL('/api/admin/workflow/briefing', request.url);
  return NextResponse.rewrite(url);
}
