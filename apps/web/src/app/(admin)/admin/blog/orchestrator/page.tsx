/*
 * Filename: src/app/(admin)/admin/blog/orchestrator/page.tsx
 * Purpose: Blog Demand Orchestrator dashboard - Phase 3 observation layer
 * Created: 2026-01-16
 * Pattern: Follows SEO hub pattern with multi-tab navigation and KPI cards
 * Phase: 3 - Observation Layer (read-only analytics)
 */
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts';
import { AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { FileText, TrendingUp, Users, DollarSign } from 'lucide-react';
import styles from './page.module.css';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

interface ArticlePerformance {
  article_id: string;
  article_title: string;
  article_slug: string;
  category: string;
  published_at: string;
  views_count: number;
  interaction_count: number;
  wiselist_save_count: number;
  booking_count: number;
  booking_revenue: number;
  conversion_rate: number;
}

interface FunnelStage {
  stage_number: number;
  stage_name: string;
  count: number | null;
  conversion_rate: number | null;
}

interface BlogAssistedListing {
  listing_id: string;
  tutor_name: string;
  category: string;
  views_from_blog: number;
  bookings_from_blog: number;
  revenue_from_blog: number;
  same_category_avg_views: number;
  same_category_avg_bookings: number;
  visibility_multiplier: number;
}

interface TimeDistribution {
  hours_to_conversion: string;
  booking_count: number;
}

interface StatsData {
  performance: ArticlePerformance[];
  funnel: FunnelStage[];
}

interface TopArticlesData {
  articles: ArticlePerformance[];
}

interface ListingsData {
  listings: BlogAssistedListing[];
}

export default function BlogOrchestratorPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'articles' | 'funnel' | 'listings'>('overview');
  const [days, setDays] = useState(30);
  const [attributionWindow, setAttributionWindow] = useState(7);

  // Fetch overview stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery<StatsData>({
    queryKey: ['blog-orchestrator-stats', days, attributionWindow],
    queryFn: async () => {
      const res = await fetch(`/api/admin/blog/orchestrator/stats?days=${days}&attributionWindow=${attributionWindow}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  // Fetch top articles (sorted by revenue)
  const { data: articlesData, isLoading: isLoadingArticles } = useQuery<TopArticlesData>({
    queryKey: ['blog-orchestrator-articles', days, attributionWindow],
    queryFn: async () => {
      const res = await fetch(`/api/admin/blog/orchestrator/top-articles?days=${days}&attributionWindow=${attributionWindow}`);
      if (!res.ok) throw new Error('Failed to fetch articles');
      return res.json();
    },
    enabled: activeTab === 'articles',
  });

  // Fetch blog-assisted listings
  const { data: listingsData, isLoading: isLoadingListings } = useQuery<ListingsData>({
    queryKey: ['blog-orchestrator-listings', days, attributionWindow],
    queryFn: async () => {
      const res = await fetch(`/api/admin/blog/orchestrator/listings?days=${days}&attributionWindow=${attributionWindow}`);
      if (!res.ok) throw new Error('Failed to fetch listings');
      return res.json();
    },
    enabled: activeTab === 'listings',
  });

  // Calculate KPI values from stats data
  const totalArticles = statsData?.performance?.length || 0;
  const totalBookings = statsData?.performance?.reduce((sum, a) => sum + (a.booking_count || 0), 0) || 0;
  const totalRevenue = statsData?.performance?.reduce((sum, a) => sum + (a.booking_revenue || 0), 0) || 0;
  const totalViews = statsData?.performance?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0;
  const overallConversionRate = totalViews > 0 ? ((totalBookings / totalViews) * 100).toFixed(1) : '0.0';

  // Format revenue as GBP
  const formatRevenue = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Date range selector buttons
  const DateRangeSelector = () => (
    <div className={styles.dateRangeSelector}>
      <button
        className={days === 30 ? styles.activeRange : ''}
        onClick={() => setDays(30)}
      >
        30 Days
      </button>
      <button
        className={days === 60 ? styles.activeRange : ''}
        onClick={() => setDays(60)}
      >
        60 Days
      </button>
      <button
        className={days === 90 ? styles.activeRange : ''}
        onClick={() => setDays(90)}
      >
        90 Days
      </button>
    </div>
  );

  // Attribution window selector
  const AttributionWindowSelector = () => (
    <div className={styles.attributionSelector}>
      <label>Attribution Window:</label>
      <select
        value={attributionWindow}
        onChange={(e) => setAttributionWindow(Number(e.target.value))}
        className={styles.select}
      >
        <option value={7}>7 days</option>
        <option value={14}>14 days</option>
        <option value={30}>30 days</option>
      </select>
    </div>
  );

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Blog Demand Orchestrator"
          subtitle="Track how blog content drives marketplace conversions"
          className={styles.orchestratorHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'articles', label: 'Top Articles', active: activeTab === 'articles' },
            { id: 'funnel', label: 'Conversion Funnel', active: activeTab === 'funnel' },
            { id: 'listings', label: 'Listing Visibility', active: activeTab === 'listings' },
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Time Period"
            stats={[
              { label: 'Days', value: `Last ${days} days` },
              { label: 'Attribution Window', value: `${attributionWindow} days` },
            ]}
          />
          <AttributionWindowSelector />
          <DateRangeSelector />
          <AdminTipWidget
            title="Phase 3: Observation"
            tips={[
              'This dashboard shows correlation, not causation',
              'Blog-assisted = ANY blog event within attribution window',
              'Baseline comparison uses same-category average (mature only)',
              'Phase 4 will add referral amplification for top articles',
            ]}
          />
        </HubSidebar>
      }
    >
      {activeTab === 'overview' && (
        <div className={styles.overviewTab}>
          {isLoadingStats ? (
            <div className={styles.loading}>Loading stats...</div>
          ) : totalArticles === 0 ? (
            <div className={styles.placeholder}>
              <p>Start embedding content in articles to see attribution data</p>
            </div>
          ) : (
            <>
              <HubKPIGrid>
                <HubKPICard
                  label="Total Articles"
                  value={totalArticles}
                  sublabel="Published articles"
                  icon={FileText}
                />
                <HubKPICard
                  label="Blog-Assisted Bookings"
                  value={totalBookings}
                  sublabel={`Last ${days} days`}
                  icon={Users}
                />
                <HubKPICard
                  label="Revenue Generated"
                  value={formatRevenue(totalRevenue)}
                  sublabel="From blog traffic"
                  icon={DollarSign}
                />
                <HubKPICard
                  label="Conversion Rate"
                  value={`${overallConversionRate}%`}
                  sublabel="View → Booking"
                  icon={TrendingUp}
                />
              </HubKPIGrid>

              {/* Funnel preview */}
              {statsData?.funnel && statsData.funnel.length > 0 && (
                <div className={styles.funnelPreview}>
                  <h3>Conversion Funnel</h3>
                  <div className={styles.funnelStages}>
                    {statsData.funnel.map((stage) => (
                      <div key={stage.stage_number} className={styles.funnelStage}>
                        <div className={styles.stageName}>{stage.stage_name}</div>
                        <div className={styles.stageCount}>{stage.count?.toLocaleString() || '0'}</div>
                        <div className={styles.stageRate}>
                          {stage.conversion_rate ? `${stage.conversion_rate.toFixed(1)}%` : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'articles' && (
        <div className={styles.articlesTab}>
          <h2>Top Performing Articles</h2>
          {isLoadingArticles ? (
            <div className={styles.loading}>Loading articles...</div>
          ) : !articlesData?.articles || articlesData.articles.length === 0 ? (
            <div className={styles.placeholder}>
              <p>No article performance data available yet</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Category</th>
                    <th>Views</th>
                    <th>Interactions</th>
                    <th>Saves</th>
                    <th>Bookings</th>
                    <th>Revenue</th>
                    <th>Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {articlesData.articles.map((article) => (
                    <tr key={article.article_id}>
                      <td>
                        <a href={`/blog/${article.article_slug}`} target="_blank" rel="noopener noreferrer">
                          {article.article_title}
                        </a>
                      </td>
                      <td>{article.category || 'Uncategorized'}</td>
                      <td>{article.views_count.toLocaleString()}</td>
                      <td>{article.interaction_count.toLocaleString()}</td>
                      <td>{article.wiselist_save_count.toLocaleString()}</td>
                      <td>{article.booking_count.toLocaleString()}</td>
                      <td>{formatRevenue(article.booking_revenue)}</td>
                      <td>{article.conversion_rate ? `${article.conversion_rate.toFixed(1)}%` : '0.0%'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'funnel' && (
        <div className={styles.funnelTab}>
          <h2>Conversion Funnel Analysis</h2>
          {isLoadingStats ? (
            <div className={styles.loading}>Loading funnel data...</div>
          ) : !statsData?.funnel || statsData.funnel.length === 0 ? (
            <div className={styles.placeholder}>
              <p>No funnel data available yet</p>
            </div>
          ) : (
            <div className={styles.funnelVisualization}>
              {statsData.funnel.map((stage, index) => (
                <div key={stage.stage_number} className={styles.funnelStageDetailed}>
                  <div className={styles.stageHeader}>
                    <h3>{stage.stage_name}</h3>
                    <span className={styles.stageNumber}>{stage.stage_number}/4</span>
                  </div>
                  <div className={styles.stageMetrics}>
                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Count:</span>
                      <span className={styles.metricValue}>{stage.count?.toLocaleString() || '0'}</span>
                    </div>
                    {stage.conversion_rate !== null && stage.conversion_rate !== undefined && (
                      <div className={styles.metric}>
                        <span className={styles.metricLabel}>Conversion:</span>
                        <span className={styles.metricValue}>{stage.conversion_rate.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  {index < statsData.funnel.length - 1 && (
                    <div className={styles.funnelArrow}>↓</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'listings' && (
        <div className={styles.listingsTab}>
          <h2>Blog-Assisted Listing Visibility</h2>
          {isLoadingListings ? (
            <div className={styles.loading}>Loading listings...</div>
          ) : !listingsData?.listings || listingsData.listings.length === 0 ? (
            <div className={styles.placeholder}>
              <p>No blog-assisted listings data available yet</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tutor</th>
                    <th>Category</th>
                    <th>Blog Views</th>
                    <th>Blog Bookings</th>
                    <th>Blog Revenue</th>
                    <th>Category Avg Views</th>
                    <th>Category Avg Bookings</th>
                    <th>Visibility Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {listingsData.listings.map((listing) => (
                    <tr key={listing.listing_id}>
                      <td>{listing.tutor_name}</td>
                      <td>{listing.category}</td>
                      <td>{listing.views_from_blog.toLocaleString()}</td>
                      <td>{listing.bookings_from_blog.toLocaleString()}</td>
                      <td>{formatRevenue(listing.revenue_from_blog)}</td>
                      <td>{listing.same_category_avg_views?.toFixed(1) || '-'}</td>
                      <td>{listing.same_category_avg_bookings?.toFixed(1) || '-'}</td>
                      <td className={listing.visibility_multiplier > 1 ? styles.positive : styles.neutral}>
                        {listing.visibility_multiplier?.toFixed(2)}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </HubPageLayout>
  );
}
