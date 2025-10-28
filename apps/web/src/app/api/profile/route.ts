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

    // Build update object dynamically - only include fields that are provided
    const updateData: Record<string, any> = {};

    // Legacy fields
    if (body.full_name !== undefined) updateData.full_name = body.full_name;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.categories !== undefined) updateData.categories = body.categories;
    if (body.achievements !== undefined) updateData.achievements = body.achievements;
    if (body.cover_photo_url !== undefined) updateData.cover_photo_url = body.cover_photo_url;
    if (body.custom_picture_url !== undefined) updateData.custom_picture_url = body.custom_picture_url;

    // New fields for professional info
    if (body.professional_details !== undefined) updateData.professional_details = body.professional_details;
    if (body.dbs_certificate_number !== undefined) updateData.dbs_certificate_number = body.dbs_certificate_number;
    if (body.first_name !== undefined) updateData.first_name = body.first_name;
    if (body.last_name !== undefined) updateData.last_name = body.last_name;
    if (body.date_of_birth !== undefined) updateData.date_of_birth = body.date_of_birth;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.postcode !== undefined) updateData.postcode = body.postcode;
    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number;
    if (body.emergency_contact_name !== undefined) updateData.emergency_contact_name = body.emergency_contact_name;
    if (body.emergency_contact_phone !== undefined) updateData.emergency_contact_phone = body.emergency_contact_phone;

    // Only proceed if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
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