/**
 * ScienceActionUtil — handles science diagram shape types.
 *
 * Types: chemical-equation, wave-diagram, forces-diagram, bohr-atom, circuit-component
 *
 * Array fields (forces, shells) are stored as JSON-serialised strings.
 *
 * @module components/feature/virtualspace/agent/actions/ScienceActionUtil
 */

import { z } from 'zod';
import type { Editor } from '@tldraw/editor';
import { BaseActionUtil } from '../BaseActionUtil';
import type { SageCanvasShapeSpec } from '../../canvas/canvasBlockParser';
import { findStampPosition } from '../../canvas/SageCanvasWriter';
import { createShapeId } from 'tldraw';

// Coerces array → JSON string, leaves strings alone
const jsonArrayString = (defaultVal: string) =>
  z.preprocess(
    v => Array.isArray(v) ? JSON.stringify(v) : (typeof v === 'string' ? v : defaultVal),
    z.string(),
  );

// ── Per-type schemas ──────────────────────────────────────────────────────

const chemicalEquationSchema = z.object({
  w:               z.number().default(360),
  h:               z.number().default(140),
  reactants:       z.string().default('2H₂ + O₂'),
  products:        z.string().default('2H₂O'),
  arrow:           z.string().default('→'),
  conditions:      z.string().default(''),
  isReversible:    z.boolean().default(false),
  showStateSymbols: z.boolean().default(true),
}).default({});

const waveDiagramSchema = z.object({
  w:          z.number().default(360),
  h:          z.number().default(200),
  amplitude:  z.number().default(40),
  frequency:  z.number().default(2),
  showLabels: z.boolean().default(true),
  color:      z.string().default('#3b82f6'),
  label:      z.string().default(''),
  waveType:   z.enum(['transverse', 'longitudinal']).default('transverse'),
}).default({});

const forcesDiagramSchema = z.object({
  w:         z.number().default(280),
  h:         z.number().default(280),
  bodyLabel: z.string().default('Object'),
  forces:    jsonArrayString(JSON.stringify([
    { label: 'Weight (W)', direction: 180, magnitude: 80, color: '#ef4444' },
    { label: 'Normal (N)', direction: 0,   magnitude: 80, color: '#3b82f6' },
  ])).default(JSON.stringify([
    { label: 'Weight (W)', direction: 180, magnitude: 80, color: '#ef4444' },
    { label: 'Normal (N)', direction: 0,   magnitude: 80, color: '#3b82f6' },
  ])),
}).default({});

const bohrAtomSchema = z.object({
  w:          z.number().default(240),
  h:          z.number().default(240),
  symbol:     z.string().default('Na'),
  protons:    z.number().default(11),
  neutrons:   z.number().default(12),
  shells:     jsonArrayString(JSON.stringify([2, 8, 1])).default(JSON.stringify([2, 8, 1])),
  color:      z.string().default('#2563eb'),
  showNumbers: z.boolean().default(true),
}).default({});

const circuitSchema = z.object({
  w:             z.number().default(80),
  h:             z.number().default(44),
  componentType: z.string().default('resistor'),
  label:         z.string().default(''),
  color:         z.string().default('#1e293b'),
  showLabel:     z.boolean().default(true),
  value:         z.string().default(''),
}).default({});

// ── Schema map ────────────────────────────────────────────────────────────

const SCIENCE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'chemical-equation': chemicalEquationSchema,
  'wave-diagram':      waveDiagramSchema,
  'forces-diagram':    forcesDiagramSchema,
  'bohr-atom':         bohrAtomSchema,
  'circuit-component': circuitSchema,
};

// ── ActionUtil class ──────────────────────────────────────────────────────

export class ScienceActionUtil extends BaseActionUtil<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>> {
  override readonly types = [
    'chemical-equation', 'wave-diagram', 'forces-diagram',
    'bohr-atom', 'circuit-component',
  ];

  override readonly schema = z.record(z.unknown()).default({});

  override validateProps(rawProps: unknown, type?: string): Record<string, unknown> {
    const perTypeSchema = type ? SCIENCE_SCHEMAS[type] : undefined;
    if (perTypeSchema) {
      try {
        return perTypeSchema.parse(rawProps ?? {}) as Record<string, unknown>;
      } catch {
        return perTypeSchema.parse({}) as Record<string, unknown>;
      }
    }
    return (rawProps && typeof rawProps === 'object' ? rawProps : {}) as Record<string, unknown>;
  }

  override applyToEditor(editor: Editor, spec: SageCanvasShapeSpec, index: number): void {
    let props: Record<string, unknown>;
    try {
      props = this.validateProps(spec.props, spec.type);
    } catch {
      props = this.validateProps({}, spec.type);
    }

    const w = (props.w as number | undefined) ?? 280;
    const h = (props.h as number | undefined) ?? 200;
    const { x, y } = findStampPosition(editor, w, h, index);

    editor.createShapes([{
      id: createShapeId(),
      type: spec.type as any, // custom shape types not in tldraw's built-in union
      x,
      y,
      opacity: 0.85,
      props: props as Record<string, unknown>,
      meta: { sageAttributed: true },
    }]);
  }

  buildPromptSnippet(): string {
    return [
      '## Science diagrams',
      '- "chemical-equation": {"reactants":"2H₂ + O₂","products":"2H₂O","arrow":"→","conditions":"","isReversible":false,"showStateSymbols":true}',
      '- "wave-diagram": {"amplitude":40,"frequency":2,"waveType":"transverse","showLabels":true,"color":"#3b82f6"}',
      '- "forces-diagram": {"bodyLabel":"Object","forces":"[{\\"label\\":\\"Weight (W)\\",\\"direction\\":180,\\"magnitude\\":80,\\"color\\":\\"#ef4444\\"},{\\"label\\":\\"Normal (N)\\",\\"direction\\":0,\\"magnitude\\":80,\\"color\\":\\"#3b82f6\\"}]"}',
      '- "bohr-atom": {"symbol":"C","protons":6,"neutrons":6,"shells":"[2,4]","showNumbers":true}',
      '- "circuit-component": {"componentType":"resistor","label":"R1","value":"100Ω","showLabel":true}',
    ].join('\n');
  }
}
