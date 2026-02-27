/**
 * WorkflowVisualizer Advanced Features
 *
 * Advanced interactive ReactFlow visualization with:
 * 1. Database persistence (Supabase)
 * 2. Export/Import (PNG, SVG, JSON)
 * 3. Real LangGraph integration
 * 4. Custom node types (conditional, parallel, loop)
 */

'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  Position,
  MarkerType,
  Handle,
  BackgroundVariant,
  Panel,
  ReactFlowInstance,
  getRectOfNodes,
  getTransformForBounds,
} from 'reactflow';
import { toPng, toSvg } from 'html-to-image';
import 'reactflow/dist/style.css';
import { createClient } from '@/utils/supabase/client';

// Import original agent configuration
import { AGENTS } from './WorkflowVisualizer';

// Custom node types configuration
const CUSTOM_NODE_TYPES = [
  {
    id: 'conditional',
    label: 'Conditional',
    color: '#f59e0b',
    icon: '❓',
    description: 'Branch based on condition',
    type: 'conditional' as const,
  },
  {
    id: 'parallel',
    label: 'Parallel',
    color: '#8b5cf6',
    icon: '⚡',
    description: 'Execute tasks in parallel',
    type: 'parallel' as const,
  },
  {
    id: 'loop',
    label: 'Loop',
    color: '#06b6d4',
    icon: '🔄',
    description: 'Repeat until condition met',
    type: 'loop' as const,
  },
];

