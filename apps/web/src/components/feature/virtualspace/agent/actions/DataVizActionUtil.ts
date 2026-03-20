/**
 * DataVizActionUtil — handles data visualisation shape types.
 *
 * Types: pie-chart, bar-chart, venn-diagram, probability-tree
 *
 * Array fields (segments, bars, branches) are stored as JSON-serialised strings.
 * A z.preprocess step coerces LLM-provided arrays into strings automatically.
 *
 * @module components/feature/virtualspace/agent/actions/DataVizActionUtil
 */

import { z } from 'zod';
import type { Editor } from '@tldraw/editor';
import { BaseActionUtil } from '../BaseActionUtil';
import type { SageCanvasShapeSpec } from '../../canvas/canvasBlockParser';

// Coerces an array value to a JSON string (LLM may provide either)
const jsonArrayString = (defaultVal: string) =>
  z.preprocess(
    v => Array.isArray(v) ? JSON.stringify(v) : (typeof v === 'string' ? v : defaultVal),
    z.string(),
  );

// ── Per-type schemas ──────────────────────────────────────────────────────

const pieChartSchema = z.object({
  w:              z.number().default(240),
  h:              z.number().default(240),
  segments:       jsonArrayString(JSON.stringify([
    { label: 'A', value: 40, color: '#3b82f6' },
    { label: 'B', value: 30, color: '#ef4444' },
    { label: 'C', value: 30, color: '#22c55e' },
  ])).default(JSON.stringify([{ label: 'A', value: 40, color: '#3b82f6' }])),
  title:           z.string().default(''),
  showLabels:      z.boolean().default(true),
  showPercentages: z.boolean().default(true),
}).default({});

const barChartSchema = z.object({
  w:          z.number().default(300),
  h:          z.number().default(220),
  bars:       jsonArrayString(JSON.stringify([
    { label: 'A', value: 10, color: '#3b82f6' },
    { label: 'B', value: 20, color: '#3b82f6' },
    { label: 'C', value: 15, color: '#3b82f6' },
  ])).default(JSON.stringify([{ label: 'A', value: 10, color: '#3b82f6' }])),
  title:      z.string().default(''),
  xLabel:     z.string().default(''),
  yLabel:     z.string().default(''),
  showValues: z.boolean().default(true),
  showGrid:   z.boolean().default(true),
}).default({});

const vennDiagramSchema = z.object({
  w:             z.number().default(340),
  h:             z.number().default(200),
  leftLabel:     z.string().default('A'),
  rightLabel:    z.string().default('B'),
  leftContent:   z.string().default(''),
  centerContent: z.string().default(''),
  rightContent:  z.string().default(''),
  title:         z.string().default(''),
  leftColor:     z.string().default('#2563eb'),
  rightColor:    z.string().default('#dc2626'),
}).default({});

const probabilityTreeSchema = z.object({
  w:        z.number().default(380),
  h:        z.number().default(280),
  title:    z.string().default('Probability Tree'),
  branches: jsonArrayString(JSON.stringify([
    { label: 'H', prob: '1/2', color: '#3b82f6', children: [
      { label: 'H', prob: '1/2', color: '#3b82f6' },
      { label: 'T', prob: '1/2', color: '#ef4444' },
    ]},
    { label: 'T', prob: '1/2', color: '#ef4444', children: [
      { label: 'H', prob: '1/2', color: '#3b82f6' },
      { label: 'T', prob: '1/2', color: '#ef4444' },
    ]},
  ])).default('[]'),
}).default({});

// ── Schema map ────────────────────────────────────────────────────────────

const DATA_VIZ_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'pie-chart':        pieChartSchema,
  'bar-chart':        barChartSchema,
  'venn-diagram':     vennDiagramSchema,
  'probability-tree': probabilityTreeSchema,
};

// ── ActionUtil class ──────────────────────────────────────────────────────

export class DataVizActionUtil extends BaseActionUtil<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>> {
  override readonly types = ['pie-chart', 'bar-chart', 'venn-diagram', 'probability-tree'];

  override readonly schema = z.record(z.unknown()).default({});

  override validateProps(rawProps: unknown, type?: string): Record<string, unknown> {
    const perTypeSchema = type ? DATA_VIZ_SCHEMAS[type] : undefined;
    if (perTypeSchema) {
      try {
        return perTypeSchema.parse(rawProps ?? {}) as Record<string, unknown>;
      } catch {
        return perTypeSchema.parse({}) as Record<string, unknown>;
      }
    }
    return (rawProps && typeof rawProps === 'object' ? rawProps : {}) as Record<string, unknown>;
  }

  override async applyToEditor(editor: Editor, spec: SageCanvasShapeSpec, index: number): Promise<void> {
    let props: Record<string, unknown>;
    try {
      props = this.validateProps(spec.props, spec.type);
    } catch {
      props = this.validateProps({}, spec.type);
    }

    const w = (props.w as number | undefined) ?? 300;
    const h = (props.h as number | undefined) ?? 240;

    const [{ createShapeId }, { findStampPosition }] = await Promise.all([
      import('tldraw'),
      import('../../canvas/SageCanvasWriter'),
    ]);

    const { x, y } = findStampPosition(editor, w, h, index);

    editor.createShapes([{
      id: createShapeId(),
      type: spec.type as any,
      x,
      y,
      opacity: 0.85,
      props: props as Record<string, unknown>,
      meta: { sageAttributed: true },
    }]);
  }

  buildPromptSnippet(): string {
    return [
      '## Data visualisation diagrams',
      '- "pie-chart": {"segments":"[{\\"label\\":\\"A\\",\\"value\\":40,\\"color\\":\\"#3b82f6\\"},{\\"label\\":\\"B\\",\\"value\\":60,\\"color\\":\\"#ef4444\\"}]","title":"","showLabels":true,"showPercentages":true}',
      '- "bar-chart": {"bars":"[{\\"label\\":\\"A\\",\\"value\\":10,\\"color\\":\\"#3b82f6\\"},{\\"label\\":\\"B\\",\\"value\\":20,\\"color\\":\\"#3b82f6\\"}]","title":"","xLabel":"","yLabel":""}',
      '- "venn-diagram": {"leftLabel":"A","rightLabel":"B","leftContent":"item1, item2","centerContent":"shared","rightContent":"item3","title":""}',
      '- "probability-tree": {"title":"Probability Tree","branches":"[{\\"label\\":\\"H\\",\\"prob\\":\\"1/2\\",\\"color\\":\\"#3b82f6\\",\\"children\\":[{\\"label\\":\\"H\\",\\"prob\\":\\"1/2\\"},{\\"label\\":\\"T\\",\\"prob\\":\\"1/2\\"}]}]"}',
    ].join('\n');
  }
}
