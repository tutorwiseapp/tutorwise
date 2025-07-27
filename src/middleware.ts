/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C002 - 2025-07-26 : 11:00 - Implemented the definitive async/await pattern.
 * C001 - 2025-07-26 : 10:30 - Updated public routes to use Clerk's standard conventions.
 * Last Modified: 2025-07-26 : 11:00
 * Requirement ID: VIN-M-02.1
 * Change Summary: This is the definitive version that resolves the "Property 'protect' does not exist"
 * TypeScript error. It uses the modern async/await pattern to correctly handle the Promise
 * returned by the auth() helper, ensuring type safety and proper route protection.
 * Impact Analysis: This change fixes a critical build-time error and correctly implements the
 * application's security policy without affecting any other files.
 * Dependencies: "@clerk/nextjs/server", "next/server".
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define the routes that should be publicly accessible.
const isPublicRoute = createRouteMatcher([
    '/',                 // The homepage
    '/refer',            // The marketing page
    '/sign-in(.*)',      // The sign-in page and all its sub-routes
    '/sign-up(.*)',      // The sign-up page and all its sub-routes
    '/api/agents/(.*)',  // Public API for agent profiles
    '/api/links',        // Public API for link generation
]);

// The entire middleware callback is now declared as 'async'.
export default clerkMiddleware(async (auth, req: NextRequest) => {
  // If the route is public, we can immediately allow the request to proceed.
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Await the auth() function to get the resolved authentication state.
  // This is the key step that fixes the TypeScript error.
  const { userId, redirectToSignIn } = await auth();

  // If there is no userId, the user is not authenticated.
  // We must explicitly redirect them to the sign-in page.
  if (!userId) {
    // The `returnBackUrl` ensures the user is sent back to the page
    // they were trying to access after they successfully log in.
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // If the user is signed in and is accessing a protected route, allow them to proceed.
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};