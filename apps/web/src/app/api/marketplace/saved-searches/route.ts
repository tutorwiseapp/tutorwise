/**
 * Filename: route.ts
 * Purpose: Saved searches management API
 * Created: 2025-12-10
 * Phase: Marketplace Phase 3 - Advanced User Interactions
 *
 * Features:
 * - CRUD operations for saved searches
 * - Execute saved searches
 * - Check for new matches
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  executeSavedSearch,
  checkForNewMatches,
  type SearchFilters,
} from '@/lib/services/savedSearches';

export const dynamic = 'force-dynamic';

/**
 * GET - Fetch all saved searches for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const savedSearches = await getSavedSearches(supabase, user.id);

    return NextResponse.json({
      success: true,
      savedSearches,
    });

  } catch (error) {
    console.error('Saved searches GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved searches' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new saved search
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, searchQuery, filters, notifyEnabled } = body;

    if (!name || !searchQuery) {
      return NextResponse.json(
        { error: 'Name and search query are required' },
        { status: 400 }
      );
    }

    const savedSearch = await createSavedSearch(
      supabase,
      user.id,
      name,
      searchQuery,
      filters || {},
      notifyEnabled || false
    );

    return NextResponse.json({
      success: true,
      savedSearch,
    });

  } catch (error) {
    console.error('Saved searches POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create saved search' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a saved search
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      );
    }

    const savedSearch = await updateSavedSearch(supabase, id, updates);

    return NextResponse.json({
      success: true,
      savedSearch,
    });

  } catch (error) {
    console.error('Saved searches PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update saved search' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a saved search
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      );
    }

    await deleteSavedSearch(supabase, id);

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Saved searches DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved search' },
      { status: 500 }
    );
  }
}
