import { create } from 'zustand';
import type { ChatMessage } from './types';
import type { ProcessNode, ProcessEdge } from './types';

export type RightPanelMode = 'properties' | 'chat';

export interface NavHistoryEntry {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  name: string;
  description: string;
  processId: string | null;
}

interface ProcessStudioStore {
  // Process metadata
  processId: string | null;
  processName: string;
  processDescription: string;

  // UI state
  selectedNodeId: string | null;
  isDrawerOpen: boolean;
  rightPanelMode: RightPanelMode;
  isDirty: boolean;
  lastSavedAt: Date | null;

  // Chat state
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // Actions — metadata
  setProcessId: (id: string | null) => void;
  setProcessName: (name: string) => void;
  setProcessDescription: (desc: string) => void;

  // Actions — UI
  setSelectedNode: (id: string | null) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setRightPanelMode: (mode: RightPanelMode) => void;
  markDirty: () => void;
  markSaved: () => void;

  // Actions — chat
  addChatMessage: (msg: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;
  clearChat: () => void;

  // Autosave status
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  setAutoSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;

  // Subprocess drill-down
  drillDownTarget: string | null;
  requestDrillDown: (templateName: string) => void;
  clearDrillDown: () => void;

  // Import from Discovery Panel
  pendingCanvasImport: { nodes: ProcessNode[]; edges: ProcessEdge[]; name: string; description: string } | null;
  setPendingCanvasImport: (data: { nodes: ProcessNode[]; edges: ProcessEdge[]; name: string; description: string } | null) => void;

  // Navigation history (for back button after drill-down)
  navigationHistory: NavHistoryEntry[];
  pushHistory: (entry: NavHistoryEntry) => void;
  popHistory: () => NavHistoryEntry | null;
  clearHistory: () => void;

  // Actions — reset
  resetStore: () => void;
}

const initialState = {
  processId: null as string | null,
  processName: 'Untitled Process',
  processDescription: '',
  selectedNodeId: null as string | null,
  isDrawerOpen: false,
  rightPanelMode: 'properties' as RightPanelMode,
  isDirty: false,
  lastSavedAt: null as Date | null,
  chatMessages: [] as ChatMessage[],
  isChatLoading: false,
  autoSaveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
  drillDownTarget: null as string | null,
  navigationHistory: [] as NavHistoryEntry[],
  pendingCanvasImport: null as { nodes: ProcessNode[]; edges: ProcessEdge[]; name: string; description: string } | null,
};

export const useProcessStudioStore = create<ProcessStudioStore>((set, get) => ({
  ...initialState,

  // Metadata
  setProcessId: (id) => set({ processId: id }),
  setProcessName: (name) => set({ processName: name, isDirty: true }),
  setProcessDescription: (desc) =>
    set({ processDescription: desc, isDirty: true }),

  // UI
  setSelectedNode: (id) =>
    set({ selectedNodeId: id, isDrawerOpen: id !== null }),
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false, selectedNodeId: null }),
  setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),

  // Chat
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  setChatLoading: (loading) => set({ isChatLoading: loading }),
  clearChat: () => set({ chatMessages: [] }),

  // Autosave
  setAutoSaveStatus: (status) => set({ autoSaveStatus: status }),

  // Subprocess drill-down
  requestDrillDown: (templateName) => set({ drillDownTarget: templateName }),
  clearDrillDown: () => set({ drillDownTarget: null }),

  // Import from Discovery Panel
  setPendingCanvasImport: (data) => set({ pendingCanvasImport: data }),

  // Navigation history
  pushHistory: (entry) =>
    set((s) => ({ navigationHistory: [...s.navigationHistory, entry] })),
  popHistory: () => {
    const history = get().navigationHistory;
    if (history.length === 0) return null;
    const entry = history[history.length - 1];
    set({ navigationHistory: history.slice(0, -1) });
    return entry;
  },
  clearHistory: () => set({ navigationHistory: [] }),

  // Reset
  resetStore: () => set({ ...initialState, navigationHistory: [] }),
}));
