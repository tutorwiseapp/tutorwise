'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { HubDataTable, type Column, type Filter, type PaginationConfig } from '@/components/hub/data';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import VerticalDotsMenu from '@/components/ui/actions/VerticalDotsMenu';
import { Users } from 'lucide-react';
import styles from './TeamsTable.module.css';

interface AgentTeam {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pattern: 'supervisor' | 'pipeline' | 'swarm';
  nodes: Array<{ id: string; data: { agentSlug: string; [key: string]: unknown } }>;
  edges: unknown[];
  coordinator_slug: string | null;
  config: Record<string, unknown>;
  seed_config?: Record<string, unknown> | null;
  status: 'active' | 'inactive';
  built_in: boolean;
  space_id: string | null;
  updated_at: string;
}

interface AgentSpace {
  id: string;
  slug: string;
  name: string;
  color: string;
}

interface TeamsTableProps {
  teams: AgentTeam[];
  spaces: AgentSpace[];
  loading: boolean;
  onEdit: (team: AgentTeam) => void;
  onDelete: (team: AgentTeam) => void;
  onRun: (team: AgentTeam) => void;
  onViewTopology: () => void;
  onNavigate: (subTab: 'spaces' | 'agents', filter?: Record<string, string>) => void;
  toolbarActions?: React.ReactNode;
}

const PATTERN_COLORS: Record<string, string> = {
  supervisor: '#6366f1',
  pipeline: '#0d9488',
  swarm: '#d97706',
};

const PATTERN_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  pipeline: 'Pipeline',
  swarm: 'Swarm',
};

const PAGE_SIZE = 15;

export function TeamsTable({ teams, spaces, loading, onEdit, onDelete, onRun, onViewTopology, onNavigate, toolbarActions }: TeamsTableProps) {
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const spaceMap = useMemo(() => {
    const map = new Map<string, AgentSpace>();
    for (const s of spaces) map.set(s.id, s);
    return map;
  }, [spaces]);

  const filters: Filter[] = useMemo(() => [
    {
      key: 'space_id',
      label: 'All Spaces',
      options: spaces.map(s => ({ value: s.id, label: s.name })),
    },
    {
      key: 'status',
      label: 'All Statuses',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ], [spaces]);

  const handleFilterChange = useCallback((key: string, value: string | string[]) => {
    setFilterValues(prev => ({ ...prev, [key]: String(value) }));
    setPage(1);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const filtered = useMemo(() => {
    let data = [...teams];

    if (filterValues.space_id) data = data.filter(t => t.space_id === filterValues.space_id);
    if (filterValues.status) data = data.filter(t => t.status === filterValues.status);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }

    data.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'updated_at') cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return data;
  }, [teams, searchQuery, filterValues, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const pagination: PaginationConfig = useMemo(() => ({
    page,
    limit: pageSize,
    total: filtered.length,
    onPageChange: setPage,
    onLimitChange: (newLimit: number) => { setPageSize(newLimit); setPage(1); },
    pageSizeOptions: [10, 15, 25, 50],
  }), [page, pageSize, filtered.length]);

  const columns: Column<AgentTeam>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => <span className={styles.nameText}>{row.name}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      width: '90px',
      hideOnMobile: true,
      render: (row) => row.built_in ? <StatusBadge variant="neutral" label="built-in" size="xs" shape="rect" /> : null,
    },
    {
      key: 'pattern',
      label: 'Pattern',
      width: '120px',
      hideOnMobile: true,
      render: (row) => (
        <span
          className={styles.patternBadge}
          style={{ backgroundColor: PATTERN_COLORS[row.pattern] || '#6b7280' }}
        >
          {PATTERN_LABELS[row.pattern] || row.pattern}
        </span>
      ),
    },
    {
      key: 'space',
      label: 'Space',
      width: '140px',
      hideOnTablet: true,
      render: (row) => {
        const space = row.space_id ? spaceMap.get(row.space_id) : null;
        if (!space) return <span className={styles.muted}>—</span>;
        return (
          <button
            className={styles.linkBtn}
            onClick={(e) => { e.stopPropagation(); onNavigate('spaces', { space_id: space.id }); }}
          >
            {space.name}
          </button>
        );
      },
    },
    {
      key: 'agents',
      label: 'Agents',
      width: '100px',
      render: (row) => {
        const count = row.nodes?.length ?? 0;
        return (
          <button
            className={styles.countLink}
            onClick={(e) => { e.stopPropagation(); onNavigate('agents', { team_slug: row.slug }); }}
          >
            {count} {count === 1 ? 'agent' : 'agents'}
          </button>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (row) => <StatusBadge variant={row.status === 'active' ? 'active' : 'inactive'} size="xs" />,
    },
    {
      key: 'updated_at',
      label: 'Updated',
      width: '130px',
      sortable: true,
      hideOnMobile: true,
      render: (row) => (
        <span className={styles.dateText}>
          {new Date(row.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '80px',
      render: (row) => (
        <VerticalDotsMenu
          actions={[
            { label: 'Edit', onClick: () => onEdit(row) },
            { label: 'View Topology', onClick: () => onViewTopology() },
            { label: 'Run', onClick: () => onRun(row) },
            ...(!row.built_in ? [{ label: 'Delete', onClick: () => onDelete(row), variant: 'danger' as const }] : []),
          ]}
        />
      ),
    },
  ], [spaceMap, onEdit, onDelete, onRun, onViewTopology, onNavigate]);

  return (
    <HubDataTable<AgentTeam>
      columns={columns}
      data={paginated}
      loading={loading}
      onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
      onSearch={handleSearch}
      onFilterChange={handleFilterChange}
      filters={filters}
      searchPlaceholder="Search teams..."
      pagination={pagination}
      toolbarActions={toolbarActions}
      emptyState={
        <div className={styles.emptyState}>
          <Users size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No teams found</p>
          <p className={styles.emptyDesc}>Create a team to coordinate multiple agents.</p>
        </div>
      }
      getRowId={(row) => row.id}
    />
  );
}
