'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Search,
  Download,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Eye,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useDiscoveryStore } from './discovery-store';
import type {
  SourceType,
  DiscoveryResult,
} from '@/lib/process-studio/scanner/types';
import type { ProcessNode, ProcessEdge } from './types';
import styles from './DiscoveryPanel.module.css';

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

interface DiscoveryPanelProps {
  onImportToCanvas?: (
    nodes: ProcessNode[],
    edges: ProcessEdge[],
    name: string,
    description: string
  ) => void;
}

/** Group results by category (business domain) */
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
    isScanning,
    setScanning,
    scanProgress,
    setScanProgress,
    lastScannedAt,
    setLastScannedAt,
    sourceFilter,
    setSourceFilter,
    selectedIds,
    toggleSelected,
    selectAll,
    deselectAll,
  } = useDiscoveryStore();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Fetch existing results on mount
  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/process-studio/discovery');
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
        // Expand all groups by default
        const cats = new Set<string>(json.data.map((r: DiscoveryResult) => r.category || 'other'));
        setExpandedGroups(cats);
      }
    } catch (err) {
      console.error('Failed to fetch discoveries:', err);
    }
  }, [setResults]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    const sourceTypes: SourceType[] = ['cas_workflow', 'status_enum', 'onboarding'];
    setScanProgress(0, sourceTypes.length);

    let completed = 0;

    // Scan each source type in parallel
    const scanPromises = sourceTypes.map(async (sourceType) => {
      try {
        const res = await fetch('/api/process-studio/discovery/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType }),
        });
        const json = await res.json();
        completed++;
        setScanProgress(completed, sourceTypes.length);
        return json;
      } catch (err) {
        completed++;
        setScanProgress(completed, sourceTypes.length);
        console.error(`Scan failed for ${sourceType}:`, err);
        return null;
      }
    });

    await Promise.allSettled(scanPromises);

    setScanning(false);
    setLastScannedAt(new Date());

    // Refresh the results
    await fetchResults();
  }, [setScanning, setScanProgress, setLastScannedAt, fetchResults]);

  const handleDismiss = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/process-studio/discovery/${id}`, {
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
    async (discovery: DiscoveryResult) => {
      if (onImportToCanvas && discovery.nodes?.length) {
        onImportToCanvas(
          discovery.nodes,
          discovery.edges,
          discovery.name,
          discovery.description || ''
        );
      }
    },
    [onImportToCanvas]
  );

  const handleImportSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const res = await fetch('/api/process-studio/discovery/import-batch', {
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

  const toggleGroup = (cat: string) => {
    const next = new Set(expandedGroups);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedGroups(next);
  };

  // Filter results
  const filtered =
    sourceFilter === 'all'
      ? results
      : results.filter((r) => r.source_type === sourceFilter);

  const groups = groupByCategory(filtered);
  const sortedCategories = Object.keys(groups).sort();

  const importableSelected = Array.from(selectedIds).filter((id) => {
    const r = results.find((d) => d.id === id);
    return r && r.analysis_state !== 'preview' && (r.nodes?.length ?? 0) > 0;
  });

  return (
    <div className={styles.panel}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          className={styles.refreshBtn}
          onClick={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <Loader2 size={16} className={styles.spinning} />
          ) : (
            <RefreshCw size={16} />
          )}
          {isScanning
            ? `Scanning... (${scanProgress.completed}/${scanProgress.total})`
            : 'Scan'}
        </button>

        <select
          className={styles.filterSelect}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as SourceType | 'all')}
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {lastScannedAt && (
          <span className={styles.lastScanned}>
            Last scan: {lastScannedAt.toLocaleTimeString()}
          </span>
        )}
      </div>

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
              <span className={styles.groupCount}>
                ({groups[cat].length})
              </span>
            </button>

            {expandedGroups.has(cat) && (
              <div className={styles.groupCards}>
                {groups[cat].map((discovery) => (
                  <DiscoveryCard
                    key={discovery.id}
                    discovery={discovery}
                    isSelected={selectedIds.has(discovery.id)}
                    onToggleSelect={() => toggleSelected(discovery.id)}
                    onImport={() => handleImportSingle(discovery)}
                    onDismiss={() => handleDismiss(discovery.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Batch actions */}
      {filtered.length > 0 && (
        <div className={styles.batchBar}>
          <button className={styles.selectToggle} onClick={() => {
            if (selectedIds.size > 0) deselectAll();
            else selectAll();
          }}>
            {selectedIds.size > 0 ? (
              <CheckSquare size={14} />
            ) : (
              <Square size={14} />
            )}
            {selectedIds.size > 0 ? 'Deselect All' : 'Select All'}
          </button>

          <span className={styles.selectionCount}>
            {importableSelected.length} of {filtered.length} selected
          </span>

          <button
            className={styles.importSelectedBtn}
            disabled={importableSelected.length === 0}
            onClick={handleImportSelected}
          >
            <Download size={14} />
            Import Selected ({importableSelected.length})
          </button>
        </div>
      )}
    </div>
  );
}

// --- DiscoveryCard sub-component ---

interface DiscoveryCardProps {
  discovery: DiscoveryResult;
  isSelected: boolean;
  onToggleSelect: () => void;
  onImport: () => void;
  onDismiss: () => void;
}

function DiscoveryCard({
  discovery,
  isSelected,
  onToggleSelect,
  onImport,
  onDismiss,
}: DiscoveryCardProps) {
  const canImport =
    discovery.analysis_state !== 'preview' && (discovery.nodes?.length ?? 0) > 0;

  return (
    <div className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}>
      <div className={styles.cardHeader}>
        <button className={styles.checkbox} onClick={onToggleSelect}>
          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>

        <div className={styles.cardTitle}>
          <span className={styles.cardName}>{discovery.name}</span>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles[`badge_${discovery.source_type}`]}`}>
              {SOURCE_LABELS[discovery.source_type] || discovery.source_type}
            </span>
            <span className={`${styles.badge} ${styles[`state_${discovery.analysis_state}`]}`}>
              {discovery.analysis_state === 'direct_mapped'
                ? 'Mapped'
                : discovery.analysis_state === 'analysed'
                  ? 'Analysed'
                  : 'Preview'}
            </span>
            {discovery.confidence && discovery.analysis_state !== 'preview' && (
              <span className={`${styles.badge} ${styles[`confidence_${discovery.confidence}`]}`}>
                {discovery.confidence}
              </span>
            )}
            {discovery.template_match_state === 'matches' && (
              <span className={`${styles.badge} ${styles.templateMatch}`}>
                <CheckCircle size={10} /> Up to date
              </span>
            )}
            {discovery.template_match_state === 'outdated' && (
              <span className={`${styles.badge} ${styles.templateOutdated}`}>
                <AlertTriangle size={10} /> Template outdated
              </span>
            )}
          </div>
        </div>
      </div>

      {discovery.description && (
        <p className={styles.cardDescription}>{discovery.description}</p>
      )}

      {/* Preview steps */}
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
        {canImport && (
          <button className={styles.importBtn} onClick={onImport}>
            <Eye size={14} /> Import to Canvas
          </button>
        )}
        <button className={styles.dismissBtn} onClick={onDismiss}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
