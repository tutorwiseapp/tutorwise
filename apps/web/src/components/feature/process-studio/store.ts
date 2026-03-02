import { create } from 'zustand';
import type { ChatMessage } from './types';

export type RightPanelMode = 'properties' | 'chat';

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
};

export const useProcessStudioStore = create<ProcessStudioStore>((set) => ({
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

  // Reset
  resetStore: () => set(initialState),
}));
