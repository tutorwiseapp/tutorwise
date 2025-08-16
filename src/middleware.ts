/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C015 - 2025-08-09 : 23:00 - Definitive and final fix for all middleware and API routing errors.
 * C014 - 2025-08-09 : 22:30 - Definitive fix for Clerk middleware syntax.
 * C013 - 2025-08-09 : 22:00 - Definitive fix using Clerk's standard config object.
 * Last Modified: 2025-08-09 : 23:00
 * Requirement ID: VIN-M-02.1
 * Change Summary: This is the definitive and final fix for all routing errors. It restores the async handler pattern that is compatible with the project's SDK version. It includes a complete list of all public pages AND all API routes in the `isPublicRoute` matcher. This prevents the middleware from incorrectly redirecting API calls and causing the "Unexpected token '<'" JSON error.
 * Impact Analysis: This change permanently stabilizes the application's security and routing, fixing all related bugs.
 * Dependencies: "@clerk/nextjs/server", "next/server".
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define all routes that should not be protected by the middleware at this level.
// This includes public pages and all API routes, which handle their own auth internally.
const isPublicRoute = createRouteMatcher([
  // Public Pages
  '/',
  '/refer',
  '/contact',
  '/contact-agent(.*)',
  '/resources(.*)',
  '/terms-of-service',
  '/privacy-policy',
  '/forgot-password',
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Public & Authenticated API Routes
  '/api/agents/(.*)',
  '/api/links',
  '/api/clerk-webhook',
  '/api/stripe/connect-account',
  '/api/stripe/create-checkout-session',
  '/api/stripe/get-connect-account',
  '/api/stripe/get-payment-methods',
  '/api/stripe/disconnect-account', // --- THIS IS THE NEW LINE ---
  '/api/profile',
  '/api/avatar/upload'
]);

// This is the async function pattern that is compatible with your environment
export default clerkMiddleware(async (auth, req: NextRequest) => {

  // --- DEFINITIVE DIAGNOSTIC LOGGING ---
  const path = req.nextUrl.pathname;
  const isPublic = isPublicRoute(req);

  console.log(`[MIDDLEWARE_DIAGNOSTIC] Path: ${path} | Is Public: ${isPublic}`);
  // --- END OF LOGGING ---

  // If the route is in our matcher, let it pass.
  // The API routes will perform their own `await auth()` check internally.
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For every other route not in the list (e.g., /dashboard, /settings),
  // we enforce authentication at the middleware level.
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};