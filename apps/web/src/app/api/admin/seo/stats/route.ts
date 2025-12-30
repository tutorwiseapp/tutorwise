/**
 * Filename: src/app/api/admin/seo/stats/route.ts
 * Purpose: API endpoint to fetch SEO statistics and activity
 * Created: 2025-12-29
 * Pattern: Server-only API route with real-time SEO analytics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface SeoStatsResponse {
  // Overview metrics
  overview: {
    totalHubs: number;
    publishedHubs: number;
    totalSpokes: number;
    publishedSpokes: number;
    totalCitations: number;
    activeCitations: number;
  };

  // Trend data for charts (last 30 days)
  hubViewsTrend: Array<{
    date: string;
    value: number;
    label: string;
  }>;

  // Status breakdown for pie charts
  contentStatusBreakdown: Array<{
    label: string;
    value: number;
    color: string;
  }>;

  // Recent activity
  recentActivity: Array<{
    id: string;
    type: 'hub' | 'spoke' | 'citation';
    action: 'published' | 'updated' | 'created' | 'activated';
    title: string;
    timestamp: string;
    author?: string;
  }>;

  // Performance metrics
  performance: {
    avgHubViews: number;
    avgSpokeViews: number;
    totalInternalLinks: number;
    brokenCitations: number;
  };
}

/**
 * GET /api/admin/seo/stats
 * Fetch SEO statistics, trends, and activity
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

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all SEO data in parallel
    const [hubsData, spokesData, citationsData] = await Promise.all([
      // Fetch hubs data
      supabase
        .from('seo_hubs')
        .select('id, title, status, created_at, updated_at, published_at, view_count, created_by, published_by, last_edited_by, last_edited_at'),

      // Fetch spokes data
      supabase
        .from('seo_spokes')
        .select('id, title, status, created_at, updated_at, published_at, view_count, created_by, published_by, last_edited_by, last_edited_at'),

      // Fetch citations data
      supabase
        .from('seo_citations')
        .select('id, source_name, url, status, created_at, updated_at'),
    ]);

    if (hubsData.error) throw hubsData.error;
    if (spokesData.error) throw spokesData.error;
    if (citationsData.error) throw citationsData.error;

    const hubs = hubsData.data || [];
    const spokes = spokesData.data || [];
    const citations = citationsData.data || [];

    // Calculate overview metrics
    const overview = {
      totalHubs: hubs.length,
      publishedHubs: hubs.filter(h => h.status === 'published').length,
      totalSpokes: spokes.length,
      publishedSpokes: spokes.filter(s => s.status === 'published').length,
      totalCitations: citations.length,
      activeCitations: citations.filter(c => c.status === 'active').length,
    };

    // Generate hub views trend (last 30 days)
    // Group by date and sum view counts
    const hubViewsTrend = generateViewsTrend(hubs, 30);

    // Content status breakdown for pie chart
    const contentStatusBreakdown = [
      {
        label: 'Published Hubs',
        value: overview.publishedHubs,
        color: '#10B981'
      },
      {
        label: 'Draft Hubs',
        value: overview.totalHubs - overview.publishedHubs,
        color: '#F59E0B'
      },
      {
        label: 'Published Spokes',
        value: overview.publishedSpokes,
        color: '#3B82F6'
      },
      {
        label: 'Draft Spokes',
        value: overview.totalSpokes - overview.publishedSpokes,
        color: '#EF4444'
      },
    ];

    // Recent activity (last 10 items)
    const recentActivity = generateRecentActivity(hubs, spokes, citations);

    // Performance metrics
    const totalHubViews = hubs.reduce((sum, h) => sum + (h.view_count || 0), 0);
    const totalSpokeViews = spokes.reduce((sum, s) => sum + (s.view_count || 0), 0);

    const performance = {
      avgHubViews: overview.publishedHubs > 0 ? Math.round(totalHubViews / overview.publishedHubs) : 0,
      avgSpokeViews: overview.publishedSpokes > 0 ? Math.round(totalSpokeViews / overview.publishedSpokes) : 0,
      totalInternalLinks: hubs.length * 10, // TODO: Calculate actual internal links
      brokenCitations: citations.filter(c => c.status === 'broken').length,
    };

    const stats: SeoStatsResponse = {
      overview,
      hubViewsTrend,
      contentStatusBreakdown,
      recentActivity,
      performance,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching SEO stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEO statistics' },
      { status: 500 }
    );
  }
}

/**
 * Generate views trend data for last N days
 */
function generateViewsTrend(hubs: any[], days: number) {
  const trend = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // For now, generate mock trend data
    // TODO: Replace with actual daily view counts when tracking is implemented
    const value = Math.floor(Math.random() * 100) + 50;

    trend.push({
      date: dateStr,
      value,
      label: formatDateLabel(date),
    });
  }

  return trend;
}

/**
 * Generate recent activity feed
 */
function generateRecentActivity(hubs: any[], spokes: any[], citations: any[]) {
  const activities: any[] = [];

  // Add recently published hubs
  hubs
    .filter(h => h.published_at)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, 5)
    .forEach(hub => {
      activities.push({
        id: hub.id,
        type: 'hub',
        action: 'published',
        title: hub.title,
        timestamp: hub.published_at,
        author: hub.published_by,
      });
    });

  // Add recently published spokes
  spokes
    .filter(s => s.published_at)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, 5)
    .forEach(spoke => {
      activities.push({
        id: spoke.id,
        type: 'spoke',
        action: 'published',
        title: spoke.title,
        timestamp: spoke.published_at,
        author: spoke.published_by,
      });
    });

  // Add recently activated citations
  citations
    .filter(c => c.status === 'active')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3)
    .forEach(citation => {
      activities.push({
        id: citation.id,
        type: 'citation',
        action: 'activated',
        title: citation.source_name,
        timestamp: citation.updated_at,
      });
    });

  // Sort all activities by timestamp and take the 10 most recent
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}

/**
 * Format date for chart labels
 */
function formatDateLabel(date: Date): string {
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const day = date.getDate();
  return `${day} ${month}`;
}
