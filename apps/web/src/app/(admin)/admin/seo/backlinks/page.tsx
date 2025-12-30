/*
 * Filename: src/app/(admin)/admin/seo/backlinks/page.tsx
 * Purpose: Backlinks monitoring and analysis dashboard
 * Created: 2025-12-29
 * Goal: Track inbound links for SEO authority building
 */
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubDataTable from '@/app/components/hub/data/HubDataTable';
import { AdminHelpWidget, AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { Link as LinkIcon, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

interface Backlink {
  id: string;
  source_url: string;
  source_domain: string;
  target_url: string;
  domain_authority: number | null;
  domain_rating: number | null;
  link_type: 'dofollow' | 'nofollow' | 'ugc' | 'sponsored';
  status: 'active' | 'lost' | 'broken' | 'redirected';
  first_seen_at: string;
  last_checked_at: string | null;
  anchor_text: string | null;
}

export default function AdminSeoBacklinksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch backlinks
  const { data: backlinks, isLoading } = useQuery({
    queryKey: ['admin', 'seo-backlinks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_backlinks')
        .select('*')
        .order('domain_rating', { ascending: false, nullsFirst: false })
        .order('first_seen_at', { ascending: false });

      if (error) throw error;
      return data as Backlink[];
    },
  });

  // Filter backlinks
  const filteredBacklinks = useMemo(() => {
    if (!backlinks) return [];

    let filtered = backlinks;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((bl) => bl.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((bl) => bl.link_type === typeFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bl) =>
          bl.source_domain.toLowerCase().includes(query) ||
          bl.target_url.toLowerCase().includes(query) ||
          bl.anchor_text?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [backlinks, statusFilter, typeFilter, searchQuery]);

  // Paginated backlinks
  const paginatedBacklinks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredBacklinks.slice(startIndex, endIndex);
  }, [filteredBacklinks, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    if (!backlinks) return { total: 0, active: 0, lost: 0, dofollow: 0, avgDR: 0 };

    const active = backlinks.filter((bl) => bl.status === 'active').length;
    const lost = backlinks.filter((bl) => bl.status === 'lost').length;
    const dofollow = backlinks.filter((bl) => bl.link_type === 'dofollow').length;
    const drValues = backlinks.filter((bl) => bl.domain_rating !== null).map((bl) => bl.domain_rating!);
    const avgDR = drValues.length > 0 ? Math.round(drValues.reduce((a, b) => a + b, 0) / drValues.length) : 0;

    return {
      total: backlinks.length,
      active,
      lost,
      dofollow,
      avgDR,
    };
  }, [backlinks]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      active: <span className={styles.statusActive}><CheckCircle className={styles.statusIcon} />Active</span>,
      lost: <span className={styles.statusLost}><TrendingDown className={styles.statusIcon} />Lost</span>,
      broken: <span className={styles.statusBroken}><AlertTriangle className={styles.statusIcon} />Broken</span>,
      redirected: <span className={styles.statusRedirected}>Redirected</span>,
    };
    return badges[status as keyof typeof badges];
  };

  // Get link type badge
  const getLinkTypeBadge = (type: string) => {
    const badges = {
      dofollow: <span className={styles.typeDofollow}>Dofollow</span>,
      nofollow: <span className={styles.typeNofollow}>Nofollow</span>,
      ugc: <span className={styles.typeUgc}>UGC</span>,
      sponsored: <span className={styles.typeSponsored}>Sponsored</span>,
    };
    return badges[type as keyof typeof badges];
  };

  // Get DR badge
  const getDRBadge = (dr: number | null) => {
    if (!dr) return <span className={styles.drUnknown}>N/A</span>;
    if (dr >= 70) return <span className={styles.drHigh}>DR {dr}</span>;
    if (dr >= 40) return <span className={styles.drMedium}>DR {dr}</span>;
    return <span className={styles.drLow}>DR {dr}</span>;
  };

  // Table columns
  const columns = [
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      render: (bl: Backlink) => (
        <div className={styles.sourceCell}>
          <a href={bl.source_url} target="_blank" rel="noopener noreferrer" className={styles.sourceUrl}>
            {bl.source_domain}
          </a>
          {bl.anchor_text && <div className={styles.anchorText}>&ldquo;{bl.anchor_text}&rdquo;</div>}
        </div>
      ),
    },
    {
      key: 'target',
      label: 'Target Page',
      sortable: true,
      render: (bl: Backlink) => (
        <div className={styles.targetCell}>
          <span className={styles.targetUrl}>{bl.target_url.replace('https://tutorwise.io', '')}</span>
        </div>
      ),
    },
    {
      key: 'metrics',
      label: 'Metrics',
      sortable: true,
      render: (bl: Backlink) => (
        <div className={styles.metricsCell}>
          {getDRBadge(bl.domain_rating)}
          {bl.domain_authority && <span className={styles.daBadge}>DA {bl.domain_authority}</span>}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (bl: Backlink) => getLinkTypeBadge(bl.link_type),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (bl: Backlink) => getStatusBadge(bl.status),
    },
    {
      key: 'first_seen',
      label: 'First Seen',
      sortable: true,
      render: (bl: Backlink) => (
        <span className={styles.dateText}>
          {new Date(bl.first_seen_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ];

  // Filter tabs
  const filterTabs = [
    { id: 'all', label: 'All Backlinks', count: backlinks?.length || 0, active: statusFilter === 'all' },
    { id: 'active', label: 'Active', count: stats.active, active: statusFilter === 'active' },
    { id: 'lost', label: 'Lost', count: stats.lost, active: statusFilter === 'lost' },
    { id: 'broken', label: 'Broken', count: backlinks?.filter(bl => bl.status === 'broken').length || 0, active: statusFilter === 'broken' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Backlinks Monitor"
          subtitle="Track inbound links and domain authority"
          className={styles.backlinksHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={filterTabs}
          onTabChange={(tabId) => setStatusFilter(tabId as string)}
          className={styles.backlinksTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Backlink Summary"
            stats={[
              { label: 'Total Backlinks', value: stats.total },
              { label: 'Active Links', value: stats.active },
              { label: 'Dofollow Links', value: stats.dofollow },
              { label: 'Average DR', value: stats.avgDR },
            ]}
          />
          <AdminHelpWidget
            title="Backlink Basics"
            items={[
              { question: 'What is Domain Rating (DR)?', answer: 'Ahrefs metric (0-100) showing domain authority. Higher = better for SEO.' },
              { question: 'Dofollow vs Nofollow?', answer: 'Dofollow links pass SEO value. Nofollow links don\'t (but still valuable for traffic).' },
              { question: 'Why track lost backlinks?', answer: 'Reach out to recover lost links to maintain SEO authority.' },
            ]}
          />
          <AdminTipWidget
            title="Link Building Tips"
            tips={[
              'Focus on high DR (70+) dofollow links',
              'Diversify anchor text naturally',
              'Monitor and recover lost backlinks',
              'Build relationships with authoritative sites',
            ]}
          />
        </HubSidebar>
      }
    >
      <HubDataTable
        columns={columns}
        data={paginatedBacklinks}
        loading={isLoading}
        onSearch={(query) => {
          setSearchQuery(query);
          setCurrentPage(1);
        }}
        onFilterChange={(key, value) => {
          const stringValue = Array.isArray(value) ? value[0] : value;
          if (key === 'status') {
            setStatusFilter(stringValue as typeof statusFilter);
          } else if (key === 'type') {
            setTypeFilter(stringValue as typeof typeFilter);
          }
          setCurrentPage(1);
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Lost', value: 'lost' },
              { label: 'Broken', value: 'broken' },
              { label: 'Redirected', value: 'redirected' },
            ],
          },
          {
            key: 'type',
            label: 'Type',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Dofollow', value: 'dofollow' },
              { label: 'Nofollow', value: 'nofollow' },
              { label: 'UGC', value: 'ugc' },
              { label: 'Sponsored', value: 'sponsored' },
            ],
          },
        ]}
        pagination={{
          page: currentPage,
          limit: pageSize,
          total: filteredBacklinks.length,
          onPageChange: setCurrentPage,
          onLimitChange: (newLimit) => {
            setPageSize(newLimit);
            setCurrentPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100],
        }}
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={(bl) => bl.id}
        searchPlaceholder="Search backlinks..."
        emptyMessage="No backlinks found"
        onExport={() => {
          const dataToExport = selectedRows.size > 0
            ? filteredBacklinks.filter((bl) => selectedRows.has(bl.id))
            : filteredBacklinks;

          const csvContent = [
            ['source_domain', 'source_url', 'target_url', 'anchor_text', 'link_type', 'status', 'domain_rating', 'domain_authority', 'first_seen_at'],
            ...dataToExport.map((bl) => [
              bl.source_domain,
              bl.source_url,
              bl.target_url,
              bl.anchor_text ?? '',
              bl.link_type,
              bl.status,
              bl.domain_rating ?? '',
              bl.domain_authority ?? '',
              bl.first_seen_at,
            ]),
          ].map((row) => row.join(',')).join('\n');

          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `backlinks-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'seo-backlinks'] });
        }}
        autoRefreshInterval={300000}
        bulkActions={[
          {
            label: 'Mark as Lost',
            value: 'mark_lost',
            onClick: (selectedIds) => {
              console.log('Mark as Lost:', selectedIds);
            },
          },
          {
            label: 'Mark as Active',
            value: 'mark_active',
            onClick: (selectedIds) => {
              console.log('Mark as Active:', selectedIds);
            },
          },
          {
            label: 'Delete Selected',
            value: 'delete',
            onClick: (selectedIds) => {
              console.log('Delete Selected:', selectedIds);
            },
            variant: 'danger' as const,
          },
        ]}
        enableSavedViews={true}
        savedViewsKey="admin_seo_backlinks_savedViews"
      />
    </HubPageLayout>
  );
}
