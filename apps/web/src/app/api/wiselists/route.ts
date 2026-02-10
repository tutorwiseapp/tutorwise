/**
 * Filename: route.ts
 * Purpose: Wiselists API endpoints (v5.7)
 * Path: GET/POST /api/wiselists
 * Created: 2025-11-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateSlug } from '@/lib/api/wiselists';

/**
 * GET /api/wiselists
 * Get all wiselists for the current user (owned + collaborated)
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get owned lists with counts
    const { data: ownedLists, error: ownedError } = await supabase
      .from('wiselists')
      .select(`
        *,
        owner:profiles!profile_id(id, full_name, avatar_url),
        items:wiselist_items(count),
        collaborators:wiselist_collaborators(count)
      `)
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (ownedError) throw ownedError;

    // Get collaborated lists with counts
    const { data: collaboratedData, error: collabError } = await supabase
      .from('wiselist_collaborators')
      .select(`
        wiselist_id,
        wiselists:wiselist_id (
          *,
          owner:profiles!profile_id(id, full_name, avatar_url),
          items:wiselist_items(count),
          collaborators:wiselist_collaborators(count)
        )
      `)
      .eq('profile_id', user.id);

    if (collabError) throw collabError;

    // Extract and flatten collaborated lists
    const collaboratedLists = (collaboratedData || [])
      .map((c: any) => c.wiselists)
      .filter(Boolean);

    // Combine lists and add computed fields
    const allLists = [...(ownedLists || []), ...collaboratedLists].map((list: any) => ({
      ...list,
      item_count: list.items?.[0]?.count || 0,
      collaborator_count: list.collaborators?.[0]?.count || 0,
      items: undefined, // Remove nested count objects
      collaborators: undefined,
    }));

    return NextResponse.json({ wiselists: allLists });
  } catch (error) {
    console.error('Get wiselists error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wiselists' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wiselists
 * Create a new wiselist
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, visibility } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Generate slug if public
    let slug = null;
    if (visibility === 'public') {
      const baseSlug = generateSlug(name);

      // Check if slug is unique, append number if needed
      let uniqueSlug = baseSlug;
      let counter = 1;

      while (true) {
        const { data: existing } = await supabase
          .from('wiselists')
          .select('id')
          .eq('slug', uniqueSlug)
          .single();

        if (!existing) break;
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      slug = uniqueSlug;
    }

    // Create wiselist
    const { data: wiselist, error } = await supabase
      .from('wiselists')
      .insert({
        profile_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        visibility: visibility || 'private',
        slug,
      })
      .select(`
        *,
        owner:profiles!profile_id(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A list with this name already exists' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      wiselist: {
        ...wiselist,
        item_count: 0,
        collaborator_count: 0,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create wiselist error:', error);
    return NextResponse.json(
      { error: 'Failed to create wiselist' },
      { status: 500 }
    );
  }
}
