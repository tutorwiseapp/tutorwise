/*
 * Filename: src/app/api/profile/route.ts
 * Purpose: Provides secure GET and POST endpoints for user profile data, migrated to Supabase.
 * Change History:
 * C007 - 2025-09-02 : 15:00 - Migrated to use Supabase Route Handler client for authentication.
 * Last Modified: 2025-09-02 : 15:00
 * Requirement ID: VIN-AUTH-MIG-03
 * Change Summary: This API has been fully migrated to Supabase Auth. It now uses the `createServerClient` to securely get the user's session from their cookie. This makes our backend fully aware of the new authentication system.
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  try {
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    if (!profile) {
      return new NextResponse("Profile not found", { status: 500 });
    }

    return NextResponse.json(profile);

  } catch (error) {
    console.error("API GET /api/profile error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = createClient();
  try {
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: body.full_name,
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