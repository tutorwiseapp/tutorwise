/*
 * Filename: src/app/api/profile/route.ts
 * Purpose: Provides secure GET and POST endpoints for user profile data.
 * Change History:
 * C006 - 2025-09-01 : 16:00 - Added GET handler to fetch profile data for the app context.
 * C005 - 2025-08-26 : 15:30 - Replaced Clerk auth and SDK with Kinde and Supabase update logic.
 * Last Modified: 2025-09-01 : 16:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This file has been updated to include a GET handler. This allows the new UserProfileContext to securely fetch the complete user profile from the database after login, making data like `agent_id` available throughout the application. The existing POST handler for updates is preserved.
 */
import { sessionManager } from '@/lib/kinde';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- THIS IS THE NEW GET HANDLER ---
export async function GET() {
  try {
    const { getUser, isAuthenticated } = sessionManager();
    if (!(await isAuthenticated())) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const user = await getUser();
    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("Supabase error fetching profile:", error);
      throw error;
    }
    
    return NextResponse.json(profile);

  } catch (error) {
    console.error("API GET /api/profile error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// --- YOUR EXISTING POST HANDLER (UNCHANGED) ---
export async function POST(req: Request) {
  try {
    const { getUser, isAuthenticated } = sessionManager();
    const authenticated = await isAuthenticated();
    const user = await getUser();
  
    if (!authenticated || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: body.display_name,
        bio: body.bio,
        categories: body.categories,
        achievements: body.achievements,
        cover_photo_url: body.cover_photo_url,
        custom_picture_url: body.custom_picture_url
      })
      .eq('id', user.id)
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