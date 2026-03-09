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
  OnNodesChange,
  OnEdgesChange,
  OnNodesDelete,
  OnEdgesDelete,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MessageSquare, Settings2, ArrowLeft, Upload, History, X, RotateCcw } from 'lucide-react';
import { useWorkflowStore } from './store';
import type { RightPanelMode } from './store';
import { ProcessStepNode } from './ProcessStepNode';
import { WorkflowEdge } from './WorkflowEdge';
import { NodePalette } from './NodePalette';
import { Toolbar } from './Toolbar';
import { PropertiesDrawer } from './PropertiesDrawer';
import { ProcessInput } from './ProcessInput';
import { TemplateSelector } from './TemplateSelector';
import { ChatPanel } from './ChatPanel';
import { useUndoRedo } from './useUndoRedo';
import { autoLayout } from './layout';
import { exportWorkflowPDF } from './PDFExporter';
import { validateForPublish } from '@/lib/workflow/validation';
import type { PublishValidationResult } from '@/lib/workflow/validation';
import type {
  ProcessNode,
  ProcessEdge,
  ProcessEdgeData,
  ProcessStepData,
  ProcessStepType,
  WorkflowProcess,
  WorkflowProcessVersion,
} from './types';
import styles from './WorkflowCanvas.module.css';

const NODE_TYPES = {
  processStep: ProcessStepNode,
};

