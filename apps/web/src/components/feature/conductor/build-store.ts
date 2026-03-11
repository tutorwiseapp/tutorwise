import { create } from 'zustand';

export type BuildLevel = 0 | 1 | 2;
export type BuildNodeType = 'space' | 'team' | 'agent';

interface BuildStore {
  // Navigation level
  level: BuildLevel;
  // Level 1 context (inside a space)
  spaceId: string | null;
  spaceName: string | null;
  // Level 2 context (inside a team)
  teamId: string | null;
  teamName: string | null;

  // Selection
  selectedNodeId: string | null;
  selectedNodeType: BuildNodeType | null;

  // Dirty state (unsaved changes on level 2 team topology)
  isDirty: boolean;

  // Actions
  drillToSpace: (id: string, name: string) => void;
  drillToTeam: (id: string, name: string) => void;
  drillUp: () => void;
  resetToRoot: () => void;
  selectNode: (id: string | null, type: BuildNodeType | null) => void;
  setDirty: (dirty: boolean) => void;
}

export const useBuildStore = create<BuildStore>((set, get) => ({
  level: 0,
  spaceId: null,
  spaceName: null,
  teamId: null,
  teamName: null,
  selectedNodeId: null,
  selectedNodeType: null,
  isDirty: false,

  drillToSpace: (id, name) =>
    set({ level: 1, spaceId: id, spaceName: name, teamId: null, teamName: null, selectedNodeId: null, selectedNodeType: null, isDirty: false }),

  drillToTeam: (id, name) =>
    set({ level: 2, teamId: id, teamName: name, selectedNodeId: null, selectedNodeType: null, isDirty: false }),

  drillUp: () => {
    const { level } = get();
    if (level === 2) {
      set({ level: 1, teamId: null, teamName: null, selectedNodeId: null, selectedNodeType: null, isDirty: false });
    } else if (level === 1) {
      set({ level: 0, spaceId: null, spaceName: null, teamId: null, teamName: null, selectedNodeId: null, selectedNodeType: null, isDirty: false });
    }
  },

  resetToRoot: () =>
    set({ level: 0, spaceId: null, spaceName: null, teamId: null, teamName: null, selectedNodeId: null, selectedNodeType: null, isDirty: false }),

  selectNode: (id, type) => set({ selectedNodeId: id, selectedNodeType: type }),

  setDirty: (dirty) => set({ isDirty: dirty }),
}));
