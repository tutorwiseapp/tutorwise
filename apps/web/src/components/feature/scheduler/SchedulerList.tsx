/**
 * Filename: src/components/feature/scheduler/SchedulerList.tsx
 * Purpose: All Items list view for the scheduler — uses HubDataTable + VerticalDotsMenu
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, PaginationConfig } from '@/app/components/hub/data';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import type { MenuAction } from '@/app/components/ui/actions/VerticalDotsMenu';
import type { ScheduledItem } from './SchedulerCalendar';

const TYPE_LABELS: Record<string, string> = {
  content: 'Content',
  agent_run: 'Agent Run',
  team_run: 'Team Run',
  task: 'Task',
  reminder: 'Reminder',
  cron_job: 'Cron Job',
  sql_func: 'SQL Function',
};

const TYPE_COLORS: Record<string, string> = {
  content: '#0d9488',
  agent_run: '#7c3aed',
  team_run: '#6366f1',
  task: '#f59e0b',
  reminder: '#ef4444',
  cron_job: '#2563eb',
  sql_func: '#d97706',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: '#ccfbf1', text: '#0d9488' },
  in_progress: { bg: '#dbeafe', text: '#2563eb' },
  completed: { bg: '#dcfce7', text: '#16a34a' },
  failed: { bg: '#fee2e2', text: '#dc2626' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280' },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

interface SchedulerListProps {
  items: ScheduledItem[];
  onItemClick: (item: ScheduledItem) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  filter?: 'upcoming' | 'all' | 'completed';
}

export default function SchedulerList({ items, onItemClick, onComplete, onCancel, filter = 'all' }: SchedulerListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Pre-filter by tab filter prop, then apply search
  const filtered = useMemo(() => {
    let result = items;
    if (filter === 'upcoming') {
      result = result.filter((item) => item.status === 'scheduled' || item.status === 'in_progress');
    } else if (filter === 'completed') {
      result = result.filter((item) => item.status === 'completed');
    } else {
      result = result.filter((item) => item.status !== 'cancelled');
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.title.toLowerCase().includes(q));
    }
    return result;
  }, [items, filter, searchQuery]);

  // Client-side sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (sortKey === 'title') {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      } else if (sortKey === 'scheduled_at') {
        aVal = new Date(a.scheduled_at).getTime();
        bVal = new Date(b.scheduled_at).getTime();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDirection]);

  // Paginate
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const pagination: PaginationConfig = {
    page,
    limit: pageSize,
    total: sorted.length,
    onPageChange: setPage,
  };

  const columns: Column<ScheduledItem>[] = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (row) => {
        const color = row.color || TYPE_COLORS[row.type] || '#6b7280';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '4px',
                height: '24px',
                borderRadius: '2px',
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 500 }}>{row.title}</span>
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      width: '120px',
      hideOnMobile: true,
      render: (row) => {
        const color = TYPE_COLORS[row.type] || '#6b7280';
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: `${color}18`,
              color,
            }}
          >
            {TYPE_LABELS[row.type] || row.type}
          </span>
        );
      },
    },
    {
      key: 'scheduled_at',
      label: 'Scheduled At',
      sortable: true,
      width: '160px',
      hideOnMobile: true,
      render: (row) => (
        <span style={{ fontSize: '13px', color: '#4b5563' }}>
          {format(new Date(row.scheduled_at), 'd MMM yyyy HH:mm')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (row) => {
        const colors = STATUS_COLORS[row.status] || STATUS_COLORS.scheduled;
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: colors.bg,
              color: colors.text,
            }}
          >
            {STATUS_LABELS[row.status] || row.status}
          </span>
        );
      },
    },
    {
      key: 'recurrence',
      label: 'Recurrence',
      width: '120px',
      hideOnTablet: true,
      render: (row) => (
        <span style={{ fontSize: '13px', color: row.recurrence ? '#4b5563' : '#9ca3af' }}>
          {row.recurrence || '\u2014'}
        </span>
      ),
    },
    {
      key: 'tags',
      label: 'Tags',
      width: '180px',
      hideOnTablet: true,
      render: (row) => {
        if (!row.tags || row.tags.length === 0) return <span style={{ color: '#9ca3af' }}>{'\u2014'}</span>;
        const visible = row.tags.slice(0, 3);
        const remaining = row.tags.length - 3;
        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {visible.map((tag) => (
              <span
                key={tag}
                style={{
                  display: 'inline-block',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                }}
              >
                {tag}
              </span>
            ))}
            {remaining > 0 && (
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>+{remaining} more</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      width: '48px',
      render: (row) => {
        const actions: MenuAction[] = [
          { label: 'View Details', onClick: () => onItemClick(row) },
        ];
        if (row.status === 'scheduled' || row.status === 'in_progress') {
          actions.push({ label: 'Mark Complete', onClick: () => onComplete(row.id) });
        }
        if (row.status === 'scheduled') {
          actions.push({ label: 'Cancel', onClick: () => onCancel(row.id), variant: 'danger' });
        }
        return <VerticalDotsMenu actions={actions} />;
      },
    },
  ];

  return (
    <HubDataTable<ScheduledItem>
      columns={columns}
      data={paginated}
      loading={false}
      searchPlaceholder="Search by title..."
      onSearch={handleSearch}
      onSort={handleSort}
      pagination={pagination}
      emptyMessage="No scheduled items found"
      getRowId={(row) => row.id}
    />
  );
}
