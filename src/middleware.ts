/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C011 - 2025-08-09 : 19:00 - Definitive fix for API route authentication.
 * C010 - 2025-08-09 : 14:00 - Removed non-existent create-setup-intent route.
 * C009 - 2025-08-09 : 13:00 - Added create-setup-intent to public routes.
 * Last Modified: 2025-08-09 : 19:00
 * Requirement ID: VIN-M-02.1
 * Change Summary: This is the definitive fix for the "Unexpected token '<'" JSON error. The Stripe API routes have been added to the public matcher, which prevents the middleware from incorrectly redirecting these authenticated API calls to the HTML sign-in page. This allows the frontend to correctly receive JSON responses.
 * Impact Analysis: This change fixes a critical application-breaking bug on the payments page.
 * Dependencies: "@clerk/nextjs/server", "next/server".
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define all routes that are publicly accessible without authentication
const isPublicRoute = createRouteMatcher([
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
  '/api/agents/(.*)',
  '/api/links',
  '/api/clerk-webhook',
  // --- THIS IS THE DEFINITIVE FIX ---
  // These API routes must be accessible to the frontend,
  // their own internal logic uses auth() to protect them.
  '/api/stripe/get-payment-methods',
  '/api/stripe/create-checkout-session',
  '/api/stripe/get-connect-account',
  '/api/stripe/connect-account'
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes
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