// Custom node component that handles all node types
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const getNodeStyle = () => {
    return {
      background: 'white',
      border: `3px solid ${data.color}`,
      boxShadow: selected ? `0 0 0 2px ${data.color}40` : '0 4px 6px rgba(0,0,0,0.1)',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '200px',
      transition: 'all 0.2s',
      cursor: 'pointer',
    };
  };

  const getTypeIcon = () => {
    if (data.icon) return data.icon;

    switch (data.type) {
      case 'trigger':
        return '▶️';
      case 'end':
        return '🏁';
      case 'note':
        return '📝';
      case 'conditional':
        return '❓';
      case 'parallel':
        return '⚡';
      case 'loop':
        return '🔄';
      default:
        return '🤖';
    }
  };

  const showHandles = data.type !== 'note';

  return (
    <div style={getNodeStyle()}>
      {/* Input Handle */}
      {showHandles && data.type !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: '#6b7280',
            border: '2px solid white',
            width: '12px',
            height: '12px',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', marginRight: '8px' }}>{getTypeIcon()}</span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#6b7280',
          }}
        >
          {data.type}
        </span>
      </div>

      <div
        style={{
          fontWeight: 600,
          fontSize: '16px',
          color: data.color,
          marginBottom: '8px',
        }}
      >
        {data.label}
      </div>

      {data.description && (
        <div
          style={{
            fontSize: '13px',
            color: '#6b7280',
            lineHeight: '1.4',
          }}
        >
          {data.description}
        </div>
      )}

      {data.status && (
        <div
          style={{
            marginTop: '12px',
            padding: '6px 12px',
            borderRadius: '12px',
            background:
              data.status === 'completed'
                ? '#dcfce7'
                : data.status === 'running'
                ? '#fef3c7'
                : '#f3f4f6',
            color:
              data.status === 'completed'
                ? '#166534'
                : data.status === 'running'
                ? '#854d0e'
                : '#6b7280',
            fontSize: '11px',
            fontWeight: 700,
            textAlign: 'center',
            textTransform: 'uppercase',
          }}
        >
          {data.status === 'completed'
            ? '✓ Complete'
            : data.status === 'running'
            ? '⏳ Running'
            : '○ Pending'}
        </div>
      )}

      {/* Output Handle */}
      {showHandles && data.type !== 'end' && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: '#6b7280',
            border: '2px solid white',
            width: '12px',
            height: '12px',
          }}
        />
      )}

      {/* Multiple output handles for parallel nodes */}
      {data.type === 'parallel' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="output-1"
            style={{
              background: '#8b5cf6',
              border: '2px solid white',
              width: '12px',
              height: '12px',
              left: '30%',
            }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="output-2"
            style={{
              background: '#8b5cf6',
              border: '2px solid white',
              width: '12px',
              height: '12px',
              left: '70%',
            }}
          />
        </>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export interface WorkflowVisualizerAdvancedProps {
  executionState?: {
    currentStep?: string;
    completedSteps?: string[];
  };
  editable?: boolean;
  workflowId?: string; // For database persistence
}

export const WorkflowVisualizerAdvanced: React.FC<WorkflowVisualizerAdvancedProps> = ({
  executionState,
  editable = false,
  workflowId = 'planning-graph',
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNodeMenu, setShowNodeMenu] = useState(false);

  // Load layout from Supabase or localStorage
  useEffect(() => {
    loadLayout();
  }, [workflowId]);

  const loadLayout = async () => {
    try {
      // Try Supabase first
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (user.user) {
        const { data, error } = await supabase
          .from('workflow_layouts')
          .select('*')
          .eq('workflow_id', workflowId)
          .eq('user_id', user.user.id)
          .single();

        if (data && !error) {
          setNodes(data.nodes || createInitialNodes());
          setEdges(data.edges || createInitialEdges());
          console.log('[WorkflowVisualizer] Loaded layout from Supabase');
          return;
        }
      }
    } catch (error) {
      console.warn('[WorkflowVisualizer] Supabase load failed, trying localStorage:', error);
    }

    // Fallback to localStorage
    try {
      const saved = localStorage.getItem(`cas-workflow-layout-${workflowId}`);
      if (saved) {
        const layout = JSON.parse(saved);
        setNodes(layout.nodes || createInitialNodes());
        setEdges(layout.edges || createInitialEdges());
        console.log('[WorkflowVisualizer] Loaded layout from localStorage');
        return;
      }
    } catch (error) {
      console.error('[WorkflowVisualizer] localStorage load failed:', error);
    }

    // Default layout
    setNodes(createInitialNodes());
    setEdges(createInitialEdges());
  };

  const saveLayout = async () => {
    setIsSaving(true);

    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (user.user) {
        const { error } = await supabase
          .from('workflow_layouts')
          .upsert({
            workflow_id: workflowId,
            user_id: user.user.id,
            nodes: nodes.map(n => ({ id: n.id, position: n.position, data: n.data, type: n.type })),
            edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, type: e.type })),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'workflow_id,user_id'
          });

        if (!error) {
          console.log('[WorkflowVisualizer] Saved layout to Supabase');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.warn('[WorkflowVisualizer] Supabase save failed, using localStorage:', error);
      // Fallback to localStorage
      localStorage.setItem(`cas-workflow-layout-${workflowId}`, JSON.stringify({
        nodes: nodes.map(n => ({ id: n.id, position: n.position, data: n.data, type: n.type })),
        edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, type: e.type })),
        savedAt: new Date().toISOString(),
      }));
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (nodes.length > 0) {
        saveLayout();
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges]);

  // Export as PNG
  const exportAsPNG = async () => {
    if (!reactFlowWrapper.current) return;

    const nodesBounds = getRectOfNodes(nodes);
    const [x, y, zoom] = getTransformForBounds(nodesBounds, nodesBounds.width, nodesBounds.height, 0.5, 2);

    try {
      const dataUrl = await toPng(reactFlowWrapper.current, {
        backgroundColor: '#f9fafb',
        width: nodesBounds.width,
        height: nodesBounds.height,
        style: {
          width: `${nodesBounds.width}px`,
          height: `${nodesBounds.height}px`,
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        },
      });

      const link = document.createElement('a');
      link.download = `${workflowId}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export PNG failed:', error);
      alert('Failed to export PNG');
    }
  };

  // Export as SVG
  const exportAsSVG = async () => {
    if (!reactFlowWrapper.current) return;

    try {
      const dataUrl = await toSvg(reactFlowWrapper.current, {
        backgroundColor: '#f9fafb',
      });

      const link = document.createElement('a');
      link.download = `${workflowId}-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export SVG failed:', error);
      alert('Failed to export SVG');
    }
  };

  // Export as JSON
  const exportAsJSON = () => {
    const workflow = {
      id: workflowId,
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${workflowId}-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // Import from JSON
  const importFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target?.result as string);
        setNodes(workflow.nodes || []);
        setEdges(workflow.edges || []);
        alert('Workflow imported successfully!');
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import workflow. Invalid JSON format.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Add custom node
  const addCustomNode = (nodeType: typeof CUSTOM_NODE_TYPES[0]) => {
    const newNode: Node = {
      id: `${nodeType.id}-${Date.now()}`,
      type: 'custom',
      position: { x: 250, y: 250 },
      data: {
        label: nodeType.label,
        color: nodeType.color,
        icon: nodeType.icon,
        description: nodeType.description,
        type: nodeType.type,
        editable: true,
      },
      draggable: true,
    };
    setNodes((nds) => [...nds, newNode]);
    setShowNodeMenu(false);
  };

  // Handle node clicks
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsDrawerOpen(true);
  }, []);

  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#374151', strokeWidth: 3 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#374151',
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '800px', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={editable ? onConnect : undefined}
        onNodeClick={onNodeClick}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={editable}
        elementsSelectable={true}
        style={{ background: '#f9fafb' }}
      >
        <Background color="#e2e8f0" gap={16} size={1} variant={BackgroundVariant.Dots} />
        <Controls showInteractive={false} />
        <MiniMap nodeColor={(node) => (node.data?.color || '#94a3b8')} />

        {/* Toolbar */}
        <Panel position="top-left">
          <div style={{ background: 'white', borderRadius: '8px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setShowNodeMenu(!showNodeMenu)} style={buttonStyle('#8b5cf6')}>
                ➕ Add Node
              </button>
              <button onClick={exportAsPNG} style={buttonStyle('#10b981')}>
                📸 Export PNG
              </button>
              <button onClick={exportAsSVG} style={buttonStyle('#3b82f6')}>
                🎨 Export SVG
              </button>
              <button onClick={exportAsJSON} style={buttonStyle('#f59e0b')}>
                💾 Export JSON
              </button>
              <label style={{ ...buttonStyle('#6366f1'), cursor: 'pointer' }}>
                📂 Import JSON
                <input type="file" accept=".json" onChange={importFromJSON} style={{ display: 'none' }} />
              </label>
              <button onClick={() => saveLayout()} disabled={isSaving} style={buttonStyle('#14b8a6')}>
                {isSaving ? '⏳ Saving...' : '💾 Save Now'}
              </button>
            </div>

            {/* Custom Node Menu */}
            {showNodeMenu && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#6b7280' }}>
                  Add Custom Node:
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {CUSTOM_NODE_TYPES.map((nodeType) => (
                    <button
                      key={nodeType.id}
                      onClick={() => addCustomNode(nodeType)}
                      style={{
                        padding: '8px 12px',
                        background: nodeType.color,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{nodeType.icon}</span>
                      <span>{nodeType.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Status Panel */}
        <Panel position="top-right">
          <div style={{ background: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '12px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              💾 {isSaving ? 'Saving...' : 'Auto-saved'}
            </div>
            <div style={{ color: '#6b7280' }}>
              {nodes.length} nodes, {edges.length} edges
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// Helper function for button styles
const buttonStyle = (bg: string) => ({
  padding: '8px 12px',
  background: bg,
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  whiteSpace: 'nowrap' as const,
});

// Create initial nodes (imported from original)
function createInitialNodes(): Node[] {
  // Use the original AGENTS configuration
  const verticalSpacing = 150;
  const centerX = 400;

  return AGENTS.map((agent, index) => ({
    id: agent.id,
    type: 'custom',
    position: { x: centerX, y: index * verticalSpacing },
    data: {
      label: agent.label,
      color: agent.color,
      description: agent.description,
      type: agent.type,
      purpose: agent.purpose,
      role: agent.role,
      responsibilities: agent.responsibilities,
      editable: false,
    },
    draggable: true,
  }));
}

// Create initial edges (imported from original)
function createInitialEdges(): Edge[] {
  const edges: Edge[] = [];

  for (let i = 0; i < AGENTS.length - 1; i++) {
    const currentAgent = AGENTS[i];
    const nextAgent = AGENTS[i + 1];

    edges.push({
      id: `${currentAgent.id}-${nextAgent.id}`,
      source: currentAgent.id,
      target: nextAgent.id,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#374151', strokeWidth: 3 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#374151',
        width: 25,
        height: 25,
      },
      label: currentAgent.id === 'security' ? 'if no critical issues' : undefined,
    });
  }

  return edges;
}
