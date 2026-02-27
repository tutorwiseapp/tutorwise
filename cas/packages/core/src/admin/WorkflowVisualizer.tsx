/**
 * WorkflowVisualizer Component
 *
 * Interactive ReactFlow visualization for LangGraph Planning Graph workflow.
 * Features: Drag nodes, click to inspect, add annotations, live execution tracking.
 */

'use client';

import React, { useCallback, useState, useEffect } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';

// Agent configuration with colors, descriptions, roles, and responsibilities
export const AGENTS = [
  {
    id: 'start',
    label: 'START',
    color: '#94a3b8',
    description: 'Workflow initialization',
    type: 'trigger' as const,
    purpose: 'Initialize the workflow and prepare the execution context',
    role: 'Entry Point',
    responsibilities: ['Set up workflow parameters', 'Validate input requirements', 'Initialize state'],
  },
  {
    id: 'planner',
    label: 'Planner',
    color: '#14b8a6',
    description: 'Strategic decision: ITERATE/SUCCESS/REMOVE',
    type: 'agent' as const,
    purpose: 'Make strategic decisions based on production data',
    role: 'Strategic Decision Making',
    responsibilities: [
      'Evaluate feature performance',
      'Recommend: ITERATE, SUCCESS, or REMOVE',
      'Update Jira with decisions',
      'Plan next iteration if needed',
      'Close workflow with final recommendation',
    ],
  },
  {
    id: 'analyst',
    label: 'Analyst',
    color: '#3b82f6',
    description: 'Generate feature brief + Three Amigos kickoff',
    type: 'agent' as const,
    purpose: 'Analyze requirements and create comprehensive feature specifications',
    role: 'Requirements Analysis & Documentation',
    responsibilities: [
      'Generate detailed feature briefs',
      'Conduct Three Amigos meetings (BA, Dev, QA)',
      'Extract user stories and acceptance criteria',
      'Define success metrics',
      'Identify edge cases and constraints',
    ],
  },
  {
    id: 'developer',
    label: 'Developer',
    color: '#8b5cf6',
    description: 'Create development plan',
    type: 'agent' as const,
    purpose: 'Design technical implementation and create development roadmap',
    role: 'Technical Planning & Architecture',
    responsibilities: [
      'Create detailed development plans',
      'Design system architecture',
      'Identify technical dependencies',
      'Estimate implementation complexity',
      'Review technical feasibility',
    ],
  },
  {
    id: 'tester',
    label: 'Tester',
    color: '#10b981',
    description: 'Run tests - 95% coverage',
    type: 'agent' as const,
    purpose: 'Execute automated tests and ensure quality standards',
    role: 'Test Execution & Coverage',
    responsibilities: [
      'Run unit tests',
      'Execute integration tests',
      'Measure code coverage (target: 95%)',
      'Generate test reports',
      'Identify test failures and regressions',
    ],
  },
  {
    id: 'qa',
    label: 'QA',
    color: '#f59e0b',
    description: 'Quality review',
    type: 'agent' as const,
    purpose: 'Perform comprehensive quality assurance and validation',
    role: 'Quality Assurance & Validation',
    responsibilities: [
      'Review test results',
      'Analyze code coverage metrics',
      'Validate against acceptance criteria',
      'Perform regression analysis',
      'Approve or reject based on quality gates',
    ],
  },
  {
    id: 'security',
    label: 'Security',
    color: '#ef4444',
    description: 'Vulnerability scan (allows warnings ⚠️)',
    type: 'agent' as const,
    purpose: 'Identify security vulnerabilities and ensure compliance',
    role: 'Security Analysis & Compliance',
    responsibilities: [
      'Scan for security vulnerabilities',
      'Check for code security issues',
      'Validate authentication/authorization',
      'Review data protection measures',
      'Allow warnings, block only critical issues',
    ],
  },
  {
    id: 'engineer',
    label: 'Engineer',
    color: '#6366f1',
    description: 'Deploy to production',
    type: 'agent' as const,
    purpose: 'Deploy to production environment and manage infrastructure',
    role: 'Deployment & Infrastructure',
    responsibilities: [
      'Deploy to production environment',
      'Manage infrastructure provisioning',
      'Configure deployment pipelines',
      'Monitor deployment health',
      'Implement rollback capabilities',
    ],
  },
  {
    id: 'marketer',
    label: 'Marketer',
    color: '#ec4899',
    description: 'Analyze production metrics',
    type: 'agent' as const,
    purpose: 'Monitor production performance and gather user feedback',
    role: 'Analytics & Performance Monitoring',
    responsibilities: [
      'Collect production metrics',
      'Analyze user behavior and feedback',
      'Measure feature adoption',
      'Track performance KPIs',
      'Generate insights for iteration',
    ],
  },
  {
    id: 'end',
    label: 'END',
    color: '#94a3b8',
    description: 'Workflow complete',
    type: 'end' as const,
    purpose: 'Finalize workflow execution and cleanup',
    role: 'Exit Point',
    responsibilities: ['Save final state', 'Generate completion report', 'Cleanup resources'],
  },
];

