'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  Download,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Eye,
  Trash2,
  ArrowRight,
  Sparkles,
  RefreshCcw,
  History,
} from 'lucide-react';
import { useDiscoveryStore } from './discovery-store';
import { useWorkflowStore } from './store';
import { useDiscoveryRealtime } from '@/app/hooks/useDiscoveryRealtime';
import type {
  SourceType,
  ConfidenceLevel,
  DiscoveryResult,
} from '@/lib/workflow/scanner/types';
import type { ProcessNode, ProcessEdge } from './types';
import { HubWidgetCard } from '@/components/hub/content';
import { HubToolbar } from '@/components/hub/toolbar';
import { HubComplexModal } from '@/components/hub/modal';

import type { Filter } from '@/components/hub/toolbar';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import type { StatusBadgeColor } from '@/components/admin/badges/StatusBadge';
import styles from './DiscoveryPanel.module.css';

// ── Badge color maps for StatusBadge ─────────────────────────────────────────

const SOURCE_BADGE_COLORS: Record<string, StatusBadgeColor> = {
  status_enum:  { bg: '#ede9fe', text: '#6d28d9' },
  cron_job:     { bg: '#fef3c7', text: '#92400e' },
  onboarding:   { bg: '#d1fae5', text: '#065f46' },
  cas_workflow:  { bg: '#dbeafe', text: '#1e40af' },
  api_route:    { bg: '#fce7f3', text: '#9d174d' },
  db_trigger:   { bg: '#fed7aa', text: '#9a3412' },
};

const STATE_BADGE_COLORS: Record<string, StatusBadgeColor> = {
  preview:       { bg: '#f3f4f6', text: '#6b7280' },
  analysed:      { bg: '#dbeafe', text: '#1e40af' },
  direct_mapped: { bg: '#d1fae5', text: '#065f46' },
};

const CONFIDENCE_BADGE_COLORS: Record<string, StatusBadgeColor> = {
  high:   { bg: '#d1fae5', text: '#065f46' },
  medium: { bg: '#fef3c7', text: '#92400e' },
  low:    { bg: '#fef2f2', text: '#991b1b' },
};

const SOURCE_LABELS: Record<string, string> = {
  status_enum: 'STATUS',
  cron_job: 'CRON',
  onboarding: 'ONBOARD',
  cas_workflow: 'CAS',
  api_route: 'API',
  db_trigger: 'TRIGGER',
};

const SOURCE_OPTIONS: { value: SourceType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'cas_workflow', label: 'CAS Workflows' },
  { value: 'status_enum', label: 'Status Enums' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'cron_job', label: 'Cron Jobs' },
  { value: 'api_route', label: 'API Routes' },
  { value: 'db_trigger', label: 'DB Triggers' },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All Confidence' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// All source types scanned (Phase 2: +cron_job, +api_route; Phase 3: +db_trigger)
const SCAN_SOURCE_TYPES: SourceType[] = [
  'cas_workflow',
  'status_enum',
  'onboarding',
  'cron_job',
  'api_route',
  'db_trigger',
];

// ── HubToolbar filter definitions ────────────────────────────────────────────

const DISCOVERY_FILTERS: Filter[] = [
  {
    key: 'source',
    label: 'All Sources',
    options: SOURCE_OPTIONS.filter((o) => o.value !== 'all').map((o) => ({
      value: o.value,
      label: o.label,
    })),
  },
  {
    key: 'confidence',
    label: 'All Confidence',
    options: CONFIDENCE_OPTIONS.filter((o) => o.value !== 'all').map((o) => ({
      value: o.value,
      label: o.label,
    })),
  },
];

interface DiscoveryPanelProps {
  onImportToCanvas?: (
    nodes: ProcessNode[],
    edges: ProcessEdge[],
    name: string,
    description: string
  ) => void;
}

function groupByCategory(
  results: DiscoveryResult[]
): Record<string, DiscoveryResult[]> {
  const groups: Record<string, DiscoveryResult[]> = {};
  for (const r of results) {
    const cat = r.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(r);
  }
  return groups;
}

function humanizeCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function DiscoveryPanel({ onImportToCanvas }: DiscoveryPanelProps) {
  const {
    results,
    setResults,
    updateResult,
    isScanning,
    setScanning,
    scanProgress,
    setScanProgress,
    lastScannedAt,
    setLastScannedAt,
    sourceFilter,
    setSourceFilter,
    confidenceFilter,
    setConfidenceFilter,
    selectedIds,
    toggleSelected,
    selectAll,
    deselectAll,
    setActiveTab,
  } = useDiscoveryStore();

  const { setPendingCanvasImport } = useWorkflowStore();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [analysingIds, setAnalysingIds] = useState<Set<string>>(new Set());
  const [isAnalysingAll, setIsAnalysingAll] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [scanHistory, setScanHistory] = useState<Array<{
    id: string;
    source_types: string[];
    status: string;
    results_count: number | null;
    duration_ms: number | null;
    started_at: string;
    completed_at: string | null;
  }>>([]);


  // Auto-scan guard — only fires once per mount when the panel has no results
  const autoScannedRef = useRef(false);

  // Realtime: append new discoveries and update existing ones as scans stream in
  useDiscoveryRealtime({
    onNewResult: useCallback((result: DiscoveryResult) => {
      // Read current store state directly to avoid stale closure over `results`
      const current = useDiscoveryStore.getState().results;
      setResults([...current, result]);
      setExpandedGroups((prev) => new Set([...prev, result.category || 'other']));
    }, [setResults]),
    onResultUpdated: useCallback((result: DiscoveryResult) => {
      updateResult(result.id, result);
    }, [updateResult]),
  });

  useEffect(() => {
    fetchResults();
    fetchScanHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchScanHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/workflow/discovery/scans');
      const json = await res.json();
      if (json.success) setScanHistory(json.data.scans);
    } catch {
      // Non-fatal — history panel just stays empty
    }
  }, []);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/workflow/discovery');
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
        const cats = new Set<string>(
          json.data.map((r: DiscoveryResult) => r.category || 'other')
        );
        setExpandedGroups(cats);
      }
    } catch (err) {
      console.error('Failed to fetch discoveries:', err);
    }
  }, [setResults]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setScanProgress(0, SCAN_SOURCE_TYPES.length);

    let completed = 0;

    const scanPromises = SCAN_SOURCE_TYPES.map(async (sourceType) => {
      try {
        const res = await fetch('/api/workflow/discovery/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType }),
        });
        const json = await res.json();
        completed++;
        setScanProgress(completed, SCAN_SOURCE_TYPES.length);
        return json;
      } catch (err) {
        completed++;
        setScanProgress(completed, SCAN_SOURCE_TYPES.length);
        console.error(`Scan failed for ${sourceType}:`, err);
        return null;
      }
    });

    await Promise.allSettled(scanPromises);

    setScanning(false);
    setLastScannedAt(new Date());
    await Promise.all([fetchResults(), fetchScanHistory()]);
  }, [setScanning, setScanProgress, setLastScannedAt, fetchResults, fetchScanHistory]);

  // Auto-scan: trigger once on mount when the panel has no cached results
  useEffect(() => {
    if (!autoScannedRef.current && !isScanning && !lastScannedAt && results.length === 0) {
      autoScannedRef.current = true;
      handleScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length, isScanning, lastScannedAt]);

  const handleDismiss = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/workflow/discovery/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'dismissed' }),
        });
        setResults(results.filter((r) => r.id !== id));
      } catch (err) {
        console.error('Failed to dismiss:', err);
      }
    },
    [results, setResults]
  );

  const handleImportSingle = useCallback(
    (discovery: DiscoveryResult) => {
      if (!discovery.nodes?.length) return;
      // Load into canvas via shared store and switch to Design tab
      setPendingCanvasImport({
        nodes: discovery.nodes,
        edges: discovery.edges,
        name: discovery.name,
        description: discovery.description || '',
      });
      setActiveTab('workflows');
      // Also call the prop callback if provided (backwards compat)
      onImportToCanvas?.(discovery.nodes, discovery.edges, discovery.name, discovery.description || '');
    },
    [setPendingCanvasImport, setActiveTab, onImportToCanvas]
  );

  const handleImportSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const res = await fetch('/api/workflow/discovery/import-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (json.success) {
        deselectAll();
        await fetchResults();
      } else {
        setError(json.error);
      }
    } catch (err) {
      console.error('Batch import failed:', err);
      setError('Batch import failed');
    }
  }, [selectedIds, deselectAll, fetchResults]);

  // Pass 2: Analyse a single preview result
  const handleAnalyse = useCallback(
    async (id: string) => {
      setAnalysingIds((prev) => new Set(prev).add(id));
      setError(null);
      try {
        const res = await fetch(`/api/workflow/discovery/${id}/analyse`, {
          method: 'POST',
        });
        const json = await res.json();
        if (json.success) {
          updateResult(id, {
            nodes: json.data.nodes,
            edges: json.data.edges,
            preview_steps: json.data.previewSteps,
            confidence: json.data.confidence,
            confidence_reason: json.data.confidenceReason,
            analysis_state: 'analysed',
            matched_template_id:
              json.data.templateOverlap?.state !== 'no_template'
                ? json.data.templateOverlap?.templateId ?? null
                : null,
            template_match_state:
              json.data.templateOverlap?.state !== 'no_template'
                ? json.data.templateOverlap?.state ?? null
                : null,
            template_match_score: json.data.templateOverlap?.matchScore ?? null,
          });
        } else {
          setError(`Analysis failed: ${json.error}`);
        }
      } catch (err) {
        console.error('Analyse failed:', err);
        setError('Analysis failed — check connection');
      } finally {
        setAnalysingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [updateResult]
  );

  // Pass 2 batch: Analyse all preview results
  const handleAnalyseAll = useCallback(async () => {
    const previewIds = results
      .filter((r) => r.analysis_state === 'preview' && r.raw_content)
      .map((r) => r.id);

    if (previewIds.length === 0) return;

    setIsAnalysingAll(true);
    setError(null);

    try {
      const res = await fetch('/api/workflow/discovery/analyse-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: previewIds }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchResults();
      } else {
        setError(json.error || 'Analyse All failed');
      }
    } catch (err) {
      console.error('Analyse All failed:', err);
      setError('Analyse All failed');
    } finally {
      setIsAnalysingAll(false);
    }
  }, [results, fetchResults]);

  // Update Template (auto-sync integration — user-confirmed)
  const handleUpdateTemplate = useCallback(
    async (discoveryId: string, discoveryName: string) => {
      const confirmed = window.confirm(
        `Replace the matched template with the discovered "${discoveryName}" workflow? This updates the template for all users.`
      );
      if (!confirmed) return;

      try {
        const res = await fetch(
          `/api/workflow/discovery/${discoveryId}/update-template`,
          { method: 'POST' }
        );
        const json = await res.json();
        if (json.success) {
          updateResult(discoveryId, {
            template_match_state: 'matches',
            template_match_score: 1.0,
          });
        } else {
          setError(json.error || 'Template update failed');
        }
      } catch (err) {
        console.error('Update template failed:', err);
        setError('Template update failed');
      }
    },
    [updateResult]
  );

  // ── HubToolbar integration ────────────────────────────────────────────────

  const filterValues: Record<string, string> = {
    source: sourceFilter === 'all' ? '' : sourceFilter,
    confidence: confidenceFilter === 'all' ? '' : confidenceFilter,
  };

  const handleFilterChange = useCallback(
    (key: string, value: string | string[]) => {
      const v = Array.isArray(value) ? value[0] || '' : value;
      if (key === 'source')
        setSourceFilter((v || 'all') as SourceType | 'all');
      if (key === 'confidence')
        setConfidenceFilter((v || 'all') as ConfidenceLevel | 'all');
    },
    [setSourceFilter, setConfidenceFilter]
  );

  const toggleGroup = (cat: string) => {
    const next = new Set(expandedGroups);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedGroups(next);
  };

  // Apply source + confidence filters
  let filtered = results;
  if (sourceFilter !== 'all') {
    filtered = filtered.filter((r) => r.source_type === sourceFilter);
  }
  if (confidenceFilter !== 'all') {
    filtered = filtered.filter((r) => r.confidence === confidenceFilter);
  }

  const groups = groupByCategory(filtered);
  const sortedCategories = Object.keys(groups).sort();

  const importableSelected = Array.from(selectedIds).filter((id) => {
    const r = results.find((d) => d.id === id);
    return r && r.analysis_state !== 'preview' && (r.nodes?.length ?? 0) > 0;
  });

  const previewCount = results.filter(
    (r) => r.analysis_state === 'preview' && r.raw_content
  ).length;

  return (
    <div className={styles.panel}>
      {/* Toolbar */}
      <HubToolbar
        variant="minimal"
        className={styles.toolbar}
        showSearch={false}
        filters={DISCOVERY_FILTERS}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onRefresh={handleScan}
        isRefreshing={isScanning}
        toolbarActions={
          <>
            {/* Analyse All — only when there are preview items */}
            {previewCount > 0 && (
              <button
                className={styles.analyseAllBtn}
                onClick={handleAnalyseAll}
                disabled={isAnalysingAll}
              >
                {isAnalysingAll ? (
                  <Loader2 size={16} className={styles.spinning} />
                ) : (
                  <Sparkles size={16} />
                )}
                {isAnalysingAll ? 'Analysing...' : `Analyse All (${previewCount})`}
              </button>
            )}

            {/* Scan history toggle */}
            <button
              className={styles.historyBtn}
              onClick={() => setShowHistory((v) => !v)}
              title="Scan history"
            >
              <History size={16} />
            </button>

            {/* Select All toggle + bulk selection */}
            {filtered.length > 0 && (
              <div className={styles.batchControls}>
                <button
                  className={styles.selectToggle}
                  onClick={() => {
                    if (selectedIds.size > 0) deselectAll();
                    else selectAll();
                  }}
                >
                  {selectedIds.size > 0 ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )}
                  {selectedIds.size > 0 ? 'Deselect All' : 'Select All'}
                </button>

                {selectedIds.size > 0 && (
                  <>
                    <span className={styles.bulkSelectedCount}>
                      {selectedIds.size} selected
                    </span>
                    <button
                      className={styles.importSelectedBtn}
                      disabled={importableSelected.length === 0}
                      onClick={handleImportSelected}
                    >
                      <Download size={14} />
                      Import ({importableSelected.length})
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        }
      />

      {/* Scan history modal */}
      <HubComplexModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Scan History"
        size="md"
      >
        <div className={styles.historyBody}>
          {scanHistory.length === 0 ? (
            <p className={styles.historyEmpty}>No scans recorded yet.</p>
          ) : (
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Sources</th>
                  <th>Status</th>
                  <th>Results</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.map((scan) => {
                  const scanDate = scan.completed_at
                    ? new Date(scan.completed_at)
                    : new Date(scan.started_at);
                  const now = new Date();
                  const diffMs = now.getTime() - scanDate.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const timeAgo =
                    diffMins < 1
                      ? 'Just now'
                      : diffMins < 60
                        ? `${diffMins}m ago`
                        : diffMins < 1440
                          ? `${Math.floor(diffMins / 60)}h ago`
                          : scanDate.toLocaleDateString();

                  return (
                    <tr key={scan.id}>
                      <td>{timeAgo}</td>
                      <td>{scan.source_types.length} sources</td>
                      <td>
                        <span className={styles.historyStatus}>
                          <span
                            className={styles.historyStatusDot}
                            data-status={scan.status === 'completed' ? undefined : scan.status}
                          />
                          {scan.status}
                        </span>
                      </td>
                      <td>{scan.results_count ?? '—'}</td>
                      <td>
                        {scan.duration_ms != null
                          ? `${(scan.duration_ms / 1000).toFixed(1)}s`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </HubComplexModal>

      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Results */}
      <div className={styles.resultsList}>
        {filtered.length === 0 && !isScanning && (
          <div className={styles.emptyState}>
            <Search size={32} />
            <p>No workflows discovered yet.</p>
            <p>Click &quot;Scan&quot; to discover workflows from the codebase.</p>
          </div>
        )}

        {sortedCategories.map((cat) => (
          <div key={cat} className={styles.domainGroup}>
            <button
              className={styles.groupHeader}
              onClick={() => toggleGroup(cat)}
            >
              {expandedGroups.has(cat) ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <span className={styles.groupName}>
                {humanizeCategory(cat)} workflows
              </span>
              <span className={styles.groupCount}>({groups[cat].length})</span>
            </button>

            {expandedGroups.has(cat) && (
              <div className={styles.groupCards}>
                {groups[cat].map((discovery) => (
                  <DiscoveryCard
                    key={discovery.id}
                    discovery={discovery}
                    isSelected={selectedIds.has(discovery.id)}
                    isAnalysing={analysingIds.has(discovery.id)}
                    onToggleSelect={() => toggleSelected(discovery.id)}
                    onImport={() => handleImportSingle(discovery)}
                    onAnalyse={() => handleAnalyse(discovery.id)}
                    onUpdateTemplate={() =>
                      handleUpdateTemplate(discovery.id, discovery.name)
                    }
                    onDismiss={() => handleDismiss(discovery.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}

// --- DiscoveryCard ---

interface DiscoveryCardProps {
  discovery: DiscoveryResult;
  isSelected: boolean;
  isAnalysing: boolean;
  onToggleSelect: () => void;
  onImport: () => void;
  onAnalyse: () => void;
  onUpdateTemplate: () => void;
  onDismiss: () => void;
}

function DiscoveryCard({
  discovery,
  isSelected,
  isAnalysing,
  onToggleSelect,
  onImport,
  onAnalyse,
  onUpdateTemplate,
  onDismiss,
}: DiscoveryCardProps) {
  const canImport =
    discovery.analysis_state !== 'preview' && (discovery.nodes?.length ?? 0) > 0;
  const isPreview = discovery.analysis_state === 'preview';
  const isTemplateOutdated = discovery.template_match_state === 'outdated';

  return (
    <div className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}>
      <div className={styles.cardHeader}>
        <button className={styles.checkbox} onClick={onToggleSelect}>
          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>

        <div className={styles.cardTitle}>
          <span className={styles.cardName}>{discovery.name}</span>
          <div className={styles.badges}>
            <StatusBadge
              variant="neutral"
              label={SOURCE_LABELS[discovery.source_type] || discovery.source_type}
              size="xs"
              shape="rect"
              color={SOURCE_BADGE_COLORS[discovery.source_type]}
            />
            <StatusBadge
              variant="neutral"
              label={
                discovery.analysis_state === 'direct_mapped'
                  ? 'Mapped'
                  : discovery.analysis_state === 'analysed'
                    ? 'Analysed'
                    : 'Preview'
              }
              size="xs"
              shape="rect"
              color={STATE_BADGE_COLORS[discovery.analysis_state]}
            />
            {discovery.confidence && discovery.analysis_state !== 'preview' && (
              <StatusBadge
                variant="neutral"
                label={discovery.confidence}
                size="xs"
                shape="rect"
                color={CONFIDENCE_BADGE_COLORS[discovery.confidence]}
              />
            )}
            {discovery.template_match_state === 'matches' && (
              <StatusBadge
                variant="success"
                label="Up to date"
                size="xs"
                shape="rect"
              />
            )}
            {isTemplateOutdated && (
              <StatusBadge
                variant="warning"
                label="Template outdated"
                size="xs"
                shape="rect"
              />
            )}
          </div>
        </div>
      </div>

      {discovery.description && (
        <p className={styles.cardDescription}>{discovery.description}</p>
      )}

      {(discovery.preview_steps || discovery.step_names) && (
        <div className={styles.previewSteps}>
          {(discovery.preview_steps || discovery.step_names || [])
            .slice(0, 5)
            .map((step, i, arr) => (
              <span key={i} className={styles.stepChip}>
                {step}
                {i < arr.length - 1 && (
                  <ArrowRight size={10} className={styles.stepArrow} />
                )}
              </span>
            ))}
          {(discovery.step_names?.length ?? 0) > 5 && (
            <span className={styles.stepMore}>
              +{(discovery.step_names?.length ?? 0) - 5} more
            </span>
          )}
        </div>
      )}

      <div className={styles.cardActions}>
        {isPreview && (
          <button
            className={styles.analyseBtn}
            onClick={onAnalyse}
            disabled={isAnalysing}
          >
            {isAnalysing ? (
              <Loader2 size={12} className={styles.spinning} />
            ) : (
              <Sparkles size={12} />
            )}
            {isAnalysing ? 'Analysing...' : 'Analyse'}
          </button>
        )}

        {canImport && (
          <button className={styles.importBtn} onClick={onImport}>
            <Eye size={14} /> Import to Canvas
          </button>
        )}

        {isTemplateOutdated && canImport && (
          <button
            className={styles.updateTemplateBtn}
            onClick={() => onUpdateTemplate()}
          >
            <RefreshCcw size={12} /> Update Template
          </button>
        )}

        <button className={styles.dismissBtn} onClick={onDismiss}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// --- Sidebar (rendered at page level by Conductor) ---

export function DiscoverySidebar() {
  return (
    <>
      <HubWidgetCard title="Discovery Help">
        <div className={styles.tipsList}>
          <p><strong>Auto-scan</strong> detects implicit workflows from code, webhooks, and cron jobs.</p>
          <p><strong>Analyse</strong> a discovered process to extract steps and generate a workflow graph.</p>
          <p><strong>Import to Canvas</strong> to turn a discovery into an editable workflow.</p>
        </div>
      </HubWidgetCard>
      <HubWidgetCard title="Discovery Tips">
        <div className={styles.tipsList}>
          <p>High-confidence discoveries are ready to import — low-confidence ones need manual review.</p>
          <p>Dismiss false positives to improve future scan accuracy.</p>
          <p>Re-scan periodically as new code deploys may introduce new implicit workflows.</p>
        </div>
      </HubWidgetCard>
    </>
  );
}
