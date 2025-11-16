/**
 * Filename: route.ts
 * Purpose: Wiselist items API endpoints (v5.7)
 * Path: POST /api/wiselists/[id]/items
 * Created: 2025-11-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/wiselists/[id]/items
 * Add an item (profile or listing) to a wiselist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id: wiselistId } = params;

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { profileId, listingId, notes } = body;

    // Validate that exactly one target is provided
    if ((!profileId && !listingId) || (profileId && listingId)) {
      return NextResponse.json(
        { error: 'Must provide either profileId or listingId, not both' },
        { status: 400 }
      );
    }

    // Check if user has permission to add items (owner or EDITOR collaborator)
    const { data: wiselist, error: wiselistError } = await supabase
      .from('wiselists')
      .select('id, profile_id')
      .eq('id', wiselistId)
      .single();

    if (wiselistError) {
      if (wiselistError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Wiselist not found' }, { status: 404 });
      }
      throw wiselistError;
    }

    const isOwner = wiselist.profile_id === user.id;

    // Check if user is a collaborator with EDITOR or OWNER role
    let hasPermission = isOwner;
    if (!isOwner) {
      const { data: collaborator } = await supabase
        .from('wiselist_collaborators')
        .select('role')
        .eq('wiselist_id', wiselistId)
        .eq('profile_id', user.id)
        .single();

      hasPermission = !!(collaborator && ['OWNER', 'EDITOR'].includes(collaborator.role));
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this wiselist' },
        { status: 403 }
      );
    }

    // Validate that the target exists
    if (profileId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', profileId)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
    }

    if (listingId) {
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id')
        .eq('id', listingId)
        .single();

      if (listingError || !listing) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
    }

    // Insert item
    const { data: item, error: insertError } = await supabase
      .from('wiselist_items')
      .insert({
        wiselist_id: wiselistId,
        profile_id: profileId || null,
        listing_id: listingId || null,
        notes: notes || null,
        added_by_profile_id: user.id,
      })
      .select(`
        *,
        profile:profiles(id, full_name, avatar_url, bio, city, slug),
        listing:listings(id, title, description, hourly_rate, slug),
        added_by:profiles!added_by_profile_id(id, full_name, avatar_url)
      `)
      .single();

    if (insertError) {
      // Check for duplicate item error
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'This item is already in the wiselist' },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Add wiselist item error:', error);
    return NextResponse.json(
      { error: 'Failed to add item to wiselist' },
      { status: 500 }
    );
  }
}
