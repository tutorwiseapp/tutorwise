/**
 * Filename: route.ts
 * Purpose: Execute saved searches and check for new matches
 * Created: 2025-12-10
 * Phase: Marketplace Phase 3 - Advanced User Interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getSavedSearches,
  executeSavedSearch,
  checkForNewMatches,
} from '@/lib/services/savedSearches';

export const dynamic = 'force-dynamic';

/**
 * GET - Execute a saved search or check for new matches
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

    const searchParams = request.nextUrl.searchParams;
    const searchId = searchParams.get('id');
    const checkNew = searchParams.get('checkNew') === 'true';

    if (!searchId) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      );
    }

    // Get the saved search
    const savedSearches = await getSavedSearches(supabase, user.id);
    const search = savedSearches.find(s => s.id === searchId);

    if (!search) {
      return NextResponse.json(
        { error: 'Saved search not found' },
        { status: 404 }
      );
    }

    if (checkNew) {
      // Check for new matches since last check
      const { newMatches, count } = await checkForNewMatches(supabase, search);

      return NextResponse.json({
        success: true,
        newMatches,
        count,
        lastChecked: search.last_checked,
      });
    } else {
      // Execute the full search
      const results = await executeSavedSearch(supabase, search);

      return NextResponse.json({
        success: true,
        results,
        count: results.length,
      });
    }

  } catch (error) {
    console.error('Execute saved search error:', error);
    return NextResponse.json(
      { error: 'Failed to execute saved search' },
      { status: 500 }
    );
  }
}
