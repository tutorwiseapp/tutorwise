'use client';

import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { Bot, Play, Flag, Users, StickyNote, RefreshCw, X, Info, ArrowRight } from 'lucide-react';
import { UnifiedSelect } from '@/components/ui/forms';
import dagre from '@dagrejs/dagre';
import { CanvasNode, FIT_VIEW_OPTIONS, BACKGROUND_CONFIG, CanvasNodeActionsContext, CanvasContextMenu } from '@/components/feature/canvas';
import type { CanvasNodeProps, ContextMenuItem } from '@/components/feature/canvas';
import { useDiscoveryStore } from '@/components/feature/workflow/discovery-store';
import styles from './TeamCanvas.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CasAgentLiveStatus {
  agent_id: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  last_activity_at: string | null;
  updated_at: string;
}

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  description: string | null;
  status: 'active' | 'inactive';
}

interface AgentSpace {
  id: string;
  name: string;
  color: string;
}

interface AgentTeam {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pattern: 'supervisor' | 'pipeline' | 'swarm';
  nodes: Array<{ id: string; data: { agentSlug: string; label?: string; isCoordinator?: boolean } }>;
  edges: Array<{ id: string; source: string; target: string }>;
  coordinator_slug: string | null;
  status: 'active' | 'inactive';
  built_in: boolean;
  space_id: string | null;
}

interface TeamNodeData {
  label: string;
  typeLabel: string;
  type: string;
  description?: string;
  accentColor: string;
  status?: CanvasNodeProps['status'];
  role?: string;
  department?: string;
  agentSlug?: string;
  isCoordinator?: boolean;
}

export interface TeamCanvasProps {
  executionState?: {
    currentStep?: string;
    completedSteps?: string[];
  };
}

// ─── Color & icon maps ────────────────────────────────────────────────────────

const DEPARTMENT_COLORS: Record<string, string> = {
  Development:  '#8b5cf6',
  Quality:      '#f59e0b',
  Security:     '#ef4444',
  Marketing:    '#ec4899',
  Analytics:    '#3b82f6',
  Planning:     '#14b8a6',
  Engineering:  '#6366f1',
  Strategy:     '#7c3aed',
  Management:   '#0891b2',
};

const FALLBACK_PALETTE = [
  '#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b',
  '#ec4899', '#6366f1', '#ef4444', '#10b981',
];

function getAgentColor(department: string, index: number): string {
  return DEPARTMENT_COLORS[department] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  trigger:     Play,
  agent:       Bot,
  coordinator: Users,
  end:         Flag,
  note:        StickyNote,
};

// ─── Auto-layout per pattern ──────────────────────────────────────────────────

const NODE_W = 160;
const NODE_H = 80;

