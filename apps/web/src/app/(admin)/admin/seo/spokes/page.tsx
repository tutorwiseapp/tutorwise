/*
 * Filename: src/app/(admin)/admin/seo/spokes/page.tsx
 * Purpose: SEO Spokes management page for admins
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
import { Plus, Edit2, Trash2, Eye, Link as LinkIcon, TrendingUp, FileText } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface SeoSpoke {
  id: string;
  hub_id: string;
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
  view_count?: number;
  hub?: {
    title: string;
    slug: string;
  };
}

export default function AdminSeoSpokesPage() {
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

  // Fetch SEO spokes
  const { data: spokes, isLoading } = useQuery({
    queryKey: ['admin', 'seo-spokes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_spokes')
        .select(`
          *,
          hub:seo_hubs!hub_id(title, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SeoSpoke[];
    },
  });

  // Fetch spoke statistics for Overview tab
  const { data: spokeStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin', 'seo-spokes-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/seo/spokes/stats');
      if (!response.ok) throw new Error('Failed to fetch spoke stats');
      return response.json();
    },
    enabled: activeView === 'overview',
  });

  // Filter and search spokes
  const filteredSpokes = useMemo(() => {
    if (!spokes) return [];

    let filtered = spokes;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((spoke) => spoke.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (spoke) =>
          spoke.title.toLowerCase().includes(query) ||
          spoke.slug.toLowerCase().includes(query) ||
          spoke.description?.toLowerCase().includes(query) ||
          spoke.hub?.title.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [spokes, statusFilter, searchQuery]);

  // Paginate spokes
  const paginatedSpokes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredSpokes.slice(startIndex, endIndex);
  }, [filteredSpokes, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    if (!spokes) return { total: 0, published: 0, draft: 0, archived: 0 };

    return {
      total: spokes.length,
      published: spokes.filter((s) => s.status === 'published').length,
      draft: spokes.filter((s) => s.status === 'draft').length,
      archived: spokes.filter((s) => s.status === 'archived').length,
    };
  }, [spokes]);

  // Table columns
  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (spoke: SeoSpoke) => (
        <div className={styles.titleCell}>
          <span className={styles.titleText}>{spoke.title}</span>
          <span className={styles.slugText}>/{spoke.slug}</span>
        </div>
      ),
    },
    {
      key: 'hub',
      label: 'Parent Hub',
      sortable: true,
      render: (spoke: SeoSpoke) => (
        <div className={styles.hubLink}>
          <LinkIcon className={styles.hubLinkIcon} />
          <span className={styles.hubLinkText}>{spoke.hub?.title || 'Orphaned'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (spoke: SeoSpoke) => (
        <span
          className={`${styles.statusBadge} ${
            spoke.status === 'published'
              ? styles.statusPublished
              : spoke.status === 'draft'
              ? styles.statusDraft
              : styles.statusArchived
          }`}
        >
          {spoke.status.charAt(0).toUpperCase() + spoke.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (spoke: SeoSpoke) => (
        <span className={styles.dateText}>
          {new Date(spoke.created_at).toLocaleDateString('en-US', {
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
      render: (spoke: SeoSpoke) => (
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
    { id: 'all', label: 'All Spokes', count: stats.total, active: statusFilter === 'all' },
    { id: 'published', label: 'Published', count: stats.published, active: statusFilter === 'published' },
    { id: 'draft', label: 'Drafts', count: stats.draft, active: statusFilter === 'draft' },
    { id: 'archived', label: 'Archived', count: stats.archived, active: statusFilter === 'archived' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Spokes"
          subtitle="Manage spoke pages that support your hub content"
          actions={
            canCreate ? (
              <Button>
                Create Spoke
              </Button>
            ) : undefined
          }
          className={styles.spokesHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={viewTabs}
          onTabChange={(tabId) => setActiveView(tabId as typeof activeView)}
          className={styles.spokesTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="SEO Spokes Overview"
            stats={[
              { label: 'Total Spokes', value: stats.total },
              { label: 'Published', value: stats.published },
              { label: 'Drafts', value: stats.draft },
              { label: 'Archived', value: stats.archived },
            ]}
          />
          <AdminHelpWidget
            title="SEO Spokes Help"
            items={[
              { question: 'What are SEO Spokes?', answer: 'Spoke pages are supporting content pages that dive deep into specific subtopics of a hub page.' },
              { question: 'How do spokes work?', answer: 'Each spoke links back to its parent hub and to related spokes, creating a strong internal linking structure.' },
              { question: 'Best practices?', answer: 'Focus on long-tail keywords, provide detailed answers, and always link back to the parent hub.' },
            ]}
          />
          <AdminTipWidget
            title="Content Tips"
            tips={[
              'Target long-tail keywords',
              'Link to parent hub',
              'Cross-link related spokes',
              'Answer specific questions',
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
                  title="Spoke Performance"
                  subtitle="Spoke activity over the last 30 days"
                  data={spokeStats?.spokePerformanceTrend || []}
                  color="#8B5CF6"
                />
              )}
            </ErrorBoundary>

            <ErrorBoundary>
              {isLoadingStats ? (
                <ChartSkeleton />
              ) : (
                <HubCategoryBreakdownChart
                  title="Spoke Status Distribution"
                  subtitle="Distribution of spokes by status"
                  data={spokeStats?.statusDistribution || []}
                />
              )}
            </ErrorBoundary>

            {/* Top Performing Spokes */}
            <div className={styles.topSpokesWidget}>
              <h3 className={styles.widgetTitle}>Top Performing Spokes</h3>
              {isLoadingStats ? (
                <p className={styles.emptyMessage}>Loading...</p>
              ) : spokeStats?.topSpokes && spokeStats.topSpokes.length > 0 ? (
                <div className={styles.topSpokesList}>
                  {spokeStats.topSpokes.map((spoke: any, index: number) => (
                    <div key={spoke.id} className={styles.topSpokeItem}>
                      <div className={styles.topSpokeRank}>#{index + 1}</div>
                      <div className={styles.topSpokeContent}>
                        <div className={styles.topSpokeTitle}>{spoke.title}</div>
                        <div className={styles.topSpokeMeta}>
                          {spoke.viewCount} views • {spoke.hubTitle}
                        </div>
                      </div>
                      <span
                        className={`${styles.topSpokeStatus} ${
                          spoke.status === 'published'
                            ? styles.statusPublished
                            : spoke.status === 'draft'
                            ? styles.statusDraft
                            : styles.statusArchived
                        }`}
                      >
                        {spoke.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyMessage}>No spoke data available</p>
              )}
            </div>
          </div>

          {/* Recent Spokes */}
          <div className={styles.recentSpokesSection}>
            <h3 className={styles.sectionTitle}>Recently Created Spokes</h3>
            {isLoadingStats ? (
              <p className={styles.emptyMessage}>Loading...</p>
            ) : spokeStats?.recentSpokes && spokeStats.recentSpokes.length > 0 ? (
              <div className={styles.recentSpokesGrid}>
                {spokeStats.recentSpokes.map((spoke: any) => (
                  <div key={spoke.id} className={styles.recentSpokeCard}>
                    <div className={styles.recentSpokeHeader}>
                      <h4 className={styles.recentSpokeTitle}>{spoke.title}</h4>
                      <span
                        className={`${styles.recentSpokeStatus} ${
                          spoke.status === 'published'
                            ? styles.statusPublished
                            : spoke.status === 'draft'
                            ? styles.statusDraft
                            : styles.statusArchived
                        }`}
                      >
                        {spoke.status}
                      </span>
                    </div>
                    <div className={styles.recentSpokeMeta}>
                      <span>{spoke.hubTitle}</span>
                      <span>•</span>
                      <span>
                        {new Date(spoke.createdAt).toLocaleDateString('en-US', {
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
              <p className={styles.emptyMessage}>No recent spokes</p>
            )}
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeView === 'data' && (
        <HubDataTable
          columns={columns}
          data={paginatedSpokes}
          loading={isLoading}
          onSearch={setSearchQuery}
          onFilterChange={(key, value) => {
            if (key === 'status') {
              setStatusFilter(value as typeof statusFilter);
              setCurrentPage(1);
            }
          }}
          onRowClick={(spoke) => {
            // TODO: Open spoke detail modal or navigate to edit page
            console.log('Row clicked:', spoke);
          }}
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
            total: filteredSpokes.length,
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
          getRowId={(spoke) => spoke.id}
          searchPlaceholder="Search spokes..."
          emptyMessage="No SEO spokes found"
          onExport={() => {
            // Export filtered spokes to CSV
            const csvHeaders = ['title', 'slug', 'hub_title', 'status', 'created_at'];
            const csvRows = filteredSpokes.map((spoke) => [
              spoke.title,
              spoke.slug,
              spoke.hub?.title || '',
              spoke.status,
              spoke.created_at,
            ]);

            const csvContent = [
              csvHeaders.join(','),
              ...csvRows.map((row) =>
                row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
              ),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `seo-spokes-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          onRefresh={() => {
            queryClient.invalidateQueries(['admin', 'seo-spokes']);
          }}
          autoRefreshInterval={300000}
          bulkActions={[
            {
              label: 'Publish Selected',
              onClick: (selectedIds) => {
                console.log('Publish Selected:', selectedIds);
              },
            },
            {
              label: 'Archive Selected',
              onClick: (selectedIds) => {
                console.log('Archive Selected:', selectedIds);
              },
            },
            {
              label: 'Delete Selected',
              onClick: (selectedIds) => {
                console.log('Delete Selected:', selectedIds);
              },
            },
          ]}
          enableSavedViews={true}
          savedViewsKey="admin_seo_spokes_savedViews"
        />
      )}
    </HubPageLayout>
  );
}
