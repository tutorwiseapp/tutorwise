import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/profiles/[id]
 * Fetch public profile information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Fetch profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Fetch role-specific details if available
    let roleDetails = null;
    if (profile.role) {
      const { data, error: roleError } = await supabase
        .from('role_details')
        .select('*')
        .eq('profile_id', params.id)
        .eq('role', profile.role)
        .single();

      if (!roleError && data) {
        roleDetails = data;
      }
    }

    // Return public profile data (exclude sensitive fields)
    const publicProfile = {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      cover_photo_url: profile.cover_photo_url,
      bio: profile.bio,
      achievements: profile.achievements,
      categories: profile.categories,
      role: profile.role,
      created_at: profile.created_at,
      role_details: roleDetails,
    };

    return NextResponse.json(publicProfile);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
