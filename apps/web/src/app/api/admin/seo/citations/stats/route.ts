/**
 * Filename: src/app/api/admin/seo/citations/stats/route.ts
 * Purpose: API endpoint to fetch citation-specific SEO statistics
 * Created: 2025-12-29
 * Pattern: Server-only API route for citation analytics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface CitationStatsResponse {
  // Overview metrics
  overview: {
    totalCitations: number;
    activeCitations: number;
    brokenCitations: number;
    pendingCitations: number;
    uniqueDomains: number;
    avgCitationsPerHub: number;
  };

  // Top domains
  topDomains: Array<{
    domain: string;
    citationCount: number;
    activeCount: number;
  }>;

  // Citation status trend (last 30 days)
  citationStatusTrend: Array<{
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

  // Recent citations
  recentCitations: Array<{
    id: string;
    sourceName: string;
    url: string;
    status: string;
    createdAt: string;
  }>;
}

/**
 * GET /api/admin/seo/citations/stats
 * Fetch citation-specific statistics and analytics
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

    // Fetch citations data
    const { data: citations, error: citationsError } = await supabase
      .from('seo_citations')
      .select('id, source_name, url, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (citationsError) throw citationsError;

    const citationsData = citations || [];

    // Extract domains from URLs
    const domainCounts = new Map<string, { total: number; active: number }>();
    citationsData.forEach(citation => {
      try {
        const url = new URL(citation.url);
        const domain = url.hostname.replace('www.', '');

        const existing = domainCounts.get(domain) || { total: 0, active: 0 };
        existing.total += 1;
        if (citation.status === 'active') existing.active += 1;
        domainCounts.set(domain, existing);
      } catch (_e) {
        // Invalid URL, skip
      }
    });

    // Calculate overview metrics
    const overview = {
      totalCitations: citationsData.length,
      activeCitations: citationsData.filter(c => c.status === 'active').length,
      brokenCitations: citationsData.filter(c => c.status === 'broken').length,
      pendingCitations: citationsData.filter(c => c.status === 'pending').length,
      uniqueDomains: domainCounts.size,
      avgCitationsPerHub: 0, // TODO: Calculate from hub relationships
    };

    // Get top domains by citation count
    const topDomains = Array.from(domainCounts.entries())
      .map(([domain, counts]) => ({
        domain,
        citationCount: counts.total,
        activeCount: counts.active,
      }))
      .sort((a, b) => b.citationCount - a.citationCount)
      .slice(0, 5);

    // Generate status trend (last 30 days)
    const citationStatusTrend = generateStatusTrend(30);

    // Status distribution for pie chart
    const statusDistribution = [
      {
        label: 'Active',
        value: overview.activeCitations,
        color: '#10B981'
      },
      {
        label: 'Pending',
        value: overview.pendingCitations,
        color: '#F59E0B'
      },
      {
        label: 'Broken',
        value: overview.brokenCitations,
        color: '#EF4444'
      },
    ].filter(item => item.value > 0);

    // Recent citations (last 5)
    const recentCitations = citationsData.slice(0, 5).map(c => ({
      id: c.id,
      sourceName: c.source_name,
      url: c.url,
      status: c.status,
      createdAt: c.created_at,
    }));

    const stats: CitationStatsResponse = {
      overview,
      topDomains,
      citationStatusTrend,
      statusDistribution,
      recentCitations,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching citation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch citation statistics' },
      { status: 500 }
    );
  }
}

/**
 * Generate status trend data for last N days
 */
function generateStatusTrend(days: number) {
  const trend = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Generate mock trend data
    // TODO: Replace with actual daily metrics when tracking is implemented
    const value = Math.floor(Math.random() * 40) + 10;

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
