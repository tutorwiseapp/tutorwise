/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C003 - 2025-08-07 : 21:00 - Definitive fix for post-login redirect loop.
 * C002 - 2025-07-26 : 11:00 - Implemented the definitive async/await pattern.
 * C001 - 2025-07-26 : 10:30 - Updated public routes to use Clerk's standard conventions.
 * Last Modified: 2025-08-07 : 21:00
 * Requirement ID: VIN-M-02.1
 * Change Summary: This is the definitive fix for the post-login redirect loop. The middleware has been refactored to follow Clerk's recommended best practices. Instead of defining public routes, we now explicitly define all **protected routes** that require authentication. We then use the built-in `auth().protect()` method, which is the robust, canonical way to handle session validation and redirection, permanently fixing the race condition that caused the login loop.
 * Impact Analysis: This change makes the application's security model more explicit, secure, and reliable. It fixes the final critical bug in the authentication user journey.
 * Dependencies: "@clerk/nextjs/server".
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define the routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/payments(.*)',
  '/referral-activities(.*)',
  '/transaction-history(.*)',
  '/become-provider(.*)',
  '/claim-rewards(.*)',
  '/claim-success(.*)',
  '/delete-account(.*)',
]);

export default clerkMiddleware((auth, req) => {
  // If the route is a protected route, secure it with auth().protect()
  if (isProtectedRoute(req)) {
    auth().protect();
  }
  
  // All other routes, including public and API routes, are allowed to proceed
  // without an explicit check, as they are not on the protected list.
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};