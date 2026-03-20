'use client';

/**
 * SageCanvasWriter
 *
 * Must be rendered inside InFrontOfTheCanvas (which has useEditor() access).
 * Watches pendingShapes, stamps each shape onto the tldraw canvas, then clears them.
 *
 * Phase 2: Spatial intelligence — finds whitespace before stamping (design §7.3).
 * Phase 2: Attribution styling — dashed teal frame + "Sage" label + opacity 0.85 (design §13.3).
 * Phase 3: Snapshot capture — registers editor.toImage() bridge for observe route.
 * Phase 3: Erase pattern tracking — subscribes to store delete events, fires onErasePattern.
 *
 * @module components/feature/virtualspace/canvas/SageCanvasWriter
 */

import { useEffect, useCallback } from 'react';
import type { Editor } from '@tldraw/editor';
import { useEditor } from '@tldraw/editor';
import { createShapeId } from 'tldraw';
import type { SageCanvasShapeSpec } from './canvasBlockParser';

// ── Shape defaults registry ────────────────────────────────────────────────

export const SHAPE_DEFAULTS: Record<string, Record<string, unknown>> = {
  // Phase 2 original set
  'math-equation':  { w: 280, h: 80,  latex: '',        displayMode: true,  color: '#1e293b', fontSize: 16 },
  'annotation':     { w: 240, h: 80,  text: '',         annotationType: 'comment', label: '', showBadge: false, highlightColor: '#fef08a' },
  'number-line':    { w: 320, h: 80,  min: 0, max: 10,  step: 1, showMinorTicks: true, markers: [], label: '', showFractions: false },
  'fraction-bar':   { w: 200, h: 60,  numerator: 1,     denominator: 2, showLabel: true, color: '#3b82f6', bgColor: '#e0f2fe', showEquivalent: false },
  'venn-diagram':   { w: 380, h: 260, leftLabel: 'A',   rightLabel: 'B', leftContent: '', centerContent: '', rightContent: '', title: '', leftColor: '#3b82f6', rightColor: '#ef4444' },
  'graph-axes':     { w: 320, h: 320, xMin: -10, xMax: 10, yMin: -10, yMax: 10, showGrid: true, showLabels: true, gridColor: '#e2e8f0', axisColor: '#1e293b', labelColor: '#475569' },
  'pie-chart':      { w: 280, h: 280, segments: '[]',   title: '', showLabels: true, showPercentages: true },
  'bar-chart':      { w: 320, h: 280, bars: '[]',       title: '', xLabel: '', yLabel: '', showValues: true, showGrid: true },
  'timeline':       { w: 400, h: 200, events: '[]',     title: '', lineColor: '#3b82f6' },
  'pythagoras':     { w: 280, h: 280, sideA: 3, sideB: 4, showWorking: true, showAngles: false, color: '#3b82f6' },
  // P2-3: Added to align with design §7.2 supported list
  'protractor':     { w: 200, h: 120, angle: 45, showDegrees: true, color: '#3b82f6' },
  'unit-circle':    { w: 320, h: 320, showAngles: true, showCoordinates: true, highlightAngle: 0 },
  // 'text-block' removed — no TextBlockShapeUtil; use 'annotation' for text content
  'line-segment':   { w: 320, h: 260, x1: 0, y1: 0, x2: 4, y2: 3, label: '', color: '#3b82f6', showGrid: true, labelA: 'A', labelB: 'B' },
  // Built-in tldraw geo shapes — style props (color, fill, dash) come from tldraw defaults
  'geo':            { w: 120, h: 120, geo: 'rectangle' },
  // Physics / science shapes
  'circuit-component': { w: 80, h: 48, componentType: 'resistor', label: 'R1', color: '#1e293b', showLabel: true, value: '100Ω' },
  'bohr-atom':      { w: 240, h: 240, symbol: 'C', protons: 6, neutrons: 6, shells: JSON.stringify([2,4]), color: '#2563eb', showNumbers: true },
  'wave-diagram':   { w: 360, h: 200, amplitude: 40, frequency: 2, showLabels: true, color: '#3b82f6', label: '', waveType: 'transverse' },
  'forces-diagram': { w: 280, h: 280, bodyLabel: 'Object', forces: JSON.stringify([{label:'Weight (W)',direction:180,magnitude:80,color:'#ef4444'},{label:'Normal (N)',direction:0,magnitude:80,color:'#3b82f6'}]) },
  'chemical-equation': { w: 360, h: 140, reactants: '2H₂ + O₂', products: '2H₂O', arrow: '→', conditions: '', isReversible: false, showStateSymbols: true },
  // Maths shapes
  'function-plot':  { w: 320, h: 320, xMin: -5, xMax: 5, yMin: -5, yMax: 5, showGrid: true, xLabel: 'x', yLabel: 'y', functions: JSON.stringify([{type:'linear',params:[1,0],color:'#3b82f6',label:'y = x'}]) },
  'trig-triangle':  { w: 280, h: 240, angleDeg: 30, hypotenuse: 5, showSOHCAHTOA: true, color: '#3b82f6', showWorking: true },
  'probability-tree': { w: 380, h: 280, title: 'Probability Tree', branches: JSON.stringify([{label:'H',prob:'1/2',color:'#3b82f6',children:[{label:'H',prob:'1/2',color:'#3b82f6'},{label:'T',prob:'1/2',color:'#ef4444'}]},{label:'T',prob:'1/2',color:'#ef4444',children:[{label:'H',prob:'1/2',color:'#3b82f6'},{label:'T',prob:'1/2',color:'#ef4444'}]}]) },
  // English / literacy shapes
  'flowchart':      { w: 260, h: 340, steps: JSON.stringify([{type:'start',label:'Start'},{type:'process',label:'Get input'},{type:'decision',label:'Valid?'},{type:'process',label:'Process data'},{type:'end',label:'End'}]) },
  'story-mountain': { w: 380, h: 280, title: '', stages: JSON.stringify([{label:'Exposition',description:'Characters & setting introduced'},{label:'Rising Action',description:'Conflict develops'},{label:'Climax',description:'Turning point / peak tension'},{label:'Falling Action',description:'Tension resolves'},{label:'Resolution',description:'New normal established'}]) },
};

