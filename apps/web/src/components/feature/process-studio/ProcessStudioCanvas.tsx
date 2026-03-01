'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
  BackgroundVariant,
} from 'reactflow';
import type {
  Connection,
  NodeMouseHandler,
  OnNodesDelete,
  OnEdgesDelete,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useProcessStudioStore } from './store';
import { ProcessStepNode } from './ProcessStepNode';
import { Toolbar } from './Toolbar';
import { PropertiesDrawer } from './PropertiesDrawer';
import { ProcessInput } from './ProcessInput';
import { TemplateSelector } from './TemplateSelector';
import { useUndoRedo } from './useUndoRedo';
import { autoLayout } from './layout';
import type { ProcessNode, ProcessEdge, ProcessStepData, ProcessStepType } from './types';
import styles from './ProcessStudioCanvas.module.css';

const NODE_TYPES = {
  processStep: ProcessStepNode,
};

const DEFAULT_NODES: ProcessNode[] = [
  {
    id: 'trigger-1',
    type: 'processStep',
    position: { x: 300, y: 50 },
    data: {
      label: 'Start',
      type: 'trigger',
      description: 'Process begins here',
      editable: false,
    },
  },
  {
    id: 'end-1',
    type: 'processStep',
    position: { x: 300, y: 400 },
    data: {
      label: 'End',
      type: 'end',
      description: 'Process completes',
      editable: false,
    },
  },
];

let nodeIdCounter = 0;
function generateNodeId(): string {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

export function ProcessStudioCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const {
    setSelectedNode,
    selectedNodeId,
    isDrawerOpen,
    markDirty,
    setProcessName,
    setProcessDescription,
  } = useProcessStudioStore();

  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(
    nodes,
    edges,
    setNodes,
    setEdges
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) as ProcessNode | null ?? null,
    [nodes, selectedNodeId]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      pushSnapshot('Connect nodes');
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
      markDirty();
    },
    [setEdges, pushSnapshot, markDirty]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      if (deleted.length > 0) {
        pushSnapshot('Delete nodes');
        markDirty();
      }
    },
    [pushSnapshot, markDirty]
  );

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      if (deleted.length > 0) {
        pushSnapshot('Delete edges');
        markDirty();
      }
    },
    [pushSnapshot, markDirty]
  );

  const handleUpdateNode = useCallback(
    (id: string, data: Partial<ProcessStepData>) => {
      pushSnapshot('Update node');
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
      markDirty();
    },
    [setNodes, pushSnapshot, markDirty]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      pushSnapshot('Delete node');
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) =>
        eds.filter((e) => e.source !== id && e.target !== id)
      );
      markDirty();
    },
    [setNodes, setEdges, pushSnapshot, markDirty]
  );

  const handleSave = useCallback(() => {
    // TODO: Wire to API save
    // eslint-disable-next-line no-console
    console.log('Save:', { nodes, edges });
  }, [nodes, edges]);

  const handleClear = useCallback(() => {
    const confirmed = window.confirm(
      'Clear the entire canvas? This cannot be undone.'
    );
    if (confirmed) {
      pushSnapshot('Clear canvas');
      setNodes(DEFAULT_NODES);
      setEdges([]);
      markDirty();
    }
  }, [setNodes, setEdges, pushSnapshot, markDirty]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const typeStr = event.dataTransfer.getData('application/process-step-type');
      if (!typeStr || !reactFlowInstance.current) return;

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const stepType = typeStr as ProcessStepType;
      const newNode: ProcessNode = {
        id: generateNodeId(),
        type: 'processStep',
        position,
        data: {
          label: `New ${stepType}`,
          type: stepType,
          description: '',
          editable: true,
        },
      };

      pushSnapshot('Add node');
      setNodes((nds) => [...nds, newNode]);
      markDirty();
      setSelectedNode(newNode.id);
    },
    [setNodes, pushSnapshot, markDirty, setSelectedNode]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const handleNodeDragStop = useCallback(() => {
    pushSnapshot('Move node');
    markDirty();
  }, [pushSnapshot, markDirty]);

  // --- AI Parse Handler ---
  const handleAIParse = useCallback(
    async (input: string) => {
      setIsParsing(true);
      try {
        const res = await fetch('/api/process-studio/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input }),
        });

        const data = await res.json();
        if (!data.success) {
          alert(data.error || 'Failed to parse process description');
          return;
        }

        const { workflow } = data.data;
        const layoutNodes = autoLayout(workflow.nodes as ProcessNode[], workflow.edges as ProcessEdge[]);

        pushSnapshot('AI generate workflow');
        setNodes(layoutNodes);
        setEdges(workflow.edges);
        setProcessName(workflow.name);
        setProcessDescription(workflow.description);
        markDirty();

        // Fit view after layout
        setTimeout(() => {
          reactFlowInstance.current?.fitView({ padding: 0.2 });
        }, 100);
      } catch {
        alert('Failed to connect to AI service. Please try again.');
      } finally {
        setIsParsing(false);
      }
    },
    [setNodes, setEdges, pushSnapshot, markDirty, setProcessName, setProcessDescription]
  );

  // --- Template Handler ---
  const handleTemplateSelect = useCallback(
    (
      templateNodes: ProcessNode[],
      templateEdges: ProcessEdge[],
      name: string,
      description: string
    ) => {
      const layoutNodes = autoLayout(templateNodes, templateEdges);

      pushSnapshot('Load template');
      setNodes(layoutNodes);
      setEdges(templateEdges);
      setProcessName(name);
      setProcessDescription(description);
      markDirty();

      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2 });
      }, 100);
    },
    [setNodes, setEdges, pushSnapshot, markDirty, setProcessName, setProcessDescription]
  );

  return (
    <div className={styles.container}>
      <Toolbar
        onSave={handleSave}
        onClear={handleClear}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={false}
        nodeCount={nodes.length}
        edgeCount={edges.length}
      />
      <div className={styles.canvasRow}>
        <div
          className={styles.canvasWrapper}
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={onInit}
            onNodeDragStop={handleNodeDragStop}
            nodeTypes={NODE_TYPES}
            fitView
            deleteKeyCode="Delete"
            proOptions={{ hideAttribution: true }}
          >
            <Controls className={styles.controls} />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <MiniMap
              className={styles.minimap}
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
            <Panel position="top-right" className={styles.panelActions}>
              <ProcessInput onParse={handleAIParse} isParsing={isParsing} />
              <TemplateSelector onSelect={handleTemplateSelect} />
            </Panel>
            <Panel position="bottom-center" className={styles.hint}>
              Drag node types from the sidebar or connect handles to build your process
            </Panel>
          </ReactFlow>
        </div>
        {isDrawerOpen && (
          <PropertiesDrawer
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
          />
        )}
      </div>
    </div>
  );
}
