/**
 * Filename: src/app/api/admin/blog/orchestrator/journey/route.ts
 * Status: DEPRECATED - Redirects to /api/admin/signal/journey
 * Created: 2026-01-16
 * Deprecated: 2026-01-18
 * Reason: Revenue Signal is platform-level intelligence, not blog-specific
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  const newUrl = `/api/admin/signal/journey${queryString ? `?${queryString}` : ''}`;

  console.warn('[DEPRECATED] /api/admin/blog/orchestrator/journey → /api/admin/signal/journey');

  return NextResponse.redirect(new URL(newUrl, request.url), {
    status: 308, // Permanent redirect
  });
}
