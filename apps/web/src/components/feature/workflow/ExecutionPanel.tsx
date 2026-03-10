'use client';

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, RefreshCw } from 'lucide-react';
import { ExecutionCommandBar } from './ExecutionCommandBar';
import { ExecutionList } from './ExecutionList';
import type { WorkflowExecution } from './ExecutionList';
import { WorkflowCanvas } from './WorkflowCanvas';
import { ApprovalDrawer } from './ApprovalDrawer';
import type { WorkflowTask } from './ApprovalDrawer';
import { ExecutionModeToggle } from './ExecutionModeToggle';
import { ShadowDivergencePanel } from './ShadowDivergencePanel';
import { GoLiveReadiness } from './GoLiveReadiness';
import type { WorkflowProcess, ProcessNode, ProcessEdge } from './types';
import styles from './ExecutionPanel.module.css';

type StatusFilter = 'all' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [approvalTask, setApprovalTask] = useState<WorkflowTask | null>(null);

  // Fetch all processes
  const { data: processes = [], isFetching: isLoadingProcesses, refetch: refetchProcesses } = useQuery({
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
      // Actual PATCH is handled inside ExecutionModeToggle — we just update cache here
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

  // Derive node status map from selected execution tasks
  const taskStatusMap: Record<string, string> = {};
  selectedExecution?.tasks?.forEach((t) => {
    taskStatusMap[t.node_id] = t.status;
  });

  const selectedProcess = processes.find(
    (p) => p.id === (selectedExecution?.process_id ?? selectedProcessId)
  );

  const shadowExecutions = executions
    .filter((e) => e.is_shadow)
    .map((e) => ({
      id: e.id,
      started_at: e.started_at,
      shadow_divergence: null as Record<string, unknown> | null,
    }));

  return (
    <div className={styles.container}>
      {/* NLI Command Bar */}
      <ExecutionCommandBar
        onResult={() => refetchExecutions()}
        onNavigateToAgent={onNavigateToAgent}
        onNavigateToTab={onNavigateToTab}
      />

      <div className={styles.body}>
        {/* Left: Process list + Execution list */}
        <div className={styles.leftPanel}>
          {/* Process list */}
          <div className={styles.processSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Processes</span>
              <button className={styles.refreshBtn} onClick={() => refetchProcesses()}>
                <RefreshCw size={12} />
              </button>
            </div>
            {isLoadingProcesses && processes.length === 0 && (
              <div className={styles.loadingRow}>Loading…</div>
            )}
            {processes.map((proc) => (
              <div
                key={proc.id}
                className={`${styles.processRow} ${selectedProcessId === proc.id ? styles.processRowActive : ''}`}
              >
                <button
                  className={styles.processRowClickable}
                  onClick={() => {
                    setSelectedProcessId(proc.id);
                    setSelectedExecutionId(null);
                  }}
                >
                  <Layers size={13} className={styles.processIcon} />
                  <span className={styles.processRowName}>{proc.name}</span>
                </button>
                <ExecutionModeToggle
                  processId={proc.id}
                  processName={proc.name}
                  currentMode={proc.execution_mode ?? 'design'}
                  onModeChanged={(m) => handleProcessModeChanged(proc.id, m)}
                />
              </div>
            ))}
          </div>

          {/* Go-Live Readiness panel (shown when selected process is in shadow mode) */}
          {selectedProcess?.execution_mode === 'shadow' && (
            <div className={styles.divergenceWrapper}>
              <GoLiveReadiness
                process={selectedProcess}
                onModeChanged={(m) => handleProcessModeChanged(selectedProcess.id, m)}
              />
            </div>
          )}

          {/* Shadow divergence panel (if process has shadow runs) */}
          {shadowExecutions.length > 0 && (
            <div className={styles.divergenceWrapper}>
              <ShadowDivergencePanel executions={shadowExecutions} />
            </div>
          )}

          {/* Execution list */}
          <div className={styles.executionSection}>
            <ExecutionList
              executions={executions}
              isLoading={isLoadingExecutions}
              statusFilter={statusFilter}
              selectedId={selectedExecutionId}
              onFilterChange={setStatusFilter}
              onSelect={handleSelectExecution}
              onRefresh={() => refetchExecutions()}
            />
          </div>
        </div>

        {/* Right: Live canvas monitor */}
        <div className={styles.rightPanel}>
          {selectedExecution && selectedProcess ? (
            <WorkflowCanvas
              readOnly
              showLiveOverlay
              executionId={selectedExecution.id}
              initialNodes={selectedProcess.nodes as ProcessNode[]}
              initialEdges={selectedProcess.edges as ProcessEdge[]}
              onNodeStatusClick={handleCanvasNodeClick}
            />
          ) : (
            <div className={styles.emptyMonitor}>
              <Layers size={32} className={styles.emptyIcon} />
              <p>Select an execution to monitor it live</p>
              {!selectedProcessId && (
                <p className={styles.emptyHint}>
                  Or select a process from the left to view its executions
                </p>
              )}
            </div>
          )}
        </div>
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
