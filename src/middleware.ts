// Filename: src/middleware.ts
import { withAuth } from '@kinde-oss/kinde-auth-nextjs/middleware';
import type { NextRequest } from 'next/server';

export default function middleware(req: NextRequest) {
  return withAuth(req);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    // Define protected routes here
    '/dashboard',
    '/profile',
    '/settings/:path*',
    '/payments'
  ],
};