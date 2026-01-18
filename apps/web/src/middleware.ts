/**
 * Filename: apps/web/src/middleware.ts
 * Purpose: Next.js middleware for URL redirects and rewrites
 * Created: 2026-01-18
 *
 * Handles:
 * - Blog → Resources permanent redirects (301)
 * - Admin blog → Admin resources permanent redirects (301)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // BLOG → RESOURCES PERMANENT REDIRECTS (301)
  // ============================================

  // Public blog routes → resources routes
  if (pathname.startsWith('/blog')) {
    const newPath = pathname.replace('/blog', '/resources');
    const url = request.nextUrl.clone();
    url.pathname = newPath;

    return NextResponse.redirect(url, {
      status: 301, // Permanent redirect (SEO-friendly)
    });
  }

  // Admin blog routes → admin resources routes
  if (pathname.startsWith('/admin/blog')) {
    const newPath = pathname.replace('/admin/blog', '/admin/resources');
    const url = request.nextUrl.clone();
    url.pathname = newPath;

    return NextResponse.redirect(url, {
      status: 301, // Permanent redirect (SEO-friendly)
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/blog/:path*',
    '/admin/blog/:path*',
  ],
};
