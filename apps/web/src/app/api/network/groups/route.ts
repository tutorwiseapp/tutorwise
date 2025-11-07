/**
 * Filename: apps/web/src/app/api/network/groups/route.ts
 * Purpose: API endpoint for connection groups CRUD operations
 * Created: 2025-11-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/network/groups
 * Fetch all groups for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch groups with member count
    const { data: groups, error: groupsError } = await supabase
      .from('connection_groups')
      .select('*')
      .eq('profile_id', user.id)
      .order('is_favorite', { ascending: false })
      .order('name');

    if (groupsError) {
      console.error('[groups/GET] Fetch error:', groupsError);
      return NextResponse.json(
        { error: 'Failed to fetch groups' },
        { status: 500 }
      );
    }

    return NextResponse.json({ groups }, { status: 200 });
  } catch (error) {
    console.error('[groups/GET] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/network/groups
 * Create a new connection group
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, color, icon, is_favorite } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length > 50) {
      return NextResponse.json(
        { error: 'Group name must be 50 characters or less' },
        { status: 400 }
      );
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: 'Invalid color format. Must be hex color (e.g., #006c67)' },
        { status: 400 }
      );
    }

    // Create group
    const { data: group, error: createError } = await supabase
      .from('connection_groups')
      .insert({
        profile_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#006c67',
        icon: icon || 'folder',
        is_favorite: is_favorite || false,
      })
      .select()
      .single();

    if (createError) {
      console.error('[groups/POST] Create error:', createError);

      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A group with this name already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('[groups/POST] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
