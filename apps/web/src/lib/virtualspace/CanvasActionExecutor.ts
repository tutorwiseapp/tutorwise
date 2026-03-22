/**
 * CanvasActionExecutor (v1.0)
 *
 * Stateless executor — takes a list of CanvasActions and an editor reference,
 * executes them locally. tldraw store → Ably draw channel handles propagation
 * to the other participant automatically (no separate channel needed).
 *
 * Called from SessionPhaseBar on every phase entry.
 */

import type { Editor } from '@tldraw/editor';
import { createShapeId } from 'tldraw';
import type { CanvasAction } from '@/components/feature/virtualspace/workflow/types';

type AnyEditor = Editor;

function getViewportCenter(editor: AnyEditor) {
  const vp = editor.getViewportPageBounds();
  return { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2 };
}

function resolvePosition(
  editor: AnyEditor,
  position: CanvasAction['position'] = 'center',
  w = 400,
  h = 300
): { x: number; y: number } {
  const vp = editor.getViewportPageBounds();
  const pad = 40;
  switch (position) {
    case 'top-left':  return { x: vp.x + pad, y: vp.y + pad };
    case 'top-right': return { x: vp.x + vp.w - w - pad, y: vp.y + pad };
    default:          return { x: vp.x + vp.w / 2 - w / 2, y: vp.y + vp.h / 2 - h / 2 };
  }
}

// ── Shape factories (maps action.shape → tldraw shape props) ───────────────

const SHAPE_DEFAULTS: Record<string, (pos: { x: number; y: number }) => object> = {
  graph_axes: (pos) => ({
    type: 'graph-axes', x: pos.x, y: pos.y,
    props: { xLabel: 'x', yLabel: 'y', gridLines: true },
  }),
  number_line: (pos) => ({
    type: 'number-line', x: pos.x, y: pos.y,
    props: { min: -10, max: 10, step: 1 },
  }),
  fraction_bar: (pos) => ({
    type: 'fraction-bar', x: pos.x, y: pos.y,
    props: { numerator: 1, denominator: 4 },
  }),
  venn_diagram: (pos) => ({
    type: 'venn-diagram', x: pos.x, y: pos.y, props: {},
  }),
  math_equation: (pos) => ({
    type: 'math-equation', x: pos.x, y: pos.y,
    props: { latex: '' },
  }),
  story_mountain: (pos) => ({
    type: 'story-mountain', x: pos.x, y: pos.y, props: {},
  }),
  timeline: (pos) => ({
    type: 'timeline', x: pos.x, y: pos.y, props: {},
  }),
  flowchart: (pos) => ({
    type: 'flowchart', x: pos.x, y: pos.y, props: {},
  }),
  bohr_atom: (pos) => ({
    type: 'bohr-atom', x: pos.x, y: pos.y, props: {},
  }),
  wave_diagram: (pos) => ({
    type: 'wave-diagram', x: pos.x, y: pos.y, props: {},
  }),
};

// ── Executor ───────────────────────────────────────────────────────────────

/**
 * Execute a list of canvas actions on the given tldraw editor.
 * Fails silently per action — one broken action never blocks others.
 */
export function executeCanvasActions(
  editor: AnyEditor,
  actions: CanvasAction[]
): void {
  for (const action of actions) {
    try {
      executeOne(editor, action);
    } catch (err) {
      console.warn('[CanvasActionExecutor] Action failed, skipping:', action, err);
    }
  }
}

function executeOne(editor: AnyEditor, action: CanvasAction): void {
  switch (action.type) {
    case 'stamp_shape': {
      if (!action.shape) return;
      const factory = SHAPE_DEFAULTS[action.shape];
      if (!factory) {
        console.warn('[CanvasActionExecutor] Unknown shape:', action.shape);
        return;
      }
      const pos = resolvePosition(editor, action.position);
      const shape = { id: createShapeId(), ...factory(pos), ...(action.props ?? {}) };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.createShape(shape as any);
      break;
    }

    case 'add_text': {
      const center = getViewportCenter(editor);
      editor.createShape({
        id: createShapeId(),
        type: 'text',
        x: center.x - 100,
        y: center.y,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props: { text: (action.props as any)?.text ?? '', size: 'm', ...(action.props ?? {}) },
      } as any);
      break;
    }

    case 'clear_canvas': {
      const allShapes = editor.getCurrentPageShapes();
      if (allShapes.length > 0) {
        editor.deleteShapes(allShapes.map(s => s.id));
      }
      break;
    }

    case 'set_background': {
      const style = action.backgroundStyle ?? action.props?.backgroundStyle as string;
      if (style === 'grid') {
        editor.updateInstanceState({ isGridMode: true });
      } else if (style === 'default' || style === 'none') {
        editor.updateInstanceState({ isGridMode: false });
      }
      break;
    }

    case 'load_template': {
      // Template loading is a Phase E feature — no-op for now
      console.info('[CanvasActionExecutor] load_template not yet implemented, skipping');
      break;
    }
  }
}
