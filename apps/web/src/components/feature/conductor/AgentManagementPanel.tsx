'use client';

import { useEffect, useState } from 'react';
import { Brain, Users, MessageCircle, Trash2, Play, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import styles from './AgentManagementPanel.module.css';

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
  updated_at: string;
}

const PATTERN_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  pipeline: 'Pipeline',
  swarm: 'Swarm',
};

export function AgentManagementPanel() {
  const [agents, setAgents] = useState<SpecialistAgent[]>([]);
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/admin/agents');
      const json = await res.json() as { success: boolean; data: SpecialistAgent[] };
      if (json.success) setAgents(json.data);
    } finally {
      setLoadingAgents(false);
    }
  };

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch('/api/admin/teams');
      const json = await res.json() as { success: boolean; data: AgentTeam[] };
      if (json.success) setTeams(json.data);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchTeams();
  }, []);

  const removeAgent = async (agent: SpecialistAgent) => {
    if (!confirm(`Deactivate agent "${agent.name}"?`)) return;
    await fetch(`/api/admin/agents/${agent.id}`, { method: 'DELETE' });
    await fetchAgents();
  };

  const removeTeam = async (team: AgentTeam) => {
    if (!confirm(`Deactivate team "${team.name}"?`)) return;
    await fetch(`/api/admin/teams/${team.id}`, { method: 'DELETE' });
    await fetchTeams();
  };

  const runTeam = async (team: AgentTeam) => {
    const task = prompt(`Task for ${team.name}:`);
    if (!task) return;
    await fetch(`/api/admin/teams/${team.id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });
    alert('Team run started. Check run history for results.');
  };

  return (
    <div className={styles.container}>
      {/* ── Agents Registry ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Brain size={18} />
            <span>Agents Registry</span>
            <span className={styles.badge}>{agents.length}</span>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={fetchAgents} title="Refresh">
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
                    <Link
                      href={`/admin/conductor/agents/${agent.slug}`}
                      className={styles.actionBtn}
                      title="Chat with agent"
                    >
                      <MessageCircle size={14} />
                    </Link>
                    {!agent.built_in && (
                      <button
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => removeAgent(agent)}
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
            <button className={styles.iconBtn} onClick={fetchTeams} title="Refresh">
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
                      onClick={() => runTeam(team)}
                      title="Run team"
                    >
                      <Play size={14} />
                    </button>
                    {!team.built_in && (
                      <button
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => removeTeam(team)}
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
  );
}
