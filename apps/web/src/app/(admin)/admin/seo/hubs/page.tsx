/*
 * Filename: src/app/(admin)/admin/seo/hubs/page.tsx
 * Purpose: SEO Hubs management page for admins
 * Created: 2025-12-23
 * Phase: 1 - SEO Management
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubDataTable from '@/app/components/hub/data/HubDataTable';
import { AdminHelpWidget, AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import HubTrendChart from '@/app/components/hub/charts/HubTrendChart';
import HubCategoryBreakdownChart from '@/app/components/hub/charts/HubCategoryBreakdownChart';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import Button from '@/app/components/ui/actions/Button';
import { Plus, Edit2, Trash2, Eye, TrendingUp, FileText } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface SeoHub {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  published_by: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  spoke_count?: number;
  view_count?: number;
}

export default function AdminSeoHubsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [activeView, setActiveView] = useState<'overview' | 'data'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Permission checks
  const canCreate = usePermission('seo', 'create');
  const canUpdate = usePermission('seo', 'update');
  const canDelete = usePermission('seo', 'delete');
  const canPublish = usePermission('seo', 'publish');

  // Fetch SEO hubs
  const { data: hubs, isLoading } = useQuery({
    queryKey: ['admin', 'seo-hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_hubs')
        .select(`
          *,
          spoke_count:seo_spokes(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SeoHub[];
    },
  });

  // Fetch hub statistics for Overview tab
  const { data: hubStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin', 'seo-hubs-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/seo/hubs/stats');
      if (!response.ok) throw new Error('Failed to fetch hub stats');
      return response.json();
    },
    enabled: activeView === 'overview',
  });

  // Filter and search hubs
  const filteredHubs = useMemo(() => {
    if (!hubs) return [];

    let filtered = hubs;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((hub) => hub.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (hub) =>
          hub.title.toLowerCase().includes(query) ||
          hub.slug.toLowerCase().includes(query) ||
          hub.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [hubs, statusFilter, searchQuery]);

  // Paginate hubs
  const paginatedHubs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredHubs.slice(startIndex, endIndex);
  }, [filteredHubs, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    if (!hubs) return { total: 0, published: 0, draft: 0, archived: 0 };

    return {
      total: hubs.length,
      published: hubs.filter((h) => h.status === 'published').length,
      draft: hubs.filter((h) => h.status === 'draft').length,
      archived: hubs.filter((h) => h.status === 'archived').length,
    };
  }, [hubs]);

  // Table columns
  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (hub: SeoHub) => (
        <div className={styles.titleCell}>
          <span className={styles.titleText}>{hub.title}</span>
          <span className={styles.slugText}>/{hub.slug}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (hub: SeoHub) => (
        <span
          className={`${styles.statusBadge} ${
            hub.status === 'published'
              ? styles.statusPublished
              : hub.status === 'draft'
              ? styles.statusDraft
              : styles.statusArchived
          }`}
        >
          {hub.status.charAt(0).toUpperCase() + hub.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'spoke_count',
      label: 'Spokes',
      sortable: true,
      render: (hub: SeoHub) => <span className={styles.countText}>{hub.spoke_count || 0}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (hub: SeoHub) => (
        <span className={styles.dateText}>
          {new Date(hub.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (hub: SeoHub) => (
        <div className={styles.tableActions}>
          <Button variant="ghost" size="sm" title="View">
            <Eye className={styles.actionIcon} />
          </Button>
          {canUpdate && (
            <Button variant="ghost" size="sm" title="Edit">
              <Edit2 className={styles.actionIcon} />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" title="Delete">
              <Trash2 className={styles.deleteIcon} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Main view tabs
  const viewTabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <TrendingUp className={styles.tabIcon} />,
      active: activeView === 'overview'
    },
    {
      id: 'data',
      label: 'Data',
      icon: <FileText className={styles.tabIcon} />,
      active: activeView === 'data'
    },
  ];

  // Data filter tabs (only shown in data view)
  const dataFilterTabs = [
    { id: 'all', label: 'All Hubs', count: stats.total, active: statusFilter === 'all' },
    { id: 'published', label: 'Published', count: stats.published, active: statusFilter === 'published' },
    { id: 'draft', label: 'Drafts', count: stats.draft, active: statusFilter === 'draft' },
    { id: 'archived', label: 'Archived', count: stats.archived, active: statusFilter === 'archived' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Hubs"
          subtitle="Manage your hub-and-spoke SEO content strategy"
          actions={
            canCreate ? (
              <Button>
                Create Hub
              </Button>
            ) : undefined
          }
          className={styles.hubsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={viewTabs}
          onTabChange={(tabId) => setActiveView(tabId as typeof activeView)}
          className={styles.hubsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="SEO Hubs Overview"
            stats={[
              { label: 'Total Hubs', value: stats.total },
              { label: 'Published', value: stats.published },
              { label: 'Drafts', value: stats.draft },
              { label: 'Archived', value: stats.archived },
            ]}
          />
          <AdminHelpWidget
            title="SEO Hubs Help"
            items={[
              { question: 'What are SEO Hubs?', answer: 'Hub pages are pillar content pages that serve as the main topic authority for a subject area.' },
              { question: 'How do I create a hub?', answer: 'Click the "Create Hub" button to start. Fill in the title, description, and SEO metadata.' },
              { question: 'Best practices?', answer: 'Keep titles under 60 characters, meta descriptions under 160 characters, and link to related spokes.' },
            ]}
          />
          <AdminTipWidget
            title="SEO Tips"
            tips={[
              'Use keyword-rich titles',
              'Internal link to spoke pages',
              'Update content regularly',
              'Monitor performance metrics',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className={styles.overviewContent}>
          {/* Charts Grid */}
          <div className={styles.chartsGrid}>
            <ErrorBoundary>
              {isLoadingStats ? (
                <ChartSkeleton />
              ) : (
                <HubTrendChart
                  title="Hub Performance"
                  subtitle="Hub activity over the last 30 days"
                  data={hubStats?.hubPerformanceTrend || []}
                  lineColor="#3B82F6"
                />
              )}
            </ErrorBoundary>

            <ErrorBoundary>
              {isLoadingStats ? (
                <ChartSkeleton />
              ) : (
                <HubCategoryBreakdownChart
                  title="Hub Status Distribution"
                  subtitle="Distribution of hubs by status"
                  data={hubStats?.statusDistribution || []}
                />
              )}
            </ErrorBoundary>

            {/* Top Performing Hubs */}
            <div className={styles.topHubsWidget}>
              <h3 className={styles.widgetTitle}>Top Performing Hubs</h3>
              {isLoadingStats ? (
                <p className={styles.emptyMessage}>Loading...</p>
              ) : hubStats?.topHubs && hubStats.topHubs.length > 0 ? (
                <div className={styles.topHubsList}>
                  {hubStats.topHubs.map((hub: any, index: number) => (
                    <div key={hub.id} className={styles.topHubItem}>
                      <div className={styles.topHubRank}>#{index + 1}</div>
                      <div className={styles.topHubContent}>
                        <div className={styles.topHubTitle}>{hub.title}</div>
                        <div className={styles.topHubMeta}>
                          {hub.viewCount} views • {hub.spokeCount} spokes
                        </div>
                      </div>
                      <span
                        className={`${styles.topHubStatus} ${
                          hub.status === 'published'
                            ? styles.statusPublished
                            : hub.status === 'draft'
                            ? styles.statusDraft
                            : styles.statusArchived
                        }`}
                      >
                        {hub.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyMessage}>No hub data available</p>
              )}
            </div>
          </div>

          {/* Recent Hubs */}
          <div className={styles.recentHubsSection}>
            <h3 className={styles.sectionTitle}>Recently Created Hubs</h3>
            {isLoadingStats ? (
              <p className={styles.emptyMessage}>Loading...</p>
            ) : hubStats?.recentHubs && hubStats.recentHubs.length > 0 ? (
              <div className={styles.recentHubsGrid}>
                {hubStats.recentHubs.map((hub: any) => (
                  <div key={hub.id} className={styles.recentHubCard}>
                    <div className={styles.recentHubHeader}>
                      <h4 className={styles.recentHubTitle}>{hub.title}</h4>
                      <span
                        className={`${styles.recentHubStatus} ${
                          hub.status === 'published'
                            ? styles.statusPublished
                            : hub.status === 'draft'
                            ? styles.statusDraft
                            : styles.statusArchived
                        }`}
                      >
                        {hub.status}
                      </span>
                    </div>
                    <div className={styles.recentHubMeta}>
                      <span>{hub.spokeCount} spokes</span>
                      <span>•</span>
                      <span>
                        {new Date(hub.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyMessage}>No recent hubs</p>
            )}
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeView === 'data' && (
        <HubDataTable
          columns={columns}
          data={paginatedHubs}
          loading={isLoading}
          onSearch={setSearchQuery}
          onFilterChange={(key, value) => {
            if (key === 'status') {
              setStatusFilter(value as typeof statusFilter);
              setCurrentPage(1);
            }
          }}
          onRowClick={(hub) => {
            // TODO: Open hub detail modal or navigate to edit page
          }}
          onExport={() => {
            // Export filtered hubs to CSV
            const csvHeaders = ['title', 'slug', 'status', 'spoke_count', 'created_at'];
            const csvRows = filteredHubs.map(hub => [
              hub.title,
              hub.slug,
              hub.status,
              hub.spoke_count || 0,
              new Date(hub.created_at).toISOString(),
            ]);

            const csvContent = [
              csvHeaders.join(','),
              ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `seo-hubs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'seo-hubs'] });
          }}
          autoRefreshInterval={300000}
          bulkActions={[
            {
              value: 'publish',
              label: 'Publish Selected',
              onClick: (selectedIds) => {
                // TODO: Implement publish selected functionality
                alert(`Publish ${selectedIds.length} hub(s) - functionality coming soon`);
              },
            },
            {
              value: 'archive',
              label: 'Archive Selected',
              onClick: (selectedIds) => {
                // TODO: Implement archive selected functionality
                alert(`Archive ${selectedIds.length} hub(s) - functionality coming soon`);
              },
            },
            {
              value: 'delete',
              label: 'Delete Selected',
              onClick: (selectedIds) => {
                // TODO: Implement delete selected functionality
                if (confirm(`Delete ${selectedIds.length} hub(s)? This action cannot be undone.`)) {
                  alert('Delete functionality coming soon');
                }
              },
              variant: 'danger' as const,
            },
          ]}
          enableSavedViews={true}
          savedViewsKey="admin_seo_hubs_savedViews"
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Published', value: 'published' },
                { label: 'Draft', value: 'draft' },
                { label: 'Archived', value: 'archived' },
              ],
            },
          ]}
          pagination={{
            page: currentPage,
            limit: pageSize,
            total: filteredHubs.length,
            onPageChange: setCurrentPage,
            onLimitChange: (newLimit) => {
              setPageSize(newLimit);
              setCurrentPage(1);
            },
            pageSizeOptions: [10, 20, 50, 100],
          }}
          selectable={true}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          getRowId={(hub) => hub.id}
          searchPlaceholder="Search hubs..."
          emptyMessage="No SEO hubs found"
        />
      )}
    </HubPageLayout>
  );
}
