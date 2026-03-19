'use client';

/**
 * SageCanvasWriter
 *
 * Must be rendered inside InFrontOfTheCanvas (which has useEditor() access).
 * Watches pendingShapes, stamps each shape onto the tldraw canvas, then clears them.
 *
 * @module components/feature/virtualspace/canvas/SageCanvasWriter
 */

import { useEffect } from 'react';
import { useEditor } from '@tldraw/editor';
import { createShapeId } from 'tldraw';
import type { SageCanvasShapeSpec } from './canvasBlockParser';

// ── Shape defaults registry ────────────────────────────────────────────────
// Provides fallback values for any props the LLM didn't specify.

const SHAPE_DEFAULTS: Record<string, Record<string, unknown>> = {
  'math-equation':  { w: 280, h: 80,  latex: '',        displayMode: true,  color: '#1e293b', fontSize: 16 },
  'annotation':     { w: 240, h: 80,  text: '',         annotationType: 'comment', label: '', showBadge: false, highlightColor: '#fef08a' },
  'number-line':    { w: 320, h: 80,  min: 0, max: 10,  step: 1, showMinorTicks: true, markers: [], label: '', showFractions: false },
  'fraction-bar':   { w: 200, h: 60,  numerator: 1,     denominator: 2, showLabel: true, color: '#3b82f6', bgColor: '#e0f2fe', showEquivalent: false },
  'venn-diagram':   { w: 380, h: 260, leftLabel: 'A',   rightLabel: 'B', leftContent: [], centerContent: [], rightContent: [], title: '', leftColor: '#3b82f6', rightColor: '#ef4444' },
  'graph-axes':     { w: 320, h: 320, xMin: -10, xMax: 10, yMin: -10, yMax: 10, showGrid: true, showLabels: true, gridColor: '#e2e8f0', axisColor: '#1e293b', labelColor: '#475569' },
  'pie-chart':      { w: 280, h: 280, segments: '[]',   title: '', showLabels: true, showPercentages: true },
  'bar-chart':      { w: 320, h: 280, bars: '[]',       title: '', xLabel: '', yLabel: '', showValues: true, showGrid: true },
  'timeline':       { w: 400, h: 200, events: '[]',     title: '', lineColor: '#3b82f6' },
  'pythagoras':     { w: 280, h: 280, sideA: 3, sideB: 4, showWorking: true, showAngles: false, color: '#3b82f6' },
};

// Fields tldraw expects as JSON strings but the LLM may provide as arrays
const ARRAY_FIELDS: Record<string, string[]> = {
  'pie-chart': ['segments'],
  'bar-chart': ['bars'],
  'timeline':  ['events'],
};

function coerceArrayField(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return JSON.stringify(value);
  return '[]';
}

function buildShape(spec: SageCanvasShapeSpec, cx: number, cy: number, offset: number) {
  const defaults = SHAPE_DEFAULTS[spec.type] ?? {};
  let props: Record<string, unknown> = { ...defaults, ...spec.props };

  // Coerce array fields
  for (const field of ARRAY_FIELDS[spec.type] ?? []) {
    if (field in props) props = { ...props, [field]: coerceArrayField(props[field]) };
  }

  const w = (props.w as number | undefined) ?? 280;
  const h = (props.h as number | undefined) ?? 80;

  return {
    id: createShapeId(),
    type: spec.type,
    x: cx - w / 2 + offset * 24,
    y: cy - h / 2 + offset * 24,
    props,
    meta: { sageAttributed: true },
  };
}

// ── Component ─────────────────────────────────────────────────────────────

interface SageCanvasWriterProps {
  pendingShapes: SageCanvasShapeSpec[];
  onShapesStamped: () => void;
}

export function SageCanvasWriter({ pendingShapes, onShapesStamped }: SageCanvasWriterProps) {
  const editor = useEditor();

  useEffect(() => {
    if (!pendingShapes.length) return;

    const vp = editor.getViewportPageBounds();
    const cx = vp.x + vp.w / 2;
    const cy = vp.y + vp.h / 2;

    for (let i = 0; i < pendingShapes.length; i++) {
      try {
        editor.createShape(buildShape(pendingShapes[i], cx, cy, i) as Parameters<typeof editor.createShape>[0]);
      } catch (err) {
        console.warn('[SageCanvasWriter] Failed to stamp shape:', pendingShapes[i].type, err);
      }
    }

    onShapesStamped();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingShapes]);

  return null;
}