// Fields tldraw expects as JSON strings but the LLM may provide as arrays
export const ARRAY_FIELDS: Record<string, string[]> = {
  'pie-chart':        ['segments'],
  'bar-chart':        ['bars'],
  'timeline':         ['events'],
  'function-plot':    ['functions'],
  'probability-tree': ['branches'],
  'flowchart':        ['steps'],
  'story-mountain':   ['stages'],
  'forces-diagram':   ['forces'],
  'bohr-atom':        ['shells'],
  // venn-diagram: leftContent/centerContent/rightContent are plain strings (textarea), not JSON arrays
};

export function coerceArrayField(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return JSON.stringify(value);
  return '[]';
}

// ── Spatial intelligence ───────────────────────────────────────────────────
// Design §7.3: find whitespace in viewport, 24px clearance from nearest shape edge.

/**
 * Find a stamp position that avoids existing student shapes.
 * Strategy:
 *   1. If viewport is empty → viewport centre (cascade for multiple shapes).
 *   2. Otherwise → place to the right of the rightmost student shape, vertically centred.
 *   3. If that falls outside the viewport right edge → place below all content, horizontally centred.
 */
export function findStampPosition(
  editor: Editor,
  shapeW: number,
  shapeH: number,
  index: number,
): { x: number; y: number } {
  const GAP = 24;
  const CASCADE = 24;
  const vp = editor.getViewportPageBounds();
  const cx = vp.x + vp.w / 2;
  const cy = vp.y + vp.h / 2;

  // Collect bounding boxes of non-Sage shapes that are visible in the viewport
  const shapes = editor.getCurrentPageShapes();
  const studentBounds = shapes
    .filter(s => !(s.meta as Record<string, unknown>)?.sageAttributed)
    .map(s => editor.getShapePageBounds(s.id))
    .filter((b): b is NonNullable<typeof b> => !!b && (
      b.x < vp.x + vp.w && b.x + b.w > vp.x &&
      b.y < vp.y + vp.h && b.y + b.h > vp.y
    ));

  if (studentBounds.length === 0) {
    // Empty canvas — place at centre with cascade offset
    return {
      x: cx - shapeW / 2 + index * CASCADE,
      y: cy - shapeH / 2 + index * CASCADE,
    };
  }

  // Find rightmost and bottommost extents of student work
  const rightmostX  = Math.max(...studentBounds.map(b => b.x + b.w));
  const bottommostY = Math.max(...studentBounds.map(b => b.y + b.h));

  const candidateX = rightmostX + GAP + index * CASCADE;
  const candidateY = cy - shapeH / 2 + index * CASCADE;

  if (candidateX + shapeW <= vp.x + vp.w) {
    // Fits to the right → use it
    return { x: candidateX, y: candidateY };
  }

  // Doesn't fit right → place below all content, horizontally centred
  return {
    x: cx - shapeW / 2 + index * CASCADE,
    y: bottommostY + GAP + index * CASCADE,
  };
}

