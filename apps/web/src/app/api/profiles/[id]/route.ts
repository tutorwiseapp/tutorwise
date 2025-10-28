import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/profiles/[id]
 * Fetch public profile information for any user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const profileId = params.id;

    // Fetch the base profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') { // "Not Found"
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      throw profileError;
    }

    // Fetch role details for all roles
    const { data: roleDetailsData, error: roleDetailsError } = await supabase
      .from('role_details')
      .select('*')
      .eq('profile_id', profileId);

    // We don't throw an error if role details are not found, as they are optional
    if (roleDetailsError && roleDetailsError.code !== 'PGRST116') {
      throw roleDetailsError;
    }

    // Convert role details array to an object keyed by role_type for easier access
    const professionalDetails: any = {};
    if (roleDetailsData && roleDetailsData.length > 0) {
      roleDetailsData.forEach((detail: any) => {
        professionalDetails[detail.role_type] = detail;
      });
    }

    // Combine the data into a single profile object
    const publicProfile = {
      // Explicitly list fields to return to avoid leaking sensitive data
      id: profileData.id,
      full_name: profileData.full_name,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      bio: profileData.bio,
      categories: profileData.categories,
      achievements: profileData.achievements,
      avatar_url: profileData.avatar_url,
      cover_photo_url: profileData.cover_photo_url,
      city: profileData.city,
      created_at: profileData.created_at,
      roles: profileData.roles || [],
      active_role: profileData.active_role,
      professional_details: professionalDetails,
      // Email, phone, address, DOB, and emergency contacts are private
    };

    return NextResponse.json(publicProfile);
  } catch (error) {
    console.error('Error fetching public profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
