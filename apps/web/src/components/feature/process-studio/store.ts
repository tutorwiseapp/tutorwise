import { create } from 'zustand';
import type { ChatMessage } from './types';

interface ProcessStudioStore {
  // Process metadata
  processId: string | null;
  processName: string;
  processDescription: string;

  // UI state
  selectedNodeId: string | null;
  isDrawerOpen: boolean;
  isChatOpen: boolean;
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
  toggleChat: () => void;
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
  processId: null,
  processName: 'Untitled Process',
  processDescription: '',
  selectedNodeId: null,
  isDrawerOpen: false,
  isChatOpen: true,
  isDirty: false,
  lastSavedAt: null,
  chatMessages: [],
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
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
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
