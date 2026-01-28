/**
 * Filename: apps/web/src/proxy.ts
 * Purpose: Next.js proxy (formerly middleware) for URL redirects and rewrites
 * Created: 2026-01-18
 * Updated: 2026-01-28 - Renamed from middleware.ts to proxy.ts for Next.js 16
 *
 * Currently unused - placeholder for future proxy needs.
 * Resource/blog redirects removed as feature was just implemented (zero technical debt).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // No redirects needed - feature just launched with /resources paths
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
