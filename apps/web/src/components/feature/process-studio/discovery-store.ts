import { create } from 'zustand';
import type {
  SourceType,
  ConfidenceLevel,
  DiscoveryResult,
} from '@/lib/process-studio/scanner/types';

export type DiscoveryTab = 'design' | 'discovery';

interface DiscoveryStore {
  // Active tab
  activeTab: DiscoveryTab;
  setActiveTab: (tab: DiscoveryTab) => void;

  // Discovery results
  results: DiscoveryResult[];
  setResults: (results: DiscoveryResult[]) => void;

  // Scanning state
  isScanning: boolean;
  scanProgress: { completed: number; total: number };
  lastScannedAt: Date | null;
  setScanning: (scanning: boolean) => void;
  setScanProgress: (completed: number, total: number) => void;
  setLastScannedAt: (date: Date) => void;

  // Filters
  sourceFilter: SourceType | 'all';
  confidenceFilter: ConfidenceLevel | 'all';
  setSourceFilter: (filter: SourceType | 'all') => void;
  setConfidenceFilter: (filter: ConfidenceLevel | 'all') => void;

  // Selection (for batch import)
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Reset
  resetDiscovery: () => void;
}

const initialState = {
  activeTab: 'design' as DiscoveryTab,
  results: [] as DiscoveryResult[],
  isScanning: false,
  scanProgress: { completed: 0, total: 0 },
  lastScannedAt: null as Date | null,
  sourceFilter: 'all' as SourceType | 'all',
  confidenceFilter: 'all' as ConfidenceLevel | 'all',
  selectedIds: new Set<string>(),
};

export const useDiscoveryStore = create<DiscoveryStore>((set, get) => ({
  ...initialState,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setResults: (results) => set({ results }),

  setScanning: (scanning) => set({ isScanning: scanning }),
  setScanProgress: (completed, total) =>
    set({ scanProgress: { completed, total } }),
  setLastScannedAt: (date) => set({ lastScannedAt: date }),

  setSourceFilter: (filter) => set({ sourceFilter: filter }),
  setConfidenceFilter: (filter) => set({ confidenceFilter: filter }),

  toggleSelected: (id) => {
    const current = get().selectedIds;
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedIds: next });
  },

  selectAll: () => {
    const importable = get().results.filter(
      (r) =>
        r.analysis_state !== 'preview' &&
        r.status === 'discovered' &&
        (r.nodes?.length ?? 0) > 0
    );
    set({ selectedIds: new Set(importable.map((r) => r.id)) });
  },

  deselectAll: () => set({ selectedIds: new Set() }),

  resetDiscovery: () => set(initialState),
}));
