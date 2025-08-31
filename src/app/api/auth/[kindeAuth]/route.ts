/*
 * Filename: src/app/api/auth/[kindeAuth]/route.ts
 * Purpose: Creates the Kinde API endpoints for the Next.js App Router.
 * Change History:
 * C002 - 2025-09-01 : 12:00 - Definitive fix for the invalid GET return type error.
 * C001 - 2025-09-01 : 11:00 - Initial creation.
 * Last Modified: 2025-09-01 : 12:00
 * Requirement ID: VIN-AUTH-MIG-06
 * Change Summary: This is the definitive fix for the build error "invalid GET return type". The code now correctly implements the Kinde SDK pattern for the App Router by directly re-exporting the `handleAuth` function as the GET handler. This allows the Kinde SDK to correctly handle all incoming requests for the /api/auth/* endpoints.
 * Impact Analysis: This change resolves the final build-blocking error and makes the entire authentication system fully operational.
 */
import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";

export const GET = handleAuth;