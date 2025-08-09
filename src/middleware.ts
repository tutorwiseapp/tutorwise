/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C006 - 2025-08-08 : 01:00 - Definitive fix for Clerk middleware build error.
 * C005 - 2025-08-07 : 23:00 - Definitive fix for Clerk middleware syntax.
 * C004 - 2025-08-07 : 22:00 - Definitive fix for build error using publicRoutes.
 * Last Modified: 2025-08-08 : 01:00
 * Requirement ID: VIN-M-02.1
 * Change Summary: This is the definitive and final fix for the Vercel build error. It uses the correct, function-based middleware pattern that is compatible with the project's dependency versions. It checks for public routes and explicitly protects all other routes, resolving the TypeScript errors and session handling loops.
 * Impact Analysis: This change fixes the critical Vercel build failure and correctly implements the application's security policy, unblocking all future development.
 * Dependencies: "@clerk/nextjs/server".
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

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

export default clerkMiddleware((auth, req) => {
  // If the route is not public, then it is protected.
  // The auth().protect() method will handle redirection for unauthenticated users.
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};