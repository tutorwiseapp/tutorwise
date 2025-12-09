/**
 * API Route: /api/saved-profiles/[id]
 * Purpose: Handle saving/unsaving profiles for authenticated users
 * Created: 2025-12-09
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/saved-profiles/[id]
 * Check if a profile is saved by the current user
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if profile is saved
    const { data, error } = await supabase
      .from('saved_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('profile_id', params.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking saved profile:', error);
      return NextResponse.json(
        { error: 'Failed to check saved status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ isSaved: !!data });
  } catch (error) {
    console.error('Unexpected error in GET /api/saved-profiles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved-profiles/[id]
 * Save a profile for the current user
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if profile exists
    const { data: profileExists, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .maybeSingle();

    if (profileError || !profileExists) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Prevent users from saving their own profile
    if (user.id === params.id) {
      return NextResponse.json(
        { error: 'You cannot save your own profile' },
        { status: 400 }
      );
    }

    // Save the profile
    const { error: insertError } = await supabase
      .from('saved_profiles')
      .insert({
        user_id: user.id,
        profile_id: params.id,
      });

    if (insertError) {
      // Check for duplicate entry (unique constraint violation)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { message: 'Profile already saved' },
          { status: 200 }
        );
      }

      console.error('Error saving profile:', insertError);
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Profile saved successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/saved-profiles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saved-profiles/[id]
 * Unsave a profile for the current user
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the saved profile
    const { error: deleteError } = await supabase
      .from('saved_profiles')
      .delete()
      .eq('user_id', user.id)
      .eq('profile_id', params.id);

    if (deleteError) {
      console.error('Error unsaving profile:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unsave profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Profile unsaved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/saved-profiles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
