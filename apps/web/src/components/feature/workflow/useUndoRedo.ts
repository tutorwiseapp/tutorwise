'use client';

import { useCallback, useRef } from 'react';
import type { ProcessNode, ProcessEdge, WorkflowSnapshot } from './types';

const MAX_HISTORY = 50;

export function useUndoRedo(
  nodes: ProcessNode[],
  edges: ProcessEdge[],
  setNodes: (nodes: ProcessNode[] | ((prev: ProcessNode[]) => ProcessNode[])) => void,
  setEdges: (edges: ProcessEdge[] | ((prev: ProcessEdge[]) => ProcessEdge[])) => void
) {
  const undoStack = useRef<WorkflowSnapshot[]>([]);
  const redoStack = useRef<WorkflowSnapshot[]>([]);

  const pushSnapshot = useCallback(
    (description: string) => {
      const snapshot: WorkflowSnapshot = {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
        timestamp: new Date(),
        description,
      };
      undoStack.current = [...undoStack.current.slice(-MAX_HISTORY + 1), snapshot];
      redoStack.current = [];
    },
    [nodes, edges]
  );

  const undo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;

    redoStack.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
      timestamp: new Date(),
      description: 'Redo point',
    });

    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    const snapshot = redoStack.current.pop();
    if (!snapshot) return;

    undoStack.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
      timestamp: new Date(),
      description: 'Undo point',
    });

    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
  }, [nodes, edges, setNodes, setEdges]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return { pushSnapshot, undo, redo, canUndo, canRedo };
}
