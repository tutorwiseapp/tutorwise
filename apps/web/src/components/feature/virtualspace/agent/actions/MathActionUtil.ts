/**
 * MathActionUtil — handles all core maths diagram shape types.
 *
 * Types: math-equation, number-line, fraction-bar, graph-axes, pythagoras,
 *        protractor, unit-circle, line-segment, function-plot, trig-triangle
 *
 * Uses a per-type schema map so each shape gets its own validated defaults.
 * The base schema is a z.record(z.unknown()).default({}) passthrough — the real
 * validation happens in validateProps() which dispatches to the per-type schema.
 *
 * @module components/feature/virtualspace/agent/actions/MathActionUtil
 */

import { z } from 'zod';
import type { Editor } from '@tldraw/editor';
import { BaseActionUtil } from '../BaseActionUtil';
import type { SageCanvasShapeSpec } from '../../canvas/canvasBlockParser';

// ── Per-type Zod schemas ───────────────────────────────────────────────────
// Each schema mirrors the corresponding ShapeUtil.getDefaultProps() exactly.

const mathEquationSchema = z.object({
  w:           z.number().default(280),
  h:           z.number().default(80),
  latex:       z.string().default('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'),
  displayMode: z.boolean().default(true),
  color:       z.string().default('#1e293b'),
  fontSize:    z.number().default(16),
}).default({});

const numberLineSchema = z.object({
  w:              z.number().default(400),
  h:              z.number().default(72),
  min:            z.number().default(-5),
  max:            z.number().default(5),
  step:           z.number().default(1),
  showMinorTicks: z.boolean().default(true),
  minorStep:      z.number().default(0.5),
  markers:        z.array(z.number()).default([]),
  label:          z.string().default(''),
  color:          z.string().default('#1e293b'),
  showArrows:     z.boolean().default(true),
  showFractions:  z.boolean().default(false),
}).default({});

const fractionBarSchema = z.object({
  w:            z.number().default(280),
  h:            z.number().default(72),
  numerator:    z.number().default(3),
  denominator:  z.number().default(4),
  showLabel:    z.boolean().default(true),
  color:        z.string().default('#006c67'),
  bgColor:      z.string().default('#e6f0f0'),
  label:        z.string().default(''),
  showEquivalent: z.boolean().default(false),
  eqNumerator:  z.number().default(6),
  eqDenominator: z.number().default(8),
}).default({});

const graphAxesSchema = z.object({
  w:          z.number().default(320),
  h:          z.number().default(260),
  xMin:       z.number().default(-5),
  xMax:       z.number().default(5),
  yMin:       z.number().default(-5),
  yMax:       z.number().default(5),
  showGrid:   z.boolean().default(true),
  showLabels: z.boolean().default(true),
  gridColor:  z.string().default('#e2e8f0'),
  axisColor:  z.string().default('#1e293b'),
  labelColor: z.string().default('#475569'),
  title:      z.string().default(''),
  xLabel:     z.string().default('x'),
  yLabel:     z.string().default('y'),
}).default({});

const pythagorasSchema = z.object({
  w:          z.number().default(260),
  h:          z.number().default(220),
  sideA:      z.number().default(3),
  sideB:      z.number().default(4),
  showWorking: z.boolean().default(true),
  showAngles:  z.boolean().default(true),
  color:       z.string().default('#2563eb'),
}).default({});

const protractorSchema = z.object({
  w:          z.number().default(220),
  h:          z.number().default(130),
  angle:      z.number().default(45),
  showArm:    z.boolean().default(true),
  showLabels: z.boolean().default(true),
  color:      z.string().default('#4338ca'),
}).default({});

const unitCircleSchema = z.object({
  w:                z.number().default(260),
  h:                z.number().default(260),
  angleDeg:         z.number().default(45),
  showCoords:       z.boolean().default(true),
  showSpecialAngles: z.boolean().default(true),
  showGrid:         z.boolean().default(true),
  color:            z.string().default('#2563eb'),
}).default({});

// jsonArrayString: coerces arrays to JSON strings (LLM may send an array literal)
const jsonArrayString = z.preprocess(
  v => Array.isArray(v) ? JSON.stringify(v) : (typeof v === 'string' ? v : '[]'),
  z.string(),
);

const lineSegmentSchema = z.object({
  w:       z.number().default(320),
  h:       z.number().default(260),
  x1:      z.number().default(0),
  y1:      z.number().default(0),
  x2:      z.number().default(4),
  y2:      z.number().default(3),
  label:   z.string().default(''),
  color:   z.string().default('#3b82f6'),
  showGrid: z.boolean().default(true),
  labelA:  z.string().default('A'),
  labelB:  z.string().default('B'),
}).default({});

