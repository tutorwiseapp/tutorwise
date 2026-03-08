'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import { ExecutionCommandBar } from './ExecutionCommandBar';
import { ExecutionList } from './ExecutionList';
import type { WorkflowExecution } from './ExecutionList';
import { ExecutionCanvas } from './ExecutionCanvas';
import { ApprovalDrawer } from './ApprovalDrawer';
import type { WorkflowTask } from './ApprovalDrawer';
import { ExecutionModeToggle } from './ExecutionModeToggle';
import { ShadowDivergencePanel } from './ShadowDivergencePanel';
import type { WorkflowProcess, ProcessNode, ProcessEdge } from './types';
import styles from './ExecutionPanel.module.css';

type StatusFilter = 'all' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

interface ExecutionDetail extends WorkflowExecution {
  tasks?: WorkflowTask[];
}

export function ExecutionPanel() {
  const [processes, setProcesses] = useState<WorkflowProcess[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(false);
  const [approvalTask, setApprovalTask] = useState<WorkflowTask | null>(null);

  // Fetch all processes
  const fetchProcesses = useCallback(async () => {
    setIsLoadingProcesses(true);
    try {
      const res = await fetch('/api/admin/workflow/processes');
      const data = await res.json();
      if (data.success) setProcesses(data.data as WorkflowProcess[]);
    } catch {
      // ignore
    } finally {
      setIsLoadingProcesses(false);
    }
  }, []);

  // Fetch executions (optionally filtered by process)
  const fetchExecutions = useCallback(async () => {
    setIsLoadingExecutions(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (selectedProcessId) params.set('processId', selectedProcessId);
      const res = await fetch(`/api/admin/workflow/execute?${params}`);
      const data = await res.json();
      if (data.executions) setExecutions(data.executions as WorkflowExecution[]);
    } catch {
      // ignore
    } finally {
      setIsLoadingExecutions(false);
    }
  }, [selectedProcessId]);

  // Fetch execution detail including tasks
  const fetchExecutionDetail = useCallback(async (executionId: string) => {
    try {
      const res = await fetch(`/api/admin/workflow/execute/${executionId}`);
      const data = await res.json();
      if (data.execution) {
        setSelectedExecution(data.execution as ExecutionDetail);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchProcesses(); }, [fetchProcesses]);
  useEffect(() => { fetchExecutions(); }, [fetchExecutions]);

  const handleSelectExecution = useCallback(
    (execution: WorkflowExecution) => {
      setApprovalTask(null);
      fetchExecutionDetail(execution.id);
    },
    [fetchExecutionDetail]
  );

  const handleProcessModeChanged = useCallback(
    (processId: string, newMode: string) => {
      setProcesses((prev) =>
        prev.map((p) =>
          p.id === processId
            ? { ...p, execution_mode: newMode as WorkflowProcess['execution_mode'] }
            : p
        )
      );
    },
    []
  );

  // When clicking a paused (HITL) node on the canvas, open ApprovalDrawer
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
      if (selectedExecution) fetchExecutionDetail(selectedExecution.id);
      fetchExecutions();
    },
    [selectedExecution, fetchExecutionDetail, fetchExecutions]
  );

  // Derive node status map from selected execution tasks
  const taskStatusMap: Record<string, string> = {};
  selectedExecution?.tasks?.forEach((t) => {
    taskStatusMap[t.node_id] = t.status;
  });

  // Get process nodes/edges for the selected execution
  const selectedProcess = processes.find(
    (p) => p.id === (selectedExecution?.process_id ?? selectedProcessId)
  );

  // Shadow executions for divergence panel
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
      <ExecutionCommandBar onResult={fetchExecutions} />

      <div className={styles.body}>
        {/* Left: Process list + Execution list */}
        <div className={styles.leftPanel}>
          {/* Process list */}
          <div className={styles.processSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Processes</span>
              <button className={styles.refreshBtn} onClick={fetchProcesses}>
                <RefreshCw size={12} />
              </button>
            </div>
            {isLoadingProcesses && (
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
                    setSelectedExecution(null);
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
              selectedId={selectedExecution?.id ?? null}
              onFilterChange={setStatusFilter}
              onSelect={handleSelectExecution}
              onRefresh={fetchExecutions}
            />
          </div>
        </div>

        {/* Right: Live canvas monitor */}
        <div className={styles.rightPanel}>
          {selectedExecution && selectedProcess ? (
            <ExecutionCanvas
              nodes={selectedProcess.nodes as ProcessNode[]}
              edges={selectedProcess.edges as ProcessEdge[]}
              executionId={selectedExecution.id}
              initialTaskStatuses={taskStatusMap}
              onNodeClick={handleCanvasNodeClick}
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
