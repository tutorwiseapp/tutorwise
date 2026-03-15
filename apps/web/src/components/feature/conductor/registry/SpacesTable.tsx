'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { HubDataTable, type Column, type PaginationConfig } from '@/components/hub/data';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import VerticalDotsMenu from '@/components/ui/actions/VerticalDotsMenu';
import { Layers } from 'lucide-react';
import styles from './SpacesTable.module.css';

interface AgentSpace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  built_in: boolean;
  updated_at: string;
}

interface AgentTeam {
  id: string;
  slug: string;
  name: string;
  space_id: string | null;
  nodes: Array<{ id: string; data: { agentSlug: string } }>;
  status: string;
}

interface SpacesTableProps {
  spaces: AgentSpace[];
  teams: AgentTeam[];
  loading: boolean;
  onEdit: (space: AgentSpace) => void;
  onDelete: (space: AgentSpace) => void;
  onViewTopology: () => void;
  onNavigate: (subTab: 'teams' | 'agents', filter?: Record<string, string>) => void;
  toolbarActions?: React.ReactNode;
}

const PAGE_SIZE = 15;

export function SpacesTable({ spaces, teams, loading, onEdit, onDelete, onViewTopology, onNavigate, toolbarActions }: SpacesTableProps) {
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const spaceCounts = useMemo(() => {
    const counts: Record<string, { teams: number; agents: number }> = {};
    for (const space of spaces) {
      counts[space.id] = { teams: 0, agents: 0 };
    }
    for (const team of teams) {
      if (team.space_id && counts[team.space_id]) {
        counts[team.space_id].teams += 1;
        counts[team.space_id].agents += team.nodes?.length ?? 0;
      }
    }
    return counts;
  }, [spaces, teams]);

  const filtered = useMemo(() => {
    let data = [...spaces];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(s => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'updated_at') cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return data;
  }, [spaces, searchQuery, sortKey, sortDir]);

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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const columns: Column<AgentSpace>[] = useMemo(() => [
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
      key: 'description',
      label: 'Description',
      hideOnMobile: true,
      render: (row) => (
        <span className={styles.descText}>
          {row.description ? (row.description.length > 80 ? row.description.slice(0, 80) + '…' : row.description) : '—'}
        </span>
      ),
    },
    {
      key: 'teams',
      label: 'Teams',
      width: '100px',
      render: (row) => {
        const count = spaceCounts[row.id]?.teams ?? 0;
        return (
          <button
            className={styles.countLink}
            onClick={(e) => { e.stopPropagation(); onNavigate('teams', { space_id: row.id }); }}
          >
            {count} {count === 1 ? 'team' : 'teams'}
          </button>
        );
      },
    },
    {
      key: 'agents',
      label: 'Agents',
      width: '100px',
      render: (row) => {
        const count = spaceCounts[row.id]?.agents ?? 0;
        return (
          <button
            className={styles.countLink}
            onClick={(e) => { e.stopPropagation(); onNavigate('agents', { space_id: row.id }); }}
          >
            {count}
          </button>
        );
      },
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
            { label: 'View Teams', onClick: () => onNavigate('teams', { space_id: row.id }) },
            { label: 'View Agents', onClick: () => onNavigate('agents', { space_id: row.id }) },
            { label: 'View Topology', onClick: () => onViewTopology() },
            ...(!row.built_in ? [{ label: 'Delete', onClick: () => onDelete(row), variant: 'danger' as const }] : []),
          ]}
        />
      ),
    },
  ], [spaceCounts, onEdit, onDelete, onViewTopology, onNavigate]);

  return (
    <HubDataTable<AgentSpace>
      columns={columns}
      data={paginated}
      loading={loading}
      onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
      onSearch={handleSearch}
      searchPlaceholder="Search spaces..."
      pagination={pagination}
      toolbarActions={toolbarActions}
      emptyState={
        <div className={styles.emptyState}>
          <Layers size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No spaces found</p>
          <p className={styles.emptyDesc}>Create a space to organise your teams by department.</p>
        </div>
      }
      getRowId={(row) => row.id}
    />
  );
}
