/**
 * Filename: src/app/(admin)/admin/signal/page.tsx
 * Purpose: Revenue Signal Analytics dashboard - Phase 3 observation layer
 * Created: 2026-01-16
 * Updated: 2026-01-18 - Migrated from /admin/blog/orchestrator to /admin/signal (strategic alignment)
 * Updated: 2026-01-17 - Added Signal Journey Viewer + Attribution Models (Migration 187)
 * Pattern: Follows SEO hub pattern with multi-tab navigation and KPI cards
 * Phase: 3 - Observation Layer (read-only analytics)
 * Note: This is platform-level business intelligence, not resource-specific
 */
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts';
import { AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { FileText, TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react';
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

interface _TimeDistribution {
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
  const [activeTab, setActiveTab] = useState<'overview' | 'articles' | 'funnel' | 'listings' | 'journeys' | 'attribution'>('overview');
  const [days, setDays] = useState(30);
  const [attributionWindow, setAttributionWindow] = useState(7);
  const [signalIdInput, setSignalIdInput] = useState(''); // For signal journey search
  const [searchedSignalId, setSearchedSignalId] = useState<string | null>(null);

  // Fetch overview stats
  const { data: statsData, isLoading: isLoadingStats, error: statsError, refetch: refetchStats } = useQuery<StatsData>({
    queryKey: ['blog-orchestrator-stats', days, attributionWindow],
    queryFn: async () => {
      const res = await fetch(`/api/admin/signal/stats?days=${days}&attributionWindow=${attributionWindow}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    retry: 2,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Fetch top articles (sorted by revenue)
  const { data: articlesData, isLoading: isLoadingArticles, error: articlesError, refetch: refetchArticles } = useQuery<TopArticlesData>({
    queryKey: ['blog-orchestrator-articles', days, attributionWindow],
    queryFn: async () => {
      const res = await fetch(`/api/admin/signal/top-articles?days=${days}&attributionWindow=${attributionWindow}`);
      if (!res.ok) throw new Error('Failed to fetch articles');
      return res.json();
    },
    enabled: activeTab === 'articles',
    retry: 2,
    staleTime: 30000,
  });

  // Fetch blog-assisted listings
  const { data: listingsData, isLoading: isLoadingListings, error: listingsError, refetch: refetchListings } = useQuery<ListingsData>({
    queryKey: ['blog-orchestrator-listings', days, attributionWindow],
    queryFn: async () => {
      const res = await fetch(`/api/admin/signal/listings?days=${days}&attributionWindow=${attributionWindow}`);
      if (!res.ok) throw new Error('Failed to fetch listings');
      return res.json();
    },
    enabled: activeTab === 'listings',
    retry: 2,
    staleTime: 30000,
  });

  // Fetch signal journey (NEW - Migration 187)
  const { data: journeyData, isLoading: isLoadingJourney, error: journeyError } = useQuery({
    queryKey: ['blog-orchestrator-journey', searchedSignalId],
    queryFn: async () => {
      if (!searchedSignalId) return null;
      const res = await fetch(`/api/admin/signal/journey?signal_id=${searchedSignalId}`);
      if (!res.ok) throw new Error('Failed to fetch journey');
      return res.json();
    },
    enabled: activeTab === 'journeys' && !!searchedSignalId,
  });

  // Fetch attribution comparison (NEW - Migration 187)
  const { data: attributionData, isLoading: isLoadingAttribution } = useQuery({
    queryKey: ['blog-orchestrator-attribution', days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/signal/attribution?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch attribution comparison');
      return res.json();
    },
    enabled: activeTab === 'attribution',
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
    <ErrorBoundary>
      <HubPageLayout
      header={
        <HubHeader
          title="Revenue Signal Analytics"
          subtitle="Platform intelligence tracking content attribution and marketplace conversions"
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
            { id: 'journeys', label: 'Signal Journeys', active: activeTab === 'journeys' },
            { id: 'attribution', label: 'Attribution Models', active: activeTab === 'attribution' },
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
          {statsError ? (
            <div className={styles.error}>
              <p>Failed to load stats: {(statsError as Error).message}</p>
              <button onClick={() => refetchStats()} className={styles.retryButton}>
                Retry
              </button>
            </div>
          ) : isLoadingStats ? (
            <div className={styles.loading}>Loading stats...</div>
          ) : totalArticles === 0 ? (
            <HubEmptyState
              title="No Attribution Data Yet"
              description="Start embedding content in articles to see attribution data. Once resource articles are viewed and users interact with embedded content, metrics will appear here."
              icon={<FileText size={48} />}
            />
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
                  sublabel="From resource traffic"
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
          {articlesError ? (
            <div className={styles.error}>
              <p>Failed to load articles: {(articlesError as Error).message}</p>
              <button onClick={() => refetchArticles()} className={styles.retryButton}>
                Retry
              </button>
            </div>
          ) : isLoadingArticles ? (
            <div className={styles.loading}>Loading articles...</div>
          ) : !articlesData?.articles || articlesData.articles.length === 0 ? (
            <HubEmptyState
              title="No Article Performance Data"
              description="Article performance metrics will appear once resource articles receive views and interactions."
              icon={<FileText size={48} />}
            />
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
                        <a href={`/resources/${article.article_slug}`} target="_blank" rel="noopener noreferrer">
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
            <HubEmptyState
              title="No Funnel Data"
              description="Conversion funnel metrics will appear once users progress through resource articles to bookings."
              icon={<TrendingUp size={48} />}
            />
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
          {listingsError ? (
            <div className={styles.error}>
              <p>Failed to load listings: {(listingsError as Error).message}</p>
              <button onClick={() => refetchListings()} className={styles.retryButton}>
                Retry
              </button>
            </div>
          ) : isLoadingListings ? (
            <div className={styles.loading}>Loading listings...</div>
          ) : !listingsData?.listings || listingsData.listings.length === 0 ? (
            <HubEmptyState
              title="No Blog-Assisted Listings"
              description="Listing visibility data will appear once resource articles drive traffic to tutor listings."
              icon={<Users size={48} />}
            />
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

      {activeTab === 'journeys' && (
        <div className={styles.journeysTab}>
          <h2>Signal Journey Viewer</h2>
          <p className={styles.tabDescription}>
            Trace a complete user journey using signal_id (dist_* or session_*).
            Shows all events from first touch to conversion.
          </p>

          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Enter signal_id (e.g., dist_abc123 or session_550e8400-...)"
              value={signalIdInput}
              onChange={(e) => setSignalIdInput(e.target.value)}
              className={styles.searchInput}
            />
            <button
              onClick={() => setSearchedSignalId(signalIdInput)}
              className={styles.searchButton}
              disabled={!signalIdInput}
            >
              Search Journey
            </button>
          </div>

          {journeyError && (
            <div className={styles.error}>
              Failed to fetch journey. Check that the signal_id is valid.
            </div>
          )}

          {isLoadingJourney && (
            <div className={styles.loading}>Loading journey...</div>
          )}

          {journeyData && journeyData.events && journeyData.events.length > 0 && (
            <div className={styles.journeyContainer}>
              <div className={styles.journeyMetadata}>
                <h3>Journey Metadata</h3>
                <div className={styles.metadataGrid}>
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Signal ID:</span>
                    <span className={styles.metadataValue}>{journeyData.metadata.signal_id}</span>
                  </div>
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Total Events:</span>
                    <span className={styles.metadataValue}>{journeyData.metadata.total_events}</span>
                  </div>
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Journey Duration:</span>
                    <span className={styles.metadataValue}>{journeyData.metadata.journey_duration || 'N/A'}</span>
                  </div>
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Source:</span>
                    <span className={styles.metadataValue}>
                      {journeyData.metadata.is_distribution ? 'Distribution (LinkedIn/Social)' : 'Organic'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.journeyTimeline}>
                <h3>Event Timeline</h3>
                <div className={styles.timeline}>
                  {journeyData.events.map((event: any, index: number) => (
                    <div key={event.event_id} className={styles.timelineEvent}>
                      <div className={styles.timelineMarker}>
                        <span className={styles.eventNumber}>{index + 1}</span>
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.eventHeader}>
                          <span className={styles.eventType}>{event.event_type}</span>
                          <span className={styles.eventTime}>
                            {event.time_since_first || 'Start'}
                          </span>
                        </div>
                        <div className={styles.eventDetails}>
                          <div className={styles.eventDetail}>
                            <strong>Target:</strong> {event.target_type} - {event.target_name || event.target_id}
                          </div>
                          <div className={styles.eventDetail}>
                            <strong>Source:</strong> {event.source_component}
                          </div>
                          {event.distribution_id && (
                            <div className={styles.eventDetail}>
                              <strong>Distribution:</strong> {event.distribution_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {journeyData && journeyData.events && journeyData.events.length === 0 && (
            <HubEmptyState
              title="No Events Found"
              description="No events were found for this signal_id. Verify the ID is correct."
              icon={<AlertCircle size={48} />}
            />
          )}

          {!searchedSignalId && !isLoadingJourney && (
            <HubEmptyState
              title="Search for a Journey"
              description="Enter a signal_id above to view the complete user journey from first touch to conversion."
              icon={<FileText size={48} />}
            />
          )}
        </div>
      )}

      {activeTab === 'attribution' && (
        <div className={styles.attributionTab}>
          <h2>Attribution Models Comparison</h2>
          <p className={styles.tabDescription}>
            Compare how different attribution models distribute credit for the same bookings.
            Same conversions, different article attribution.
          </p>

          {isLoadingAttribution ? (
            <div className={styles.loading}>Loading attribution comparison...</div>
          ) : !attributionData?.models || attributionData.models.length === 0 ? (
            <HubEmptyState
              title="No Attribution Data"
              description="Attribution models require signal journeys with multiple touchpoints. Data will appear once users interact with multiple articles before booking."
              icon={<TrendingUp size={48} />}
            />
          ) : (
            <div className={styles.attributionContainer}>
              <div className={styles.attributionSummary}>
                <h3>Summary Insights</h3>
                <div className={styles.insightsGrid}>
                  <div className={styles.insightCard}>
                    <div className={styles.insightLabel}>Total Bookings</div>
                    <div className={styles.insightValue}>{attributionData.insights.total_bookings}</div>
                    <div className={styles.insightNote}>Same across all models</div>
                  </div>
                  <div className={styles.insightCard}>
                    <div className={styles.insightLabel}>First-Touch Articles</div>
                    <div className={styles.insightValue}>{attributionData.insights.first_touch_articles}</div>
                    <div className={styles.insightNote}>Entry point attribution</div>
                  </div>
                  <div className={styles.insightCard}>
                    <div className={styles.insightLabel}>Last-Touch Articles</div>
                    <div className={styles.insightValue}>{attributionData.insights.last_touch_articles}</div>
                    <div className={styles.insightNote}>Final touchpoint before booking</div>
                  </div>
                  <div className={styles.insightCard}>
                    <div className={styles.insightLabel}>Linear Articles</div>
                    <div className={styles.insightValue}>{attributionData.insights.linear_articles}</div>
                    <div className={styles.insightNote}>Distributed across journey</div>
                  </div>
                </div>
              </div>

              <div className={styles.modelComparison}>
                <h3>Model Breakdown</h3>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Attribution Model</th>
                      <th>Attributed Articles</th>
                      <th>Attributed Bookings</th>
                      <th>Attributed Revenue</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributionData.models.map((model: any) => (
                      <tr key={model.model_type}>
                        <td className={styles.modelName}>
                          {model.model_type === 'first_touch' && 'First-Touch'}
                          {model.model_type === 'last_touch' && 'Last-Touch'}
                          {model.model_type === 'linear' && 'Linear'}
                        </td>
                        <td>{model.attributed_articles}</td>
                        <td>{model.attributed_bookings}</td>
                        <td>{formatRevenue(parseFloat(model.attributed_revenue || '0'))}</td>
                        <td className={styles.modelDescription}>
                          {model.model_type === 'first_touch' && 'Credits the first article in the journey'}
                          {model.model_type === 'last_touch' && 'Credits the last article before booking'}
                          {model.model_type === 'linear' && 'Splits credit equally across all articles'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.attributionNote}>
                <h4>How to Choose a Model</h4>
                <ul>
                  <li><strong>First-Touch:</strong> Use if you want to optimize for discovery (top-of-funnel content)</li>
                  <li><strong>Last-Touch:</strong> Use if you want to optimize for conversion (bottom-of-funnel content)</li>
                  <li><strong>Linear:</strong> Use if you want to reward all touchpoints equally (full-journey content)</li>
                </ul>
                <p className={styles.note}>
                  Note: Phase 6 will allow you to select which model to use for reporting.
                  Currently, this is for analysis only.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      </HubPageLayout>
    </ErrorBoundary>
  );
}
