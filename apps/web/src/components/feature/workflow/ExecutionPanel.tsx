'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { ExecutionList } from './ExecutionList';
import type { WorkflowExecution } from './ExecutionList';
import { WorkflowCanvas } from './WorkflowCanvas';
import { ApprovalDrawer } from './ApprovalDrawer';
import type { WorkflowTask } from './ApprovalDrawer';
import { ExecutionModeToggle } from './ExecutionModeToggle';
import type { WorkflowProcess, ProcessNode, ProcessEdge } from './types';
import { HubWidgetCard } from '@/components/hub/content';
import styles from './ExecutionPanel.module.css';

interface ExecutionDetail extends WorkflowExecution {
  tasks?: WorkflowTask[];
}

interface ExecutionPanelProps {
  onNavigateToAgent?: (slug: string, prompt?: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export function ExecutionPanel({ onNavigateToAgent, onNavigateToTab }: ExecutionPanelProps = {}) {
  const queryClient = useQueryClient();
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'>('all');
  const [approvalTask, setApprovalTask] = useState<WorkflowTask | null>(null);

  // Fetch all processes
  const { data: processes = [], isFetching: isLoadingProcesses } = useQuery({
    queryKey: ['workflow-processes'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/processes');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to load processes');
      return data.data as WorkflowProcess[];
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Auto-select first process when loaded
  useEffect(() => {
    if (!selectedProcessId && processes.length > 0) {
      setSelectedProcessId(processes[0].id);
    }
  }, [processes, selectedProcessId]);

  // Fetch executions filtered by selected process
  const { data: executions = [], isFetching: isLoadingExecutions, refetch: refetchExecutions } = useQuery({
    queryKey: ['workflow-executions', selectedProcessId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (selectedProcessId) params.set('processId', selectedProcessId);
      const res = await fetch(`/api/admin/workflow/execute?${params}`);
      const data = await res.json();
      return (data.executions ?? []) as WorkflowExecution[];
    },
    staleTime: 30_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  // Fetch execution detail (auto-polls when an execution is selected)
  const { data: selectedExecution } = useQuery<ExecutionDetail | null>({
    queryKey: ['execution-detail', selectedExecutionId],
    queryFn: async () => {
      if (!selectedExecutionId) return null;
      const res = await fetch(`/api/admin/workflow/execute/${selectedExecutionId}`);
      const data = await res.json();
      return (data.execution ?? null) as ExecutionDetail | null;
    },
    enabled: !!selectedExecutionId,
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  // Process mode optimistic update
  const processModesMutation = useMutation({
    mutationFn: async ({ processId, newMode }: { processId: string; newMode: string }) => {
      return { processId, newMode };
    },
    onMutate: async ({ processId, newMode }) => {
      await queryClient.cancelQueries({ queryKey: ['workflow-processes'] });
      const prev = queryClient.getQueryData<WorkflowProcess[]>(['workflow-processes']);
      queryClient.setQueryData<WorkflowProcess[]>(['workflow-processes'], (old = []) =>
        old.map((p) =>
          p.id === processId
            ? { ...p, execution_mode: newMode as WorkflowProcess['execution_mode'] }
            : p
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['workflow-processes'], ctx.prev);
    },
  });

  const handleSelectProcess = useCallback((processId: string) => {
    setSelectedProcessId(processId);
    setSelectedExecutionId(null);
    setApprovalTask(null);
  }, []);

  const handleSelectExecution = useCallback((execution: WorkflowExecution) => {
    setApprovalTask(null);
    setSelectedExecutionId(execution.id);
  }, []);

  const handleProcessModeChanged = useCallback(
    (processId: string, newMode: string) => {
      processModesMutation.mutate({ processId, newMode });
    },
    [processModesMutation]
  );

  const handleCanvasNodeClick = useCallback(
    (nodeId: string, status: string) => {
      if (status !== 'paused' || !selectedExecution?.tasks) return;
      const task = selectedExecution.tasks.find(
        (t) => t.node_id === nodeId && t.status === 'paused'
      );
      if (task) setApprovalTask(task);
    },
    [selectedExecution]
  );

  const handleApprovalDecision = useCallback(
    (_decision: 'approve' | 'reject') => {
      setApprovalTask(null);
      if (selectedExecutionId) {
        queryClient.invalidateQueries({ queryKey: ['execution-detail', selectedExecutionId] });
      }
      queryClient.invalidateQueries({ queryKey: ['workflow-executions', selectedProcessId] });
    },
    [queryClient, selectedExecutionId, selectedProcessId]
  );

  const selectedProcess = processes.find(
    (p) => p.id === (selectedExecution?.process_id ?? selectedProcessId)
  );

  const showCanvas = !!(selectedExecution && selectedProcess);

  // Toolbar actions: mode toggle for selected process
  const toolbarActions = useMemo(() => {
    if (!selectedProcess) return undefined;
    return (
      <ExecutionModeToggle
        processId={selectedProcess.id}
        processName={selectedProcess.name}
        currentMode={selectedProcess.execution_mode ?? 'design'}
        onModeChanged={(m) => handleProcessModeChanged(selectedProcess.id, m)}
      />
    );
  }, [selectedProcess, handleProcessModeChanged]);

  return (
    <div className={styles.panel}>
      {/* Tier 1: Process category bar */}
      <div className={styles.categoryBar}>
        {processes.map((proc) => (
          <button
            key={proc.id}
            className={`${styles.categoryTab} ${selectedProcessId === proc.id ? styles.categoryTabActive : ''}`}
            onClick={() => handleSelectProcess(proc.id)}
          >
            {proc.name}
            {proc.execution_mode !== 'live' && (
              <span className={styles.categoryModeBadge}>{proc.execution_mode}</span>
            )}
          </button>
        ))}
        {isLoadingProcesses && processes.length === 0 && (
          <span className={styles.loadingHint}>Loading…</span>
        )}
      </div>

      {/* Content area — table always rendered */}
      <div className={styles.content}>
        <div className={showCanvas ? styles.tableCompact : styles.tableFull}>
          <ExecutionList
            executions={selectedProcessId ? executions : []}
            isLoading={selectedProcessId ? isLoadingExecutions : false}
            statusFilter={statusFilter}
            selectedId={selectedExecutionId}
            onFilterChange={setStatusFilter}
            onSelect={handleSelectExecution}
            toolbarActions={toolbarActions}
            emptyState={
              !selectedProcessId ? (
                <div className={styles.empty}>
                  <Layers size={32} className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>Select a process to view executions</p>
                  <p className={styles.emptyDesc}>
                    Choose a workflow process above to see its execution history.
                  </p>
                </div>
              ) : undefined
            }
          />
        </div>

        {/* Canvas detail (shows below table when execution selected) */}
        {showCanvas && (
          <div className={styles.canvasSection}>
            <WorkflowCanvas
              readOnly
              showLiveOverlay
              executionId={selectedExecution.id}
              initialNodes={selectedProcess.nodes as ProcessNode[]}
              initialEdges={selectedProcess.edges as ProcessEdge[]}
              onNodeStatusClick={handleCanvasNodeClick}
            />
          </div>
        )}
      </div>

      {/* HITL Approval Drawer */}
      {approvalTask && selectedExecution && (
        <ApprovalDrawer
          task={approvalTask}
          executionId={selectedExecution.id}
          executionContext={selectedExecution.execution_context ?? {}}
          onClose={() => setApprovalTask(null)}
          onDecision={handleApprovalDecision}
        />
      )}
    </div>
  );
}

// --- Sidebar (rendered at page level by Conductor) ---

export function ExecutionSidebar() {
  return (
    <>
      <HubWidgetCard title="Execution Help">
        <div className={styles.tipsList}>
          <p>View and manage <strong>live workflow executions</strong> across all processes.</p>
          <p>Use the <strong>command bar</strong> to start new executions or route to agents.</p>
          <p><strong>HITL approvals</strong> pause execution until a human reviews and decides.</p>
        </div>
      </HubWidgetCard>
      <HubWidgetCard title="Execution Tips">
        <div className={styles.tipsList}>
          <p>Shadow executions run in parallel without affecting live data — use them to validate changes.</p>
          <p>Check go-live readiness before promoting a process from shadow to live.</p>
          <p>Failed executions can be retried — check the error context for root cause.</p>
        </div>
      </HubWidgetCard>
    </>
  );
}
