/**
 * Filename: trendingAnalytics.ts
 * Purpose: Analytics for trending subjects and marketplace insights
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Trending Subjects & Insights
 *
 * Features:
 * - Time-based trending calculations
 * - Subject demand analysis
 * - Price trend analysis
 * - Location popularity tracking
 * - Growth rate calculations
 */

export interface TrendingSubject {
  subject: string;
  count: number;
  growth: number; // Percentage growth from previous period
  avgPrice: number;
  popularLevels: string[];
  label: 'hot' | 'rising' | 'steady';
}

export interface PriceTrend {
  subject: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceChange: number; // Percentage change from previous period
}

export interface LocationInsight {
  city: string;
  count: number;
  topSubjects: string[];
  avgPrice: number;
}

export interface MarketplaceInsights {
  trendingSubjects: TrendingSubject[];
  priceTrends: PriceTrend[];
  topLocations: LocationInsight[];
  totalListings: number;
  totalProfiles: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Time periods for trend analysis
 */
export type TrendPeriod = '7d' | '30d' | '90d';

/**
 * Calculate trending subjects based on listing and search activity
 */
export async function calculateTrendingSubjects(
  supabase: any,
  period: TrendPeriod = '30d'
): Promise<TrendingSubject[]> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get current period listings by subject
  const { data: currentListings } = await supabase
    .from('listings')
    .select('subjects, levels, hourly_rate, created_at')
    .eq('status', 'published')
    .gte('created_at', startDate.toISOString());

  // Get previous period for growth calculation
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - days);

  const { data: previousListings } = await supabase
    .from('listings')
    .select('subjects, created_at')
    .eq('status', 'published')
    .gte('created_at', prevStartDate.toISOString())
    .lt('created_at', startDate.toISOString());

  // Aggregate by subject
  const subjectMap = new Map<string, {
    count: number;
    prevCount: number;
    prices: number[];
    levels: string[];
  }>();

  // Process current period
  currentListings?.forEach((listing: any) => {
    const subjects = listing.subjects || [];
    const levels = listing.levels || [];
    const price = listing.hourly_rate || 0;

    subjects.forEach((subject: string) => {
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { count: 0, prevCount: 0, prices: [], levels: [] });
      }
      const data = subjectMap.get(subject)!;
      data.count++;
      if (price > 0) data.prices.push(price);
      levels.forEach((level: string) => {
        if (!data.levels.includes(level)) {
          data.levels.push(level);
        }
      });
    });
  });

  // Process previous period
  previousListings?.forEach((listing: any) => {
    const subjects = listing.subjects || [];
    subjects.forEach((subject: string) => {
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { count: 0, prevCount: 0, prices: [], levels: [] });
      }
      subjectMap.get(subject)!.prevCount++;
    });
  });

  // Calculate trending scores
  const trending: TrendingSubject[] = Array.from(subjectMap.entries())
    .map(([subject, data]) => {
      const growth = data.prevCount > 0
        ? ((data.count - data.prevCount) / data.prevCount) * 100
        : data.count > 0 ? 100 : 0;

      const avgPrice = data.prices.length > 0
        ? data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length
        : 0;

      // Determine label based on growth and count
      let label: 'hot' | 'rising' | 'steady';
      if (growth > 50 && data.count >= 5) label = 'hot';
      else if (growth > 20) label = 'rising';
      else label = 'steady';

      // Get top 3 most common levels
      const levelCounts = data.levels.reduce((acc, level) => {
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const popularLevels = Object.entries(levelCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([level]) => level);

      return {
        subject,
        count: data.count,
        growth,
        avgPrice,
        popularLevels,
        label,
      };
    })
    .filter(item => item.count >= 3) // Minimum threshold
    .sort((a, b) => {
      // Sort by growth, then by count
      if (Math.abs(a.growth - b.growth) > 10) {
        return b.growth - a.growth;
      }
      return b.count - a.count;
    })
    .slice(0, 10); // Top 10

  return trending;
}

/**
 * Calculate price trends by subject
 */
export async function calculatePriceTrends(
  supabase: any,
  period: TrendPeriod = '30d'
): Promise<PriceTrend[]> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const midDate = new Date(startDate);
  midDate.setDate(midDate.getDate() + Math.floor(days / 2));

  // Get recent listings
  const { data: recentListings } = await supabase
    .from('listings')
    .select('subjects, hourly_rate, created_at')
    .eq('status', 'published')
    .gte('created_at', midDate.toISOString())
    .not('hourly_rate', 'is', null);

  // Get older listings
  const { data: olderListings } = await supabase
    .from('listings')
    .select('subjects, hourly_rate, created_at')
    .eq('status', 'published')
    .gte('created_at', startDate.toISOString())
    .lt('created_at', midDate.toISOString())
    .not('hourly_rate', 'is', null);

  const priceMap = new Map<string, {
    recentPrices: number[];
    olderPrices: number[];
  }>();

  // Process recent listings
  recentListings?.forEach((listing: any) => {
    const subjects = listing.subjects || [];
    const price = listing.hourly_rate;

    subjects.forEach((subject: string) => {
      if (!priceMap.has(subject)) {
        priceMap.set(subject, { recentPrices: [], olderPrices: [] });
      }
      priceMap.get(subject)!.recentPrices.push(price);
    });
  });

  // Process older listings
  olderListings?.forEach((listing: any) => {
    const subjects = listing.subjects || [];
    const price = listing.hourly_rate;

    subjects.forEach((subject: string) => {
      if (!priceMap.has(subject)) {
        priceMap.set(subject, { recentPrices: [], olderPrices: [] });
      }
      priceMap.get(subject)!.olderPrices.push(price);
    });
  });

  const trends: PriceTrend[] = Array.from(priceMap.entries())
    .map(([subject, data]) => {
      const allPrices = [...data.recentPrices, ...data.olderPrices];

      const avgRecent = data.recentPrices.length > 0
        ? data.recentPrices.reduce((sum, p) => sum + p, 0) / data.recentPrices.length
        : 0;

      const avgOlder = data.olderPrices.length > 0
        ? data.olderPrices.reduce((sum, p) => sum + p, 0) / data.olderPrices.length
        : avgRecent;

      const priceChange = avgOlder > 0
        ? ((avgRecent - avgOlder) / avgOlder) * 100
        : 0;

      return {
        subject,
        avgPrice: avgRecent,
        minPrice: Math.min(...allPrices),
        maxPrice: Math.max(...allPrices),
        priceChange,
      };
    })
    .filter(item => item.avgPrice > 0)
    .sort((a, b) => b.avgPrice - a.avgPrice)
    .slice(0, 10);

  return trends;
}

