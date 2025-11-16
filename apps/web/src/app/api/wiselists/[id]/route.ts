/**
 * Filename: route.ts
 * Purpose: Individual wiselist API endpoints (v5.7)
 * Path: GET/PATCH/DELETE /api/wiselists/[id]
 * Created: 2025-11-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateSlug } from '@/lib/api/wiselists';

/**
 * GET /api/wiselists/[id]
 * Get a single wiselist with items and collaborators
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Fetch wiselist with full details
    const { data, error } = await supabase
      .from('wiselists')
      .select(`
        *,
        owner:profiles!profile_id(id, full_name, avatar_url, email),
        items:wiselist_items(
          *,
          profile:profiles(id, full_name, avatar_url, bio, city, slug),
          listing:listings(id, title, description, hourly_rate, slug),
          added_by:profiles!added_by_profile_id(id, full_name, avatar_url)
        ),
        collaborators:wiselist_collaborators(
          *,
          profile:profiles!profile_id(id, full_name, avatar_url, email),
          invited_by:profiles!invited_by_profile_id(id, full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Wiselist not found' }, { status: 404 });
      }
      throw error;
    }

    // Add computed counts
    const wiselist = {
      ...data,
      item_count: data.items?.length || 0,
      collaborator_count: data.collaborators?.length || 0,
    };

    return NextResponse.json({ wiselist });
  } catch (error) {
    console.error('Get wiselist error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wiselist' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/wiselists/[id]
 * Update a wiselist
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, visibility } = body;

    // Build updates object
    const updates: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (visibility !== undefined) {
      updates.visibility = visibility;

      // Generate slug if changing to public
      if (visibility === 'public') {
        const slugName = name || body.name;
        if (slugName) {
          const baseSlug = generateSlug(slugName);

          // Check uniqueness
          let uniqueSlug = baseSlug;
          let counter = 1;

          while (true) {
            const { data: existing } = await supabase
              .from('wiselists')
              .select('id')
              .eq('slug', uniqueSlug)
              .neq('id', id) // Exclude current list
              .single();

            if (!existing) break;
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
          }

          updates.slug = uniqueSlug;
        }
      } else {
        // Clear slug if changing to private
        updates.slug = null;
      }
    }

    // Update wiselist
    const { data: wiselist, error } = await supabase
      .from('wiselists')
      .update(updates)
      .eq('id', id)
      .eq('profile_id', user.id) // Ensure user owns the list
      .select(`
        *,
        owner:profiles!profile_id(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Wiselist not found or access denied' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ wiselist });
  } catch (error) {
    console.error('Update wiselist error:', error);
    return NextResponse.json(
      { error: 'Failed to update wiselist' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wiselists/[id]
 * Delete a wiselist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete wiselist (cascade will handle items and collaborators)
    const { error } = await supabase
      .from('wiselists')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id); // Ensure user owns the list

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete wiselist error:', error);
    return NextResponse.json(
      { error: 'Failed to delete wiselist' },
      { status: 500 }
    );
  }
}
