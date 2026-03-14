'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Users, Bot, Plus, CheckCircle2, X } from 'lucide-react';
import { AgentChatPanel } from '../AgentChatPanel';
import { AgentConfigModal } from '../AgentConfigModal';
import { TeamConfigModal } from '../TeamConfigModal';
import { SpaceConfigModal } from '../SpaceConfigModal';
import { SpacesTable } from './SpacesTable';
import { TeamsTable } from './TeamsTable';
import { AgentsTable } from './AgentsTable';
import { useDiscoveryStore, type RegistrySubTab } from '@/components/feature/workflow/discovery-store';
import type { DiscoveryTab } from '@/components/feature/workflow/discovery-store';
import styles from './AgentRegistryPanel.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentConfig {
  tools?: string[];
  skills?: string[];
  instructions?: string;
  system_prompt_template?: string;
  [key: string]: unknown;
}

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  description: string | null;
  config: AgentConfig;
  seed_config?: AgentConfig | null;
  status: 'active' | 'inactive';
  built_in: boolean;
  updated_at: string;
}

interface AgentTeam {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pattern: 'supervisor' | 'pipeline' | 'swarm';
  nodes: Array<{ id: string; data: { agentSlug: string; [key: string]: unknown } }>;
  edges: unknown[];
  coordinator_slug: string | null;
  config: Record<string, unknown>;
  seed_config?: Record<string, unknown> | null;
  status: 'active' | 'inactive';
  built_in: boolean;
  space_id: string | null;
  updated_at: string;
}

interface AgentSpace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  built_in: boolean;
  updated_at: string;
}

type ModalState =
  | { type: 'agent'; mode: 'create' | 'edit'; agent?: SpecialistAgent }
  | { type: 'team'; mode: 'create' | 'edit'; team?: AgentTeam }
  | { type: 'space'; mode: 'create' | 'edit'; space?: AgentSpace }
  | null;

