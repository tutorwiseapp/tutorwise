/**
 * Marketplace Search API Route
 * Handles searching and filtering of tutor listings
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchListings } from '@/lib/api/listings';
import type { ListingSearchParams } from '@tutorwise/shared-types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const filters: ListingSearchParams = {
      filters: {},
      limit: parseInt(searchParams.get('limit') || '20', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    // Subjects filter
    const subjects = searchParams.get('subjects');
    if (subjects) {
      filters.filters!.subjects = subjects.split(',').map(s => s.trim());
    }

    // Levels filter
    const levels = searchParams.get('levels');
    if (levels) {
      filters.filters!.levels = levels.split(',').map(l => l.trim());
    }

    // Location type filter
    const locationType = searchParams.get('location_type');
    if (locationType && ['online', 'in_person', 'hybrid'].includes(locationType)) {
      filters.filters!.location_type = locationType as 'online' | 'in_person' | 'hybrid';
    }

    // Location city filter
    const locationCity = searchParams.get('location_city');
    if (locationCity) {
      filters.filters!.location_city = locationCity;
    }

    // Price range filters
    const minPrice = searchParams.get('min_price');
    if (minPrice) {
      filters.filters!.min_price = parseFloat(minPrice);
    }

    const maxPrice = searchParams.get('max_price');
    if (maxPrice) {
      filters.filters!.max_price = parseFloat(maxPrice);
    }

    // Free trial filter
    const freeTrialOnly = searchParams.get('free_trial_only');
    if (freeTrialOnly === 'true') {
      filters.filters!.free_trial_only = true;
    }

    // Search text
    const search = searchParams.get('search');
    if (search) {
      filters.filters!.search = search;
    }

    // Sorting
    const sortField = searchParams.get('sort_field');
    const sortOrder = searchParams.get('sort_order');
    if (sortField) {
      filters.sort = {
        field: sortField as any,
        order: (sortOrder as 'asc' | 'desc') || 'desc',
      };
    }

    // Execute search
    const result = await searchListings(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Marketplace search error:', error);
    return NextResponse.json(
      { error: 'Failed to search listings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters, sort, limit, offset } = body;

    const searchParams: ListingSearchParams = {
      filters: filters || {},
      sort,
      limit: limit || 20,
      offset: offset || 0,
    };

    const result = await searchListings(searchParams);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Marketplace search error:', error);
    return NextResponse.json(
      { error: 'Failed to search listings' },
      { status: 500 }
    );
  }
}
