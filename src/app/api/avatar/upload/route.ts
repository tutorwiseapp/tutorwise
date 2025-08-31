/*
 * Filename: src/api/avatar/upload/route.ts
 * Purpose: Provides a secure endpoint for uploading user profile pictures, migrated to Kinde.
 * Change History:
 * C002 - 2025-08-26 : 15:30 - Replaced Clerk auth with Kinde's sessionManager.
 * C001 - 2025-07-26 : 18:00 - Initial creation.
 * Last Modified: 2025-08-26 : 15:30
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This API route has been migrated from Clerk to Kinde. It now uses the `sessionManager` to get the authenticated user's session. The logic to update user metadata has been removed, as this will be handled by our main profile update API. This resolves the "Module not found" build error.
 */
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/kinde'; // --- THIS IS THE FIX ---

export async function POST(request: Request): Promise<NextResponse> {
  // --- THIS IS THE FIX: Use Kinde's session manager for authentication ---
  const { getUser, isAuthenticated } = sessionManager();
  const authenticated = await isAuthenticated();
  const user = await getUser();
  
  if (!authenticated || !user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return new NextResponse('Bad request: Missing filename or body', { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    // NOTE: With Kinde, we will not update the user record directly from this endpoint.
    // Instead, the client will take the returned blob.url and include it
    // in the main profile update request to `/api/profile`.
    
    return NextResponse.json(blob);
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}