const EDGE_TYPES = {
  workflowEdge: WorkflowEdge,
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

interface WorkflowCanvasProps {
  /** If provided, renders the canvas in execution overlay mode (read-only + live task status). */
  executionId?: string;
  showLiveOverlay?: boolean;
  readOnly?: boolean;
  /** Seed nodes/edges for readOnly/overlay mode (not managed by store). */
  initialNodes?: ProcessNode[];
  initialEdges?: ProcessEdge[];
  /** Called when a node is clicked in overlay mode (nodeId, taskStatus). */
  onNodeStatusClick?: (nodeId: string, status: string) => void;
}

export function WorkflowCanvas({
  executionId,
  showLiveOverlay,
  readOnly,
  initialNodes,
  initialEdges,
  onNodeStatusClick,
}: WorkflowCanvasProps = {}) {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishValidationResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Version history
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<WorkflowProcessVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Live overlay: task status map nodeId → status
  const [taskStatusMap, setTaskStatusMap] = useState<Record<string, string>>({});

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes ?? DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges ?? []);

  // When initialNodes/initialEdges change (overlay mode), sync them in
  useEffect(() => {
    if (readOnly && initialNodes) setNodes(initialNodes);
  }, [readOnly, initialNodes, setNodes]);
  useEffect(() => {
    if (readOnly && initialEdges) setEdges(initialEdges);
  }, [readOnly, initialEdges, setEdges]);

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
    pendingCanvasImport,
    setPendingCanvasImport,
  } = useWorkflowStore();

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

  // Apply live overlay styles when executionId + showLiveOverlay
  const displayNodes = useMemo(() => {
    if (!showLiveOverlay || Object.keys(taskStatusMap).length === 0) return nodes;

    const STATUS_COLORS: Record<string, string> = {
      running: '#3b82f6',
      pending: '#9ca3af',
      paused: '#f59e0b',
      completed: '#10b981',
      failed: '#ef4444',
      skipped: '#d1d5db',
    };

    return nodes.map((n) => {
      const status = taskStatusMap[n.id];
      if (!status) return n;
      return {
        ...n,
        style: {
          ...n.style,
          outline: `3px solid ${STATUS_COLORS[status] ?? '#9ca3af'}`,
          borderRadius: 8,
        },
      };
    });
  }, [nodes, taskStatusMap, showLiveOverlay]);

  // Subscribe to workflow_tasks for live overlay
  useEffect(() => {
    if (!showLiveOverlay || !executionId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;

    const setup = async () => {
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Initial fetch
      const { data } = await supabase
        .from('workflow_tasks')
        .select('node_id, status')
        .eq('execution_id', executionId);
      if (data) {
        const map: Record<string, string> = {};
        for (const t of data) map[t.node_id] = t.status;
        setTaskStatusMap(map);
      }

      // Realtime subscription
      channel = supabase
        .channel(`overlay:${executionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workflow_tasks',
            filter: `execution_id=eq.${executionId}`,
          },
          (payload) => {
            const record = payload.new as { node_id: string; status: string } | null;
            if (record) {
              setTaskStatusMap((prev) => ({ ...prev, [record.node_id]: record.status }));
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel && typeof (channel as unknown as { unsubscribe?: () => void }).unsubscribe === 'function') {
        (channel as unknown as { unsubscribe: () => void }).unsubscribe();
      }
    };
  }, [executionId, showLiveOverlay]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      pushSnapshot('Connect nodes');
      setEdges((eds) =>
        addEdge({ ...connection, type: 'workflowEdge', animated: true }, eds)
      );
      markDirty();
    },
    [setEdges, pushSnapshot, markDirty, readOnly]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (!readOnly) {
        setSelectedNode(node.id);
      } else if (onNodeStatusClick) {
        const status = taskStatusMap[node.id] ?? 'pending';
        onNodeStatusClick(node.id, status);
      }
    },
    [setSelectedNode, readOnly, onNodeStatusClick, taskStatusMap]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      if (readOnly) return;
      if (deleted.length > 0) {
        pushSnapshot('Delete nodes');
        markDirty();
      }
    },
    [pushSnapshot, markDirty, readOnly]
  );

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      if (readOnly) return;
      if (deleted.length > 0) {
        pushSnapshot('Delete edges');
        markDirty();
      }
    },
    [pushSnapshot, markDirty, readOnly]
  );

  const handleUpdateNode = useCallback(
    (id: string, data: Partial<ProcessStepData>) => {
      if (readOnly) return;
      pushSnapshot('Update node');
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
      markDirty();
    },
    [setNodes, pushSnapshot, markDirty, readOnly]
  );

  const handleUpdateEdge = useCallback(
    (id: string, data: Partial<ProcessEdgeData>) => {
      if (readOnly) return;
      setEdges((eds) =>
        eds.map((e) =>
          e.id === id ? { ...e, data: { ...e.data, ...data } } : e
        )
      );
      markDirty();
    },
    [setEdges, markDirty, readOnly]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      if (readOnly) return;
      pushSnapshot('Delete node');
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) =>
        eds.filter((e) => e.source !== id && e.target !== id)
      );
      markDirty();
    },
    [setNodes, setEdges, pushSnapshot, markDirty, readOnly]
  );

  // --- Save Handler: saves to draft_nodes/draft_edges ---
  const handleSave = useCallback(async (silent = false) => {
    if (readOnly) return;
    setIsSaving(true);
    setAutoSaveStatus('saving');
    try {
      const payload = {
        name: processName || 'Untitled Process',
        description: processDescription || null,
        category: 'general',
        draft_nodes: nodes,
        draft_edges: edges,
      };

      let res: Response;
      if (processId) {
        res = await fetch(`/api/admin/workflow/processes/${processId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // First save: POST with nodes too (so the process has at least initial data)
        res = await fetch('/api/admin/workflow/processes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, nodes, edges }),
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
  }, [readOnly, processId, processName, processDescription, nodes, edges, setProcessId, markSaved, setAutoSaveStatus]);

  // --- Publish: doPublish must be defined before handlePublish ---
  const doPublish = useCallback(async (notes?: string) => {
    if (!processId) return;
    setIsPublishing(true);
    try {
      // Auto-save draft first
      await handleSave(true);

      const res = await fetch(`/api/admin/workflow/processes/${processId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes ?? null }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishResult(null);
        setPublishError(null);
        alert(`Published as v${data.data.version}!`);
      } else {
        setPublishError(data.error || 'Failed to publish');
      }
    } catch {
      setPublishError('Publish failed. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  }, [processId, handleSave]);

  const handlePublish = useCallback(async () => {
    if (readOnly || !processId) return;

    const result = validateForPublish(nodes as ProcessNode[], edges as ProcessEdge[]);
    if (!result.valid) {
      setPublishResult(result);
      return;
    }
    if (result.warnings.length > 0) {
      setPublishResult(result);
      return;
    }

    // No errors and no warnings — publish immediately
    await doPublish();
  }, [readOnly, processId, nodes, edges, doPublish]);

  // Keep a ref so the autosave timer always calls the latest version
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  // --- Autosave: debounced 2s after any nodes/edges change (only if already saved) ---
  useEffect(() => {
    if (readOnly) return;
    const state = useWorkflowStore.getState();
    if (!state.isDirty || !state.processId) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveRef.current(true);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [nodes, edges, readOnly]);

  // --- Version History ---
  const handleShowVersionHistory = useCallback(async () => {
    if (!processId) return;
    setShowVersionHistory(true);
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/admin/workflow/processes/${processId}/versions?full=true`);
      const data = await res.json();
      if (data.success) setVersions(data.data);
    } finally {
      setLoadingVersions(false);
    }
  }, [processId]);

  const handleRestoreVersion = useCallback(
    (version: WorkflowProcessVersion) => {
      const confirmed = window.confirm(
        `Restore v${version.version_number}? This will replace your draft (the live process is unchanged until you publish).`
      );
      if (!confirmed) return;
      pushSnapshot('Restore version');
      setNodes((version.nodes as ProcessNode[]) || []);
      setEdges((version.edges as ProcessEdge[]) || []);
      markDirty();
      setShowVersionHistory(false);
      setTimeout(() => reactFlowInstance.current?.fitView({ padding: 0.2 }), 100);
    },
    [pushSnapshot, setNodes, setEdges, markDirty]
  );

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
    const confirmed = !useWorkflowStore.getState().isDirty ||
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
  }, [resetStore, setNodes, setEdges, clearHistory]);

  // --- Load Process Handler ---
  const handleLoadProcess = useCallback(
    (process: WorkflowProcess) => {
      const confirmed = !useWorkflowStore.getState().isDirty ||
        window.confirm('You have unsaved changes. Load a different process?');
      if (!confirmed) return;

      // Prefer draft nodes/edges if they exist
      const loadedNodes = ((process.draft_nodes ?? process.nodes) || []) as ProcessNode[];
      const loadedEdges = ((process.draft_edges ?? process.edges) || []) as ProcessEdge[];

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
    if (readOnly) return;
    const confirmed = window.confirm(
      'Clear the entire canvas? This cannot be undone.'
    );
    if (confirmed) {
      pushSnapshot('Clear canvas');
      setNodes(DEFAULT_NODES);
      setEdges([]);
      markDirty();
    }
  }, [setNodes, setEdges, pushSnapshot, markDirty, readOnly]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [readOnly]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;
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
    [setNodes, pushSnapshot, markDirty, setSelectedNode, readOnly]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const handleNodeDragStop = useCallback(() => {
    if (readOnly) return;
    pushSnapshot('Move node');
    markDirty();
  }, [pushSnapshot, markDirty, readOnly]);

  // --- AI Parse Handler ---
  const handleAIParse = useCallback(
    async (input: string) => {
      setIsParsing(true);
      try {
        const res = await fetch('/api/workflow/parse', {
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
        const state = useWorkflowStore.getState();
        if (state.isDirty && state.processId) {
          await handleSaveRef.current(true);
        }

        const res = await fetch('/api/admin/workflow/templates');
        const data = await res.json();
        if (!data.success) return;

        const match = (data.data as { name: string; nodes: ProcessNode[]; edges: ProcessEdge[]; description: string | null }[])
          .find((t) => t.name.toLowerCase() === target.toLowerCase());

        if (!match) {
          alert(`No template found for "${target}". You can create it from the Templates panel.`);
          return;
        }

        const currentState = useWorkflowStore.getState();
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

  // --- Import from Discovery Panel ---
  useEffect(() => {
    if (!pendingCanvasImport) return;
    const { nodes: importNodes, edges: importEdges, name: importName, description: importDesc } = pendingCanvasImport;
    setPendingCanvasImport(null);
    handleTemplateSelect(importNodes, importEdges, importName, importDesc);
  }, [pendingCanvasImport, setPendingCanvasImport, handleTemplateSelect]);

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
          const confirmed = !useWorkflowStore.getState().isDirty ||
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
    router.push('/admin/conductor/fullscreen');
  }, [router]);

  // Nodes/edges change handlers: forward to ReactFlow but block in readOnly
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (readOnly) return;
      onNodesChange(changes);
    },
    [onNodesChange, readOnly]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (readOnly) return;
      onEdgesChange(changes);
    },
    [onEdgesChange, readOnly]
  );

  return (
    <div className={styles.container}>
      {!readOnly && (
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
      )}
      <div className={styles.canvasRow}>
        {!readOnly && <NodePalette />}
        <div
          className={styles.canvasWrapper}
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
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
            edgeTypes={EDGE_TYPES}
            defaultEdgeOptions={{ type: 'workflowEdge', animated: true }}
            fitView
            deleteKeyCode={readOnly ? null : 'Delete'}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
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
            {!readOnly && (
              <Panel position="top-right" className={styles.panelActions}>
                <ProcessInput onParse={handleAIParse} isParsing={isParsing} />
                <TemplateSelector
                  onSelect={handleTemplateSelect}
                  currentNodes={nodes as ProcessNode[]}
                  currentEdges={edges as ProcessEdge[]}
                  currentName={processName}
                  currentDescription={processDescription}
                />
                {processId && (
                  <button
                    className={styles.historyButton}
                    onClick={handleShowVersionHistory}
                    title="Version History"
                  >
                    <History size={14} />
                  </button>
                )}
                {processId && (
                  <button
                    className={`${styles.publishButton} ${isPublishing ? styles.publishButtonBusy : ''}`}
                    onClick={handlePublish}
                    disabled={isPublishing}
                    title="Publish to live"
                  >
                    <Upload size={14} />
                    {isPublishing ? 'Publishing…' : 'Publish'}
                  </button>
                )}
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
                    title="Workflow Assistant"
                  >
                    <MessageSquare size={14} />
                  </button>
                </div>
              </Panel>
            )}
            <Panel position="bottom-center" className={styles.hint}>
              {showLiveOverlay
                ? 'Live execution overlay — node borders show task status'
                : 'Drag node types from the sidebar or connect handles to build your process'}
            </Panel>
          </ReactFlow>
        </div>
        {!readOnly && (
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
                edges={edges as ProcessEdge[]}
                onUpdateNode={handleUpdateNode}
                onUpdateEdge={handleUpdateEdge}
                onDeleteNode={handleDeleteNode}
              />
            )}
          </div>
        )}
      </div>

      {/* Publish Validation Dialog */}
      {publishResult && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <h3>{publishResult.valid ? 'Publish with warnings?' : 'Cannot publish'}</h3>
              <button onClick={() => setPublishResult(null)} className={styles.dialogClose}>
                <X size={16} />
              </button>
            </div>
            {publishResult.errors.length > 0 && (
              <div className={styles.dialogSection}>
                <strong className={styles.errorHeading}>Errors (must fix)</strong>
                <ul className={styles.issueList}>
                  {publishResult.errors.map((e, i) => (
                    <li key={i} className={styles.errorItem}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {publishResult.warnings.length > 0 && (
              <div className={styles.dialogSection}>
                <strong className={styles.warningHeading}>Warnings</strong>
                <ul className={styles.issueList}>
                  {publishResult.warnings.map((w, i) => (
                    <li key={i} className={styles.warningItem}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.dialogFooter}>
              <button className={styles.dialogCancel} onClick={() => setPublishResult(null)}>
                Cancel
              </button>
              {publishResult.valid && (
                <button className={styles.dialogConfirm} onClick={() => doPublish()}>
                  Publish anyway
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish error toast */}
      {publishError && (
        <div className={styles.errorToast}>
          {publishError}
          <button onClick={() => setPublishError(null)}><X size={12} /></button>
        </div>
      )}

      {/* Version History Panel */}
      {showVersionHistory && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <h3>Version History</h3>
              <button onClick={() => setShowVersionHistory(false)} className={styles.dialogClose}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.versionList}>
              {loadingVersions && <div className={styles.versionLoading}>Loading…</div>}
              {!loadingVersions && versions.length === 0 && (
                <div className={styles.versionEmpty}>No published versions yet.</div>
              )}
              {versions.map((v) => (
                <div key={v.id} className={styles.versionRow}>
                  <div className={styles.versionMeta}>
                    <span className={styles.versionNumber}>v{v.version_number}</span>
                    <span className={styles.versionDate}>
                      {new Date(v.published_at).toLocaleString()}
                    </span>
                    {v.notes && <span className={styles.versionNotes}>{v.notes}</span>}
                  </div>
                  <button
                    className={styles.restoreButton}
                    onClick={() => handleRestoreVersion(v)}
                  >
                    <RotateCcw size={12} /> Restore as draft
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
