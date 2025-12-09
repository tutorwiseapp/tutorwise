/**
 * Filename: route.ts
 * Purpose: API endpoints for saving/unsaving listings
 * Created: 2025-12-09
 *
 * Endpoints:
 * - POST /api/saved-listings/[id] - Save a listing
 * - DELETE /api/saved-listings/[id] - Unsave a listing
 * - GET /api/saved-listings/[id] - Check if listing is saved
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Check if listing is saved by current user
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', params.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking saved listing:', error);
      return NextResponse.json({ error: 'Failed to check saved status' }, { status: 500 });
    }

    return NextResponse.json({ isSaved: !!data });
  } catch (error) {
    console.error('Error in GET /api/saved-listings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save a listing
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if listing exists
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', params.id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Save the listing
    const { error: insertError } = await supabase
      .from('saved_listings')
      .insert({
        user_id: user.id,
        listing_id: params.id,
      });

    if (insertError) {
      // Check if already saved (unique constraint violation)
      if (insertError.code === '23505') {
        return NextResponse.json({ message: 'Listing already saved' }, { status: 200 });
      }
      console.error('Error saving listing:', insertError);
      return NextResponse.json({ error: 'Failed to save listing' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Listing saved successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/saved-listings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Unsave a listing
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', params.id);

    if (deleteError) {
      console.error('Error unsaving listing:', deleteError);
      return NextResponse.json({ error: 'Failed to unsave listing' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Listing unsaved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/saved-listings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
