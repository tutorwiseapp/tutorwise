/*
 * Filename: src/app/(admin)/admin/seo/keywords/page.tsx
 * Purpose: Keywords management and rank tracking dashboard
 * Created: 2025-12-29
 * Goal: Track progress toward top 5 rankings
 */
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubDataTable from '@/app/components/hub/data/HubDataTable';
import { AdminHelpWidget, AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { Plus, TrendingUp, TrendingDown, Target, Search, AlertTriangle } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  current_position: number | null;
  target_position: number;
  best_position: number | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  keyword_type: 'primary' | 'secondary' | 'long-tail' | 'lsi';
  impressions: number;
  clicks: number;
  ctr: number | null;
  last_checked_at: string | null;
  created_at: string;
}

export default function AdminSeoKeywordsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const supabase = createClient();
  const canCreate = usePermission('seo', 'create');

  // Fetch keywords
  const { data: keywords, isLoading } = useQuery({
    queryKey: ['admin', 'seo-keywords'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('*')
        .order('priority', { ascending: false })
        .order('current_position', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as Keyword[];
    },
  });

  // Filter keywords
  const filteredKeywords = useMemo(() => {
    if (!keywords) return [];

    let filtered = keywords;

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((kw) => kw.priority === priorityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((kw) => {
        if (statusFilter === 'top5') return kw.current_position && kw.current_position <= 5;
        if (statusFilter === 'top10') return kw.current_position && kw.current_position <= 10;
        if (statusFilter === 'page2') return kw.current_position && kw.current_position > 10 && kw.current_position <= 20;
        if (statusFilter === 'unranked') return !kw.current_position || kw.current_position > 100;
        return true;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((kw) => kw.keyword.toLowerCase().includes(query));
    }

    return filtered;
  }, [keywords, priorityFilter, statusFilter, searchQuery]);

  // Paginated keywords
  const paginatedKeywords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredKeywords.slice(startIndex, endIndex);
  }, [filteredKeywords, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    if (!keywords) return { total: 0, top5: 0, top10: 0, critical: 0 };

    return {
      total: keywords.length,
      top5: keywords.filter((kw) => kw.current_position && kw.current_position <= 5).length,
      top10: keywords.filter((kw) => kw.current_position && kw.current_position <= 10).length,
      critical: keywords.filter((kw) => kw.priority === 'critical').length,
    };
  }, [keywords]);

  // Get position badge color
  const getPositionBadge = (position: number | null, target: number) => {
    if (!position) {
      return <span className={styles.badgeUnranked}>Not Ranked</span>;
    }
    if (position <= 5) {
      return <span className={styles.badgeTop5}>#{position}</span>;
    }
    if (position <= 10) {
      return <span className={styles.badgeTop10}>#{position}</span>;
    }
    if (position <= 20) {
      return <span className={styles.badgePage1}>#{position}</span>;
    }
    return <span className={styles.badgePage2}>#{position}</span>;
  };

  // Get trend indicator
  const getTrendIndicator = (current: number | null, best: number | null) => {
    if (!current || !best) return null;

    const diff = best - current; // Positive = improved (lower position number is better)

    if (diff > 0) {
      return <span title={`Improved by ${diff} positions`}><TrendingUp className={styles.trendUp} /></span>;
    } else if (diff < 0) {
      return <span title={`Declined by ${Math.abs(diff)} positions`}><TrendingDown className={styles.trendDown} /></span>;
    }
    return null;
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const badges = {
      critical: <span className={styles.priorityCritical}>Critical</span>,
      high: <span className={styles.priorityHigh}>High</span>,
      medium: <span className={styles.priorityMedium}>Medium</span>,
      low: <span className={styles.priorityLow}>Low</span>,
    };
    return badges[priority as keyof typeof badges];
  };

  // Table columns
  const columns = [
    {
      key: 'keyword',
      label: 'Keyword',
      sortable: true,
      render: (kw: Keyword) => (
        <div className={styles.keywordCell}>
          <span className={styles.keywordText}>{kw.keyword}</span>
          <div className={styles.keywordMeta}>
            <span>Vol: {kw.search_volume?.toLocaleString() || 'N/A'}</span>
            <span>•</span>
            <span>KD: {kw.keyword_difficulty || 'N/A'}</span>
            <span>•</span>
            <span className={styles.keywordType}>{kw.keyword_type}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'current_position',
      label: 'Position',
      sortable: true,
      render: (kw: Keyword) => (
        <div className={styles.positionCell}>
          {getPositionBadge(kw.current_position, kw.target_position)}
          {getTrendIndicator(kw.current_position, kw.best_position)}
        </div>
      ),
    },
    {
      key: 'target',
      label: 'Target',
      sortable: true,
      render: (kw: Keyword) => (
        <div className={styles.targetCell}>
          <Target className={styles.targetIcon} />
          <span>Top {kw.target_position}</span>
        </div>
      ),
    },
    {
      key: 'performance',
      label: 'Performance',
      sortable: true,
      render: (kw: Keyword) => (
        <div className={styles.performanceCell}>
          <div className={styles.performanceStat}>
            <span className={styles.statLabel}>Impressions:</span>
            <span className={styles.statValue}>{kw.impressions?.toLocaleString() || 0}</span>
          </div>
          <div className={styles.performanceStat}>
            <span className={styles.statLabel}>Clicks:</span>
            <span className={styles.statValue}>{kw.clicks?.toLocaleString() || 0}</span>
          </div>
          <div className={styles.performanceStat}>
            <span className={styles.statLabel}>CTR:</span>
            <span className={styles.statValue}>{kw.ctr ? `${kw.ctr.toFixed(1)}%` : 'N/A'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (kw: Keyword) => getPriorityBadge(kw.priority),
    },
    {
      key: 'last_checked',
      label: 'Last Checked',
      sortable: true,
      render: (kw: Keyword) => (
        <span className={styles.lastChecked}>
          {kw.last_checked_at
            ? new Date(kw.last_checked_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Never'}
        </span>
      ),
    },
  ];

  // Filter tabs
  const filterTabs = [
    { id: 'all', label: 'All Keywords', count: keywords?.length || 0, active: statusFilter === 'all' },
    { id: 'top5', label: 'Top 5', count: stats.top5, active: statusFilter === 'top5' },
    { id: 'top10', label: 'Top 10', count: stats.top10, active: statusFilter === 'top10' },
    { id: 'page2', label: 'Page 2', count: keywords?.filter(kw => kw.current_position && kw.current_position > 10 && kw.current_position <= 20).length || 0, active: statusFilter === 'page2' },
    { id: 'unranked', label: 'Not Ranked', count: keywords?.filter(kw => !kw.current_position || kw.current_position > 100).length || 0, active: statusFilter === 'unranked' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Keywords & Rankings"
          subtitle="Track keyword rankings and progress toward top 5 positions"
          actions={
            canCreate ? (
              <Button>
                Add Keyword
              </Button>
            ) : undefined
          }
          className={styles.keywordsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={filterTabs}
          onTabChange={(tabId) => setStatusFilter(tabId as string)}
          className={styles.keywordsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Ranking Progress"
            stats={[
              { label: 'Total Keywords', value: stats.total },
              { label: 'Top 5 Rankings', value: stats.top5 },
              { label: 'Top 10 Rankings', value: stats.top10 },
              { label: 'Critical Priority', value: stats.critical },
            ]}
          />
          <AdminHelpWidget
            title="Keyword Tracking Help"
            items={[
              { question: 'What is a target position?', answer: 'The Google ranking position you want to achieve (1-10 for page 1).' },
              { question: 'How often are rankings checked?', answer: 'Critical keywords: daily, High: every 3 days, Medium/Low: weekly.' },
              { question: 'What is keyword difficulty?', answer: 'A score (0-100) indicating how hard it is to rank for this keyword. Lower is easier.' },
            ]}
          />
          <AdminTipWidget
            title="Ranking Tips"
            tips={[
              'Focus on keywords at positions 11-20 (quick wins)',
              'Target low competition keywords first',
              'Update content for declining rankings',
              'Prioritize keywords with high search volume',
            ]}
          />
        </HubSidebar>
      }
    >
      <HubDataTable
        columns={columns}
        data={paginatedKeywords}
        loading={isLoading}
        onSearch={setSearchQuery}
        onFilterChange={(key, value) => {
          const stringValue = Array.isArray(value) ? value[0] : value;
          if (key === 'priority') setPriorityFilter(stringValue);
          if (key === 'status') setStatusFilter(stringValue);
        }}
        filters={[
          {
            key: 'priority',
            label: 'Priority',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Critical', value: 'critical' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' },
            ],
          },
        ]}
        pagination={{
          page: currentPage,
          limit: pageSize,
          total: filteredKeywords.length,
          onPageChange: setCurrentPage,
          onLimitChange: (newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100],
        }}
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={(row) => row.id}
        searchPlaceholder="Search keywords..."
        emptyMessage="No keywords found"
        onExport={() => {
          const dataToExport = selectedRows.size > 0
            ? filteredKeywords.filter((kw) => selectedRows.has(kw.id))
            : filteredKeywords;

          const csvContent = [
            ['keyword', 'current_position', 'target_position', 'priority', 'search_volume', 'keyword_difficulty', 'impressions', 'clicks', 'ctr'],
            ...dataToExport.map((kw) => [
              kw.keyword,
              kw.current_position ?? '',
              kw.target_position,
              kw.priority,
              kw.search_volume,
              kw.keyword_difficulty,
              kw.impressions,
              kw.clicks,
              kw.ctr ?? '',
            ]),
          ].map((row) => row.join(',')).join('\n');

          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `keywords-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'seo-keywords'] });
        }}
        autoRefreshInterval={300000}
        bulkActions={[
          {
            label: 'Set Priority High',
            value: 'set_priority_high',
            onClick: (selectedIds) => {
              alert(`Set priority to High for ${selectedIds.length} keyword(s) - functionality coming soon`);
            },
          },
          {
            label: 'Set Priority Critical',
            value: 'set_priority_critical',
            onClick: (selectedIds) => {
              alert(`Set priority to Critical for ${selectedIds.length} keyword(s) - functionality coming soon`);
            },
          },
          {
            label: 'Delete Selected',
            value: 'delete',
            onClick: (selectedIds) => {
              if (confirm(`Delete ${selectedIds.length} keyword(s)? This action cannot be undone.`)) {
                alert('Delete functionality coming soon');
              }
            },
            variant: 'danger' as const,
          },
        ]}
        enableSavedViews={true}
        savedViewsKey="admin_seo_keywords_savedViews"
      />
    </HubPageLayout>
  );
}
