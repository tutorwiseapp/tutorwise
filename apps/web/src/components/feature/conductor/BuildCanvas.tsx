'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, memo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Panel,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
  useStore,
  getSmoothStepPath,
  updateEdge,
  addEdge,
  type EdgeProps,
  type EdgeTypes,
  type Connection,
  type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bot, Building2, Users, ChevronRight, ChevronDown, ChevronUp, RefreshCw, Save, Maximize2, Minimize2, FilePlus, FileDown, FileUp, Undo2, Redo2, Trash2, Pencil, Copy, Settings2, MessageSquare, Play, Brain, Send } from 'lucide-react';
import dagre from '@dagrejs/dagre';
import { FIT_VIEW_OPTIONS, BACKGROUND_CONFIG, CanvasContextMenu } from '@/components/feature/canvas';
import type { ContextMenuItem } from '@/components/feature/canvas';
import { useBuildStore } from './build-store';
import { BuildPalette, getDeptColor } from './BuildPalette';
import type { SpecialistAgentSummary, NavSpace, NavTeam } from './BuildPalette';
import { BuildPropertiesDrawer } from './BuildPropertiesDrawer';
import type { SpaceData, TeamData, AgentData } from './BuildPropertiesDrawer';
import styles from './BuildCanvas.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentSpace {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  team_count?: number;
  built_in?: boolean;
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
  status: string;
  space_id: string | null;
  built_in?: boolean;
}

interface CasAgentLiveStatus {
  agent_id: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  last_activity_at: string | null;
}

interface BuildNodeData {
  label: string;
  typeLabel: string;
  nodeEntityType: 'space' | 'team' | 'agent';
  accentColor: string;
  description?: string;
  status?: string;
  entityId: string;
  agentSlug?: string;
  // Rich display data
  teamCount?: number;
  agentCount?: number;
  pattern?: 'supervisor' | 'pipeline' | 'swarm';
  department?: string;
  isCoordinator?: boolean;
  // Raw entity for properties drawer
  spaceEntity?: SpaceData;
  teamEntity?: TeamData;
  agentEntity?: AgentData;
  // Runtime / lifecycle
  liveStatus?: CasAgentLiveStatus['status'];
  agentId?: string;       // registry id for CAS status lookup & delete
  built_in?: boolean;     // guard delete/deactivate operations
}

// ── Build node callbacks context ──────────────────────────────────────────────

interface BuildNodeCallbacks {
  onSelect: (nodeId: string, entityId: string, type: 'space' | 'team' | 'agent') => void;
  onDrillIn: (entityId: string, label: string) => void;
  onDelete?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
}

const BuildNodeCallbacksCtx = createContext<BuildNodeCallbacks>({
  onSelect: () => {},
  onDrillIn: () => {},
});

// ── Pattern colors ────────────────────────────────────────────────────────────

const PATTERN_COLORS: Record<string, string> = {
  supervisor: '#7c3aed',
  pipeline:   '#0891b2',
  swarm:      '#d97706',
};

// ── Dagre layout ──────────────────────────────────────────────────────────────

const NODE_W = 280;
const NODE_H = 120;

function buildAutoLayout(
  nodes: Node<BuildNodeData>[],
  edges: Edge[],
  rankdir: 'LR' | 'TB' = 'LR',
): Node<BuildNodeData>[] {
  if (nodes.length === 0) return nodes;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, ranksep: 90, nodesep: 50, marginx: 60, marginy: 60 });
  for (const node of nodes) g.setNode(node.id, { width: NODE_W, height: NODE_H });
  for (const edge of edges) g.setEdge(edge.source, edge.target);
  dagre.layout(g);
  return nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

// ── Grid layout (for levels 0 & 1 — no edges) ────────────────────────────────

const GRID_COLS = 3;
const GRID_COL_GAP = 60;
const GRID_ROW_GAP = 50;

function buildGridLayout(nodes: Node<BuildNodeData>[]): Node<BuildNodeData>[] {
  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: (i % GRID_COLS) * (NODE_W + GRID_COL_GAP) + 60,
      y: Math.floor(i / GRID_COLS) * (NODE_H + GRID_ROW_GAP) + 60,
    },
  }));
}

// ── Supervisor layout (coordinator at top, agents in grid below) ───────────────

function buildSupervisorLayout(
  nodes: Node<BuildNodeData>[],
  coordId: string | undefined,
): Node<BuildNodeData>[] {
  if (nodes.length === 0) return nodes;
  const coordNode = nodes.find((n) => n.id === coordId || n.data.isCoordinator);
  const agents = nodes.filter((n) => n !== coordNode);
  const COLS = agents.length <= 4 ? 2 : 3;
  const COL_GAP = 50;
  const ROW_GAP = 80;
  const totalW = COLS * NODE_W + (COLS - 1) * COL_GAP;
  const startX = 60;
  const result: Node<BuildNodeData>[] = [];
  if (coordNode) {
    result.push({ ...coordNode, position: { x: startX + totalW / 2 - NODE_W / 2, y: 60 } });
  }
  const agentY0 = 60 + NODE_H + ROW_GAP;
  agents.forEach((agent, i) => {
    result.push({
      ...agent,
      position: {
        x: startX + (i % COLS) * (NODE_W + COL_GAP),
        y: agentY0 + Math.floor(i / COLS) * (NODE_H + ROW_GAP),
      },
    });
  });
  return result;
}

// ── Bridge edge — smooth step path + white arc overlays at H/V crossings ──────

const BRIDGE_R  = 6;   // arc radius px
const BRIDGE_EP = 3;   // tolerance for H / V classification

type Seg4 = [number, number, number, number]; // [x1, y1, x2, y2]

/** H/V crossing detector: returns crossing point when H-seg meets V-seg */
function hvCross(ax1: number, ay: number, ax2: number, bx: number, by1: number, by2: number): { x: number; y: number } | null {
  const minAx = Math.min(ax1, ax2), maxAx = Math.max(ax1, ax2);
  const minBy = Math.min(by1, by2), maxBy = Math.max(by1, by2);
  if (bx > minAx + BRIDGE_EP && bx < maxAx - BRIDGE_EP && ay > minBy + BRIDGE_EP && ay < maxBy - BRIDGE_EP)
    return { x: bx, y: ay };
  return null;
}

/** 3-segment step path approximation for TB routing (bottom → top) */
function stepSegsTB(sx: number, sy: number, tx: number, ty: number): Seg4[] {
  const my = (sy + ty) / 2;
  return [
    [sx, sy, sx, my],   // V: source down to mid
    [sx, my, tx, my],   // H: mid horizontal
    [tx, my, tx, ty],   // V: mid down to target
  ];
}