// ── Attribution shapes ─────────────────────────────────────────────────────
// Design §13.3: dashed teal border + "Sage" label + opacity 0.85.
// Implemented as a companion geo frame + text shape alongside the main shape.

// tldraw v4: built-in shape types (geo, text) use richText instead of text string.
// Attribution shapes are omitted entirely to avoid v4 schema validation failures
// that would kill the entire createShapes batch. Main shape uses opacity 0.85 + sageAttributed meta.
export function buildAttributionShapes(
  _x: number,
  _y: number,
  _w: number,
  _h: number,
): Array<Record<string, unknown>> {
  return [];
}

// ── Main shape builder ─────────────────────────────────────────────────────

export function buildShape(
  spec: SageCanvasShapeSpec,
  x: number,
  y: number,
): Record<string, unknown> {
  const defaults = SHAPE_DEFAULTS[spec.type] ?? {};
  let props: Record<string, unknown> = { ...defaults, ...spec.props };

  // Coerce array fields
  for (const field of ARRAY_FIELDS[spec.type] ?? []) {
    if (field in props) props = { ...props, [field]: coerceArrayField(props[field]) };
  }

  return {
    id: createShapeId(),
    type: spec.type,
    x,
    y,
    opacity: 0.85, // design §13.3: lower opacity until student interacts
    props,
    meta: { sageAttributed: true },
  };
}

// ── Erase pattern detection ────────────────────────────────────────────────
// Design §6: "Repeated erase + redraw of same area (≥2 times) → Medium stuck signal"

interface DeletionRecord {
  x: number;
  y: number;
  w: number;
  h: number;
  time: number;
}

const ERASE_CLUSTER_RADIUS = 200; // px — shapes within this radius count as "same region"
const ERASE_WINDOW_MS = 2 * 60 * 1000; // 2-minute rolling window
const ERASE_CLUSTER_THRESHOLD = 2; // ≥2 deletions in same region → pattern detected

// ── Component ─────────────────────────────────────────────────────────────

// ── Stamp helper (called from EmbeddedWhiteboard via editor ref) ───────────

/**
 * Stamp an array of SageCanvasShapeSpec onto the canvas.
 * Called from EmbeddedWhiteboard's useEffect via the editor ref captured in onMount.
 * This avoids the tldrawComponents remount issue caused by pendingShapes in useMemo deps.
 *
 * Phase 2 refactor: delegates to AgentActionRegistry so each shape type is
 * validated by its own typed ActionUtil (Zod schema + defaults).
 * The registry is lazy-loaded to avoid circular import issues.
 */
