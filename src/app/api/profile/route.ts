/*
 * Filename: src/app/api/profile/route.ts
 * Purpose: Provides a secure endpoint for updating a user's profile data, migrated to Kinde.
 * Change History:
 * C005 - 2025-08-26 : 15:30 - Replaced Clerk auth and SDK with Kinde and Supabase update logic.
 * C004 - 2025-07-27 : 14:30 - Definitive fix for all SDK usage errors.
 * Last Modified: 2025-08-26 : 15:30
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This API route has been fully migrated from Clerk to Kinde. It now uses the `sessionManager` for authentication. Instead of calling the Clerk SDK, it now performs an `update` operation on our Supabase `profiles` table to save the user's data. This makes our database the source of truth for profile information and resolves the "Module not found" build error.
 */
import { sessionManager } from '@/lib/kinde'; // --- THIS IS THE FIX ---
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- THIS IS THE FIX: Initialize Supabase admin client to perform the update ---
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // --- THIS IS THE FIX: Use Kinde's session manager for authentication ---
    const { getUser, isAuthenticated } = sessionManager();
    const authenticated = await isAuthenticated();
    const user = await getUser();
  
    if (!authenticated || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    // --- THIS IS THE FIX: Update our own Supabase database, not Kinde's metadata ---
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: body.display_name,
        bio: body.bio,
        categories: body.categories,
        achievements: body.achievements,
        cover_photo_url: body.cover_photo_url,
        // The client will also send the new avatar URL here after uploading
        custom_picture_url: body.custom_picture_url
      })
      .eq('id', user.id) // Find the profile by the Kinde user ID
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, user: data });

  } catch (error) {
    console.error("Error updating profile:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}