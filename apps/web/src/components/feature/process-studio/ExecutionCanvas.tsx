'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { NODE_TYPE_CONFIG } from './types';
import type { ProcessStepData, ProcessNode, ProcessEdge } from './types';
import { useExecutionRealtime } from '@/app/hooks/useExecutionRealtime';
import styles from './ExecutionCanvas.module.css';

// Task status → CSS class
const STATUS_CLASS: Record<string, string> = {
  pending: 'statusPending',
  running: 'statusRunning',
  paused: 'statusPaused',
  completed: 'statusCompleted',
  failed: 'statusFailed',
  skipped: 'statusSkipped',
};

interface ExecutionNodeData extends ProcessStepData {
  executionStatus?: string;
}

function ExecutionNodeComponent({ data, id }: NodeProps<ExecutionNodeData>) {
  const config = NODE_TYPE_CONFIG[data.type];
  const Icon = config.icon;
  const statusClass = data.executionStatus ? STATUS_CLASS[data.executionStatus] ?? '' : '';

  return (
    <div
      className={`${styles.node} ${styles[config.cssClass]} ${statusClass ? styles[statusClass] : ''}`}
      data-node-id={id}
    >
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <span className={styles.nodeIcon}><Icon size={14} /></span>
        <span className={styles.nodeLabel}>{data.label}</span>
        {data.executionStatus && (
          <span className={`${styles.statusDot} ${statusClass ? styles[statusClass + 'Dot'] : ''}`} />
        )}
      </div>
      {data.description && (
        <div className={styles.nodeDesc}>{data.description}</div>
      )}
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
      {data.type === 'condition' && (
        <>
          <Handle type="source" id="yes" position={Position.Left} className={styles.handleSide} style={{ top: '60%' }} />
          <Handle type="source" id="no" position={Position.Right} className={styles.handleSide} style={{ top: '60%' }} />
        </>
      )}
    </div>
  );
}

const NODE_TYPES = { processStep: ExecutionNodeComponent };

interface ExecutionCanvasProps {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  executionId?: string;
  initialTaskStatuses?: Record<string, string>;
  onNodeClick?: (nodeId: string, status: string) => void;
}

export function ExecutionCanvas({
  nodes,
  edges,
  executionId,
  initialTaskStatuses = {},
  onNodeClick,
}: ExecutionCanvasProps) {
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>(initialTaskStatuses);

  // Sync initial statuses when execution changes
  useEffect(() => {
    setTaskStatuses(initialTaskStatuses);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId]);

  // Subscribe to realtime updates for this execution
  useExecutionRealtime({
    executionId,
    enabled: !!executionId,
    onTaskUpdated: (task) => {
      setTaskStatuses((prev) => ({ ...prev, [task.node_id]: task.status }));
    },
  });

  // Inject execution status into node data
  const enrichedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          executionStatus: taskStatuses[n.id],
        } as ExecutionNodeData,
        draggable: false,
        selectable: true,
      })),
    [nodes, taskStatuses]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string; data: ExecutionNodeData }) => {
      if (onNodeClick) {
        onNodeClick(node.id, node.data.executionStatus ?? '');
      }
    },
    [onNodeClick]
  );

  return (
    <div className={styles.canvasWrapper}>
      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
        onNodeClick={handleNodeClick as never}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
      <div className={styles.legend}>
        <span className={`${styles.legendDot} ${styles.statusRunning}`} />Running
        <span className={`${styles.legendDot} ${styles.statusPaused}`} />Paused
        <span className={`${styles.legendDot} ${styles.statusCompleted}`} />Done
        <span className={`${styles.legendDot} ${styles.statusFailed}`} />Failed
      </div>
    </div>
  );
}