// Custom node component for agent nodes
const AgentNode = ({ data, selected }: { data: any; selected: boolean }) => {
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
    switch (data.type) {
      case 'trigger':
        return '▶️';
      case 'end':
        return '🏁';
      case 'note':
        return '📝';
      default:
        return '🤖';
    }
  };

  return (
    <div style={getNodeStyle()}>
      {/* Input Handle - only show if not a trigger node */}
      {data.type !== 'trigger' && data.type !== 'note' && (
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

      {/* Output Handle - only show if not an end node or note */}
      {data.type !== 'end' && data.type !== 'note' && (
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
    </div>
  );
};

// Custom node types
const nodeTypes: NodeTypes = {
  agent: AgentNode,
};

// Calculate initial layout
const createInitialNodes = (): Node[] => {
  const verticalSpacing = 150;
  const centerX = 400;

  return AGENTS.map((agent, index) => ({
    id: agent.id,
    type: 'agent',
    position: {
      x: centerX,
      y: index * verticalSpacing,
    },
    data: {
      label: agent.label,
      color: agent.color,
      description: agent.description,
      type: agent.type,
      purpose: agent.purpose,
      role: agent.role,
      responsibilities: agent.responsibilities,
      editable: false, // Agent nodes are not editable (defined in LangGraph)
    },
    draggable: true,
  }));
};

// Create initial edges
const createInitialEdges = (): Edge[] => {
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
      style: {
        stroke: '#9ca3af',
        strokeWidth: 3,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#9ca3af',
        width: 15,
        height: 15,
      },
      label: currentAgent.id === 'security' ? 'if no critical issues' : undefined,
      labelStyle:
        currentAgent.id === 'security'
          ? {
              fill: '#ef4444',
              fontSize: 11,
              fontWeight: 600,
            }
          : undefined,
      labelBgStyle:
        currentAgent.id === 'security'
          ? {
              fill: '#fee2e2',
              fillOpacity: 0.9,
            }
          : undefined,
    });
  }

  return edges;
};

// Load layout from localStorage
const loadLayout = (): { nodes: Node[]; edges: Edge[] } | null => {
  try {
    const saved = localStorage.getItem('cas-workflow-layout');
    if (saved) {
      const layout = JSON.parse(saved);
      // Merge saved positions with default data
      const defaultNodes = createInitialNodes();
      const mergedNodes = defaultNodes.map(defaultNode => {
        const savedNode = layout.nodes?.find((n: Node) => n.id === defaultNode.id);
        return savedNode ? { ...defaultNode, position: savedNode.position } : defaultNode;
      });
      // Always use fresh edges to pick up latest styling updates
      return { nodes: mergedNodes, edges: createInitialEdges() };
    }
  } catch (error) {
    console.error('Failed to load layout:', error);
  }
  return null;
};

