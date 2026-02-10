/*
 * Filename: src/app/(admin)/admin/seo/citations/page.tsx
 * Purpose: SEO Citations (backlinks) management page for admins
 * Created: 2025-12-23
 * Phase: 1 - SEO Management
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Edit2, Trash2, ExternalLink, CheckCircle2, XCircle, Clock, TrendingUp, FileText } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface SeoCitation {
  id: string;
  source_url: string;
  source_domain: string;
  target_url: string;
  anchor_text: string | null;
  citation_type: 'backlink' | 'mention' | 'review' | 'directory';
  status: 'active' | 'broken' | 'removed' | 'pending';
  domain_authority: number | null;
  discovered_at: string;
  last_checked_at: string | null;
  notes: string | null;
}

export default function AdminSeoCitationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'broken' | 'removed' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'backlink' | 'mention' | 'review' | 'directory'>('all');
  const [activeView, setActiveView] = useState<'overview' | 'data'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Permission checks
  const canCreate = usePermission('seo', 'create');
  const canUpdate = usePermission('seo', 'update');
  const canDelete = usePermission('seo', 'delete');

  // Fetch citations from database (returns empty if table doesn't exist yet)
  const { data: citations, isLoading } = useQuery({
    queryKey: ['admin', 'seo-citations'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('seo_citations')
          .select('*')
          .order('discovered_at', { ascending: false });

        if (error) {
          // If table doesn't exist, return empty array instead of throwing
          return [] as SeoCitation[];
        }
        return (data as SeoCitation[]) || [];
      } catch (_err) {
        return [] as SeoCitation[];
      }
    },
  });

  // Fetch citation statistics for Overview tab
  const { data: citationStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin', 'seo-citations-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/seo/citations/stats');
      if (!response.ok) throw new Error('Failed to fetch citation stats');
      return response.json();
    },
    enabled: activeView === 'overview',
  });

  // Filter citations
  const filteredCitations = useMemo(() => {
    if (!citations) return [];

    let filtered = citations;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((c) => c.citation_type === typeFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.source_domain.toLowerCase().includes(query) ||
          c.source_url.toLowerCase().includes(query) ||
          c.anchor_text?.toLowerCase().includes(query) ||
          c.target_url.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [citations, statusFilter, typeFilter, searchQuery]);

  // Paginated citations
  const paginatedCitations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredCitations.slice(startIndex, endIndex);
  }, [filteredCitations, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    if (!citations) return { total: 0, active: 0, broken: 0, pending: 0, avgDA: 0 };

    const active = citations.filter((c) => c.status === 'active');
    const avgDA = active.length > 0
      ? Math.round(active.reduce((sum, c) => sum + (c.domain_authority || 0), 0) / active.length)
      : 0;

    return {
      total: citations.length,
      active: active.length,
      broken: citations.filter((c) => c.status === 'broken').length,
      pending: citations.filter((c) => c.status === 'pending').length,
      avgDA,
    };
  }, [citations]);

  // Export handler for CSV export
  const handleExport = () => {
    const csvData = filteredCitations.map((citation) => ({
      source_domain: citation.source_domain,
      source_url: citation.source_url,
      target_url: citation.target_url,
      anchor_text: citation.anchor_text || '',
      citation_type: citation.citation_type,
      status: citation.status,
      domain_authority: citation.domain_authority || '',
      discovered_at: citation.discovered_at,
    }));

    const headers = ['source_domain', 'source_url', 'target_url', 'anchor_text', 'citation_type', 'status', 'domain_authority', 'discovered_at'];
    const csvContent = [
      headers.join(','),
      ...csvData.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row];
          // Escape values that contain commas or quotes
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `seo-citations-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Refresh handler
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'seo-citations'] });
  };

  // Bulk actions
  const bulkActions = [
    {
      label: 'Mark as Active',
      value: 'mark_active',
      onClick: (selectedIds: string[]) => {
        // TODO: Implement mark as active functionality
        alert(`Mark ${selectedIds.length} citation(s) as active - functionality coming soon`);
      },
    },
    {
      label: 'Mark as Broken',
      value: 'mark_broken',
      onClick: (selectedIds: string[]) => {
        // TODO: Implement mark as broken functionality
        alert(`Mark ${selectedIds.length} citation(s) as broken - functionality coming soon`);
      },
    },
    {
      label: 'Delete Selected',
      value: 'delete',
      onClick: (selectedIds: string[]) => {
        // TODO: Implement delete functionality
        if (confirm(`Delete ${selectedIds.length} citation(s)? This action cannot be undone.`)) {
          alert('Delete functionality coming soon');
        }
      },
      variant: 'danger' as const,
    },
  ];

  // Table columns
  const columns = [
    {
      key: 'source_domain',
      label: 'Source',
      sortable: true,
      render: (citation: SeoCitation) => (
        <div className={styles.citationUrl}>
          <span className={styles.citationUrlText}>{citation.source_domain}</span>
          <a
            href={citation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.citationUrlLink}
          >
            View <ExternalLink className={styles.externalLinkIcon} />
          </a>
        </div>
      ),
    },
    {
      key: 'anchor_text',
      label: 'Anchor Text',
      sortable: true,
      render: (citation: SeoCitation) => (
        <span className={styles.anchorText}>{citation.anchor_text || '—'}</span>
      ),
    },
    {
      key: 'citation_type',
      label: 'Type',
      sortable: true,
      render: (citation: SeoCitation) => (
        <span className={styles.citationType}>{citation.citation_type}</span>
      ),
    },
    {
      key: 'domain_authority',
      label: 'DA',
      sortable: true,
      render: (citation: SeoCitation) => (
        <span
          className={`font-medium ${
            (citation.domain_authority || 0) >= 70
              ? 'text-green-600'
              : (citation.domain_authority || 0) >= 40
              ? 'text-yellow-600'
              : 'text-gray-600'
          }`}
        >
          {citation.domain_authority || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (citation: SeoCitation) => {
        const statusConfig = {
          active: { icon: CheckCircle2, className: styles.statusActive },
          broken: { icon: XCircle, className: styles.statusBroken },
          pending: { icon: Clock, className: styles.statusPending },
          removed: { icon: XCircle, className: styles.statusRemoved },
        };
        const config = statusConfig[citation.status];
        const Icon = config.icon;

        return (
          <span className={`${styles.statusBadge} ${config.className}`}>
            <Icon className={styles.statusIcon} />
            {citation.status.charAt(0).toUpperCase() + citation.status.slice(1)}
          </span>
        );
      },
    },
    {
      key: 'discovered_at',
      label: 'Discovered',
      sortable: true,
      render: (citation: SeoCitation) => (
        <span className={styles.dateText}>
          {new Date(citation.discovered_at).toLocaleDateString('en-US', {
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
      render: (_citation: SeoCitation) => (
        <div className={styles.tableActions}>
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
  const _dataFilterTabs = [
    { id: 'all', label: 'All Citations', count: stats.total, active: statusFilter === 'all' },
    { id: 'active', label: 'Active', count: stats.active, active: statusFilter === 'active' },
    { id: 'broken', label: 'Broken', count: stats.broken, active: statusFilter === 'broken' },
    { id: 'pending', label: 'Pending', count: stats.pending, active: statusFilter === 'pending' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Citations"
          subtitle="Track and manage external backlinks and mentions"
          actions={
            canCreate ? (
              <Button>
                Add Citation
              </Button>
            ) : undefined
          }
          className={styles.citationsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={viewTabs}
          onTabChange={(tabId) => setActiveView(tabId as typeof activeView)}
          className={styles.citationsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Citations Overview"
            stats={[
              { label: 'Total Citations', value: stats.total },
              { label: 'Active Links', value: stats.active },
              { label: 'Avg Domain Authority', value: stats.avgDA },
              { label: 'Broken Links', value: stats.broken },
            ]}
          />
          <AdminHelpWidget
            title="Citations Help"
            items={[
              { question: 'What are citations?', answer: 'Citations are external websites that link to or mention your content. They\'re crucial for SEO and domain authority.' },
              { question: 'What is Domain Authority?', answer: 'Domain Authority (DA) is a score from 0-100 that predicts how well a website will rank on search engines. Higher is better.' },
              { question: 'How to get more citations?', answer: 'Create high-quality content, engage with industry publications, and build relationships with other websites in your niche.' },
            ]}
          />
          <AdminTipWidget
            title="Citation Tips"
            tips={[
              'Monitor broken links regularly',
              'Focus on high-DA sources',
              'Diversify anchor text',
              'Build relationships for natural links',
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
                  title="Citation Status Trend"
                  subtitle="Citation activity over the last 30 days"
                  data={citationStats?.citationStatusTrend || []}
                  lineColor="#F59E0B"
                />
              )}
            </ErrorBoundary>

            <ErrorBoundary>
              {isLoadingStats ? (
                <ChartSkeleton />
              ) : (
                <HubCategoryBreakdownChart
                  title="Citation Status Distribution"
                  subtitle="Distribution of citations by status"
                  data={citationStats?.statusDistribution || []}
                />
              )}
            </ErrorBoundary>

            {/* Top Domains */}
            <div className={styles.topDomainsWidget}>
              <h3 className={styles.widgetTitle}>Top Referring Domains</h3>
              {isLoadingStats ? (
                <p className={styles.emptyMessage}>Loading...</p>
              ) : citationStats?.topDomains && citationStats.topDomains.length > 0 ? (
                <div className={styles.topDomainsList}>
                  {citationStats.topDomains.map((domain: any, index: number) => (
                    <div key={domain.domain} className={styles.topDomainItem}>
                      <div className={styles.topDomainRank}>#{index + 1}</div>
                      <div className={styles.topDomainContent}>
                        <div className={styles.topDomainName}>{domain.domain}</div>
                        <div className={styles.topDomainMeta}>
                          {domain.citationCount} citations • {domain.activeCount} active
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyMessage}>No citation data available</p>
              )}
            </div>
          </div>

          {/* Recent Citations */}
          <div className={styles.recentCitationsSection}>
            <h3 className={styles.sectionTitle}>Recently Added Citations</h3>
            {isLoadingStats ? (
              <p className={styles.emptyMessage}>Loading...</p>
            ) : citationStats?.recentCitations && citationStats.recentCitations.length > 0 ? (
              <div className={styles.recentCitationsGrid}>
                {citationStats.recentCitations.map((citation: any) => (
                  <div key={citation.id} className={styles.recentCitationCard}>
                    <div className={styles.recentCitationHeader}>
                      <h4 className={styles.recentCitationTitle}>{citation.sourceName}</h4>
                      <span
                        className={`${styles.recentCitationStatus} ${
                          citation.status === 'active'
                            ? styles.statusActive
                            : citation.status === 'broken'
                            ? styles.statusBroken
                            : styles.statusPending
                        }`}
                      >
                        {citation.status}
                      </span>
                    </div>
                    <div className={styles.recentCitationMeta}>
                      <span className={styles.citationUrlShort}>
                        {citation.url.length > 50 ? citation.url.substring(0, 50) + '...' : citation.url}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(citation.createdAt).toLocaleDateString('en-US', {
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
              <p className={styles.emptyMessage}>No recent citations</p>
            )}
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeView === 'data' && (
        <HubDataTable
          columns={columns}
          data={paginatedCitations}
          loading={isLoading}
          onSearch={(query) => setSearchQuery(query)}
          onFilterChange={(filterKey, value) => {
            if (filterKey === 'status') {
              setStatusFilter(value as typeof statusFilter);
            } else if (filterKey === 'type') {
              setTypeFilter(value as typeof typeFilter);
            }
          }}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Broken', value: 'broken' },
                { label: 'Removed', value: 'removed' },
                { label: 'Pending', value: 'pending' },
              ],
            },
            {
              key: 'type',
              label: 'Type',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Backlink', value: 'backlink' },
                { label: 'Mention', value: 'mention' },
                { label: 'Review', value: 'review' },
                { label: 'Directory', value: 'directory' },
              ],
            },
          ]}
          pagination={{
            page: currentPage,
            limit: pageSize,
            total: filteredCitations.length,
            onPageChange: (page) => setCurrentPage(page),
            onLimitChange: (limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            },
            pageSizeOptions: [10, 20, 50, 100],
          }}
          selectable={true}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          getRowId={(citation) => citation.id}
          searchPlaceholder="Search citations..."
          emptyMessage="No citations found"
          onExport={handleExport}
          onRefresh={handleRefresh}
          autoRefreshInterval={300000}
          bulkActions={bulkActions}
          enableSavedViews={true}
          savedViewsKey="admin_seo_citations_savedViews"
        />
      )}
    </HubPageLayout>
  );
}
