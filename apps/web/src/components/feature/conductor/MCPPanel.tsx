/**
 * MCPPanel — MCP Integrations management in Conductor Build stage
 * Manages MCP server connections, tool catalog, and execution log.
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  Trash2,
  Plug,
  Wrench,
  Activity,
  ChevronDown,
  ChevronRight,
  Power,
} from 'lucide-react';
import type { MCPConnection, MCPToolCatalogEntry, MCPToolExecution } from '@/lib/mcp/types';
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

// ── Connection Card ─────────────────────────────────────────────────────────

function ConnectionCard({
  conn,
  onSync,
  onDelete,
  isSyncing,
}: {
  conn: MCPConnection;
  onSync: () => void;
  onDelete: () => void;
  isSyncing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusClass =
    conn.status === 'active' ? styles.statusActive
    : conn.status === 'error' ? styles.statusError
    : styles.statusInactive;

  const heartbeatAgo = conn.last_heartbeat
    ? formatTimeAgo(new Date(conn.last_heartbeat))
    : 'never';

  return (
    <div className={styles.connectionCard}>
      <div className={styles.connectionHeader} onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className={`${styles.statusDot} ${statusClass}`} />
        <span className={styles.connectionName}>{conn.name}</span>
        <div className={styles.connectionMeta}>
          <span className={styles.credBadge}>{conn.credential_type}</span>
          <span>{conn.tool_count} tools</span>
          <span>Heartbeat: {heartbeatAgo}</span>
        </div>
      </div>

      {expanded && (
        <>
          <div className={styles.connectionUrl}>{conn.server_url}</div>
          {conn.error_message && (
            <div className={styles.connectionUrl} style={{ color: '#ef4444' }}>
              Error: {conn.error_message}
            </div>
          )}
          <div className={styles.connectionActions}>
            <button className={styles.actionBtn} onClick={onSync} disabled={isSyncing}>
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Tools'}
            </button>
            <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => {
              if (confirm(`Delete "${conn.name}" and all its tools?`)) onDelete();
            }}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Tool Row ────────────────────────────────────────────────────────────────

function ToolRow({
  tool,
  connectionName,
  onToggle,
}: {
  tool: MCPToolCatalogEntry;
  connectionName: string;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className={styles.toolRow}>
      <div>
        <div className={styles.toolSlug}>{tool.qualified_slug}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{tool.description}</div>
      </div>
      <span className={styles.toolSource}>{connectionName}</span>
      <div className={styles.toolToggle}>
        <button
          className={`${styles.toggle} ${tool.enabled ? styles.toggleOn : styles.toggleOff}`}
          onClick={() => onToggle(!tool.enabled)}
          title={tool.enabled ? 'Disable' : 'Enable'}
        />
      </div>
      <div />
    </div>
  );
}

// ── Execution Row ───────────────────────────────────────────────────────────

function ExecutionRow({ exec }: { exec: MCPToolExecution }) {
  const time = new Date(exec.created_at).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const statusClass =
    exec.status === 'success' ? styles.statusSuccess
    : exec.status === 'error' ? styles.statusErrorBadge
    : styles.statusPending;

  return (
    <div className={styles.execRow}>
      <span className={styles.execTime}>{time}</span>
      <span className={styles.execTool}>{exec.qualified_slug}</span>
      <span className={styles.execAgent}>{exec.agent_slug ?? '-'}</span>
      <span className={styles.execDuration}>{exec.duration_ms ? `${exec.duration_ms}ms` : '-'}</span>
      <span className={styles.execStatus}>
        <span className={`${styles.statusBadge} ${statusClass}`}>{exec.status}</span>
      </span>
    </div>
  );
}

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

  const { data: tools = [] } = useQuery<(MCPToolCatalogEntry & { connection: { slug: string; name: string } })[]>({
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
  const activeCount = connections.filter((c) => c.status === 'active').length;
  const errorCount = connections.filter((c) => c.status === 'error').length;

  return (
    <div className={styles.container}>
      {/* Stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{connections.length}</div>
          <div className={styles.statLabel}>Connections</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalTools}</div>
          <div className={styles.statLabel}>Tools</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={activeCount > 0 ? { color: '#16a34a' } : {}}>{activeCount}</div>
          <div className={styles.statLabel}>Active</div>
        </div>
        {errorCount > 0 && (
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#ef4444' }}>{errorCount}</div>
            <div className={styles.statLabel}>Errors</div>
          </div>
        )}
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add Server
        </button>
      </div>

      {/* Sub-nav */}
      <div className={styles.subNav}>
        <button
          className={`${styles.subTab} ${subTab === 'connections' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('connections')}
        >
          <Plug size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Connections
        </button>
        <button
          className={`${styles.subTab} ${subTab === 'tools' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('tools')}
        >
          <Wrench size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Tool Catalog
        </button>
        <button
          className={`${styles.subTab} ${subTab === 'log' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('log')}
        >
          <Activity size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Execution Log
        </button>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* ── Connections sub-tab ──────────────────────────────────── */}
        {subTab === 'connections' && (
          connections.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Power size={40} /></div>
              <div className={styles.emptyTitle}>No MCP servers connected</div>
              <div className={styles.emptyText}>
                Register an MCP server to give agents access to external tools like Google Classroom, Jira, and more.
              </div>
            </div>
          ) : (
            <div className={styles.connectionList}>
              {connections.map((conn) => (
                <ConnectionCard
                  key={conn.id}
                  conn={conn}
                  isSyncing={syncingSlug === conn.slug}
                  onSync={() => {
                    setSyncingSlug(conn.slug);
                    syncMutation.mutate(conn.id);
                  }}
                  onDelete={() => deleteMutation.mutate(conn.id)}
                />
              ))}
            </div>
          )
        )}

        {/* ── Tool Catalog sub-tab ────────────────────────────────── */}
        {subTab === 'tools' && (
          tools.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Wrench size={40} /></div>
              <div className={styles.emptyTitle}>No tools discovered</div>
              <div className={styles.emptyText}>
                Sync a connection to discover available MCP tools.
              </div>
            </div>
          ) : (
            <div className={styles.toolTable}>
              {/* Header */}
              <div className={styles.toolRow} style={{ fontWeight: 600, fontSize: 11, color: '#9ca3af', borderBottom: '2px solid #e5e7eb' }}>
                <span>Tool</span>
                <span>Source</span>
                <span style={{ textAlign: 'center' }}>Enabled</span>
                <span />
              </div>
              {tools.map((tool) => (
                <ToolRow
                  key={tool.id}
                  tool={tool}
                  connectionName={tool.connection?.name ?? '?'}
                  onToggle={(enabled) => toggleToolMutation.mutate({ id: tool.id, enabled })}
                />
              ))}
            </div>
          )
        )}

        {/* ── Execution Log sub-tab ───────────────────────────────── */}
        {subTab === 'log' && (
          executions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Activity size={40} /></div>
              <div className={styles.emptyTitle}>No executions yet</div>
              <div className={styles.emptyText}>
                MCP tool calls from agents will appear here.
              </div>
            </div>
          ) : (
            <div className={styles.execTable}>
              <div className={styles.execRow} style={{ fontWeight: 600, fontSize: 11, color: '#9ca3af', borderBottom: '2px solid #e5e7eb' }}>
                <span>Time</span>
                <span>Tool</span>
                <span>Agent</span>
                <span style={{ textAlign: 'right' }}>Duration</span>
                <span style={{ textAlign: 'center' }}>Status</span>
              </div>
              {executions.map((exec) => (
                <ExecutionRow key={exec.id} exec={exec} />
              ))}
            </div>
          )
        )}
      </div>

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

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