// Save layout to localStorage
const saveLayout = (nodes: Node[], edges: Edge[]) => {
  try {
    const layout = {
      nodes: nodes.map(n => ({ id: n.id, position: n.position, data: n.data })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('cas-workflow-layout', JSON.stringify(layout));
  } catch (error) {
    console.error('Failed to save layout:', error);
  }
};

export interface WorkflowVisualizerProps {
  /** Optional: Execution state for live updates */
  executionState?: {
    currentStep?: string;
    completedSteps?: string[];
  };
  /** Optional: Allow editing (add/remove nodes) */
  editable?: boolean;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  executionState,
  editable = false,
}) => {
  // Load saved layout or use defaults
  const savedLayout = loadLayout();
  const initialNodes = savedLayout?.nodes || createInitialNodes();
  const initialEdges = savedLayout?.edges || createInitialEdges();

  // Use ReactFlow hooks for state management
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Drawer state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Edit mode state
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Auto-save layout when nodes/edges change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveLayout(nodes, edges);
    }, 1000); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [nodes, edges]);

  // Update node status based on execution state
  useEffect(() => {
    if (!executionState) return;

    setNodes((nds) =>
      nds.map((node) => {
        const isCompleted = executionState.completedSteps?.includes(node.id);
        const isRunning = executionState.currentStep === node.id;

        return {
          ...node,
          data: {
            ...node.data,
            status: isCompleted ? 'completed' : isRunning ? 'running' : 'pending',
          },
        };
      })
    );
  }, [executionState, setNodes]);

  // Update edge animation based on execution state
  useEffect(() => {
    if (!executionState) return;

    setEdges((eds) =>
      eds.map((edge) => {
        const sourceCompleted = executionState.completedSteps?.includes(edge.source);
        const targetRunning = executionState.currentStep === edge.target;

        return {
          ...edge,
          animated: sourceCompleted && targetRunning,
          style: {
            ...edge.style,
            opacity: sourceCompleted ? 1 : 0.3,
          },
        };
      })
    );
  }, [executionState, setEdges]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#9ca3af', strokeWidth: 3 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#9ca3af',
              width: 15,
              height: 15,
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Handle node clicks - open inspection drawer
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setEditLabel(node.data.label || '');
    setEditDescription(node.data.description || '');
    setIsDrawerOpen(true);
  }, []);

  // Add annotation node
  const addAnnotationNode = useCallback(() => {
    const newNode: Node = {
      id: `note-${Date.now()}`,
      type: 'agent',
      position: { x: 100, y: 100 },
      data: {
        label: 'New Note',
        color: '#9ca3af',
        description: 'Click to edit this annotation',
        type: 'note',
        editable: true,
      },
      draggable: true,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Save node edits
  const saveNodeEdit = useCallback(() => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                label: editLabel,
                description: editDescription,
              },
            }
          : node
      )
    );
    setIsDrawerOpen(false);
  }, [selectedNode, editLabel, editDescription, setNodes]);

  // Delete node
  const deleteNode = useCallback(() => {
    if (!selectedNode || !selectedNode.data.editable) {
      alert('Cannot delete agent nodes. Only annotation notes can be deleted.');
      return;
    }

    if (confirm(`Delete "${selectedNode.data.label}"?`)) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setIsDrawerOpen(false);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Reset layout
  const resetLayout = useCallback(() => {
    if (confirm('Reset to default layout? This will restore original positions.')) {
      localStorage.removeItem('cas-workflow-layout');
      setNodes(createInitialNodes());
      setEdges(createInitialEdges());
    }
  }, [setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={editable ? onConnect : undefined}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        nodesDraggable={true}
        nodesConnectable={editable}
        elementsSelectable={true}
        style={{ background: '#f9fafb' }}
      >
        <Background
          color="#e2e8f0"
          gap={16}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const agent = AGENTS.find((a) => a.id === node.id);
            return agent?.color || node.data?.color || '#94a3b8';
          }}
          maskColor="rgba(0,0,0,0.1)"
          style={{
            background: 'white',
            border: '2px solid #e2e8f0',
          }}
        />

        {/* Toolbar */}
        <Panel position="top-left">
          <div style={{ background: 'white', borderRadius: '8px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={addAnnotationNode}
                style={{
                  padding: '8px 16px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📝</span>
                <span>Add Note</span>
              </button>
              <button
                onClick={resetLayout}
                style={{
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Reset Layout
              </button>
            </div>
          </div>
        </Panel>

        {/* Info panel */}
        <Panel position="top-right">
          <div
            style={{
              background: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontSize: '13px',
              color: '#6b7280',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#111827' }}>
              💡 Interactive Workflow
            </div>
            <div>• Drag nodes to reposition</div>
            <div>• Click nodes to inspect</div>
            <div>• Add notes for annotations</div>
            <div>• Layout auto-saves</div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Inspection Drawer */}
      {isDrawerOpen && selectedNode && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '400px',
            height: '100%',
            background: 'white',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                {selectedNode.data.type === 'note' ? 'Edit Note' : 'Agent Details'}
              </h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Label
              </label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                disabled={!selectedNode.data.editable}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: selectedNode.data.editable ? 'white' : '#f9fafb',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={!selectedNode.data.editable}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: selectedNode.data.editable ? 'white' : '#f9fafb',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Type
              </label>
              <div
                style={{
                  padding: '10px',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#6b7280',
                }}
              >
                {selectedNode.data.type}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Color
              </label>
              <div
                style={{
                  padding: '10px',
                  background: selectedNode.data.color,
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: 'white',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {selectedNode.data.color}
              </div>
            </div>

            {selectedNode.data.status && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Status
                </label>
                <div
                  style={{
                    padding: '10px',
                    background: '#f0fdf4',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#166534',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  {selectedNode.data.status}
                </div>
              </div>
            )}

            {selectedNode.data.purpose && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  🎯 Purpose
                </label>
                <div
                  style={{
                    padding: '12px',
                    background: '#eff6ff',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1e40af',
                    lineHeight: '1.6',
                  }}
                >
                  {selectedNode.data.purpose}
                </div>
              </div>
            )}

            {selectedNode.data.role && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  👤 Role
                </label>
                <div
                  style={{
                    padding: '12px',
                    background: '#f0fdf4',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#166534',
                    fontWeight: 500,
                  }}
                >
                  {selectedNode.data.role}
                </div>
              </div>
            )}

            {selectedNode.data.responsibilities && selectedNode.data.responsibilities.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  ✅ Responsibilities
                </label>
                <div
                  style={{
                    padding: '12px',
                    background: '#fef3c7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#78350f',
                  }}
                >
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                    {selectedNode.data.responsibilities.map((resp: string, idx: number) => (
                      <li key={idx}>{resp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {!selectedNode.data.editable && (
              <div
                style={{
                  padding: '12px',
                  background: '#fef3c7',
                  border: '1px solid #fde047',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#854d0e',
                }}
              >
                ℹ️ Agent nodes are defined in LangGraph and cannot be edited. Only annotation notes are editable.
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px' }}>
            {selectedNode.data.editable && (
              <>
                <button
                  onClick={saveNodeEdit}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={deleteNode}
                  style={{
                    padding: '10px 16px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </>
            )}
            {!selectedNode.data.editable && (
              <button
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
