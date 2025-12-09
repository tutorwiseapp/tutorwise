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

    // Log current user for debugging
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[GET /api/wiselists/[id]] User:', user?.id, 'fetching wiselist:', id);

    // First, check if wiselist exists and user has access
    const { data: basicWiselist, error: basicError } = await supabase
      .from('wiselists')
      .select('*')
      .eq('id', id)
      .single();

    if (basicError) {
      console.error('[GET /api/wiselists/[id]] Basic wiselist fetch error:', basicError);
      console.error('[GET /api/wiselists/[id]] Error code:', basicError.code);
      console.error('[GET /api/wiselists/[id]] Error details:', JSON.stringify(basicError, null, 2));
      if (basicError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Wiselist not found' }, { status: 404 });
      }
      throw basicError;
    }

    // Fetch related data separately to handle potential RLS issues
    console.log('[GET /api/wiselists/[id]] Fetching items for wiselist:', id);
    const [itemsResult, collaboratorsResult] = await Promise.all([
      supabase
        .from('wiselist_items')
        .select(`
          *,
          profile:profiles!wiselist_items_profile_id_fkey(id, full_name, avatar_url, bio, city, slug, active_role),
          listing:listings(id, title, description, hourly_rate, slug, subjects, levels, location_type, images),
          added_by:profiles!wiselist_items_added_by_profile_id_fkey(id, full_name, avatar_url)
        `)
        .eq('wiselist_id', id),
      supabase
        .from('wiselist_collaborators')
        .select(`
          *,
          profile:profiles!wiselist_collaborators_profile_id_fkey(id, full_name, avatar_url, email),
          invited_by:profiles!wiselist_collaborators_invited_by_profile_id_fkey(id, full_name, avatar_url)
        `)
        .eq('wiselist_id', id)
    ]);

    if (itemsResult.error) {
      console.error('[GET /api/wiselists/[id]] Items fetch error:', itemsResult.error);
      console.error('[GET /api/wiselists/[id]] Error details:', JSON.stringify(itemsResult.error, null, 2));
    } else {
      console.log('[GET /api/wiselists/[id]] Items fetched successfully:', itemsResult.data?.length || 0, 'items');
    }

    if (collaboratorsResult.error) {
      console.error('[GET /api/wiselists/[id]] Collaborators fetch error:', collaboratorsResult.error);
    }

    // Combine the data
    const data = {
      ...basicWiselist,
      items: itemsResult.data || [],
      collaborators: collaboratorsResult.data || [],
    };

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
