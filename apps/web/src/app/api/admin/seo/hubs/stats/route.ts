/**
 * Filename: src/app/api/admin/seo/hubs/stats/route.ts
 * Purpose: API endpoint to fetch hub-specific SEO statistics
 * Created: 2025-12-29
 * Pattern: Server-only API route for hub analytics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface HubStatsResponse {
  // Overview metrics
  overview: {
    totalHubs: number;
    publishedHubs: number;
    draftHubs: number;
    archivedHubs: number;
    totalSpokes: number;
    avgSpokesPerHub: number;
  };

  // Top performing hubs
  topHubs: Array<{
    id: string;
    title: string;
    slug: string;
    viewCount: number;
    spokeCount: number;
    status: string;
  }>;

  // Hub performance trend (last 30 days)
  hubPerformanceTrend: Array<{
    date: string;
    value: number;
    label: string;
  }>;

  // Status distribution
  statusDistribution: Array<{
    label: string;
    value: number;
    color: string;
  }>;

  // Recent hubs
  recentHubs: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    spokeCount: number;
  }>;
}

/**
 * GET /api/admin/seo/hubs/stats
 * Fetch hub-specific statistics and analytics
 */
export async function GET() {
  try {
    // Verify user is authenticated and is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch hubs data with spoke counts
    const { data: hubs, error: hubsError } = await supabase
      .from('seo_hubs')
      .select(`
        id,
        title,
        slug,
        status,
        created_at,
        updated_at,
        published_at,
        view_count,
        spoke_count:seo_spokes(count)
      `)
      .order('created_at', { ascending: false });

    if (hubsError) throw hubsError;

    const hubsData = hubs || [];

    // Calculate overview metrics
    const overview = {
      totalHubs: hubsData.length,
      publishedHubs: hubsData.filter(h => h.status === 'published').length,
      draftHubs: hubsData.filter(h => h.status === 'draft').length,
      archivedHubs: hubsData.filter(h => h.status === 'archived').length,
      totalSpokes: hubsData.reduce((sum, h) => sum + (Array.isArray(h.spoke_count) ? h.spoke_count.length : 0), 0),
      avgSpokesPerHub: hubsData.length > 0
        ? Math.round(hubsData.reduce((sum, h) => sum + (Array.isArray(h.spoke_count) ? h.spoke_count.length : 0), 0) / hubsData.length)
        : 0,
    };

    // Get top performing hubs (by view count)
    const topHubs = hubsData
      .map(h => ({
        id: h.id,
        title: h.title,
        slug: h.slug,
        viewCount: h.view_count || 0,
        spokeCount: Array.isArray(h.spoke_count) ? h.spoke_count.length : 0,
        status: h.status,
      }))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);

    // Generate performance trend (last 30 days)
    const hubPerformanceTrend = generatePerformanceTrend(30);

    // Status distribution for pie chart
    const statusDistribution = [
      {
        label: 'Published',
        value: overview.publishedHubs,
        color: '#10B981'
      },
      {
        label: 'Draft',
        value: overview.draftHubs,
        color: '#F59E0B'
      },
      {
        label: 'Archived',
        value: overview.archivedHubs,
        color: '#6B7280'
      },
    ].filter(item => item.value > 0);

    // Recent hubs (last 5)
    const recentHubs = hubsData.slice(0, 5).map(h => ({
      id: h.id,
      title: h.title,
      status: h.status,
      createdAt: h.created_at,
      spokeCount: Array.isArray(h.spoke_count) ? h.spoke_count.length : 0,
    }));

    const stats: HubStatsResponse = {
      overview,
      topHubs,
      hubPerformanceTrend,
      statusDistribution,
      recentHubs,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching hub stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hub statistics' },
      { status: 500 }
    );
  }
}

/**
 * Generate performance trend data for last N days
 */
function generatePerformanceTrend(days: number) {
  const trend = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Generate mock trend data
    // TODO: Replace with actual daily metrics when tracking is implemented
    const value = Math.floor(Math.random() * 50) + 20;

    trend.push({
      date: dateStr,
      value,
      label: formatDateLabel(date),
    });
  }

  return trend;
}

/**
 * Format date for chart labels
 */
function formatDateLabel(date: Date): string {
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const day = date.getDate();
  return `${day} ${month}`;
}
