'use client';

import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
  type EdgeProps,
} from 'reactflow';
import { X } from 'lucide-react';
import type { ProcessEdgeData } from './types';
import styles from './WorkflowEdge.module.css';

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
  selected,
}: EdgeProps<ProcessEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { deleteElements } = useReactFlow();
  const label = data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2 : 1.5,
          stroke: selected ? 'var(--color-primary, #006C67)' : '#94a3b8',
        }}
      />
      <EdgeLabelRenderer>
        {selected && (
          <button
            className={styles.deleteBtn}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            onClick={(e) => { e.stopPropagation(); deleteElements({ edges: [{ id }] }); }}
            title="Delete connection"
          >
            <X size={10} />
          </button>
        )}
        {label && (
          <div
            className={styles.edgeLabel}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {label}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
