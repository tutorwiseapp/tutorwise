/*
 * Filename: src/app/api/auth/[kindeAuth]/route.ts
 * Purpose: Provides the dynamic API route handlers for the Kinde SDK.
 * Change History:
 * C003 - 2025-08-31 : 21:00 - Removed invalid 'AuthEndpoints' type to fix TypeScript error.
 * C002 - 2025-08-31 : 20:30 - Added 'await' to the handler to resolve build error.
 * C001 - 2025-08-31 : 20:00 - Initial creation.
 * Last Modified: 2025-08-31 : 21:00
 * Requirement ID: VIN-AUTH-MIG-06
 * Change Summary: This is the definitive fix for the final build error. The non-existent 'AuthEndpoints' type has been removed and replaced with the correct 'string' type for the dynamic route parameter. This resolves the "Module has no exported member" TypeScript error and makes the route handler fully compliant.
 * Impact Analysis: This change fixes the final build-blocking error.
 */
import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { kindeAuth: string } } // --- THIS IS THE DEFINITIVE FIX ---
) {
  const endpoint = params.kindeAuth;
  return await handleAuth(request, endpoint);
}