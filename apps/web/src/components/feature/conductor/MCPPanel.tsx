/**
 * MCPPanel — MCP Integrations management in Conductor Build stage
 * Manages MCP server connections, tool catalog, and execution log.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Plug,
  Wrench,
  Activity,
  Power,
} from 'lucide-react';
import type { MCPConnection, MCPToolCatalogEntry, MCPToolExecution } from '@/lib/mcp/types';
import { HubDataTable } from '@/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/components/hub/data';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import VerticalDotsMenu from '@/components/ui/actions/VerticalDotsMenu';
import { HubWidgetCard } from '@/components/hub/content';
import styles from './MCPPanel.module.css';

type SubTab = 'connections' | 'tools' | 'log';

// ── Add Server Modal ────────────────────────────────────────────────────────

interface AddServerForm {
  slug: string;
  name: string;
  server_url: string;
  credential_type: 'api_key' | 'oauth_delegated' | 'none';
  credentials: string; // JSON string
  metadata: string;    // JSON string
}

const EMPTY_FORM: AddServerForm = {
  slug: '',
  name: '',
  server_url: '',
  credential_type: 'api_key',
  credentials: '{}',
  metadata: '{}',
};

function AddServerModal({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void;
  onSubmit: (form: AddServerForm) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<AddServerForm>(EMPTY_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className={styles.modalTitle}>Add MCP Server</div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Slug (unique identifier)</label>
          <input
            className={styles.formInput}
            placeholder="e.g. jira, classroom, confluence"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Name</label>
          <input
            className={styles.formInput}
            placeholder="e.g. Atlassian Jira"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Server URL</label>
          <input
            className={styles.formInput}
            placeholder="https://mcp.example.com/v1"
            value={form.server_url}
            onChange={(e) => setForm({ ...form, server_url: e.target.value })}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Credential Type</label>
          <select
            className={styles.formSelect}
            value={form.credential_type}
            onChange={(e) => setForm({ ...form, credential_type: e.target.value as AddServerForm['credential_type'] })}
          >
            <option value="api_key">API Key (org-wide)</option>
            <option value="oauth_delegated">OAuth Delegated (per-user)</option>
            <option value="none">None (public)</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Credentials (JSON)</label>
          <textarea
            className={styles.formTextarea}
            placeholder={'{\n  "apiToken": "...",\n  "email": "..."\n}'}
            value={form.credentials}
            onChange={(e) => setForm({ ...form, credentials: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Metadata (JSON, optional)</label>
          <textarea
            className={styles.formTextarea}
            placeholder={'{\n  "oauth_platform": "google_classroom"\n}'}
            value={form.metadata}
            onChange={(e) => setForm({ ...form, metadata: e.target.value })}
          />
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting || !form.slug || !form.name || !form.server_url}
          >
            {isSubmitting ? 'Registering...' : 'Register Server'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Tool Catalog type (with connection join) ────────────────────────────────
type ToolWithConnection = MCPToolCatalogEntry & { connection: { slug: string; name: string } };

// ── Main Panel ──────────────────────────────────────────────────────────────

export function MCPPanel() {
  const [subTab, setSubTab] = useState<SubTab>('connections');
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  // Queries
  const { data: connections = [] } = useQuery<MCPConnection[]>({
    queryKey: ['mcp-connections'],
    queryFn: () => fetch('/api/admin/mcp/connections').then((r) => r.json()),
  });

  const { data: tools = [] } = useQuery<ToolWithConnection[]>({
    queryKey: ['mcp-tools'],
    queryFn: () => fetch('/api/admin/mcp/tools').then((r) => r.json()),
    enabled: subTab === 'tools',
  });

  const { data: executions = [] } = useQuery<MCPToolExecution[]>({
    queryKey: ['mcp-executions'],
    queryFn: () => fetch('/api/admin/mcp/executions').then((r) => r.json()),
    enabled: subTab === 'log',
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (form: AddServerForm) => {
      const res = await fetch('/api/admin/mcp/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          credentials: JSON.parse(form.credentials),
          metadata: JSON.parse(form.metadata),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mcp-connections'] });
      setShowModal(false);
    },
  });

  // ── Client-side pagination state ─────────────────────────────────────────
  const [connPage, setConnPage] = useState(1);
  const [connPageSize, setConnPageSize] = useState(15);
  const [connSearch, setConnSearch] = useState('');
  const [connSortKey, setConnSortKey] = useState<string>('name');
  const [connSortDir, setConnSortDir] = useState<'asc' | 'desc'>('asc');

  const [toolPage, setToolPage] = useState(1);
  const [toolPageSize, setToolPageSize] = useState(15);
  const [toolSearch, setToolSearch] = useState('');
  const [toolSortKey, setToolSortKey] = useState<string>('qualified_slug');
  const [toolSortDir, setToolSortDir] = useState<'asc' | 'desc'>('asc');
  const [toolFilterValues, setToolFilterValues] = useState<Record<string, string>>({});

  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(15);
  const [logSearch, setLogSearch] = useState('');
  const [logSortKey, setLogSortKey] = useState<string>('created_at');
  const [logSortDir, setLogSortDir] = useState<'asc' | 'desc'>('desc');

  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/mcp/connections/${id}/sync`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mcp-connections'] });
      qc.invalidateQueries({ queryKey: ['mcp-tools'] });
      setSyncingSlug(null);
    },
    onError: () => setSyncingSlug(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/mcp/connections/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mcp-connections'] });
      qc.invalidateQueries({ queryKey: ['mcp-tools'] });
    },
  });

  const toggleToolMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await fetch(`/api/admin/mcp/tools/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mcp-tools'] }),
  });

  const totalTools = connections.reduce((sum, c) => sum + c.tool_count, 0);

  // ── Filtered + paginated data ───────────────────────────────────────────
  const filteredConnections = useMemo(() => {
    let data = [...connections];
    if (connSearch) {
      const q = connSearch.toLowerCase();
      data = data.filter(c => c.name.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      let cmp = 0;
      if (connSortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (connSortKey === 'tool_count') cmp = a.tool_count - b.tool_count;
      return connSortDir === 'desc' ? -cmp : cmp;
    });
    return data;
  }, [connections, connSearch, connSortKey, connSortDir]);

  const paginatedConnections = useMemo(() => {
    const start = (connPage - 1) * connPageSize;
    return filteredConnections.slice(start, start + connPageSize);
  }, [filteredConnections, connPage, connPageSize]);

  const connPagination: PaginationConfig = useMemo(() => ({
    page: connPage, limit: connPageSize, total: filteredConnections.length,
    onPageChange: setConnPage,
    onLimitChange: (n: number) => { setConnPageSize(n); setConnPage(1); },
    pageSizeOptions: [10, 15, 25, 50],
  }), [connPage, connPageSize, filteredConnections.length]);

  const filteredTools = useMemo(() => {
    let data = [...tools];
    if (toolSearch) {
      const q = toolSearch.toLowerCase();
      data = data.filter(t => t.qualified_slug.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    if (toolFilterValues.connection) {
      data = data.filter(t => t.connection?.slug === toolFilterValues.connection);
    }
    if (toolFilterValues.enabled) {
      const en = toolFilterValues.enabled === 'true';
      data = data.filter(t => t.enabled === en);
    }
    data.sort((a, b) => {
      let cmp = 0;
      if (toolSortKey === 'qualified_slug') cmp = a.qualified_slug.localeCompare(b.qualified_slug);
      return toolSortDir === 'desc' ? -cmp : cmp;
    });
    return data;
  }, [tools, toolSearch, toolFilterValues, toolSortKey, toolSortDir]);

  const paginatedTools = useMemo(() => {
    const start = (toolPage - 1) * toolPageSize;
    return filteredTools.slice(start, start + toolPageSize);
  }, [filteredTools, toolPage, toolPageSize]);

  const toolPagination: PaginationConfig = useMemo(() => ({
    page: toolPage, limit: toolPageSize, total: filteredTools.length,
    onPageChange: setToolPage,
    onLimitChange: (n: number) => { setToolPageSize(n); setToolPage(1); },
    pageSizeOptions: [10, 15, 25, 50],
  }), [toolPage, toolPageSize, filteredTools.length]);

  const filteredExecutions = useMemo(() => {
    let data = [...executions];
    if (logSearch) {
      const q = logSearch.toLowerCase();
      data = data.filter(e => e.qualified_slug.toLowerCase().includes(q) || e.agent_slug?.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      let cmp = 0;
      if (logSortKey === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (logSortKey === 'qualified_slug') cmp = a.qualified_slug.localeCompare(b.qualified_slug);
      else if (logSortKey === 'duration_ms') cmp = (a.duration_ms ?? 0) - (b.duration_ms ?? 0);
      else if (logSortKey === 'status') cmp = a.status.localeCompare(b.status);
      return logSortDir === 'desc' ? -cmp : cmp;
    });
    return data;
  }, [executions, logSearch, logSortKey, logSortDir]);

  const paginatedExecutions = useMemo(() => {
    const start = (logPage - 1) * logPageSize;
    return filteredExecutions.slice(start, start + logPageSize);
  }, [filteredExecutions, logPage, logPageSize]);

  const logPagination: PaginationConfig = useMemo(() => ({
    page: logPage, limit: logPageSize, total: filteredExecutions.length,
    onPageChange: setLogPage,
    onLimitChange: (n: number) => { setLogPageSize(n); setLogPage(1); },
    pageSizeOptions: [10, 15, 25, 50],
  }), [logPage, logPageSize, filteredExecutions.length]);

  const handleConnSearch = useCallback((q: string) => { setConnSearch(q); setConnPage(1); }, []);
  const handleToolSearch = useCallback((q: string) => { setToolSearch(q); setToolPage(1); }, []);
  const handleLogSearch = useCallback((q: string) => { setLogSearch(q); setLogPage(1); }, []);
  const handleToolFilter = useCallback((key: string, value: string | string[]) => {
    setToolFilterValues(prev => ({ ...prev, [key]: value as string }));
    setToolPage(1);
  }, []);

  // ── Connection columns ────────────────────────────────────────────────────
  const connectionColumns: Column<MCPConnection>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.name}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (row) => {
        const variant = row.status === 'active' ? 'active' as const
          : row.status === 'error' ? 'error' as const
          : 'inactive' as const;
        return <StatusBadge variant={variant} size="xs" />;
      },
    },
    {
      key: 'credential_type',
      label: 'Credential',
      width: '130px',
      hideOnMobile: true,
      render: (row) => <span className={styles.credBadge}>{row.credential_type}</span>,
    },
    {
      key: 'tool_count',
      label: 'Tools',
      width: '80px',
      sortable: true,
      render: (row) => <span style={{ fontSize: '0.8125rem' }}>{row.tool_count}</span>,
    },
    {
      key: 'last_heartbeat',
      label: 'Heartbeat',
      width: '120px',
      hideOnMobile: true,
      render: (row) => (
        <span style={{ color: 'var(--color-gray-400, #9ca3af)', fontSize: '0.8125rem' }}>
          {row.last_heartbeat ? formatTimeAgo(new Date(row.last_heartbeat)) : 'never'}
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
            {
              label: syncingSlug === row.slug ? 'Syncing...' : 'Sync Tools',
              onClick: () => {
                setSyncingSlug(row.slug);
                syncMutation.mutate(row.id);
              },
            },
            {
              label: 'Delete',
              onClick: () => {
                if (confirm(`Delete "${row.name}" and all its tools?`)) {
                  deleteMutation.mutate(row.id);
                }
              },
              variant: 'danger' as const,
            },
          ]}
        />
      ),
    },
  ];

  const connectionFilters: Filter[] = [
    {
      key: 'status',
      label: 'All Statuses',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Error', value: 'error' },
      ],
    },
  ];

  // ── Tool Catalog columns ──────────────────────────────────────────────────
  const uniqueConnections = Array.from(
    new Map(tools.map(t => [t.connection?.slug, t.connection?.name])).entries()
  ).filter(([slug]) => slug);

  const toolFilters: Filter[] = [
    {
      key: 'connection',
      label: 'All Sources',
      options: uniqueConnections.map(([slug, name]) => ({ value: slug!, label: name ?? slug! })),
    },
    {
      key: 'enabled',
      label: 'All States',
      options: [
        { label: 'Enabled', value: 'true' },
        { label: 'Disabled', value: 'false' },
      ],
    },
  ];

  const toolColumns: Column<ToolWithConnection>[] = [
    {
      key: 'qualified_slug',
      label: 'Tool',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.qualified_slug}</div>
          {row.description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400, #9ca3af)', marginTop: 2 }}>
              {row.description.length > 100 ? `${row.description.slice(0, 100)}...` : row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'connection',
      label: 'Source',
      width: '120px',
      render: (row) => (
        <span className={styles.toolSource}>{row.connection?.name ?? '?'}</span>
      ),
    },
    {
      key: 'enabled',
      label: 'Enabled',
      width: '80px',
      render: (row) => (
        <div className={styles.toolToggle}>
          <button
            className={`${styles.toggle} ${row.enabled ? styles.toggleOn : styles.toggleOff}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleToolMutation.mutate({ id: row.id, enabled: !row.enabled });
            }}
            title={row.enabled ? 'Disable' : 'Enable'}
          />
        </div>
      ),
    },
  ];

  // ── Execution Log columns ─────────────────────────────────────────────────
  const executionColumns: Column<MCPToolExecution>[] = [
    {
      key: 'created_at',
      label: 'Time',
      width: '160px',
      sortable: true,
      render: (row) => (
        <span style={{ color: 'var(--color-gray-400, #9ca3af)', fontSize: '0.8125rem' }}>
          {new Date(row.created_at).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'qualified_slug',
      label: 'Tool',
      sortable: true,
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.qualified_slug}</span>
      ),
    },
    {
      key: 'agent_slug',
      label: 'Agent',
      width: '120px',
      hideOnMobile: true,
      render: (row) => <span>{row.agent_slug ?? '-'}</span>,
    },
    {
      key: 'duration_ms',
      label: 'Duration',
      width: '100px',
      hideOnMobile: true,
      sortable: true,
      render: (row) => (
        <span style={{ color: 'var(--color-gray-400, #9ca3af)', fontSize: '0.8125rem' }}>{row.duration_ms ? `${row.duration_ms}ms` : '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      sortable: true,
      render: (row) => {
        const variant = row.status === 'success' ? 'success' as const
          : row.status === 'error' ? 'error' as const
          : 'warning' as const;
        return <StatusBadge variant={variant} label={row.status} size="xs" />;
      },
    },
  ];

  const executionFilters: Filter[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'All', value: '' },
        { label: 'Success', value: 'success' },
        { label: 'Error', value: 'error' },
        { label: 'Pending', value: 'pending' },
      ],
    },
  ];

  return (
    <div className={styles.container}>
      {/* Sub-tab bar — matches Registry tabBar pattern */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${subTab === 'connections' ? styles.tabActive : ''}`}
          onClick={() => setSubTab('connections')}
        >
          <Plug size={13} /> Connections ({connections.length})
        </button>
        <button
          className={`${styles.tab} ${subTab === 'tools' ? styles.tabActive : ''}`}
          onClick={() => setSubTab('tools')}
        >
          <Wrench size={13} /> Tools ({totalTools})
        </button>
        <button
          className={`${styles.tab} ${subTab === 'log' ? styles.tabActive : ''}`}
          onClick={() => setSubTab('log')}
        >
          <Activity size={13} /> Execution Log
        </button>
      </div>

      {/* Body */}
      <div className={styles.content}>
        {/* ── Connections sub-tab ──────────────────────────────────── */}
        {subTab === 'connections' && (
          <HubDataTable<MCPConnection>
            columns={connectionColumns}
            data={paginatedConnections}
            loading={!connections}
            getRowId={(row) => row.id}
            filters={connectionFilters}
            onSearch={handleConnSearch}
            onSort={(key, dir) => { setConnSortKey(key); setConnSortDir(dir); }}
            pagination={connPagination}
            searchPlaceholder="Search connections..."
            emptyMessage="No MCP servers connected. Register a server to give agents access to external tools."
            toolbarActions={
              <button className={styles.addBtn} onClick={() => setShowModal(true)}>
                <Plus size={14} /> Add Server
              </button>
            }
            emptyState={
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><Power size={32} /></div>
                <div className={styles.emptyTitle}>No MCP servers connected</div>
                <div className={styles.emptyText}>
                  Register an MCP server to give agents access to external tools like Google Classroom, Jira, and more.
                </div>
              </div>
            }
          />
        )}

        {/* ── Tool Catalog sub-tab ────────────────────────────────── */}
        {subTab === 'tools' && (
          <HubDataTable<ToolWithConnection>
            columns={toolColumns}
            data={paginatedTools}
            loading={!tools}
            getRowId={(row) => row.id}
            filters={toolFilters}
            onSearch={handleToolSearch}
            onSort={(key, dir) => { setToolSortKey(key); setToolSortDir(dir); }}
            onFilterChange={handleToolFilter}
            pagination={toolPagination}
            searchPlaceholder="Search tools..."
            emptyMessage="No tools discovered. Sync a connection to discover available MCP tools."
          />
        )}

        {/* ── Execution Log sub-tab ───────────────────────────────── */}
        {subTab === 'log' && (
          <HubDataTable<MCPToolExecution>
            columns={executionColumns}
            data={paginatedExecutions}
            loading={!executions}
            getRowId={(row) => row.id}
            filters={executionFilters}
            onSearch={handleLogSearch}
            onSort={(key, dir) => { setLogSortKey(key); setLogSortDir(dir); }}
            pagination={logPagination}
            searchPlaceholder="Search executions..."
            emptyMessage="No executions yet. MCP tool calls from agents will appear here."
          />
        )}
      </div>  {/* end .content */}

      {/* Add Server Modal */}
      {showModal && (
        <AddServerModal
          onClose={() => setShowModal(false)}
          onSubmit={(form) => addMutation.mutate(form)}
          isSubmitting={addMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// --- Sidebar (rendered at page level by Conductor) ---

export function IntegrationsSidebar() {
  return (
    <>
      <HubWidgetCard title="Integrations Help">
        <div className={styles.tipsList}>
          <p>Add <strong>MCP servers</strong> to give agents access to external tools and APIs.</p>
          <p>The <strong>Tool Catalog</strong> shows all tools exposed by connected servers.</p>
          <p>The <strong>Execution Log</strong> records every tool call made by agents.</p>
        </div>
      </HubWidgetCard>
      <HubWidgetCard title="Integrations Tips">
        <div className={styles.tipsList}>
          <p>Disable unused servers to reduce latency and avoid unnecessary API calls.</p>
          <p>Check the execution log for failed calls — they may indicate auth or config issues.</p>
          <p>Each server connection is tested on add — fix any errors before enabling.</p>
        </div>
      </HubWidgetCard>
    </>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