const SUB_TABS: { id: RegistrySubTab; label: string; icon: typeof Layers }[] = [
  { id: 'spaces', label: 'Spaces', icon: Layers },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'agents', label: 'Agents', icon: Bot },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentRegistryPanel() {
  const queryClient = useQueryClient();
  const setActiveTab = useDiscoveryStore(s => s.setActiveTab);
  const pendingSubTab = useDiscoveryStore(s => s.pendingRegistrySubTab);
  const clearPending = useDiscoveryStore(s => s.clearPendingRegistry);

  // Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<RegistrySubTab>('spaces');

  // Modal + chat + banner state
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedAgent, setSelectedAgent] = useState<SpecialistAgent | null>(null);
  const [runBanner, setRunBanner] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['admin-agents'],
    queryFn: async () => {
      const res = await fetch('/api/admin/agents');
      const json = await res.json() as { success: boolean; data: SpecialistAgent[] };
      if (!json.success) throw new Error('Failed to load agents');
      return json.data;
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const res = await fetch('/api/admin/teams');
      const json = await res.json() as { success: boolean; data: AgentTeam[] };
      if (!json.success) throw new Error('Failed to load teams');
      return json.data;
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: spaces = [], isLoading: loadingSpaces } = useQuery({
    queryKey: ['admin-spaces'],
    queryFn: async () => {
      const res = await fetch('/api/admin/spaces?status=active');
      const json = await res.json() as { success: boolean; data: AgentSpace[] };
      if (!json.success) throw new Error('Failed to load spaces');
      return json.data;
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // ─── Derived data ───────────────────────────────────────────────────────────

  const agentToTeam = useMemo(() => {
    const map = new Map<string, AgentTeam>();
    for (const team of teams) {
      for (const node of team.nodes ?? []) {
        if (node.data?.agentSlug) {
          map.set(node.data.agentSlug, team);
        }
      }
    }
    return map;
  }, [teams]);

  // Tab counts for labels: Spaces (5) · Teams (2) · Agents (17)
  const tabCounts: Record<RegistrySubTab, number> = useMemo(() => ({
    spaces: spaces.length,
    teams: teams.length,
    agents: agents.length,
  }), [spaces.length, teams.length, agents.length]);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const removeAgentMutation = useMutation({
    mutationFn: async (agent: SpecialistAgent) => {
      if (!confirm(`Deactivate agent "${agent.name}"?`)) throw new Error('cancelled');
      await fetch(`/api/admin/agents/${agent.id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-agents'] }),
  });

  const removeTeamMutation = useMutation({
    mutationFn: async (team: AgentTeam) => {
      if (!confirm(`Deactivate team "${team.name}"?`)) throw new Error('cancelled');
      await fetch(`/api/admin/teams/${team.id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-teams'] }),
  });

  const removeSpaceMutation = useMutation({
    mutationFn: async (space: AgentSpace) => {
      if (!confirm(`Delete space "${space.name}"? Teams will be unlinked.`)) throw new Error('cancelled');
      await fetch(`/api/admin/spaces/${space.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
    },
  });

  const runTeamMutation = useMutation({
    mutationFn: async (team: AgentTeam) => {
      const task = prompt(`Task for ${team.name}:`);
      if (!task) throw new Error('cancelled');
      await fetch(`/api/admin/teams/${team.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      return team.name;
    },
    onSuccess: (teamName) => {
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      setRunBanner(teamName);
      bannerTimeoutRef.current = setTimeout(() => setRunBanner(null), 12_000);
    },
  });

  const cloneAgentMutation = useMutation({
    mutationFn: async (agent: SpecialistAgent) => {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: agent.slug + '-copy',
          name: agent.name + ' (Copy)',
          role: agent.role,
          department: agent.department,
          description: agent.description,
          config: agent.config,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to clone agent');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-agents'] }),
  });

  // ─── Cross-navigation from store ───────────────────────────────────────────

  useEffect(() => {
    if (pendingSubTab) {
      setActiveSubTab(pendingSubTab);
      clearPending();
    }
  }, [pendingSubTab, clearPending]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleNavigate = useCallback((subTab: RegistrySubTab, _filter?: Record<string, string>) => {
    setActiveSubTab(subTab);
  }, []);

  const handleRunAgent = useCallback(async (agent: SpecialistAgent) => {
    const task = prompt(`Task for ${agent.name}:`);
    if (!task) return;
    await fetch(`/api/admin/agents/${agent.id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });
  }, []);

  // ─── Toolbar action buttons (+ New) per sub-tab ───────────────────────────

  const spacesToolbarAction = useMemo(() => (
    <button className={styles.newBtn} onClick={() => setModal({ type: 'space', mode: 'create' })}>
      <Plus size={14} /> New Space
    </button>
  ), []);

  const teamsToolbarAction = useMemo(() => (
    <button className={styles.newBtn} onClick={() => setModal({ type: 'team', mode: 'create' })}>
      <Plus size={14} /> New Team
    </button>
  ), []);

  const agentsToolbarAction = useMemo(() => (
    <button className={styles.newBtn} onClick={() => setModal({ type: 'agent', mode: 'create' })}>
      <Plus size={14} /> New Agent
    </button>
  ), []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const isLoading = loadingAgents || loadingTeams || loadingSpaces;

  return (
    <div className={styles.panel}>
      {/* Sub-tab bar — matches Intelligence .tabBar pattern */}
      <div className={styles.tabBar}>
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeSubTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              <Icon size={13} />
              {tab.label} ({tabCounts[tab.id]})
            </button>
          );
        })}
      </div>

      {/* Scrollable content area */}
      <div className={styles.content}>
        {/* Run banner */}
        {runBanner && (
          <div className={styles.runBanner}>
            <CheckCircle2 size={14} className={styles.bannerIcon} />
            <span><strong>{runBanner}</strong> run complete —</span>
            <button className={styles.bannerLink} onClick={() => setActiveTab('simulation' as DiscoveryTab)}>
              View output in Simulation →
            </button>
            <button className={styles.bannerClose} onClick={() => setRunBanner(null)}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Tab content — each table owns its own HubDataTable toolbar (search + filters + new btn) */}
        <div className={styles.tableArea}>
          {activeSubTab === 'spaces' && (
            <SpacesTable
              spaces={spaces}
              teams={teams}
              loading={isLoading}
              onEdit={(space) => setModal({ type: 'space', mode: 'edit', space })}
              onDelete={(space) => removeSpaceMutation.mutate(space)}
              onNavigate={handleNavigate}
              toolbarActions={spacesToolbarAction}
            />
          )}

          {activeSubTab === 'teams' && (
            <TeamsTable
              teams={teams}
              spaces={spaces}
              loading={isLoading}
              onEdit={(team) => setModal({ type: 'team', mode: 'edit', team })}
              onDelete={(team) => removeTeamMutation.mutate(team)}
              onRun={(team) => runTeamMutation.mutate(team)}
              onViewTopology={() => setActiveTab('build' as DiscoveryTab)}
              onNavigate={handleNavigate}
              toolbarActions={teamsToolbarAction}
            />
          )}

          {activeSubTab === 'agents' && (
            <AgentsTable
              agents={agents}
              teams={teams}
              spaces={spaces}
              loading={isLoading}
              agentToTeam={agentToTeam}
              onConfigure={(agent) => setModal({ type: 'agent', mode: 'edit', agent })}
              onChat={(agent) => setSelectedAgent(agent)}
              onRun={handleRunAgent}
              onClone={(agent) => cloneAgentMutation.mutate(agent)}
              onDelete={(agent) => removeAgentMutation.mutate(agent)}
              onNavigate={handleNavigate}
              toolbarActions={agentsToolbarAction}
            />
          )}
        </div>
      </div>

      {/* Agent chat drawer */}
      {selectedAgent && (
        <AgentChatPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}

      {/* Modals */}
      {modal?.type === 'agent' && (
        <AgentConfigModal
          mode={modal.mode}
          agent={modal.mode === 'edit' ? modal.agent : null}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'team' && (
        <TeamConfigModal
          mode={modal.mode}
          team={modal.mode === 'edit' ? modal.team : null}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'space' && (
        <SpaceConfigModal
          mode={modal.mode}
          space={modal.mode === 'edit' ? modal.space : null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
