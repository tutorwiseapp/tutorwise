/*
 * Filename: src/lib/kinde.ts
 * Purpose: Initializes and exports the Kinde session manager for server-side use.
 * Change History:
 * C001 - 2025-08-26 : 09:00 - Initial creation.
 * Last Modified: 2025-08-26 : 09:00
 * Requirement ID: VIN-AUTH-MIG-01
 * Change Summary: This file was created to resolve a "Module not found" error. It provides a
 * centralized export for the Kinde session manager, as required by the Kinde Next.js SDK
 * for use in API routes and other server-side logic.
 * Impact Analysis: This is a foundational file for the Kinde migration, enabling all
 * secure backend operations.
 */
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

// This is a simple wrapper to match the naming convention used in the plan.
// You can use getKindeServerSession directly if you prefer.
export const sessionManager = getKindeServerSession;