function teamAutoLayout(
  nodes: Node<TeamNodeData>[],
  edges: Edge[],
  pattern: AgentTeam['pattern'],
): Node<TeamNodeData>[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: pattern === 'pipeline' ? 'LR' : 'TB',
    ranksep: pattern === 'pipeline' ? 60 : 80,
    nodesep: pattern === 'pipeline' ? 30 : 40,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

// ─── TeamNode (ReactFlow wrapper) ─────────────────────────────────────────────

const TeamNodeComponent = ({ data, selected }: { data: TeamNodeData; selected: boolean }) => {
  const Icon = ICONS[data.isCoordinator ? 'coordinator' : data.type] ?? Bot;
  return (
    <CanvasNode
      label={data.label}
      typeLabel={data.typeLabel}
      icon={Icon}
      accentColor={data.accentColor}
      description={data.description}
      status={data.status}
      selected={selected}
      hasTargetHandle={data.type !== 'trigger'}
      hasSourceHandle={data.type !== 'end'}
      navigateType="agents"
    />
  );
};

const TeamNode = memo(TeamNodeComponent);

const NODE_TYPES: NodeTypes = { teamAgent: TeamNode };

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function fetchTeams(): Promise<AgentTeam[]> {
  const res = await fetch('/api/admin/teams');
  const json = await res.json();
  if (!json.success) throw new Error('Failed to fetch teams');
  return (json.data as AgentTeam[]).filter((t) => t.status === 'active');
}

async function fetchAgents(): Promise<SpecialistAgent[]> {
  const res = await fetch('/api/admin/agents');
  const json = await res.json();
  if (!json.success) throw new Error('Failed to fetch agents');
  return json.data as SpecialistAgent[];
}

async function fetchSpaces(): Promise<AgentSpace[]> {
  const res = await fetch('/api/admin/spaces?status=active');
  const json = await res.json();
  if (!json.success) return [];
  return json.data as AgentSpace[];
}

async function fetchCasStatus(): Promise<CasAgentLiveStatus[]> {
  const res = await fetch('/api/admin/cas/agents/status');
  const json = await res.json();
  if (!json.success) return [];
  return json.data as CasAgentLiveStatus[];
}

/** Map CAS runtime status → CanvasNode status prop.
 *  CAS 'running' = agent daemon is healthy/online → green 'active' dot.
 *  Amber pulse ('running') is reserved for agents that were active within the last 5 minutes.
 */
function casStatusToNodeStatus(
  s: CasAgentLiveStatus['status'],
  lastActivityAt: string | null,
): CanvasNodeProps['status'] {
  if (s === 'error')   return 'pending';   // amber pending — closest to "needs attention"
  if (s === 'stopped') return 'skipped';   // gray
  if (s === 'paused')  return 'pending';   // amber
  // s === 'running': green normally; amber pulse if active in last 5 min
  if (lastActivityAt) {
    const ageMs = Date.now() - new Date(lastActivityAt).getTime();
    if (ageMs < 5 * 60_000) return 'running'; // recently active → amber pulse
  }
  return 'online'; // healthy/online → solid green, no pulse
}

function buildGraph(
  team: AgentTeam,
  agentMap: Map<string, SpecialistAgent>,
): { nodes: Node<TeamNodeData>[]; edges: Edge[] } {
  const rawNodes = team.nodes.map((n, i) => {
    const agent = agentMap.get(n.data.agentSlug);
    const isCoordinator = n.data.isCoordinator || n.data.agentSlug === team.coordinator_slug;
    const accentColor = agent ? getAgentColor(agent.department, i) : FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
    const typeLabel = isCoordinator ? 'COORDINATOR' : 'AGENT';

    const nodeData: TeamNodeData = {
      label: agent?.name ?? n.data.label ?? n.data.agentSlug,
      typeLabel,
      type: 'agent',
      description: agent?.role ?? undefined,
      accentColor,
      department: agent?.department,
      role: agent?.role,
      agentSlug: n.data.agentSlug,
      isCoordinator,
    };

    return {
      id: n.id,
      type: 'teamAgent',
      position: { x: 0, y: 0 },
      data: nodeData,
      draggable: true,
    } as Node<TeamNodeData>;
  });

  const edges: Edge[] = (team.edges ?? []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    style: { stroke: '#9ca3af', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af', width: 13, height: 13 },
  }));

  // For supervisor with no edges: auto-create star topology (coordinator → all agents)
  if (team.pattern === 'supervisor' && edges.length === 0 && team.coordinator_slug) {
    const coordNode = rawNodes.find((n) => n.data.agentSlug === team.coordinator_slug);
    if (coordNode) {
      rawNodes.forEach((n) => {
        if (n.id !== coordNode.id) {
          edges.push({
            id: `${coordNode.id}->${n.id}`,
            source: coordNode.id,  // coordinator dispatches to agents
            target: n.id,
            type: 'smoothstep',
            style: { stroke: '#9ca3af', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af', width: 13, height: 13 },
          });
        }
      });
    }
  }

  const positioned = teamAutoLayout(rawNodes, edges, team.pattern);
  return { nodes: positioned, edges };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamCanvas({ executionState }: TeamCanvasProps) {
  const { data: teams, isLoading: teamsLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: fetchTeams,
    staleTime: 60_000,
    refetchInterval: 90_000,
    refetchOnWindowFocus: true,
  });

  const { data: agents } = useQuery({
    queryKey: ['admin-agents'],
    queryFn: fetchAgents,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: spaces } = useQuery({
    queryKey: ['admin-spaces'],
    queryFn: fetchSpaces,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const agentMap = useMemo(() => {
    const map = new Map<string, SpecialistAgent>();
    (agents ?? []).forEach((a) => map.set(a.slug, a));
    return map;
  }, [agents]);

  // Selected team — default to first built-in
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const selectedTeam = useMemo(() => {
    if (!teams || teams.length === 0) return null;
    return teams.find((t) => t.id === selectedTeamId) ?? teams[0];
  }, [teams, selectedTeamId]);

  // DevOps Team live status — poll every 12s, only active when DevOps built-in team is shown
  const isCasTeam = selectedTeam?.built_in === true && selectedTeam?.slug === 'devops-team';
  const { data: casStatus } = useQuery({
    queryKey: ['cas-agent-status'],
    queryFn: fetchCasStatus,
    staleTime: 0,
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
    enabled: isCasTeam,
  });

  // Build graph when team or agents change
  const graphData = useMemo(() => {
    if (!selectedTeam) return { nodes: [], edges: [] };
    return buildGraph(selectedTeam, agentMap);
  }, [selectedTeam, agentMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.edges);

  useEffect(() => {
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
  }, [graphData, setNodes, setEdges]);

  // Apply CAS live status overlay (near real-time, replaces execution overlay when CAS team)
  useEffect(() => {
    if (!casStatus || casStatus.length === 0) return;
    const statusMap = new Map(casStatus.map((s) => [s.agent_id, s]));
    setNodes((nds) =>
      nds.map((node) => {
        const live = statusMap.get(node.data.agentSlug ?? '');
        if (!live) return node;
        return { ...node, data: { ...node.data, status: casStatusToNodeStatus(live.status, live.last_activity_at) } };
      })
    );
  }, [casStatus, setNodes]);

  // Apply execution state overlay
  useEffect(() => {
    if (!executionState) return;
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: executionState.completedSteps?.includes(node.id)
            ? 'completed'
            : executionState.currentStep === node.id
            ? 'running'
            : 'pending',
        },
      }))
    );
  }, [executionState, setNodes]);

  // Inspection drawer
  const [drawerNode, setDrawerNode] = useState<Node<TeamNodeData> | null>(null);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<TeamNodeData>) => {
    setDrawerNode(node);
  }, []);

  // Context menu (right-click)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node<TeamNodeData>) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const setConductorTab  = useDiscoveryStore((s) => s.setActiveTab);
  const pendingTeamSlug  = useDiscoveryStore((s) => s.pendingTeamSlug);
  const clearPendingTeam = useDiscoveryStore((s) => s.clearPendingTeam);

  // Auto-select team when navigated from another panel (e.g. Spaces)
  useEffect(() => {
    if (!pendingTeamSlug || !teams || teams.length === 0) return;
    const match = teams.find((t) => t.slug === pendingTeamSlug);
    if (match) {
      setSelectedTeamId(match.id);
      clearPendingTeam();
    }
  }, [pendingTeamSlug, teams, clearPendingTeam]);

  const patternLabel = selectedTeam?.pattern
    ? selectedTeam.pattern.charAt(0).toUpperCase() + selectedTeam.pattern.slice(1)
    : '';

  const patternClass =
    selectedTeam?.pattern === 'supervisor' ? styles.patternSupervisor
    : selectedTeam?.pattern === 'pipeline' ? styles.patternPipeline
    : styles.patternSwarm;

  if (teamsLoading) {
    return (
      <div className={styles.emptyState}>
        <RefreshCw size={18} />
        Loading teams…
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <div className={styles.emptyState}>
        No active agent teams found. Create one in the Build stage.
      </div>
    );
  }

  const teamNodeActions = {
    onViewDetails: (nodeId: string) => {
      const n = nodes.find((nd) => nd.id === nodeId);
      if (n) setDrawerNode(n);
    },
    onNavigate: (_nodeId: string, tab: 'agents' | 'teams') => setConductorTab(tab),
  };

  const contextMenuItems: ContextMenuItem[] = contextMenu ? [
    { icon: Info, label: 'View details', onClick: () => { const n = nodes.find((nd) => nd.id === contextMenu.nodeId); if (n) setDrawerNode(n); } },
    { icon: ArrowRight, label: 'Configure Agent', variant: 'navigate' as const, onClick: () => setConductorTab('agents') },
  ] : [];

  return (
    <CanvasNodeActionsContext.Provider value={teamNodeActions}>
    <div className={styles.wrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu as never}
        onPaneClick={() => setContextMenu(null)}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.3}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color={BACKGROUND_CONFIG.color}
          gap={BACKGROUND_CONFIG.gap}
          size={BACKGROUND_CONFIG.size}
          variant={BACKGROUND_CONFIG.variant}
        />
        <Controls className={styles.controls} showInteractive={false} />
        <MiniMap
          className={styles.minimap}
          nodeColor={(node) => (node.data as TeamNodeData).accentColor ?? '#9ca3af'}
          maskColor="rgba(0,0,0,0.06)"
          style={{ background: '#fff' }}
        />

        <Panel position="top-left">
          <div className={styles.toolbar}>
            <UnifiedSelect
              size="sm"
              value={selectedTeam?.id ?? ''}
              onChange={(v) => {
                setSelectedTeamId(String(v));
                setDrawerNode(null);
              }}
              placeholder="Select a team…"
              options={
                spaces && spaces.length > 0
                  ? [
                      ...spaces.flatMap((space) => {
                        const spaceTeams = teams.filter((t) => t.space_id === space.id);
                        return spaceTeams.map((t) => ({
                          value: t.id,
                          label: `${space.name} / ${t.name}`,
                        }));
                      }),
                      ...teams
                        .filter((t) => !t.space_id)
                        .map((t) => ({
                          value: t.id,
                          label: `Unassigned / ${t.name}`,
                        })),
                    ]
                  : teams.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))
              }
            />

            {patternLabel && (
              <span className={`${styles.patternBadge} ${patternClass}`}>
                {patternLabel}
              </span>
            )}

            {isCasTeam && (
              <span className={styles.liveBadge} title="Polling DevOps Team agent status every 12s">
                <span className={styles.liveDot} />
                Live
              </span>
            )}

            <button
              className={styles.refreshBtn}
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh teams"
            >
              <RefreshCw size={13} />
              {isFetching ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </Panel>
      </ReactFlow>

      {drawerNode && (
        <div className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <div
              className={styles.drawerAccent}
              style={{ background: drawerNode.data.accentColor }}
            />
            <div className={styles.drawerTitle}>
              <span className={styles.drawerTypeLabel}>
                {drawerNode.data.typeLabel}
              </span>
              <h3 className={styles.drawerName}>{drawerNode.data.label}</h3>
            </div>
            <button
              className={styles.drawerClose}
              onClick={() => setDrawerNode(null)}
              title="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className={styles.drawerBody}>
            {drawerNode.data.department && (
              <section className={styles.drawerSection}>
                <h4 className={styles.drawerSectionTitle}>Department</h4>
                <p className={styles.drawerSectionBody}>{drawerNode.data.department}</p>
              </section>
            )}
            {drawerNode.data.role && (
              <section className={styles.drawerSection}>
                <h4 className={styles.drawerSectionTitle}>Role</h4>
                <p className={styles.drawerSectionBody}>{drawerNode.data.role}</p>
              </section>
            )}
            {drawerNode.data.description && (
              <section className={styles.drawerSection}>
                <h4 className={styles.drawerSectionTitle}>Description</h4>
                <p className={styles.drawerSectionBody}>{drawerNode.data.description}</p>
              </section>
            )}
            {drawerNode.data.agentSlug && (
              <section className={styles.drawerSection}>
                <h4 className={styles.drawerSectionTitle}>Slug</h4>
                <p className={styles.drawerSectionBody}>{drawerNode.data.agentSlug}</p>
              </section>
            )}
          </div>
        </div>
      )}

      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
    </CanvasNodeActionsContext.Provider>
  );
}
