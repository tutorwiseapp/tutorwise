/**
 * Filename: apps/web/src/middleware.ts
 * Purpose: Next.js middleware for URL redirects and rewrites
 * Created: 2026-01-18
 *
 * Currently unused - placeholder for future middleware needs.
 * Resource/blog redirects removed as feature was just implemented (zero technical debt).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // No redirects needed - feature just launched with /resources paths
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
