'use client';

import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
  useStore,
  Position,
  type EdgeProps,
  type Edge,
} from 'reactflow';
import { X } from 'lucide-react';
import type { ProcessEdgeData } from './types';
import styles from './WorkflowEdge.module.css';

// ── Bridge crossing detection ─────────────────────────────────────────────────
// Workflow nodes are 240×120 (matches layout.ts constants)
const NODE_W = 240;
const NODE_H = 120;
const BRIDGE_R  = 6;   // arc radius px
const BRIDGE_EP = 3;   // H/V classification tolerance

type Seg4 = [number, number, number, number];

function hvCross(ax1: number, ay: number, ax2: number, bx: number, by1: number, by2: number) {
  const minAx = Math.min(ax1, ax2), maxAx = Math.max(ax1, ax2);
  const minBy = Math.min(by1, by2), maxBy = Math.max(by1, by2);
  if (bx > minAx + BRIDGE_EP && bx < maxAx - BRIDGE_EP && ay > minBy + BRIDGE_EP && ay < maxBy - BRIDGE_EP)
    return { x: bx, y: ay };
  return null;
}

function stepSegsTB(sx: number, sy: number, tx: number, ty: number): Seg4[] {
  const my = (sy + ty) / 2;
  return [[sx, sy, sx, my], [sx, my, tx, my], [tx, my, tx, ty]];
}

function stepSegsLR(sx: number, sy: number, tx: number, ty: number): Seg4[] {
  const mx = (sx + tx) / 2;
  return [[sx, sy, mx, sy], [mx, sy, mx, ty], [mx, ty, tx, ty]];
}

function detectCrossings(
  edgeId: string,
  sx: number, sy: number, tx: number, ty: number,
  isTB: boolean,
  allEdges: Edge[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeInternals: Map<string, any>,
) {
  const mySegs = isTB ? stepSegsTB(sx, sy, tx, ty) : stepSegsLR(sx, sy, tx, ty);
  const crossings: { x: number; y: number }[] = [];

  for (const e of allEdges) {
    if (e.id === edgeId) continue;
    const src = nodeInternals.get(e.source);
    const tgt = nodeInternals.get(e.target);
    if (!src || !tgt) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pa = (n: any) => n.positionAbsolute ?? n.position ?? { x: 0, y: 0 };
    const esx = pa(src).x + NODE_W / 2;
    const esy = pa(src).y + NODE_H;
    const etx = pa(tgt).x + NODE_W / 2;
    const ety = pa(tgt).y;
    const otherSegs = isTB ? stepSegsTB(esx, esy, etx, ety) : stepSegsLR(esx, esy, etx, ety);

    for (const [ax1, ay1, ax2, ay2] of mySegs) {
      if (Math.abs(ay2 - ay1) >= BRIDGE_EP) continue; // only H segs of this edge
      for (const [bx1, by1, bx2, by2] of otherSegs) {
        if (Math.abs(by2 - by1) < BRIDGE_EP) continue; // skip H-H
        const c = hvCross(ax1, ay1, ax2, bx1, by1, by2);
        if (c) crossings.push(c);
      }
    }
  }
  return crossings;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkflowEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  data, markerEnd, style, selected,
}: EdgeProps<ProcessEdgeData>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEdges      = useStore((s: any) => s.edges as Edge[]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeInternals = useStore((s: any) => s.nodeInternals as Map<string, any>);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const isTB = sourcePosition === Position.Bottom || targetPosition === Position.Top;
  const crossings = detectCrossings(id, sourceX, sourceY, targetX, targetY, isTB, allEdges, nodeInternals);

  const { deleteElements } = useReactFlow();
  const label = data?.label;

  const stroke       = selected ? 'var(--color-primary, #006C67)' : '#c1c8d1';
  const strokeWidth  = selected ? 2.5 : 2;

  return (
    <>
      {/* Wide transparent hit area */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      {/* Visible edge path (inherits animated class from parent) */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        markerEnd={markerEnd}
        style={style as React.CSSProperties}
        className="react-flow__edge-path"
      />
      {/* Bridge arcs at H/V crossings */}
      {crossings.map((c, i) => (
        <path
          key={i}
          d={`M ${c.x - BRIDGE_R} ${c.y} A ${BRIDGE_R} ${BRIDGE_R} 0 0 1 ${c.x + BRIDGE_R} ${c.y}`}
          fill="none"
          stroke="white"
          strokeWidth={5}
          strokeLinecap="round"
          style={{ animation: 'none', pointerEvents: 'none' }}
        />
      ))}
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
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          >
            {label}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
