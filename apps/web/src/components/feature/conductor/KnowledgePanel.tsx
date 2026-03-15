'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, Search, BookOpen } from 'lucide-react';
import { UnifiedSelect } from '@/components/ui/forms';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import { HubDataTable } from '@/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/components/hub/data';
import VerticalDotsMenu from '@/components/ui/actions/VerticalDotsMenu';
import type { MenuAction } from '@/components/ui/actions/VerticalDotsMenu';
import { HubWidgetCard } from '@/components/hub/content';
import styles from './KnowledgePanel.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

type KnowledgeCategory =
  | 'workflow_process' | 'handler_doc' | 'policy' | 'help_article'
  | 'intel_caas' | 'intel_resources' | 'intel_seo' | 'intel_marketplace'
  | 'intel_listings' | 'intel_bookings' | 'intel_financials'
  | 'intel_virtualspace' | 'intel_referral' | 'intel_retention'
  | 'intel_ai_adoption' | 'intel_org_conversion' | 'intel_ai_studio' | 'intel_network';

const CATEGORIES: KnowledgeCategory[] = [
  'workflow_process', 'handler_doc', 'policy', 'help_article',
  'intel_caas', 'intel_resources', 'intel_seo', 'intel_marketplace',
  'intel_listings', 'intel_bookings', 'intel_financials',
  'intel_virtualspace', 'intel_referral', 'intel_retention',
  'intel_ai_adoption', 'intel_org_conversion', 'intel_ai_studio', 'intel_network',
];

interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  source_ref: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface RagResult {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  similarity: number;
}

interface ChunkFormState {
  title: string;
  content: string;
  category: KnowledgeCategory;
  source_ref: string;
  tags: string; // comma-separated string in the form
}

const DEFAULT_FORM: ChunkFormState = {
  title: '',
  content: '',
  category: 'workflow_process',
  source_ref: '',
  tags: '',
};

type SubTab = 'knowledge' | 'rag';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  } catch {
    return iso;
  }
}

// ── Chunk Form ────────────────────────────────────────────────────────────────

