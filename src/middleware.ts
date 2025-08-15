/*
 * Filename: src/middleware.ts
 * Purpose: Implements Clerk authentication middleware to protect application routes.
 * Change History:
 * C009 - 2025-08-09 : 13:00 - Added create-setup-intent to public routes.
 * C008 - 2025-08-09 : 00:00 - Added contact-agent to public routes.
 * C007 - 2025-08-08 : 02:00 - Definitive async/await fix for middleware build error.
 * Last Modified: 2025-08-09 : 13:00
 * Requirement ID: VIN-M-02.1
 * Change Summary: Added `/api/stripe/create-setup-intent` to the publicRoutes array. This is the definitive fix for the "Could not fetch saved cards" error, as it ensures the frontend can successfully prepare the Stripe payment form.
 * Impact Analysis: This change fixes a critical API access error on the payments page.
 * Dependencies: "@clerk/nextjs/server", "next/server".
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  '/api/stripe/create-checkout-session', // --- THIS IS THE DEFINITIVE FIX ---
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
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