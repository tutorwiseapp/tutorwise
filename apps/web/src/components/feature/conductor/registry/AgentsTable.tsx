'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { HubDataTable, type Column, type Filter, type PaginationConfig } from '@/components/hub/data';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import VerticalDotsMenu from '@/components/ui/actions/VerticalDotsMenu';
import { Bot } from 'lucide-react';
import styles from './AgentsTable.module.css';

interface AgentConfig {
  tools?: string[];
  [key: string]: unknown;
}

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  description: string | null;
  config: AgentConfig;
  seed_config?: AgentConfig | null;
  status: 'active' | 'inactive';
  built_in: boolean;
  updated_at: string;
}

interface AgentTeam {
  id: string;
  slug: string;
  name: string;
  nodes: Array<{ id: string; data: { agentSlug: string } }>;
  space_id: string | null;
}

interface AgentSpace {
  id: string;
  slug: string;
  name: string;
}

interface AgentsTableProps {
  agents: SpecialistAgent[];
  teams: AgentTeam[];
  spaces: AgentSpace[];
  loading: boolean;
  agentToTeam: Map<string, AgentTeam>;
  onConfigure: (agent: SpecialistAgent) => void;
  onChat: (agent: SpecialistAgent) => void;
  onRun: (agent: SpecialistAgent) => void;
  onClone: (agent: SpecialistAgent) => void;
  onDelete: (agent: SpecialistAgent) => void;
  onNavigate: (subTab: 'teams', filter?: Record<string, string>) => void;
  toolbarActions?: React.ReactNode;
}

const PAGE_SIZE = 15;

export function AgentsTable({
  agents, teams, spaces, loading, agentToTeam,
  onConfigure, onChat, onRun, onClone, onDelete, onNavigate, toolbarActions,
}: AgentsTableProps) {
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const filters: Filter[] = useMemo(() => [
    {
      key: 'space_id',
      label: 'All Spaces',
      options: spaces.map(s => ({ value: s.id, label: s.name })),
    },
    {
      key: 'team_slug',
      label: 'All Teams',
      options: teams.map(t => ({ value: t.slug, label: t.name })),
    },
    {
      key: 'status',
      label: 'All Statuses',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ], [spaces, teams]);

  const handleFilterChange = useCallback((key: string, value: string | string[]) => {
    setFilterValues(prev => ({ ...prev, [key]: String(value) }));
    setPage(1);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const filtered = useMemo(() => {
    let data = [...agents];

    if (filterValues.space_id) {
      const teamIdsInSpace = new Set(teams.filter(t => t.space_id === filterValues.space_id).map(t => t.slug));
      data = data.filter(a => {
        const team = agentToTeam.get(a.slug);
        return team && teamIdsInSpace.has(team.slug);
      });
    }

    if (filterValues.team_slug) {
      data = data.filter(a => {
        const team = agentToTeam.get(a.slug);
        return team && team.slug === filterValues.team_slug;
      });
    }

    if (filterValues.status) data = data.filter(a => a.status === filterValues.status);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'updated_at') cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return data;
  }, [agents, teams, searchQuery, filterValues, agentToTeam, sortKey, sortDir]);

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

  const columns: Column<SpecialistAgent>[] = useMemo(() => [
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
      key: 'role',
      label: 'Role',
      width: '130px',
      hideOnMobile: true,
      render: (row) => <span className={styles.cellText}>{row.role}</span>,
    },
    {
      key: 'department',
      label: 'Department',
      width: '130px',
      hideOnMobile: true,
      render: (row) => <span className={styles.cellText}>{row.department}</span>,
    },
    {
      key: 'team',
      label: 'Team',
      width: '140px',
      hideOnTablet: true,
      render: (row) => {
        const team = agentToTeam.get(row.slug);
        if (!team) return <span className={styles.muted}>—</span>;
        return (
          <button
            className={styles.linkBtn}
            onClick={(e) => { e.stopPropagation(); onNavigate('teams', { team_slug: team.slug }); }}
          >
            {team.name}
          </button>
        );
      },
    },
    {
      key: 'tools',
      label: 'Tools',
      width: '70px',
      hideOnTablet: true,
      render: (row) => <span className={styles.cellText}>{row.config?.tools?.length ?? 0}</span>,
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
            { label: 'Configure', onClick: () => onConfigure(row) },
            { label: 'Chat', onClick: () => onChat(row) },
            { label: 'Run', onClick: () => onRun(row) },
            { label: 'Clone', onClick: () => onClone(row) },
            ...(!row.built_in ? [{ label: 'Delete', onClick: () => onDelete(row), variant: 'danger' as const }] : []),
          ]}
        />
      ),
    },
  ], [agentToTeam, onConfigure, onChat, onRun, onClone, onDelete, onNavigate]);

  return (
    <HubDataTable<SpecialistAgent>
      columns={columns}
      data={paginated}
      loading={loading}
      onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
      onSearch={handleSearch}
      onFilterChange={handleFilterChange}
      filters={filters}
      searchPlaceholder="Search agents..."
      pagination={pagination}
      toolbarActions={toolbarActions}
      emptyState={
        <div className={styles.emptyState}>
          <Bot size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No agents found</p>
          <p className={styles.emptyDesc}>Create an agent or adjust your filters.</p>
        </div>
      }
      getRowId={(row) => row.id}
    />
  );
}
