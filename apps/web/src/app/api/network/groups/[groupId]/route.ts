/**
 * Filename: apps/web/src/app/api/network/groups/[groupId]/route.ts
 * Purpose: API endpoint for individual group operations (update, delete)
 * Created: 2025-11-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/network/groups/[groupId]
 * Update a connection group
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
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

    const { groupId } = params;

    // Parse request body
    const body = await request.json();
    const { name, description, color, icon, is_favorite } = body;

    // Build update object with only provided fields
    const updates: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Group name cannot be empty' },
          { status: 400 }
        );
      }
      if (name.trim().length > 50) {
        return NextResponse.json(
          { error: 'Group name must be 50 characters or less' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (color !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return NextResponse.json(
          { error: 'Invalid color format. Must be hex color (e.g., #006c67)' },
          { status: 400 }
        );
      }
      updates.color = color;
    }

    if (icon !== undefined) {
      updates.icon = icon;
    }

    if (is_favorite !== undefined) {
      updates.is_favorite = !!is_favorite;
    }

    // Update group (RLS will ensure user owns this group)
    const { data: group, error: updateError } = await supabase
      .from('connection_groups')
      .update(updates)
      .eq('id', groupId)
      .eq('profile_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[groups/PATCH] Update error:', updateError);

      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A group with this name already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update group' },
        { status: 500 }
      );
    }

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ group }, { status: 200 });
  } catch (error) {
    console.error('[groups/PATCH] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/network/groups/[groupId]
 * Delete a connection group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
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

    const { groupId } = params;

    // Delete group (RLS will ensure user owns this group)
    // CASCADE will automatically delete group_members
    const { error: deleteError } = await supabase
      .from('connection_groups')
      .delete()
      .eq('id', groupId)
      .eq('profile_id', user.id);

    if (deleteError) {
      console.error('[groups/DELETE] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[groups/DELETE] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
