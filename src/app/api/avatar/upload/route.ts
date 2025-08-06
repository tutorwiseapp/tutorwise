/*
 * Filename: src/api/avatar/upload/route.ts
 * Purpose: Provides a secure, server-side endpoint for uploading user profile pictures.
 * Change History:
 * C001 - 2025-07-26 : 18:00 - Initial creation.
 * Last Modified: 2025-07-26 : 18:00
 * Requirement ID: VIN-B-03.3
 * Change Summary: This new API route securely handles user avatar uploads. It authenticates the
 * user, uploads the file to Vercel Blob storage, and then uses the Clerk Backend SDK to update
 * the user's `imageUrl` with the new, permanent URL of the stored image.
 * Impact Analysis: This provides the necessary backend functionality for the new "Upload Photo"
 * feature on the Profile page. It is a secure, server-only operation.
 * Dependencies: "@vercel/blob", "@clerk/nextjs/server", "next/server".
 */
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request): Promise<NextResponse> {
  // FIX: Await the auth() Promise to correctly destructure userId
  const { userId } = await auth();
  if (!userId) {
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

    // After successful upload, update the user's profile picture in Clerk
    // FIX: Await clerkClient() to get the actual client object
    const client = await clerkClient();
    await client.users.updateUser(userId, {
        publicMetadata: {
          imageUrl: blob.url,
        },
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}