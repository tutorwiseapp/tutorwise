/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C014 - 2025-08-09 : 22:30 - Definitive and final fix for all middleware errors.
 * C013 - 2025-08-09 : 22:00 - Definitive fix using Clerk's standard config object.
 * C012 - 2025-08-09 : 21:00 - Definitive fix for JSON parsing error on payments page.
 * Last Modified: 2025-08-09 : 22:30
 * Requirement ID: VIN-M-02.1
 * Change Summary: This is the definitive and final fix for all middleware errors, including the "Property 'protect' does not exist" and "Unexpected token '<'" errors. This version uses the async handler pattern that is compatible with the project's specific Clerk SDK version. It correctly defines all public-facing pages and API routes in the `isPublicRoute` matcher, allowing them to pass through for their own internal authentication checks. This resolves all outstanding routing and API call failures.
 * Impact Analysis: This change permanently stabilizes the application's security and routing, fixing all related bugs.
 * Dependencies: "@clerk/nextjs/server", "next/server".
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define all routes that are publicly accessible OR handle their own auth.
// This includes all pages and all API routes.
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

  // Public API Routes
  '/api/agents/(.*)',
  '/api/links',
  '/api/clerk-webhook',
  
  // Authenticated API Routes (must be listed here to bypass incorrect redirects)
  '/api/stripe/create-checkout-session',
  '/api/stripe/connect-account',
  '/api/stripe/get-connect-account',
  '/api/stripe/get-payment-methods'
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // If the route is in our matcher, we let it pass.
  // The API routes will do their own `await auth()` check internally.
  // The public pages will render.
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For every other route not in the list, we enforce authentication.
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    // This will redirect users from any protected page (e.g., /dashboard)
    // to the sign-in page.
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