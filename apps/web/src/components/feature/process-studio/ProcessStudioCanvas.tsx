'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { MessageSquare, Settings2, ArrowLeft } from 'lucide-react';
import { useProcessStudioStore } from './store';
import type { RightPanelMode } from './store';
import { ProcessStepNode } from './ProcessStepNode';
import { Toolbar } from './Toolbar';
import { PropertiesDrawer } from './PropertiesDrawer';
import { ProcessInput } from './ProcessInput';
import { TemplateSelector } from './TemplateSelector';
import { ChatPanel } from './ChatPanel';
import { useUndoRedo } from './useUndoRedo';
import { autoLayout } from './layout';
import { exportWorkflowPDF } from './PDFExporter';
import type {
  ProcessNode,
  ProcessEdge,
  ProcessStepData,
  ProcessStepType,
  WorkflowProcess,
} from './types';
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
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const {
    processId,
    setProcessId,
    setSelectedNode,
    selectedNodeId,
    markDirty,
    markSaved,
    setProcessName,
    setProcessDescription,
    processName,
    processDescription,
    rightPanelMode,
    setRightPanelMode,
    resetStore,
    setAutoSaveStatus,
    drillDownTarget,
    clearDrillDown,
    navigationHistory,
    pushHistory,
    popHistory,
    clearHistory,
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
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds));
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

  // --- Save Handler (POST for new, PATCH for existing) ---
  const handleSave = useCallback(async (silent = false) => {
    setIsSaving(true);
    setAutoSaveStatus('saving');
    try {
      const payload = {
        name: processName || 'Untitled Process',
        description: processDescription || null,
        category: 'general',
        nodes,
        edges,
      };

      let res: Response;
      if (processId) {
        res = await fetch(`/api/admin/process-studio/processes/${processId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/process-studio/processes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        if (!processId && data.data?.id) {
          setProcessId(data.data.id);
        }
        markSaved();
        setAutoSaveStatus('saved');
      } else {
        setAutoSaveStatus('error');
        if (!silent) alert(data.error || 'Failed to save process');
      }
    } catch {
      setAutoSaveStatus('error');
      if (!silent) alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [processId, processName, processDescription, nodes, edges, setProcessId, markSaved, setAutoSaveStatus]);

  // Keep a ref so the autosave timer always calls the latest version
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  // --- Autosave: debounced 2s after any nodes/edges change (only if already saved) ---
  useEffect(() => {
    const state = useProcessStudioStore.getState();
    if (!state.isDirty || !state.processId) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveRef.current(true);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [nodes, edges]);

  // --- Go Back Handler ---
  const handleGoBack = useCallback(() => {
    const entry = popHistory();
    if (!entry) return;
    pushSnapshot('Navigate back');
    setNodes(entry.nodes);
    setEdges(entry.edges);
    setProcessName(entry.name);
    setProcessDescription(entry.description);
    setProcessId(entry.processId);
    markSaved();
    setTimeout(() => {
      reactFlowInstance.current?.fitView({ padding: 0.2 });
    }, 100);
  }, [popHistory, pushSnapshot, setNodes, setEdges, setProcessName, setProcessDescription, setProcessId, markSaved]);

  // --- New Process Handler ---
  const handleNew = useCallback(() => {
    const confirmed = !useProcessStudioStore.getState().isDirty ||
      window.confirm('You have unsaved changes. Start a new process?');
    if (confirmed) {
      clearHistory();
      resetStore();
      setNodes(DEFAULT_NODES);
      setEdges([]);
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2 });
      }, 100);
    }
  }, [resetStore, setNodes, setEdges]);

  // --- Load Process Handler ---
  const handleLoadProcess = useCallback(
    (process: WorkflowProcess) => {
      const confirmed = !useProcessStudioStore.getState().isDirty ||
        window.confirm('You have unsaved changes. Load a different process?');
      if (!confirmed) return;

      const loadedNodes = (process.nodes || []) as ProcessNode[];
      const loadedEdges = (process.edges || []) as ProcessEdge[];

      pushSnapshot('Load process');
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setProcessId(process.id);
      setProcessName(process.name);
      setProcessDescription(process.description || '');
      markSaved();

      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2 });
      }, 100);
    },
    [setNodes, setEdges, pushSnapshot, setProcessId, setProcessName, setProcessDescription, markSaved]
  );

  // --- Clear Handler ---
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

  // --- Chat Mutation Handler ---
  const handleChatMutation = useCallback(
    (mutatedNodes: ProcessNode[], mutatedEdges: ProcessEdge[], description: string) => {
      const layoutNodes = autoLayout(mutatedNodes, mutatedEdges);
      pushSnapshot(description);
      setNodes(layoutNodes);
      setEdges(mutatedEdges);
      markDirty();

      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2 });
      }, 100);
    },
    [setNodes, setEdges, pushSnapshot, markDirty]
  );

  // --- Global Keyboard Shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (mod && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      } else if (mod && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, undo, redo]);

  // --- Subprocess Drill-Down Handler ---
  useEffect(() => {
    if (!drillDownTarget) return;

    const target = drillDownTarget;
    clearDrillDown();

    (async () => {
      try {
        // Auto-save silently if we have a saved process with unsaved changes
        const state = useProcessStudioStore.getState();
        if (state.isDirty && state.processId) {
          await handleSaveRef.current(true);
        }

        const res = await fetch('/api/admin/process-studio/templates');
        const data = await res.json();
        if (!data.success) return;

        const match = (data.data as { name: string; nodes: ProcessNode[]; edges: ProcessEdge[]; description: string | null }[])
          .find((t) => t.name.toLowerCase() === target.toLowerCase());

        if (!match) {
          alert(`No template found for "${target}". You can create it from the Templates panel.`);
          return;
        }

        // Push current state to history so Back button can restore it
        const currentState = useProcessStudioStore.getState();
        pushHistory({
          nodes: nodes as ProcessNode[],
          edges: edges as ProcessEdge[],
          name: currentState.processName,
          description: currentState.processDescription,
          processId: currentState.processId,
        });

        handleTemplateSelect(
          match.nodes as ProcessNode[],
          match.edges as ProcessEdge[],
          match.name,
          match.description || ''
        );
      } catch {
        alert('Failed to load subprocess template. Please try again.');
      }
    })();
  }, [drillDownTarget, clearDrillDown, handleTemplateSelect]);

  // --- Export JSON Handler ---
  const handleExportJSON = useCallback(() => {
    const data = {
      name: processName || 'Untitled Process',
      description: processDescription || '',
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = (processName || 'process')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [processName, processDescription, nodes, edges]);

  // --- Import JSON Handler ---
  const handleImportJSON = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (!data.nodes || !Array.isArray(data.nodes)) {
            alert('Invalid process file: missing nodes array.');
            return;
          }
          const confirmed = !useProcessStudioStore.getState().isDirty ||
            window.confirm('You have unsaved changes. Import this process?');
          if (!confirmed) return;

          const importedNodes = data.nodes as ProcessNode[];
          const importedEdges = (data.edges || []) as ProcessEdge[];
          const layoutNodes = autoLayout(importedNodes, importedEdges);

          pushSnapshot('Import JSON');
          setNodes(layoutNodes);
          setEdges(importedEdges);
          if (data.name) setProcessName(data.name);
          if (data.description) setProcessDescription(data.description);
          setProcessId(null);
          markDirty();

          setTimeout(() => {
            reactFlowInstance.current?.fitView({ padding: 0.2 });
          }, 100);
        } catch {
          alert('Failed to parse JSON file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    },
    [setNodes, setEdges, pushSnapshot, markDirty, setProcessName, setProcessDescription, setProcessId]
  );

  // --- Export PDF Handler ---
  const handleExportPDF = useCallback(async () => {
    const canvasEl = reactFlowWrapper.current?.querySelector('.react-flow') as HTMLElement | null;
    if (!canvasEl) return;
    await exportWorkflowPDF({
      processName,
      processDescription,
      nodes: nodes as ProcessNode[],
      canvasElement: canvasEl,
    });
  }, [processName, processDescription, nodes]);

  const handleFullscreen = useCallback(() => {
    router.push('/admin/process-studio/fullscreen');
  }, [router]);

  return (
    <div className={styles.container}>
      <Toolbar
        onSave={handleSave}
        onClear={handleClear}
        onNew={handleNew}
        onExportPDF={handleExportPDF}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onLoadProcess={handleLoadProcess}
        onUndo={undo}
        onRedo={redo}
        onFullscreen={handleFullscreen}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
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
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
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
            {navigationHistory.length > 0 && (
              <Panel position="top-left" className={styles.backPanel}>
                <button className={styles.backButton} onClick={handleGoBack} title="Back to previous process">
                  <ArrowLeft size={14} />
                  <span>Back to {navigationHistory[navigationHistory.length - 1].name}</span>
                </button>
              </Panel>
            )}
            <Panel position="top-right" className={styles.panelActions}>
              <ProcessInput onParse={handleAIParse} isParsing={isParsing} />
              <TemplateSelector
                onSelect={handleTemplateSelect}
                currentNodes={nodes as ProcessNode[]}
                currentEdges={edges as ProcessEdge[]}
                currentName={processName}
                currentDescription={processDescription}
              />
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
                  title="Process Assistant"
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            </Panel>
            <Panel position="bottom-center" className={styles.hint}>
              Drag node types from the sidebar or connect handles to build your process
            </Panel>
          </ReactFlow>
        </div>
        <div className={styles.rightPanel}>
          {rightPanelMode === 'chat' ? (
            <ChatPanel
              nodes={nodes}
              edges={edges}
              onApplyMutation={handleChatMutation}
            />
          ) : (
            <PropertiesDrawer
              node={selectedNode}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
