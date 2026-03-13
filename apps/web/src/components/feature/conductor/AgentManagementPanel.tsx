'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Users, MessageCircle, Trash2, Play, Plus, RefreshCw, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import styles from './AgentManagementPanel.module.css';
import { AgentChatPanel } from './AgentChatPanel';
import { useDiscoveryStore } from '@/components/feature/workflow/discovery-store';
import type { DiscoveryTab } from '@/components/feature/workflow/discovery-store';

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  description: string | null;
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
  nodes: Array<{ id: string; data: { agentSlug: string } }>;
  status: 'active' | 'inactive';
  built_in: boolean;
  space_id: string | null;
  updated_at: string;
}

const PATTERN_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  pipeline: 'Pipeline',
  swarm: 'Swarm',
};

export function AgentManagementPanel() {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<SpecialistAgent | null>(null);
  const [runBanner, setRunBanner] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setActiveTab = useDiscoveryStore(s => s.setActiveTab);

  const { data: agents = [], isLoading: loadingAgents, refetch: refetchAgents } = useQuery({
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

  const { data: teams = [], isLoading: loadingTeams, refetch: refetchTeams } = useQuery({
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

  return (
    <div className={styles.outer}>
    <div className={styles.container}>
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

      {/* ── Agents Registry ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Brain size={18} />
            <span>Agents Registry</span>
            <span className={styles.badge}>{agents.length}</span>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={() => refetchAgents()} title="Refresh">
              <RefreshCw size={14} />
            </button>
            <Link href="/admin/conductor/agents/new" className={styles.addBtn}>
              <Plus size={14} /> New Agent
            </Link>
          </div>
        </div>

        {loadingAgents ? (
          <div className={styles.loading}>Loading agents…</div>
        ) : (
          <div className={styles.grid}>
            {agents.map((agent) => (
              <div key={agent.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.agentMeta}>
                    <span className={`${styles.statusDot} ${agent.status === 'active' ? styles.active : styles.inactive}`} />
                    <span className={styles.agentName}>{agent.name}</span>
                    {agent.built_in && <span className={styles.builtInBadge}>built-in</span>}
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={`${styles.actionBtn} ${selectedAgent?.id === agent.id ? styles.active : ''}`}
                      onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                      title="Chat with agent"
                    >
                      <MessageCircle size={14} />
                    </button>
                    {!agent.built_in && (
                      <button
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => removeAgentMutation.mutate(agent)}
                        disabled={removeAgentMutation.isPending}
                        title="Deactivate agent"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.agentRole}>{agent.role} · {agent.department}</div>
                {agent.description && (
                  <div className={styles.agentDesc}>{agent.description}</div>
                )}
                <div className={styles.cardFooter}>
                  Last updated {new Date(agent.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Teams Registry ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Users size={18} />
            <span>Teams Registry</span>
            <span className={styles.badge}>{teams.length}</span>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={() => refetchTeams()} title="Refresh">
              <RefreshCw size={14} />
            </button>
            <Link href="/admin/conductor/teams/new" className={styles.addBtn}>
              <Plus size={14} /> New Team
            </Link>
          </div>
        </div>

        {loadingTeams ? (
          <div className={styles.loading}>Loading teams…</div>
        ) : (
          <div className={styles.grid}>
            {teams.map((team) => (
              <div key={team.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.agentMeta}>
                    <span className={`${styles.statusDot} ${team.status === 'active' ? styles.active : styles.inactive}`} />
                    <span className={styles.agentName}>{team.name}</span>
                    {team.built_in && <span className={styles.builtInBadge}>built-in</span>}
                    <span className={styles.patternBadge}>{PATTERN_LABELS[team.pattern]}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => runTeamMutation.mutate(team)}
                      disabled={runTeamMutation.isPending}
                      title="Run team"
                    >
                      <Play size={14} />
                    </button>
                    {!team.built_in && (
                      <button
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => removeTeamMutation.mutate(team)}
                        disabled={removeTeamMutation.isPending}
                        title="Deactivate team"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {team.description && (
                  <div className={styles.agentDesc}>{team.description}</div>
                )}
                <div className={styles.cardFooter}>
                  {team.nodes.length} agents · updated {new Date(team.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    {selectedAgent && (
      <AgentChatPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
    )}
    </div>
  );
}
