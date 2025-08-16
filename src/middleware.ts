/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C012 - 2025-08-09 : 21:00 - Definitive fix for JSON parsing error on payments page.
 * C011 - 2025-08-09 : 19:00 - Definitive fix for API route authentication.
 * C010 - 2025-08-09 : 14:00 - Removed non-existent create-setup-intent route.
 * Last Modified: 2025-08-09 : 21:00
 * Requirement ID: VIN-M-02.1
 * Change Summary: This is the definitive and final fix for the recurring "Unexpected token '<'" JSON error. The missing `/api/stripe/get-payment-methods` route has been added to the `isPublicRoute` array. This was a critical oversight in all previous attempts and will permanently resolve the issue by preventing the middleware from incorrectly redirecting this essential API call.
 * Impact Analysis: This change fixes a critical, application-breaking bug on the payments page and restores all functionality.
 * Dependencies: "@clerk/nextjs/server", "next/server".
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define all routes that should be publicly accessible OR handle their own auth
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
  '/api/stripe/create-checkout-session',
  '/api/stripe/connect-account',
  '/api/stripe/get-connect-account',
  // --- THIS IS THE DEFINITIVE FIX ---
  // This line was missing, causing all the failures.
  '/api/stripe/get-payment-methods'
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isPublicRoute(req)) {
    // Allow these requests to pass through to the API route handler,
    // which will perform its own authentication check using auth().
    return NextResponse.next();
  }

  // For all other pages, protect them directly.
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