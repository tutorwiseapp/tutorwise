/**
 * Filename: src/app/api/admin/seo/spokes/stats/route.ts
 * Purpose: API endpoint to fetch spoke-specific SEO statistics
 * Created: 2025-12-29
 * Pattern: Server-only API route for spoke analytics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface SpokeStatsResponse {
  // Overview metrics
  overview: {
    totalSpokes: number;
    publishedSpokes: number;
    draftSpokes: number;
    archivedSpokes: number;
    totalHubs: number;
    avgSpokesPerHub: number;
  };

  // Top performing spokes
  topSpokes: Array<{
    id: string;
    title: string;
    slug: string;
    viewCount: number;
    hubTitle: string;
    status: string;
  }>;

  // Spoke performance trend (last 30 days)
  spokePerformanceTrend: Array<{
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

  // Recent spokes
  recentSpokes: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    hubTitle: string;
  }>;
}

/**
 * GET /api/admin/seo/spokes/stats
 * Fetch spoke-specific statistics and analytics
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

    // Fetch spokes data with hub information
    const { data: spokes, error: spokesError } = await supabase
      .from('seo_spokes')
      .select(`
        id,
        title,
        slug,
        status,
        created_at,
        updated_at,
        published_at,
        view_count,
        hub_id,
        hub:seo_hubs(title)
      `)
      .order('created_at', { ascending: false });

    if (spokesError) throw spokesError;

    const spokesData = spokes || [];

    // Get unique hub count
    const uniqueHubIds = new Set(spokesData.map(s => s.hub_id).filter(Boolean));
    const totalHubs = uniqueHubIds.size;

    // Calculate overview metrics
    const overview = {
      totalSpokes: spokesData.length,
      publishedSpokes: spokesData.filter(s => s.status === 'published').length,
      draftSpokes: spokesData.filter(s => s.status === 'draft').length,
      archivedSpokes: spokesData.filter(s => s.status === 'archived').length,
      totalHubs,
      avgSpokesPerHub: totalHubs > 0 ? Math.round(spokesData.length / totalHubs) : 0,
    };

    // Get top performing spokes (by view count)
    const topSpokes = spokesData
      .map(s => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        viewCount: s.view_count || 0,
        hubTitle: Array.isArray(s.hub) ? s.hub[0]?.title || 'No Hub' : s.hub?.title || 'No Hub',
        status: s.status,
      }))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);

    // Generate performance trend (last 30 days)
    const spokePerformanceTrend = generatePerformanceTrend(30);

    // Status distribution for pie chart
    const statusDistribution = [
      {
        label: 'Published',
        value: overview.publishedSpokes,
        color: '#10B981'
      },
      {
        label: 'Draft',
        value: overview.draftSpokes,
        color: '#F59E0B'
      },
      {
        label: 'Archived',
        value: overview.archivedSpokes,
        color: '#6B7280'
      },
    ].filter(item => item.value > 0);

    // Recent spokes (last 5)
    const recentSpokes = spokesData.slice(0, 5).map(s => ({
      id: s.id,
      title: s.title,
      status: s.status,
      createdAt: s.created_at,
      hubTitle: Array.isArray(s.hub) ? s.hub[0]?.title || 'No Hub' : s.hub?.title || 'No Hub',
    }));

    const stats: SpokeStatsResponse = {
      overview,
      topSpokes,
      spokePerformanceTrend,
      statusDistribution,
      recentSpokes,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching spoke stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spoke statistics' },
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
    const value = Math.floor(Math.random() * 80) + 30;

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
