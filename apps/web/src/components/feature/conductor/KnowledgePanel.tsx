'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, Search, BookOpen, RefreshCw } from 'lucide-react';
import { UnifiedSelect } from '@/components/ui/forms';
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function groupByCategory(chunks: KnowledgeChunk[]): Record<string, KnowledgeChunk[]> {
  return chunks.reduce<Record<string, KnowledgeChunk[]>>((acc, chunk) => {
    const cat = chunk.category ?? 'uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(chunk);
    return acc;
  }, {});
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
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Tags (comma-separated)</label>
          <input
            className={styles.formInput}
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="e.g. stripe, webhook, payout"
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
        />
        <UnifiedSelect
          value={category}
          placeholder="All categories"
          onChange={(v) => setCategory(v as string)}
          options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
          size="sm"
        />
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

// ── Main Panel ────────────────────────────────────────────────────────────────

export function KnowledgePanel() {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const grouped = groupByCategory(chunks);
  const categoryKeys = Object.keys(grouped).sort();

  return (
    <div className={styles.panel}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <UnifiedSelect
            value={filterCategory}
            placeholder="All categories"
            onChange={(v) => setFilterCategory(v as string)}
            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            size="sm"
          />
          <button
            className={styles.iconBtn}
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw size={14} className={isFetching ? styles.spinning : undefined} />
          </button>
        </div>
        <div className={styles.toolbarRight}>
          <button
            className={styles.addBtn}
            onClick={() => { setShowAddForm(true); setEditingId(null); }}
            type="button"
          >
            <Plus size={14} />
            Add chunk
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className={styles.body}>
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

        {/* Loading */}
        {isFetching && chunks.length === 0 && (
          <div className={styles.loading}>Loading knowledge chunks…</div>
        )}

        {/* Empty state */}
        {!isFetching && !error && chunks.length === 0 && (
          <div className={styles.empty}>
            <BookOpen size={32} className={styles.emptyIcon} />
            <span>No knowledge chunks yet.</span>
            <span className={styles.emptyHint}>Click "Add chunk" to create the first entry.</span>
          </div>
        )}

        {/* Grouped chunk list */}
        {categoryKeys.map((cat) => (
          <div key={cat} className={styles.groupSection}>
            <div className={styles.groupHeading}>{cat} ({grouped[cat].length})</div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Title / Preview</th>
                    <th>Source Ref</th>
                    <th>Tags</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[cat].map((chunk) => (
                    <>
                      <tr key={chunk.id}>
                        <td>
                          <div className={styles.chunkTitle}>{chunk.title}</div>
                          <div className={styles.chunkPreview}>{chunk.content}</div>
                        </td>
                        <td>
                          <span className={styles.mono}>{chunk.source_ref ?? '—'}</span>
                        </td>
                        <td>
                          <div className={styles.tagsWrap}>
                            {(chunk.tags ?? []).length > 0
                              ? chunk.tags.map((t) => (
                                  <span key={t} className={styles.tag}>{t}</span>
                                ))
                              : <span className={styles.mono}>—</span>
                            }
                          </div>
                        </td>
                        <td>{formatDate(chunk.updated_at)}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              className={styles.iconBtn}
                              title="Edit"
                              onClick={() => {
                                setEditingId(editingId === chunk.id ? null : chunk.id);
                                setShowAddForm(false);
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              title="Delete"
                              onClick={() => handleDelete(chunk)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingId === chunk.id && (
                        <tr key={`${chunk.id}-edit`}>
                          <td colSpan={5} style={{ padding: 0 }}>
                            <div style={{ padding: '12px 12px' }}>
                              <ChunkForm
                                title={`Editing: ${chunk.title}`}
                                initial={chunkToForm(chunk)}
                                saving={updateMutation.isPending}
                                onSave={(form) => updateMutation.mutate({ id: chunk.id, form })}
                                onCancel={() => setEditingId(null)}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* RAG Preview section */}
        <RagPreview />
      </div>
    </div>
  );
}
