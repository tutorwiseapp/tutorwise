/*
 * Filename: src/middleware.ts
 * Purpose: Implements Kinde authentication middleware, preserving the routing logic from the previous Clerk implementation.
 * Change History:
 * C003 - 2025-08-26 : 21:00 - Merged Kinde SDK with the complete public route list from the previous Clerk middleware.
 * C002 - 2025-08-26 : 20:00 - Corrected to use Kinde's 'publicRoutes' configuration.
 * C001 - 2025-08-26 : 09:00 - Initial creation with Kinde.
 * Last Modified: 2025-08-26 : 21:00
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This is the definitive and final version of the middleware. It correctly uses Kinde's `withAuth` function. Crucially, the `publicRoutes` array has been populated with the comprehensive list of all pages AND API routes from the previous, working Clerk middleware. This prevents the middleware from incorrectly protecting API endpoints and public pages, resolving the root cause of the redirect and blank page errors.
 */
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  return withAuth(req, {
    // --- THIS IS THE CRITICAL FIX ---
    // This list is a direct translation of the working logic from the old Clerk middleware.
    // It ensures that all public pages and internal API routes are accessible.
    publicRoutes: [
        // Public Pages
        '/',
        '/refer',
        '/contact',
        '/contact-agent',
        '/resources',
        '/terms-of-service',
        '/privacy-policy',
        '/forgot-password',
        '/login',
        '/signup',

        // All API routes are considered public at this level.
        // They handle their own authentication internally using the sessionManager.
        '/api/agents/:path*',
        '/api/links',
        '/api/stripe/:path*', // Catches all Stripe routes
        '/api/profile',
        '/api/avatar/upload',
        '/api/referrals',
        '/api/activity',
    ],
  });
}

export const config = {
  // This robust matcher is preserved from the previous Clerk implementation.
  // It ensures the middleware runs on all relevant paths.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};