const functionPlotSchema = z.object({
  w:         z.number().default(320),
  h:         z.number().default(320),
  xMin:      z.number().default(-5),
  xMax:      z.number().default(5),
  yMin:      z.number().default(-5),
  yMax:      z.number().default(5),
  showGrid:  z.boolean().default(true),
  xLabel:    z.string().default('x'),
  yLabel:    z.string().default('y'),
  functions: jsonArrayString.default(JSON.stringify([{ type: 'linear', params: [1, 0], color: '#3b82f6', label: 'y = x' }])),
}).default({});

const trigTriangleSchema = z.object({
  w:            z.number().default(280),
  h:            z.number().default(240),
  angleDeg:     z.number().default(30),
  hypotenuse:   z.number().default(5),
  showSOHCAHTOA: z.boolean().default(true),
  color:        z.string().default('#3b82f6'),
  showWorking:  z.boolean().default(true),
}).default({});

// ── Schema map ────────────────────────────────────────────────────────────

const MATH_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'math-equation':  mathEquationSchema,
  'number-line':    numberLineSchema,
  'fraction-bar':   fractionBarSchema,
  'graph-axes':     graphAxesSchema,
  'pythagoras':     pythagorasSchema,
  'protractor':     protractorSchema,
  'unit-circle':    unitCircleSchema,
  'line-segment':   lineSegmentSchema,
  'function-plot':  functionPlotSchema,
  'trig-triangle':  trigTriangleSchema,
};

// ── ActionUtil class ─────────────────────────────────────────────────────

export class MathActionUtil extends BaseActionUtil<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>> {
  override readonly types = [
    'math-equation', 'number-line', 'fraction-bar', 'graph-axes',
    'pythagoras', 'protractor', 'unit-circle', 'line-segment',
    'function-plot', 'trig-triangle',
  ];

  // Fallback schema (individual types use MATH_SCHEMAS dispatch in validateProps)
  override readonly schema = z.record(z.unknown()).default({});

  override validateProps(rawProps: unknown, type?: string): Record<string, unknown> {
    const perTypeSchema = type ? MATH_SCHEMAS[type] : undefined;
    if (perTypeSchema) {
      try {
        return perTypeSchema.parse(rawProps ?? {}) as Record<string, unknown>;
      } catch {
        return perTypeSchema.parse({}) as Record<string, unknown>;
      }
    }
    // Fallback: pass-through with empty defaults
    return (rawProps && typeof rawProps === 'object' ? rawProps : {}) as Record<string, unknown>;
  }

  /** Override applyToEditor so we can pass spec.type down to validateProps */
  override async applyToEditor(editor: Editor, spec: SageCanvasShapeSpec, index: number): Promise<void> {
    let props: Record<string, unknown>;
    try {
      props = this.validateProps(spec.props, spec.type);
    } catch {
      props = this.validateProps({}, spec.type);
    }

    const w = (props.w as number | undefined) ?? 200;
    const h = (props.h as number | undefined) ?? 200;

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
      '## Maths diagrams',
      '- "math-equation": {"latex":"x^2+y^2=r^2","displayMode":true}',
      '- "number-line": {"min":0,"max":10,"step":1,"label":""}',
      '- "fraction-bar": {"numerator":3,"denominator":4,"showLabel":true}',
      '- "graph-axes": {"xMin":-10,"xMax":10,"yMin":-10,"yMax":10,"showGrid":true}',
      '- "pythagoras": {"sideA":3,"sideB":4,"showWorking":true}',
      '- "protractor": {"angle":45,"showLabels":true}',
      '- "unit-circle": {"angleDeg":45,"showCoords":true,"showSpecialAngles":true}',
      '- "line-segment": {"x1":0,"y1":0,"x2":4,"y2":3,"labelA":"A","labelB":"B","showGrid":true,"color":"#3b82f6"}',
      '- "function-plot": {"xMin":-5,"xMax":5,"yMin":-5,"yMax":5,"functions":"[{\\"type\\":\\"linear\\",\\"params\\":[1,0],\\"color\\":\\"#3b82f6\\",\\"label\\":\\"y = x\\"}]"}',
      '- "trig-triangle": {"angleDeg":30,"hypotenuse":5,"showSOHCAHTOA":true,"showWorking":true}',
    ].join('\n');
  }
}
