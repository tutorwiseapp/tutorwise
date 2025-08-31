/*
 * Filename: src/app/api/auth/[kindeAuth]/route.ts
 * Purpose: Creates the Kinde API endpoints for the Next.js App Router.
 * Change History:
 * C001 - 2025-09-01 : 11:00 - Initial creation.
 * Last Modified: 2025-09-01 : 11:00
 * Requirement ID: VIN-AUTH-MIG-06
 * Change Summary: This file is the definitive fix for the '404 Not Found' error on all Kinde API routes. It implements the required catch-all route handler that the Kinde Next.js SDK uses to create the /login, /logout, /register, and callback endpoints.
 * Impact Analysis: This is a critical, foundational file that makes the entire Kinde authentication flow functional.
 */
import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { kindeAuth: string } }
) {
  const endpoint = params.kindeAuth;
  return handleAuth(request, endpoint);
}