/**
 * Get location insights
 */
export async function getLocationInsights(
  supabase: any,
  period: TrendPeriod = '30d'
): Promise<LocationInsight[]> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: listings } = await supabase
    .from('listings')
    .select('location_city, subjects, hourly_rate, created_at')
    .eq('status', 'published')
    .gte('created_at', startDate.toISOString())
    .not('location_city', 'is', null);

  const locationMap = new Map<string, {
    count: number;
    subjects: Map<string, number>;
    prices: number[];
  }>();

  listings?.forEach((listing: any) => {
    const city = listing.location_city;
    const subjects = listing.subjects || [];
    const price = listing.hourly_rate;

    if (!locationMap.has(city)) {
      locationMap.set(city, { count: 0, subjects: new Map(), prices: [] });
    }

    const data = locationMap.get(city)!;
    data.count++;

    subjects.forEach((subject: string) => {
      data.subjects.set(subject, (data.subjects.get(subject) || 0) + 1);
    });

    if (price) data.prices.push(price);
  });

  const insights: LocationInsight[] = Array.from(locationMap.entries())
    .map(([city, data]) => {
      const topSubjects = Array.from(data.subjects.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([subject]) => subject);

      const avgPrice = data.prices.length > 0
        ? data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length
        : 0;

      return {
        city,
        count: data.count,
        topSubjects,
        avgPrice,
      };
    })
    .filter(item => item.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return insights;
}

/**
 * Get comprehensive marketplace insights
 */
export async function getMarketplaceInsights(
  supabase: any,
  period: TrendPeriod = '30d'
): Promise<MarketplaceInsights> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const endDate = new Date();

  // Fetch all data in parallel
  const [
    trendingSubjects,
    priceTrends,
    topLocations,
    listingsCount,
    profilesCount,
  ] = await Promise.all([
    calculateTrendingSubjects(supabase, period),
    calculatePriceTrends(supabase, period),
    getLocationInsights(supabase, period),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('created_at', startDate.toISOString()),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString()),
  ]);

  return {
    trendingSubjects,
    priceTrends,
    topLocations,
    totalListings: listingsCount.count || 0,
    totalProfiles: profilesCount.count || 0,
    periodStart: startDate.toISOString(),
    periodEnd: endDate.toISOString(),
  };
}
