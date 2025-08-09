/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C007 - 2025-08-08 : 02:00 - Definitive async/await fix for middleware build error.
 * C006 - 2025-08-08 : 01:00 - Definitive fix for Clerk middleware build error.
 * C005 - 2025-08-07 : 23:00 - Definitive fix for Clerk middleware syntax.
 * Last Modified: 2025-08-08 : 02:00
 * Requirement ID: VIN-M-02.1
 * Change Summary: This is the definitive and final fix for the Vercel build error. The middleware handler is now correctly declared as `async`, and the `auth()` function is correctly `await`ed before use. This resolves the `Property 'protect' does not exist on type 'Promise<...>'` TypeScript error by properly handling the asynchronous nature of the authentication check. This is the canonical pattern for protecting routes with this version of the Clerk SDK.
 * Impact Analysis: This change will fix the Vercel build failure and correctly implement the application's security policy, unblocking all future development.
 * Dependencies: "@clerk/nextjs/server", "next/server".
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define all routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  '/',
  '/refer',
  '/contact',
  '/resources(.*)',
  '/terms-of-service',
  '/privacy-policy',
  '/forgot-password',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/agents/(.*)',
  '/api/links',
  '/api/clerk-webhook',
]);

// This is now an async function
export default clerkMiddleware(async (auth, req: NextRequest) => {
  // If the route is public, allow the request to proceed
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Await the auth function to get the resolved authentication state
  const { userId, redirectToSignIn } = await auth();

  // If there is no userId, the user is not authenticated.
  // Redirect them to the sign-in page.
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // If the user is signed in and accessing a protected route, allow them to proceed.
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};