export function stampShapesOnEditor(
  editor: Editor,
  pendingShapes: SageCanvasShapeSpec[],
): void {
  if (!pendingShapes.length) return;

  // Delegate to AgentActionRegistry — async import avoids circular deps between
  // canvas/ and agent/ directories. Fire-and-forget is intentional here; the
  // editor createShapes calls are idempotent and the caller doesn't need to await.
  import('../agent/AgentActionRegistry').then(({ AgentActionRegistry }) => {
    pendingShapes.forEach((spec, i) => {
      AgentActionRegistry.applySpec(editor, spec, i).catch(err => {
        console.warn('[SageCanvasWriter] Failed to apply spec:', spec.type, err);
      });
    });
  }).catch(err => {
    console.warn('[SageCanvasWriter] Failed to load AgentActionRegistry:', err);
  });
}

// ── Component ─────────────────────────────────────────────────────────────

interface SageCanvasWriterProps {
  /** Called once on mount with a function that captures the viewport as a base64 PNG. */
  onRegisterSnapshot?: (fn: () => Promise<string | null>) => void;
  /** Called when a repeated-erase pattern is detected. Arg = cluster count. */
  onErasePattern?: (clusterCount: number) => void;
}

export function SageCanvasWriter({
  onRegisterSnapshot,
  onErasePattern,
}: SageCanvasWriterProps) {
  const editor = useEditor();

  // Register snapshot capture function on mount
  useEffect(() => {
    if (!onRegisterSnapshot) return;

    onRegisterSnapshot(async () => {
      try {
        const shapeIds = [...editor.getCurrentPageShapeIds()];
        if (shapeIds.length === 0) return null;

        const result = await (editor as any).toImage?.(shapeIds, {
          format: 'png',
          scale: 0.75,
          background: true,
        });

        if (!result?.src) return null;
        return (result.src as string).replace(/^data:[^;]+;base64,/, '');
      } catch (err) {
        console.warn('[SageCanvasWriter] Snapshot capture failed:', err);
        return null;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Erase pattern tracking — subscribe to store delete events (design §6)
  const handleErasePattern = useCallback((clusterCount: number) => {
    onErasePattern?.(clusterCount);
  }, [onErasePattern]);

  useEffect(() => {
    if (!onErasePattern) return;

    const deletionHistory: DeletionRecord[] = [];

    const unsubscribe = editor.store.listen((entry) => {
      const removed = Object.values(entry.changes.removed);
      if (removed.length === 0) return;

      const now = Date.now();

      // Prune history outside the rolling window
      const cutoff = now - ERASE_WINDOW_MS;
      while (deletionHistory.length > 0 && deletionHistory[0].time < cutoff) {
        deletionHistory.shift();
      }

      for (const record of removed) {
        if (!('type' in record) || !('x' in record)) continue;
        const r = record as unknown as { type: string; x: number; y: number; meta?: Record<string, unknown>; props?: Record<string, unknown> };
        // Skip Sage's own shapes and non-shape records
        if (r.meta?.sageAttributed || r.meta?.sageFrame || r.meta?.sageLabel) continue;

        const w = (r.props?.w as number | undefined) ?? 50;
        const h = (r.props?.h as number | undefined) ?? 50;
        deletionHistory.push({ x: r.x, y: r.y, w, h, time: now });
      }

      // Detect cluster: ≥ THRESHOLD deletions within CLUSTER_RADIUS
      for (const ref of deletionHistory) {
        let count = 0;
        for (const d of deletionHistory) {
          const dx = Math.abs(d.x - ref.x);
          const dy = Math.abs(d.y - ref.y);
          if (dx < ERASE_CLUSTER_RADIUS && dy < ERASE_CLUSTER_RADIUS) count++;
        }
        if (count >= ERASE_CLUSTER_THRESHOLD) {
          handleErasePattern(count);
          // Clear history after firing to avoid re-triggering until new deletions accumulate
          deletionHistory.length = 0;
          break;
        }
      }
    }, { scope: 'document', source: 'user' });

    return () => unsubscribe();
  }, [editor, handleErasePattern, onErasePattern]);

  return null;
}
