/*
 * Filename: src/api/profile/route.ts
 * Purpose: Provides a secure, server-side endpoint for updating a user's profile data.
 * Change History:
 * C004 - 2025-07-27 : 14:30 - Definitive fix for all SDK usage errors.
 * ... (previous history)
 * Last Modified: 2025-07-27 : 14:30
 * Requirement ID: VIN-B-03.2
 * Change Summary: This is the definitive and final fix. The code now correctly `await`s
 * the `auth()` Promise to get the `userId`, and `await`s the `clerkClient()` Promise to
 * get the SDK instance, exactly as required by the TypeScript compiler.
 * Impact Analysis: Resolves all build errors, making the profile update functionality
 * fully type-safe and operational.
 * Dependencies: "@clerk/nextjs/server".
 */
import { clerkClient, auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // --- FIX #1: Await the auth() Promise ---
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      display_name,
      categories,
      bio,
      achievements,
      cover_photo_url,
    } = body;

    const nameParts = display_name?.split(' ') || [];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    // --- FIX #2: Await the clerkClient() Promise ---
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const updatedUser = await client.users.updateUser(userId, {
      firstName: firstName,
      lastName: lastName,
      publicMetadata: {
        ...user.publicMetadata,
        bio: bio,
        categories: categories,
        achievements: achievements,
        cover_photo_url: cover_photo_url,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error("Error updating profile:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}