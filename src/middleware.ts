/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C008 - 2025-08-09 : 00:00 - Added contact-agent to public routes.
 * C007 - 2025-08-08 : 02:00 - Definitive async/await fix for middleware build error.
 * C006 - 2025-08-08 : 01:00 - Definitive fix for Clerk middleware build error.
 * Last Modified: 2025-08-09 : 00:00
 * Requirement ID: VIN-M-02.1
 * Change Summary: This is the definitive fix for the 404 error on the agent contact page. The line `/contact-agent(.*)` has been added to the `isPublicRoute` array in the correct, fully functional asynchronous middleware file. This is the only change required.
 * Impact Analysis: This surgical change fixes a critical broken link in a core user journey without altering the now-stable security logic.
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
  '/contact-agent(.*)', // --- THIS IS THE DEFINITIVE FIX ---
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