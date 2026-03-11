/**
 * GET /api/admin/operations/exceptions
 * @deprecated Use GET /api/admin/workflow/exceptions instead (canonical endpoint).
 * Thin wrapper kept for backward compatibility.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL('/api/admin/workflow/exceptions' + new URL(request.url).search, request.url);
  return NextResponse.rewrite(url);
}