/** 3-segment step path approximation for LR routing (right → left) */
function stepSegsLR(sx: number, sy: number, tx: number, ty: number): Seg4[] {
  const mx = (sx + tx) / 2;
  return [
    [sx, sy, mx, sy],   // H: source right to mid
    [mx, sy, mx, ty],   // V: mid vertical
    [mx, ty, tx, ty],   // H: mid right to target
  ];
}

/** Detect crossing points between this edge and all other edges via step-path approx */
function detectCrossings(
  edgeId: string,
  sx: number, sy: number,
  tx: number, ty: number,
  isTB: boolean,
  allEdges: Edge[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeInternals: Map<string, any>,
): { x: number; y: number }[] {
  const mySegs = isTB ? stepSegsTB(sx, sy, tx, ty) : stepSegsLR(sx, sy, tx, ty);
  const crossings: { x: number; y: number }[] = [];

  for (const e of allEdges) {
    if (e.id === edgeId) continue;
    const src = nodeInternals.get(e.source);
    const tgt = nodeInternals.get(e.target);
    if (!src || !tgt) continue;
    const pa = (n: any) => n.positionAbsolute ?? n.position ?? { x: 0, y: 0 }; // eslint-disable-line @typescript-eslint/no-explicit-any
    // Approximate handle positions (bottom-center source, top-center target)
    const esx = pa(src).x + NODE_W / 2;
    const esy = pa(src).y + NODE_H;
    const etx = pa(tgt).x + NODE_W / 2;
    const ety = pa(tgt).y;
    const otherSegs = isTB ? stepSegsTB(esx, esy, etx, ety) : stepSegsLR(esx, esy, etx, ety);

    for (const [ax1, ay1, ax2, ay2] of mySegs) {
      const aIsH = Math.abs(ay2 - ay1) < BRIDGE_EP;
      if (!aIsH) continue; // only add arcs on H segments of THIS edge
      for (const [bx1, by1, bx2, by2] of otherSegs) {
        const bIsH = Math.abs(by2 - by1) < BRIDGE_EP;
        if (bIsH) continue; // H-H don't cross
        const c = hvCross(ax1, ay1, ax2, bx1, by1, by2);
        if (c) crossings.push(c);
      }
    }
  }
  return crossings;
}

const BridgeEdgeComponent = function BridgeEdgeInner({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style, markerEnd,
}: EdgeProps) {
  const allEdges = useStore((s: any) => s.edges as Edge[]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const nodeInternals = useStore((s: any) => s.nodeInternals as Map<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any

  const isTB = sourcePosition === Position.Bottom || targetPosition === Position.Top;
  const [smoothPath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 10,
  });

  const crossings = detectCrossings(id, sourceX, sourceY, targetX, targetY, isTB, allEdges, nodeInternals);

  return (
    <>
      {/* Wide transparent path makes the edge easy to click and drag endpoints */}
      <path d={smoothPath} fill="none" strokeOpacity={0} strokeWidth={20} className="react-flow__edge-interaction" />
      <path id={id} d={smoothPath} style={style as React.CSSProperties} className="react-flow__edge-path" markerEnd={markerEnd} fill="none" />
      {crossings.map((c, i) => (
        <path
          key={i}
          d={`M ${c.x - BRIDGE_R} ${c.y} A ${BRIDGE_R} ${BRIDGE_R} 0 0 1 ${c.x + BRIDGE_R} ${c.y}`}
          fill="none"
          stroke="white"
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}
    </>
  );
};

const BridgeEdge = memo(BridgeEdgeComponent);
const EDGE_TYPES: EdgeTypes = { bridge: BridgeEdge };

// ── Rich ReactFlow node component ─────────────────────────────────────────────

const BuildNodeComponent = ({ id, data, selected }: { id: string; data: BuildNodeData; selected: boolean }) => {
  const { onSelect, onDrillIn, onDelete, onDuplicate } = useContext(BuildNodeCallbacksCtx);

  const isSpace = data.nodeEntityType === 'space';
  const isTeam  = data.nodeEntityType === 'team';
  const isAgent = data.nodeEntityType === 'agent';
  const canDrill = isSpace || isTeam;
  const statusActive = !data.status || data.status === 'active';

  const Icon = isSpace ? Building2 : isTeam ? Users : Bot;

  const hStyle = (visible: boolean): React.CSSProperties => ({
    background: '#c1c8d1',
    width: 9,
    height: 9,
    border: '2px solid #fff',
    borderRadius: '50%',
    opacity: visible ? 0.85 : 0,
    pointerEvents: visible ? 'auto' : 'none',
  });

  return (
    <>
      {/* 4 handles — agent nodes get visible dots; space/team nodes are invisible */}
      <Handle type="target"  position={Position.Top}    id="tt" style={hStyle(isAgent)} />
      <Handle type="source"  position={Position.Bottom} id="sb" style={hStyle(isAgent)} />
      <Handle type="target"  position={Position.Left}   id="lt" style={hStyle(isAgent)} />
      <Handle type="source"  position={Position.Right}  id="rs" style={hStyle(isAgent)} />

      {/* Card body */}
      <div className={`${styles.richNode} ${selected ? styles.richNodeSelected : ''}`}>
        <div className={styles.richNodeAccent} style={{ background: data.accentColor }} />
        <div className={styles.richNodeBody}>
          {/* Header: icon + name + badge */}
          <div className={styles.richNodeHeader}>
            <Icon size={14} style={{ color: data.accentColor, flexShrink: 0 }} />
            <span className={styles.richNodeTitle}>{data.label}</span>
            {isTeam && data.pattern && (
              <span
                className={styles.richNodeBadge}
                style={{ color: data.accentColor, borderColor: `${data.accentColor}55` }}
              >
                {data.pattern}
              </span>
            )}
            {isSpace && (
              <span className={styles.richNodeBadge} style={{ color: '#c1c8d1', borderColor: '#e5e7eb' }}>
                space
              </span>
            )}
            {isAgent && data.isCoordinator && (
              <span className={styles.richNodeCoordBadge}>lead</span>
            )}
          </div>

          {/* Description — single line truncated; native tooltip shows full text */}
          {data.description && (
            <p className={styles.richNodeDesc} title={data.description}>{data.description}</p>
          )}

          {/* Footer: stats + status + drill CTA */}
          <div className={styles.richNodeFooter}>
            <div className={styles.richNodeStats}>
              {isSpace && (
                <span className={styles.richNodeStat}>
                  <Users size={9} /> {data.teamCount ?? 0} team{data.teamCount !== 1 ? 's' : ''}
                </span>
              )}
              {isTeam && (
                <span className={styles.richNodeStat}>
                  <Bot size={9} /> {data.agentCount ?? 0} agent{data.agentCount !== 1 ? 's' : ''}
                </span>
              )}
              {isAgent && data.department && (
                <span className={styles.richNodeStat}>{data.department}</span>
              )}
            </div>
            {/* Live CAS status (agent nodes only) */}
            {isAgent && data.liveStatus ? (
              <div className={styles.liveStatusRow}>
                <span className={`${styles.liveStatusDot} ${
                  data.liveStatus === 'running' ? styles.liveRunning :
                  data.liveStatus === 'paused'  ? styles.livePaused  :
                  data.liveStatus === 'error'   ? styles.liveError   :
                  styles.liveStopped
                }`} />
                {data.liveStatus}
              </div>
            ) : (
              <div className={styles.richNodeStatus}>
                <span
                  className={`${styles.richNodeStatusDot} ${statusActive ? styles.richNodeStatusActive : styles.richNodeStatusInactive}`}
                />
                {data.status ?? 'active'}
              </div>
            )}
          </div>

          {/* Inline drill CTA for space/team nodes */}
          {canDrill && (
            <button
              className={styles.richNodeDrillBtn}
              onClick={(e) => { e.stopPropagation(); onDrillIn(data.entityId, data.label); }}
            >
              {isSpace ? 'Open teams' : 'Open agents'} <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

const BuildNode = memo(BuildNodeComponent);
const NODE_TYPES: NodeTypes = { buildNode: BuildNode };

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchSpaces(): Promise<AgentSpace[]> {
  const res = await fetch('/api/admin/spaces?status=active');
  const json = await res.json();
  if (!json.success) throw new Error('Failed to fetch spaces');
  return json.data as AgentSpace[];
}

async function fetchTeams(): Promise<AgentTeam[]> {
  const res = await fetch('/api/admin/teams');
  const json = await res.json();
  if (!json.success) throw new Error('Failed to fetch teams');
  return (json.data as AgentTeam[]).filter((t) => t.status === 'active');
}

async function fetchAgents(): Promise<SpecialistAgentSummary[]> {
  const res = await fetch('/api/admin/agents');
  const json = await res.json();
  if (!json.success) throw new Error('Failed to fetch agents');
  return (json.data as SpecialistAgentSummary[]).filter((a) => a.status === 'active');
}

async function fetchCasStatus(): Promise<CasAgentLiveStatus[]> {
  const res = await fetch('/api/admin/cas/agents/status');
  const json = await res.json();
  if (!json.success) return [];
  return json.data as CasAgentLiveStatus[];
}

// ── Inline agent chat panel (fits in the 300px right rail) ────────────────────

interface BuildChatMessage { role: 'user' | 'assistant'; content: string; }
interface AgentRunRecord {
  id: string;
  input_prompt: string;
  output_text: string | null;
  status: string;
  duration_ms: number | null;
}

function BuildAgentChat({ agent }: { agent: { id: string; name: string; role: string; description: string | null } }) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<BuildChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: runs = [], refetch: refetchRuns, isFetching: runsFetching } = useQuery<AgentRunRecord[]>({
    queryKey: ['build-agent-runs', agent.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/agents/${agent.id}/runs`);
      const json = await res.json();
      if (!json.success) return [];
      return json.data as AgentRunRecord[];
    },
    staleTime: 30_000,
    enabled: showHistory,
  });

  useEffect(() => {
    setMessages([]); setInput(''); setExpandedRun(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [agent.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(async (text?: string) => {
    const prompt = (text ?? input).trim();
    if (!prompt || streaming) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setStreaming(true);
    let assistantContent = '';
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'chunk' && event.data.content) {
                assistantContent += event.data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch { /* ignore */ }
          }
        }
      }
    } finally {
      setStreaming(false);
      qc.invalidateQueries({ queryKey: ['build-agent-runs', agent.id] });
    }
  }, [agent.id, input, streaming, qc]);

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatPanelHeader}>
        <Brain size={14} style={{ color: 'var(--color-primary, #006C67)', flexShrink: 0 }} />
        <span className={styles.chatPanelTitle}>{agent.name}</span>
        <span className={styles.chatPanelRole}>{agent.role}</span>
      </div>
      <div className={styles.chatPanelMessages}>
        {messages.length === 0 && (
          <div className={styles.chatPanelEmpty}>
            <Brain size={20} style={{ opacity: 0.3 }} />
            <span>Chat with {agent.name}</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? styles.chatMsgUser : styles.chatMsgAssistant}>
            {msg.content || (streaming && i === messages.length - 1 ? '…' : '')}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className={styles.chatPanelInput}>
        <textarea
          ref={inputRef}
          className={styles.chatPanelTextarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Ask ${agent.name}…`}
          rows={2}
          disabled={streaming}
        />
        <button className={styles.chatPanelSend} onClick={() => send()} disabled={!input.trim() || streaming}>
          <Send size={14} />
        </button>
      </div>
      <div className={styles.chatPanelHistoryToggle}>
        <button
          className={styles.chatPanelHistoryBtn}
          onClick={() => { setShowHistory((v) => !v); if (!showHistory) refetchRuns(); }}
        >
          {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Run History {runs.length > 0 && `(${runs.length})`}
          {runsFetching && <RefreshCw size={10} className={styles.spinning} />}
        </button>
      </div>
      {showHistory && (
        <div className={styles.chatPanelHistory}>
          {runs.length === 0 ? (
            <div className={styles.chatPanelHistoryEmpty}>No runs yet</div>
          ) : (
            runs.map((run) => (
              <div key={run.id} className={styles.chatRunCard}>
                <button
                  className={styles.chatRunHeader}
                  onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                >
                  <span className={styles.chatRunPrompt}>{run.input_prompt.slice(0, 50)}{run.input_prompt.length > 50 ? '…' : ''}</span>
                  <span className={styles.chatRunMeta}>
                    {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'}
                    {expandedRun === run.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </span>
                </button>
                {expandedRun === run.id && run.output_text && (
                  <div className={styles.chatRunOutput}>{run.output_text}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Undo/redo snapshot type (module-level to avoid re-declaration) ─────────────
type BuildSnapshot = { nodes: Node<BuildNodeData>[]; edges: Edge[] };

// ── Canvas inner (needs useReactFlow) ─────────────────────────────────────────

function BuildCanvasInner() {
  const qc = useQueryClient();
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'properties' | 'chat'>('properties');

  const {
    level, spaceId, spaceName, teamId, teamName,
    selectedNodeId, selectedNodeType, isDirty,
    drillToSpace, drillToTeam, drillUp, resetToRoot,
    selectNode, setDirty,
  } = useBuildStore();

  const { fitView } = useReactFlow();

  // ── Queries ──────────────────────────────────────────────────────────────────

  // NOTE: no `= []` defaults — new array literals on every render break useMemo stability
  const { data: spaces, isLoading: spacesLoading, refetch: refetchSpaces } = useQuery({
    queryKey: ['build-spaces'],
    queryFn: fetchSpaces,
    staleTime: 60_000,
  });

  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useQuery({
    queryKey: ['build-teams'],
    queryFn: fetchTeams,
    staleTime: 60_000,
  });

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['build-agents'],
    queryFn: fetchAgents,
    staleTime: 5 * 60_000,
  });

  // No inline `= []` default — that creates a new array reference every render,
  // destabilising casStatusMap → graphData → setNodes effect → infinite loop.
  const { data: casStatusList } = useQuery<CasAgentLiveStatus[]>({
    queryKey: ['build-cas-status'],
    queryFn: fetchCasStatus,
    enabled: level === 2,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const isLoading = level === 0 ? spacesLoading : level === 1 ? teamsLoading : agentsLoading;

  // ── Agent lookup ──────────────────────────────────────────────────────────────

  const agentMap = useMemo(() => {
    const m = new Map<string, SpecialistAgentSummary>();
    // agents is undefined while loading — stable reference, no recompute each render
    (agents ?? []).forEach((a) => m.set(a.slug, a));
    return m;
  }, [agents]);

  // Map agent registry id → CAS live status
  const casStatusMap = useMemo(() => {
    const m = new Map<string, CasAgentLiveStatus>();
    (casStatusList ?? []).forEach((s) => m.set(s.agent_id, s));
    return m;
  }, [casStatusList]);

  // ── Build graph from data ─────────────────────────────────────────────────────

  const graphData = useMemo((): { nodes: Node<BuildNodeData>[]; edges: Edge[] } => {
    const safeSpaces = spaces ?? [];
    const safeTeams = teams ?? [];

    if (level === 0) {
      // Show all spaces as nodes
      const rawNodes: Node<BuildNodeData>[] = safeSpaces.map((space) => {
        const spaceTeamCount = safeTeams.filter((t) => t.space_id === space.id).length;
        return {
          id: space.id,
          type: 'buildNode',
          position: { x: 0, y: 0 },
          data: {
            label: space.name,
            typeLabel: 'SPACE',
            nodeEntityType: 'space',
            accentColor: space.color || '#c1c8d1',
            description: space.description ?? undefined,
            status: space.status,
            built_in: space.built_in,
            entityId: space.id,
            teamCount: spaceTeamCount,
            spaceEntity: {
              id: space.id,
              name: space.name,
              description: space.description,
              color: space.color,
              status: space.status,
            },
          },
          draggable: true,
        };
      });
      // Add virtual "Unassigned" node if any teams have no space
      const unassignedTeams = safeTeams.filter((t) => !t.space_id);
      if (unassignedTeams.length > 0) {
        rawNodes.push({
          id: '__unassigned__',
          type: 'buildNode',
          position: { x: 0, y: 0 },
          data: {
            label: 'Unassigned',
            typeLabel: 'SPACE',
            nodeEntityType: 'space',
            accentColor: '#6b7280',
            description: `${unassignedTeams.length} team${unassignedTeams.length !== 1 ? 's' : ''} not assigned to a space`,
            status: 'active',
            entityId: '__unassigned__',
            teamCount: unassignedTeams.length,
          },
          draggable: true,
        });
      }
      return { nodes: buildGridLayout(rawNodes), edges: [] };
    }

    if (level === 1) {
      // Show teams within current space (or unassigned teams for sentinel)
      const spaceTeams = spaceId === '__unassigned__'
        ? safeTeams.filter((t) => !t.space_id)
        : safeTeams.filter((t) => t.space_id === spaceId);
      const rawNodes: Node<BuildNodeData>[] = spaceTeams.map((team) => ({
        id: team.id,
        type: 'buildNode',
        position: { x: 0, y: 0 },
        data: {
          label: team.name,
          typeLabel: team.pattern.toUpperCase(),
          nodeEntityType: 'team',
          accentColor: PATTERN_COLORS[team.pattern] ?? '#c1c8d1',
          description: team.description ?? undefined,
          status: team.status,
          entityId: team.id,
          agentCount: team.nodes?.length ?? 0,
          pattern: team.pattern,
          built_in: team.built_in,
          teamEntity: {
            id: team.id,
            name: team.name,
            description: team.description,
            pattern: team.pattern,
            coordinator_slug: team.coordinator_slug,
            status: team.status,
            space_id: team.space_id,
          },
        },
        draggable: true,
      }));
      return { nodes: buildGridLayout(rawNodes), edges: [] };
    }

    // level === 2: Show agents within selected team
    const team = safeTeams.find((t) => t.id === teamId);
    if (!team) return { nodes: [], edges: [] };

    const rawNodes: Node<BuildNodeData>[] = team.nodes.map((n, i) => {
      const agent = agentMap.get(n.data.agentSlug);
      const isCoord = n.data.isCoordinator || n.data.agentSlug === team.coordinator_slug;
      const color = agent ? getDeptColor(agent.department, i) : '#c1c8d1';
      const storedPos = (n as unknown as { position?: { x: number; y: number } }).position;
      const cas = agent ? casStatusMap.get(agent.id) : undefined;

      return {
        id: n.id,
        type: 'buildNode',
        position: storedPos ?? { x: 0, y: 0 },
        data: {
          label: agent?.name ?? n.data.label ?? n.data.agentSlug,
          typeLabel: isCoord ? 'COORDINATOR' : 'AGENT',
          nodeEntityType: 'agent',
          accentColor: color,
          description: agent?.role,
          status: agent?.status ?? 'active',
          entityId: n.id,
          agentSlug: n.data.agentSlug,
          agentId: agent?.id,
          department: agent?.department,
          isCoordinator: isCoord,
          built_in: agent?.built_in,
          liveStatus: cas?.status,
          agentEntity: agent
            ? {
                id: agent.id,
                slug: agent.slug,
                name: agent.name,
                role: agent.role,
                department: agent.department,
                description: null,
                status: agent.status,
              }
            : undefined,
        },
        draggable: true,
      } as Node<BuildNodeData>;
    });

    const EDGE_STYLE = { stroke: '#c1c8d1', strokeWidth: 2.5 };
    const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: '#c1c8d1', width: 16, height: 16 };

    const edges: Edge[] = (team.edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: 'sb',
      targetHandle: 'tt',
      type: 'bridge',
      style: EDGE_STYLE,
      markerEnd: EDGE_MARKER,
    }));

    // Supervisor auto-topology
    if (team.pattern === 'supervisor' && edges.length === 0 && team.coordinator_slug) {
      const coordNode = rawNodes.find((n) => n.data.agentSlug === team.coordinator_slug);
      if (coordNode) {
        rawNodes.forEach((n) => {
          if (n.id !== coordNode.id) {
            edges.push({
              id: `${coordNode.id}->${n.id}`,
              source: coordNode.id,
              sourceHandle: 'sb',
              target: n.id,
              targetHandle: 'tt',
              type: 'bridge',
              style: EDGE_STYLE,
              markerEnd: EDGE_MARKER,
            });
          }
        });
      }
    }

    // Pipeline auto-topology: sequential chain if no stored edges
    if (team.pattern === 'pipeline' && edges.length === 0 && rawNodes.length > 1) {
      rawNodes.forEach((n, i) => {
        if (i < rawNodes.length - 1) {
          edges.push({
            id: `pipe-${n.id}->${rawNodes[i + 1].id}`,
            source: n.id,
            sourceHandle: 'sb',
            target: rawNodes[i + 1].id,
            targetHandle: 'tt',
            type: 'bridge',
            style: EDGE_STYLE,
            markerEnd: EDGE_MARKER,
          });
        }
      });
    }

    // If all nodes have saved positions, honour them and skip auto-layout
    const allHavePositions = rawNodes.every(
      (n) => n.position.x !== 0 || n.position.y !== 0,
    );

    // Choose layout based on pattern (only when no saved positions)
    // Supervisor with stored edges → dagre TB respects hierarchy (e.g. director→planner→agents)
    // Supervisor with no edges (auto-topology) → buildSupervisorLayout (coord top, agents grid)
    let laid: Node<BuildNodeData>[];
    if (allHavePositions) {
      laid = rawNodes;
    } else if (team.pattern === 'supervisor' && edges.length > 0) {
      laid = buildAutoLayout(rawNodes, edges, 'TB');
    } else if (team.pattern === 'supervisor') {
      laid = buildSupervisorLayout(rawNodes, rawNodes.find((n) => n.data.agentSlug === team.coordinator_slug)?.id);
    } else if (team.pattern === 'pipeline') {
      laid = buildAutoLayout(rawNodes, edges, 'TB');
    } else {
      // swarm — grid layout
      laid = buildGridLayout(rawNodes);
    }
    return { nodes: laid, edges };
  }, [level, spaces, teams, agents, spaceId, teamId, agentMap, casStatusMap]);

  // ── Nav data for left palette ─────────────────────────────────────────────────

  const navSpaces = useMemo((): NavSpace[] =>
    (spaces ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#c1c8d1',
      teamCount: (teams ?? []).filter((t) => t.space_id === s.id).length,
    })),
  [spaces, teams]);

  const navTeams = useMemo((): NavTeam[] =>
    (teams ?? [])
      .filter((t) => t.space_id === spaceId)
      .map((t) => ({
        id: t.id,
        name: t.name,
        pattern: t.pattern,
        agentCount: t.nodes?.length ?? 0,
      })),
  [teams, spaceId]);

  // ── ReactFlow state ───────────────────────────────────────────────────────────

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.edges);

  // Mark dirty when nodes are dragged to new positions (drag-end only)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    if (level === 2 && changes.some((c) => c.type === 'position' && !(c as { dragging?: boolean }).dragging)) {
      setDirty(true);
    }
  }, [onNodesChange, level, setDirty]);

  useEffect(() => {
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
    setTimeout(() => fitView(FIT_VIEW_OPTIONS), 50);
  // setNodes and setEdges are stable; fitView is stable from useReactFlow
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // ── Undo / Redo — declared AFTER nodes/edges so no TDZ ────────────────────────

  const undoStack = useRef<BuildSnapshot[]>([]);
  const redoStack = useRef<BuildSnapshot[]>([]);
  const [, forceHistoryRender] = useState(0);

  const pushSnapshot = useCallback((currentNodes: Node<BuildNodeData>[], currentEdges: Edge[]) => {
    undoStack.current = [...undoStack.current.slice(-49), { nodes: structuredClone(currentNodes), edges: structuredClone(currentEdges) }];
    redoStack.current = [];
    forceHistoryRender((n) => n + 1);
  }, []);

  const handleUndo = useCallback(() => {
    const snap = undoStack.current.pop();
    if (!snap) return;
    redoStack.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    setNodes(snap.nodes);
    setEdges(snap.edges);
    forceHistoryRender((n) => n + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const snap = redoStack.current.pop();
    if (!snap) return;
    undoStack.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    setNodes(snap.nodes);
    setEdges(snap.edges);
    forceHistoryRender((n) => n + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  // ── Node click → selection & drill-down ──────────────────────────────────────

  const handleNodeClick = useCallback((_e: React.MouseEvent, node: Node<BuildNodeData>) => {
    const { nodeEntityType, entityId, label } = node.data;
    // Space / team: click the card → drill in. Right-click → properties via context menu.
    if (nodeEntityType === 'space') {
      drillToSpace(entityId, label);
    } else if (nodeEntityType === 'team') {
      drillToTeam(entityId, label);
    } else {
      // Agent: click → select for properties panel
      selectNode(node.id, nodeEntityType);
    }
  }, [selectNode, drillToSpace, drillToTeam]);

  const handleNodeDoubleClick = useCallback((_e: React.MouseEvent, _node: Node<BuildNodeData>) => {
    // no-op — single click handles drill-in
  }, []);

  const handlePaneClick = useCallback(() => {
    selectNode(null, null);
    setContextMenu(null);
  }, [selectNode]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node<BuildNodeData>) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
    // Also select the node so the right panel shows its form
    selectNode(
      node.data.nodeEntityType === 'agent' ? node.id : node.data.entityId,
      node.data.nodeEntityType,
    );
  }, [selectNode]);

  // ── Save topology (level 2) ───────────────────────────────────────────────────

  const saveTeamMutation = useMutation({
    mutationFn: async () => {
      const team = (teams ?? []).find((t) => t.id === teamId);
      if (!team) throw new Error('Team not found');

      const newNodes = nodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: { agentSlug: n.data.agentSlug ?? '', isCoordinator: n.data.typeLabel === 'COORDINATOR' },
      }));
      const newEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));

      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: team.name,
          description: team.description,
          pattern: team.pattern,
          coordinator_slug: team.coordinator_slug,
          nodes: newNodes,
          edges: newEdges,
          status: team.status,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Save failed');
      return json;
    },
    onSuccess: () => {
      toast.success('Team topology saved');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['build-teams'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Save failed'),
  });

  // ── Delete space / team / agent from registry ────────────────────────────────

  const deleteSpaceMutation = useMutation({
    mutationFn: async (entityId: string) => {
      if (!confirm('Deactivate this space? Teams will become unassigned.')) throw new Error('cancelled');
      await fetch(`/api/admin/spaces/${entityId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Space deactivated');
      qc.invalidateQueries({ queryKey: ['build-spaces'] });
    },
    onError: (e) => { if ((e as Error).message !== 'cancelled') toast.error('Failed to deactivate space'); },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (entityId: string) => {
      if (!confirm('Deactivate this team?')) throw new Error('cancelled');
      await fetch(`/api/admin/teams/${entityId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Team deactivated');
      qc.invalidateQueries({ queryKey: ['build-teams'] });
    },
    onError: (e) => { if ((e as Error).message !== 'cancelled') toast.error('Failed to deactivate team'); },
  });

  const deactivateAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      if (!confirm('Deactivate this agent from the registry?')) throw new Error('cancelled');
      await fetch(`/api/admin/agents/${agentId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Agent deactivated');
      qc.invalidateQueries({ queryKey: ['build-agents'] });
      qc.invalidateQueries({ queryKey: ['build-agents-palette'] });
      qc.invalidateQueries({ queryKey: ['build-teams'] });
    },
    onError: (e) => { if ((e as Error).message !== 'cancelled') toast.error('Failed to deactivate agent'); },
  });

  // ── Run team (level 2) ────────────────────────────────────────────────────────

  const runTeamMutation = useMutation({
    mutationFn: async (task: string) => {
      const res = await fetch(`/api/admin/teams/${teamId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Run failed');
      return json;
    },
    onSuccess: () => toast.success('Team run started. Check run history for results.'),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Run failed'),
  });

  const handleRunTeam = useCallback(() => {
    const task = window.prompt('Task for this team:');
    if (!task?.trim()) return;
    runTeamMutation.mutate(task.trim());
  }, [runTeamMutation]);

  // ── Drop agent from palette ───────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (level !== 2) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, [level]);

  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (level !== 2) return;

    const agentSlug = e.dataTransfer.getData('application/build-agent-slug');
    const agentName = e.dataTransfer.getData('application/build-agent-name');
    const agentDept = e.dataTransfer.getData('application/build-agent-dept');
    if (!agentSlug) return;

    // Don't add duplicates
    const alreadyExists = nodes.some((n) => n.data.agentSlug === agentSlug);
    if (alreadyExists) {
      toast.info(`${agentName} is already on this team`);
      return;
    }

    const position = reactFlowInstance.current?.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    }) ?? { x: 100, y: 100 };

    const newNode: Node<BuildNodeData> = {
      id: `agent-${agentSlug}-${Date.now()}`,
      type: 'buildNode',
      position,
      data: {
        label: agentName,
        typeLabel: 'AGENT',
        nodeEntityType: 'agent',
        accentColor: getDeptColor(agentDept, nodes.length),
        description: undefined,
        entityId: `agent-${agentSlug}`,
        agentSlug,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setDirty(true);
    toast.success(`Added ${agentName} to team`);
  }, [level, nodes, setNodes, setDirty]);

  // Add agent directly from palette "create new" (no drag, just add to canvas center)
  const handleAddAgentFromPalette = useCallback((agent: SpecialistAgentSummary) => {
    if (level !== 2) return;
    const alreadyExists = nodes.some((n) => n.data.agentSlug === agent.slug);
    if (alreadyExists) { toast.info(`${agent.name} is already on this team`); return; }
    const newNode: Node<BuildNodeData> = {
      id: `agent-${agent.slug}-${Date.now()}`,
      type: 'buildNode',
      position: { x: 80 + nodes.length * 40, y: 80 + nodes.length * 30 },
      data: {
        label: agent.name,
        typeLabel: 'AGENT',
        nodeEntityType: 'agent',
        accentColor: getDeptColor(agent.department, nodes.length),
        description: agent.role,
        entityId: `agent-${agent.slug}`,
        agentSlug: agent.slug,
        agentEntity: { id: agent.id, slug: agent.slug, name: agent.name, role: agent.role, department: agent.department, description: null, status: agent.status },
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setDirty(true);
    toast.success(`Added ${agent.name} to team`);
  }, [level, nodes, setNodes, setDirty]);

  // ── Delete agent node (level 2) ───────────────────────────────────────────────

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    selectNode(null, null);
    setDirty(true);
  }, [setNodes, setEdges, selectNode, setDirty]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const source = nodes.find((n) => n.id === nodeId);
    if (!source) return;
    const newId = `${source.id}-copy-${Date.now()}`;
    const newNode: Node<BuildNodeData> = {
      ...source,
      id: newId,
      position: { x: source.position.x + 180, y: source.position.y + 20 },
      selected: false,
    };
    setNodes((nds) => [...nds, newNode]);
    setDirty(true);
  }, [nodes, setNodes, setDirty]);

  // ── Edge reconnection (drag endpoint to a different handle) ───────────────────

  const edgeReconnectSuccessful = useRef(true);

  const onEdgeUpdateStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    edgeReconnectSuccessful.current = true;
    setEdges((eds) => updateEdge(oldEdge, newConnection, eds));
    setDirty(true);
  }, [setEdges, setDirty]);

  const onEdgeUpdateEnd = useCallback((_: MouseEvent | TouchEvent, edge: Edge) => {
    // If dropped on nothing (no handle) remove the edge
    if (!edgeReconnectSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      setDirty(true);
    }
    edgeReconnectSuccessful.current = true;
  }, [setEdges, setDirty]);

  // ── New connection drawn by user ──────────────────────────────────────────────

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const newEdge: Edge = {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? 'sb',
      targetHandle: connection.targetHandle ?? 'tt',
      id: `e-${connection.source}-${connection.sourceHandle ?? 'sb'}-${connection.target}-${connection.targetHandle ?? 'tt'}-${Date.now()}`,
      type: 'bridge',
      style: { stroke: '#c1c8d1', strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#c1c8d1', width: 16, height: 16 },
    };
    setEdges((eds) => addEdge(newEdge, eds));
    setDirty(true);
  }, [setEdges, setDirty]);

  // ── Context menu items ────────────────────────────────────────────────────────

  const contextMenuItems: ContextMenuItem[] = contextMenu ? (() => {
    const node = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!node) return [];
    const { nodeEntityType, entityId, built_in, agentId } = node.data;
    const isVirtualNode = entityId === '__unassigned__';

    const items: ContextMenuItem[] = [
      {
        icon: Pencil,
        label: 'Edit',
        onClick: () => selectNode(
          nodeEntityType === 'agent' ? node.id : entityId,
          nodeEntityType,
        ),
      },
    ];

    // Level 0 — space nodes: delete (non-built-in, non-virtual)
    if (level === 0 && nodeEntityType === 'space' && !built_in && !isVirtualNode) {
      items.push({
        icon: Trash2,
        label: 'Deactivate space',
        onClick: () => deleteSpaceMutation.mutate(entityId),
        variant: 'danger',
        dividerBefore: true,
      });
    }

    // Level 1 — team nodes: delete (non-built-in)
    if (level === 1 && nodeEntityType === 'team' && !built_in) {
      items.push({
        icon: Trash2,
        label: 'Deactivate team',
        onClick: () => deleteTeamMutation.mutate(entityId),
        variant: 'danger',
        dividerBefore: true,
      });
    }

    // Level 2 — agent nodes: canvas remove + registry deactivate
    if (level === 2 && nodeEntityType === 'agent') {
      items.push({
        icon: Copy,
        label: 'Duplicate',
        onClick: () => handleDuplicateNode(contextMenu.nodeId),
      });
      items.push({
        icon: Trash2,
        label: 'Remove from team',
        onClick: () => handleDeleteNode(contextMenu.nodeId),
        variant: 'danger',
        dividerBefore: true,
      });
      if (!built_in && agentId) {
        items.push({
          icon: Trash2,
          label: 'Deactivate agent',
          onClick: () => deactivateAgentMutation.mutate(agentId),
          variant: 'danger',
        });
      }
    }

    return items;
  })() : [];

  // ── Resolve selected entity data for drawer ───────────────────────────────────

  const selectedNode = nodes.find((n) =>
    selectedNodeType === 'agent' ? n.id === selectedNodeId : n.data.entityId === selectedNodeId
  );
  const spaceEntity = selectedNode?.data.spaceEntity;
  const teamEntity  = selectedNode?.data.teamEntity;
  const agentEntity = selectedNode?.data.agentEntity;

  // ── Refetch ───────────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    if (level === 0) refetchSpaces();
    else refetchTeams();
  }, [level, refetchSpaces, refetchTeams]);

  // ── Export PDF ────────────────────────────────────────────────────────────────

  const handleExportPDF = useCallback(async () => {
    if (!reactFlowWrapper.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      const w = reactFlowWrapper.current.clientWidth;
      const h = reactFlowWrapper.current.clientHeight;
      const dataUrl = await toPng(reactFlowWrapper.current, { backgroundColor: '#f9fafb', width: w, height: h });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [w, h] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
      pdf.save(`build-canvas-${Date.now()}.pdf`);
    } catch {
      toast.error('PDF export failed');
    }
  }, []);

  // ── Export JSON ───────────────────────────────────────────────────────────────

  const handleExportJSON = useCallback(() => {
    const payload = { nodes, edges, meta: { level, spaceId, teamId } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `build-canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, level, spaceId, teamId]);

  // ── Import JSON ───────────────────────────────────────────────────────────────

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
          pushSnapshot(nodes, edges);
          setNodes(data.nodes);
          setEdges(data.edges);
          setDirty(true);
          toast.success('Canvas imported');
        } else {
          toast.error('Invalid canvas JSON');
        }
      } catch {
        toast.error('Could not parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [nodes, edges, setNodes, setEdges, pushSnapshot, setDirty]);

  // ── Clear canvas ──────────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    if (nodes.length === 0) return;
    if (!window.confirm('Clear all nodes and edges from the canvas?')) return;
    pushSnapshot(nodes, edges);
    setNodes([]);
    setEdges([]);
    setDirty(true);
  }, [nodes, edges, setNodes, setEdges, pushSnapshot, setDirty]);

  // ── Fullscreen ────────────────────────────────────────────────────────────────

  const handleFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const ctrl = e.metaKey || e.ctrlKey;
      if (ctrl && e.key === 's') { e.preventDefault(); if (level === 2 && isDirty) saveTeamMutation.mutate(); }
      if (ctrl && !e.shiftKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (ctrl && e.shiftKey && e.key === 'z') { e.preventDefault(); handleRedo(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // saveTeamMutation.mutate is stable; handleUndo/handleRedo captured via closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, isDirty, handleUndo, handleRedo]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const buildNodeCallbacks = useMemo<BuildNodeCallbacks>(() => ({
    onSelect: (nodeId, entityId, type) => selectNode(type === 'agent' ? nodeId : entityId, type),
    onDrillIn: (entityId, label) => {
      if (level === 0) drillToSpace(entityId, label);
      else if (level === 1) drillToTeam(entityId, label);
    },
    onDelete: level === 2 ? handleDeleteNode : undefined,
    onDuplicate: level === 2 ? handleDuplicateNode : undefined,
  }), [selectNode, drillToSpace, drillToTeam, level, handleDeleteNode, handleDuplicateNode]);

  return (
    <div className={styles.wrapper}>
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Left: action buttons — matches Workflow toolbar layout */}
        <div className={styles.toolbarActions}>
          <button
            className={styles.toolbarBtn}
            onClick={() => setShowNewForm(true)}
            title={`New ${level === 0 ? 'space' : level === 1 ? 'team' : 'agent'}`}
          >
            <FilePlus size={14} /> New
          </button>

          <button
            className={`${styles.toolbarBtn} ${isDirty && level === 2 ? styles.saveBtnActive : ''}`}
            onClick={() => { if (level === 2) saveTeamMutation.mutate(); }}
            disabled={!isDirty || saveTeamMutation.isPending || level !== 2}
            title="Save topology (Ctrl+S)"
          >
            <Save size={14} /> {saveTeamMutation.isPending ? 'Saving…' : 'Save'}
          </button>

          {level === 2 && (
            <button
              className={styles.toolbarBtn}
              onClick={handleRunTeam}
              disabled={runTeamMutation.isPending}
              title="Run this team with a task"
            >
              <Play size={14} /> {runTeamMutation.isPending ? 'Running…' : 'Run'}
            </button>
          )}

          <button className={styles.toolbarBtn} onClick={handleExportPDF} title="Export as PDF">
            <FileDown size={14} /> PDF
          </button>

          <button className={styles.toolbarBtn} onClick={handleExportJSON} title="Export as JSON">
            <FileDown size={14} /> JSON
          </button>

          <button className={styles.toolbarBtn} onClick={() => fileInputRef.current?.click()} title="Import JSON file">
            <FileUp size={14} /> Import
          </button>

          <button className={styles.toolbarBtn} onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo2 size={14} /> Undo
          </button>

          <button className={styles.toolbarBtn} onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 size={14} /> Redo
          </button>

          <button
            className={`${styles.toolbarBtn} ${styles.danger}`}
            onClick={handleClear}
            disabled={nodes.length === 0}
            title="Clear canvas"
          >
            <Trash2 size={14} /> Clear
          </button>

          <button className={styles.toolbarBtn} onClick={handleRefresh} disabled={isLoading} title="Refresh data">
            <RefreshCw size={14} className={isLoading ? styles.spinning : undefined} />
          </button>

          <button className={styles.toolbarBtn} onClick={handleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />} Fullscreen
          </button>
        </div>

        {/* Right: stats + save status */}
        <div className={styles.toolbarMeta}>
          <span className={styles.toolbarStats}>{nodes.length} nodes · {edges.length} connections</span>

          {saveTeamMutation.isPending && (
            <span className={`${styles.saveStatus} ${styles.saveStatusSaving}`}>
              <span className={styles.statusDot} /> Saving…
            </span>
          )}
          {isDirty && !saveTeamMutation.isPending && level === 2 && (
            <span className={`${styles.saveStatus} ${styles.saveStatusUnsaved}`}>
              <span className={styles.statusDot} /> Unsaved
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Left palette — only shown at level 2 */}
        <BuildPalette
          level={level}
          spaceId={spaceId}
          spaceName={spaceName}
          teamName={teamName}
          navSpaces={navSpaces}
          navTeams={navTeams}
          selectedId={selectedNodeId}
          onNavClick={(id, name) => { if (level === 0) drillToSpace(id, name); else drillToTeam(id, name); }}
          onNavDrillIn={(id, name) => { if (level === 0) drillToSpace(id, name); else drillToTeam(id, name); }}
          onAddAgentToCanvas={handleAddAgentFromPalette}
          triggerCreate={showNewForm}
          onTriggerCreateHandled={() => setShowNewForm(false)}
        />

        {/* Canvas */}
        <div
          ref={reactFlowWrapper}
          className={styles.canvasArea}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {isDragOver && level === 2 && (
            <div className={styles.dropOverlay}>Drop agent here</div>
          )}

          <BuildNodeCallbacksCtx.Provider value={buildNodeCallbacks}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              connectionMode={"loose" as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onPaneClick={handlePaneClick}
              onNodeContextMenu={onNodeContextMenu as never}
              onConnect={onConnect}
              onInit={(inst) => { reactFlowInstance.current = inst; }}
              fitView
              fitViewOptions={FIT_VIEW_OPTIONS}
              nodesConnectable={level === 2}
              nodesDraggable={true}
              edgesUpdatable={level === 2}
              onEdgeUpdateStart={onEdgeUpdateStart}
              onEdgeUpdate={onEdgeUpdate}
              onEdgeUpdateEnd={onEdgeUpdateEnd as never}
              minZoom={0.2}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background {...BACKGROUND_CONFIG} />
              <Controls className={styles.controls} />
              <MiniMap
                className={styles.minimap}
                nodeStrokeWidth={3}
                zoomable
                pannable
              />
              {/* Empty state — inside ReactFlow so back button Panel is always visible */}
              {!isLoading && nodes.length === 0 && (
                <Panel position="top-center">
                  <div className={styles.emptyState}>
                    <Building2 size={32} className={styles.emptyIcon} />
                    <span>
                      {level === 0 ? 'No spaces found.' : level === 1 ? 'No teams in this space.' : 'No agents in this team. Drag from the left panel.'}
                    </span>
                  </div>
                </Panel>
              )}
              {isLoading && nodes.length === 0 && (
                <Panel position="top-center">
                  <div className={styles.emptyState}>
                    <RefreshCw size={20} className={styles.spinning} />
                    Loading…
                  </div>
                </Panel>
              )}

              {/* Back button — levels 1 and 2 only (not on spaces root) */}
              {level >= 1 && (
                <Panel position="top-left">
                  <button className={styles.backButton} onClick={drillUp} title="Go up one level">
                    ← Back
                  </button>
                </Panel>
              )}
              <Panel position="top-right" className={styles.panelActions}>
                <div className={styles.panelToggle}>
                  <button
                    className={`${styles.toggleButton} ${rightPanelMode === 'properties' ? styles.toggleActive : ''}`}
                    onClick={() => setRightPanelMode('properties')}
                    title="Properties panel"
                  >
                    <Settings2 size={14} />
                  </button>
                  <button
                    className={`${styles.toggleButton} ${rightPanelMode === 'chat' ? styles.toggleActive : ''}`}
                    onClick={() => setRightPanelMode('chat')}
                    title="Assistant (coming soon)"
                  >
                    <MessageSquare size={14} />
                  </button>
                </div>
              </Panel>
              <Panel position="bottom-center" className={styles.hint}>
                {level === 0
                  ? 'Click a space to open its teams · right-click to edit properties · drag to reposition'
                  : level === 1
                    ? 'Click a team to open its agents · right-click to edit properties · drag to reposition'
                    : 'Drag agents from the left panel · click to select · connect handles with edges'}
              </Panel>
            </ReactFlow>
          </BuildNodeCallbacksCtx.Provider>

          {/* Context menu */}
          {contextMenu && contextMenuItems.length > 0 && (
            <CanvasContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              items={contextMenuItems}
              onClose={() => setContextMenu(null)}
            />
          )}
        </div>

        {/* Right panel — always visible, shows empty state when nothing selected */}
        <div className={styles.rightPanel}>
          {rightPanelMode === 'properties' && (
            <BuildPropertiesDrawer
              spaceData={spaceEntity}
              teamData={teamEntity}
              agentData={agentEntity}
              onClose={() => selectNode(null, null)}
              onSaved={() => {
                if (selectedNodeType === 'space') refetchSpaces();
                else if (selectedNodeType === 'team' || selectedNodeType === 'agent') refetchTeams();
              }}
            />
          )}
          {rightPanelMode === 'chat' && selectedNodeType === 'agent' && agentEntity && (
            <BuildAgentChat agent={agentEntity} />
          )}
          {rightPanelMode === 'chat' && selectedNodeType !== 'agent' && (
            <div className={styles.chatSelectPrompt}>
              <MessageSquare size={24} style={{ opacity: 0.3 }} />
              <span>Select an agent node to chat</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exported wrapper ──────────────────────────────────────────────────────────

export function BuildCanvas() {
  return (
    <ReactFlowProvider>
      <BuildCanvasInner />
    </ReactFlowProvider>
  );
}