function ChunkForm({
  initial,
  title,
  onSave,
  onCancel,
  saving,
}: {
  initial: ChunkFormState;
  title: string;
  onSave: (data: ChunkFormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ChunkFormState>(initial);

  function set(field: keyof ChunkFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className={styles.formCard}>
      <p className={styles.formTitle}>
        <BookOpen size={14} />
        {title}
      </p>
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Title</label>
          <input
            className={styles.formInput}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Knowledge chunk title"
            aria-label="Title"
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Category</label>
          <UnifiedSelect
            value={form.category}
            onChange={(v) => set('category', v as KnowledgeCategory)}
            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            size="sm"
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Source Ref</label>
          <input
            className={styles.formInput}
            value={form.source_ref}
            onChange={(e) => set('source_ref', e.target.value)}
            placeholder="e.g. migration_342, handler_commission"
            aria-label="Source reference"
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Tags (comma-separated)</label>
          <input
            className={styles.formInput}
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="e.g. stripe, webhook, payout"
            aria-label="Tags, comma-separated"
          />
        </div>
        <div className={styles.formFieldFull}>
          <label className={styles.formLabel}>Content</label>
          <textarea
            className={styles.formTextarea}
            rows={5}
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder="Full knowledge chunk content…"
            aria-label="Content"
          />
        </div>
      </div>
      <div className={styles.formActions}>
        <button className={styles.cancelBtn} onClick={onCancel} type="button">
          <X size={13} />
          Cancel
        </button>
        <button
          className={styles.saveBtn}
          onClick={() => onSave(form)}
          disabled={saving || !form.title.trim() || !form.content.trim()}
          type="button"
        >
          <Save size={13} />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── RAG Preview ───────────────────────────────────────────────────────────────

function RagPreview() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('');
  const [results, setResults] = useState<RagResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function runPreview() {
    if (!query.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/conductor/knowledge/preview-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), category: category || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setResults(json.data ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to run RAG preview');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.ragCard}>
      <h3 className={styles.ragTitle}>
        <Search size={15} />
        Preview RAG Retrieval
      </h3>
      <div className={styles.ragInputRow}>
        <input
          className={styles.ragInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a test query to see which chunks match…"
          onKeyDown={(e) => e.key === 'Enter' && runPreview()}
          aria-label="RAG preview query"
        />
        <div className={styles.ragCategorySelect}>
          <UnifiedSelect
            value={category}
            placeholder="All categories"
            onChange={(v) => setCategory(v as string)}
            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            size="sm"
          />
        </div>
        <button
          className={styles.ragBtn}
          onClick={runPreview}
          disabled={loading || !query.trim()}
          type="button"
        >
          <Search size={13} />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {err && <div className={styles.error}>{err}</div>}

      {results !== null && (
        <div className={styles.ragResults}>
          {results.length === 0 ? (
            <div className={styles.empty}>
              <Search size={28} className={styles.emptyIcon} />
              <span>No matching chunks found.</span>
              <span className={styles.emptyHint}>Try a different query or lower the threshold.</span>
            </div>
          ) : (
            results.map((r, i) => (
              <div key={r.id} className={styles.ragResultItem}>
                <div className={styles.ragRank}>{i + 1}</div>
                <div className={styles.ragResultBody}>
                  <div className={styles.ragResultTitle}>{r.title}</div>
                  <div className={styles.ragResultMeta}>
                    <span>{r.category}</span>
                    <span className={styles.similarityBadge}>
                      {(r.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <div className={styles.ragResultContent}>{r.content}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Table Columns ─────────────────────────────────────────────────────────────

function buildColumns(
  editingId: string | null,
  setEditingId: (id: string | null) => void,
  setShowAddForm: (show: boolean) => void,
  handleDelete: (chunk: KnowledgeChunk) => void,
  deletePending: boolean,
): Column<KnowledgeChunk>[] {
  return [
    {
      key: 'title',
      label: 'Title',
      width: '300px',
      sortable: true,
      render: (chunk) => (
        <div>
          <div className={styles.chunkTitle}>{chunk.title}</div>
          <div className={styles.chunkPreview}>{chunk.content}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: '160px',
      sortable: true,
      hideOnMobile: true,
      render: (chunk) => (
        <StatusBadge variant="neutral" label={chunk.category} size="xs" shape="rect" />
      ),
    },
    {
      key: 'source_ref',
      label: 'Source Ref',
      width: '140px',
      sortable: true,
      hideOnMobile: true,
      render: (chunk) => (
        <span className={styles.mono}>{chunk.source_ref ?? '—'}</span>
      ),
    },
    {
      key: 'tags',
      label: 'Tags',
      width: '180px',
      hideOnTablet: true,
      render: (chunk) => (
        <div className={styles.tagsWrap}>
          {(chunk.tags ?? []).length > 0
            ? chunk.tags.map((t) => (
                <StatusBadge key={t} variant="neutral" label={t} size="xs" shape="rect" />
              ))
            : <span className={styles.mono}>—</span>
          }
        </div>
      ),
    },
    {
      key: 'updated_at',
      label: 'Updated',
      width: '100px',
      sortable: true,
      hideOnMobile: true,
      render: (chunk) => formatDate(chunk.updated_at),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (chunk) => {
        const actions: MenuAction[] = [
          {
            label: 'Edit',
            onClick: () => {
              setEditingId(editingId === chunk.id ? null : chunk.id);
              setShowAddForm(false);
            },
          },
          {
            label: 'Delete',
            variant: 'danger',
            disabled: deletePending,
            onClick: () => handleDelete(chunk),
          },
        ];
        return <VerticalDotsMenu actions={actions} />;
      },
    },
  ];
}

// ── Category filter for HubDataTable ─────────────────────────────────────────

const CATEGORY_FILTERS: Filter[] = [
  {
    key: 'category',
    label: 'All Categories',
    options: CATEGORIES.map((cat) => ({ value: cat, label: cat })),
  },
];

// ── Main Panel ────────────────────────────────────────────────────────────────

export function KnowledgePanel() {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SubTab>('knowledge');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const { data: chunks = [], isFetching, error, refetch } = useQuery<KnowledgeChunk[]>({
    queryKey: ['knowledge-chunks', filterCategory],
    queryFn: async () => {
      const url = filterCategory
        ? `/api/admin/conductor/knowledge?category=${encodeURIComponent(filterCategory)}`
        : '/api/admin/conductor/knowledge';
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 2 * 60_000,
    retry: false,
    refetchOnWindowFocus: true,
  });

  // ── Create ─────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (form: ChunkFormState) => {
      const res = await fetch('/api/admin/conductor/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          category: form.category,
          source_ref: form.source_ref.trim() || null,
          tags: parseTags(form.tags),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Knowledge chunk created');
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to create chunk');
    },
  });

  // ── Update ─────────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: ChunkFormState }) => {
      const res = await fetch(`/api/admin/conductor/knowledge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          category: form.category,
          source_ref: form.source_ref.trim() || null,
          tags: parseTags(form.tags),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Knowledge chunk updated');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to update chunk');
    },
  });

  // ── Delete ─────────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/conductor/knowledge/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      toast.success('Knowledge chunk deleted');
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks'] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to delete chunk');
    },
  });

  function handleDelete(chunk: KnowledgeChunk) {
    if (!window.confirm(`Delete "${chunk.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(chunk.id);
  }

  function chunkToForm(chunk: KnowledgeChunk): ChunkFormState {
    return {
      title: chunk.title,
      content: chunk.content,
      category: chunk.category,
      source_ref: chunk.source_ref ?? '',
      tags: (chunk.tags ?? []).join(', '),
    };
  }

  // ── Filter handler for HubDataTable ─────────────────────────────────────────

  const handleFilterChange = useCallback((filterKey: string, value: string | string[]) => {
    if (filterKey === 'category') {
      setFilterCategory(typeof value === 'string' ? value : value[0] ?? '');
    }
  }, []);

  // ── Filtered + searched data ───────────────────────────────────────────────

  const filteredChunks = useMemo(() => {
    if (!searchQuery.trim()) return chunks;
    const q = searchQuery.toLowerCase();
    return chunks.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q),
    );
  }, [chunks, searchQuery]);

  // ── Editing chunk (for form above table) ───────────────────────────────────

  const editingChunk = useMemo(
    () => (editingId ? chunks.find((c) => c.id === editingId) ?? null : null),
    [editingId, chunks],
  );

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns = useMemo(
    () => buildColumns(editingId, setEditingId, setShowAddForm, handleDelete, deleteMutation.isPending),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingId, deleteMutation.isPending],
  );

  // ── Pagination ──────────────────────────────────────────────────────────────

  const pagination: PaginationConfig = useMemo(() => ({
    page,
    limit: pageSize,
    total: filteredChunks.length,
    onPageChange: setPage,
    onLimitChange: (newLimit: number) => {
      setPageSize(newLimit);
      setPage(1);
    },
    pageSizeOptions: [10, 15, 25, 50],
  }), [page, pageSize, filteredChunks.length]);

  const paginatedChunks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredChunks.slice(start, start + pageSize);
  }, [filteredChunks, page, pageSize]);

  // ── Toolbar actions for HubDataTable ───────────────────────────────────────

  const toolbarActions = useMemo(() => (
    <button
      className={styles.newBtn}
      onClick={() => { setShowAddForm(true); setEditingId(null); }}
      type="button"
    >
      <Plus size={14} />
      Add Chunk
    </button>
  ), []);

  return (
    <div className={styles.panel}>
      {/* Sub-tab bar — matches Registry pattern */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'knowledge' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('knowledge')}
          type="button"
        >
          <BookOpen size={14} />
          Knowledge Base ({chunks.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'rag' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('rag')}
          type="button"
        >
          <Search size={14} />
          RAG Preview
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeTab === 'knowledge' && (
          <>
            {error && (
              <div className={styles.error}>
                {error instanceof Error ? error.message : 'Failed to load knowledge chunks'}
              </div>
            )}

            {/* Add form */}
            {showAddForm && (
              <ChunkForm
                title="New Knowledge Chunk"
                initial={DEFAULT_FORM}
                saving={createMutation.isPending}
                onSave={(form) => createMutation.mutate(form)}
                onCancel={() => setShowAddForm(false)}
              />
            )}

            {/* Edit form (shown above table when editing) */}
            {editingChunk && (
              <ChunkForm
                title={`Editing: ${editingChunk.title}`}
                initial={chunkToForm(editingChunk)}
                saving={updateMutation.isPending}
                onSave={(form) => updateMutation.mutate({ id: editingChunk.id, form })}
                onCancel={() => setEditingId(null)}
              />
            )}

            {/* Knowledge chunks table */}
            <HubDataTable<KnowledgeChunk>
              columns={columns}
              data={paginatedChunks}
              loading={isFetching && chunks.length === 0}
              error={error ? (error instanceof Error ? error.message : 'Failed to load knowledge chunks') : undefined}
              searchPlaceholder="Search title or content…"
              onSearch={(q) => { setSearchQuery(q); setPage(1); }}
              onRefresh={() => refetch()}
              filters={CATEGORY_FILTERS}
              onFilterChange={handleFilterChange}
              toolbarActions={toolbarActions}
              pagination={pagination}
              emptyMessage="No knowledge chunks found"
            />
          </>
        )}

        {activeTab === 'rag' && <RagPreview />}
      </div>
    </div>
  );
}

// --- Sidebar (rendered at page level by Conductor) ---

export function KnowledgeSidebar() {
  return (
    <>
      <HubWidgetCard title="Knowledge Help">
        <div className={styles.tipsList}>
          <p>Add <strong>knowledge chunks</strong> to give agents domain-specific context via RAG.</p>
          <p>Use <strong>categories</strong> to organise chunks — agents only retrieve relevant categories.</p>
          <p>The <strong>RAG Preview</strong> tab lets you test retrieval queries before deploying.</p>
        </div>
      </HubWidgetCard>
      <HubWidgetCard title="Knowledge Tips">
        <div className={styles.tipsList}>
          <p>Keep chunks concise (200-500 words) for best retrieval accuracy.</p>
          <p>Use specific titles — they help the embedding model match queries more precisely.</p>
          <p>Review RAG preview results to verify agents will surface the right context.</p>
        </div>
      </HubWidgetCard>
    </>
  );
}
