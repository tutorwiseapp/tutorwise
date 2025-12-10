/**
 * Filename: route.ts
 * Purpose: Marketplace insights and trending subjects API
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Trending Subjects & Insights
 *
 * Features:
 * - Trending subjects with growth metrics
 * - Price trend analysis
 * - Location insights
 * - Time-based period selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getMarketplaceInsights,
  calculateTrendingSubjects,
  calculatePriceTrends,
  getLocationInsights,
  type TrendPeriod,
} from '@/lib/services/trendingAnalytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse parameters
    const period = (searchParams.get('period') || '30d') as TrendPeriod;
    const type = searchParams.get('type') || 'all'; // all, subjects, prices, locations

    // Validate period
    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Use 7d, 30d, or 90d' },
        { status: 400 }
      );
    }

    let data;

    switch (type) {
      case 'subjects':
        data = {
          trendingSubjects: await calculateTrendingSubjects(supabase, period),
        };
        break;

      case 'prices':
        data = {
          priceTrends: await calculatePriceTrends(supabase, period),
        };
        break;

      case 'locations':
        data = {
          topLocations: await getLocationInsights(supabase, period),
        };
        break;

      case 'all':
      default:
        data = await getMarketplaceInsights(supabase, period);
        break;
    }

    return NextResponse.json({
      success: true,
      period,
      data,
    });

  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
