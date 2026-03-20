/**
 * EnglishHumanitiesActionUtil — handles English & Humanities diagram shape types.
 *
 * Types: story-mountain, annotation, timeline
 *
 * Array fields (stages, events) are stored as JSON-serialised strings.
 *
 * @module components/feature/virtualspace/agent/actions/EnglishHumanitiesActionUtil
 */

import { z } from 'zod';
import type { Editor } from '@tldraw/editor';
import { BaseActionUtil } from '../BaseActionUtil';
import type { SageCanvasShapeSpec } from '../../canvas/canvasBlockParser';

// Coerces array → JSON string, leaves strings alone
const jsonArrayString = (defaultVal: string) =>
  z.preprocess(
    v => Array.isArray(v) ? JSON.stringify(v) : (typeof v === 'string' ? v : defaultVal),
    z.string(),
  );

// ── Per-type schemas ──────────────────────────────────────────────────────

const DEFAULT_STAGES = JSON.stringify([
  { label: 'Exposition',    description: 'Characters & setting introduced' },
  { label: 'Rising Action', description: 'Conflict develops' },
  { label: 'Climax',        description: 'Turning point / peak tension' },
  { label: 'Falling Action', description: 'Tension resolves' },
  { label: 'Resolution',    description: 'New normal established' },
]);

const DEFAULT_EVENTS = JSON.stringify([
  { label: 'Event 1', date: '1066', color: '#3b82f6' },
  { label: 'Event 2', date: '1215', color: '#8b5cf6' },
]);

const storyMountainSchema = z.object({
  w:      z.number().default(380),
  h:      z.number().default(280),
  title:  z.string().default(''),
  stages: jsonArrayString(DEFAULT_STAGES).default(DEFAULT_STAGES),
}).default({});

const annotationSchema = z.object({
  w:              z.number().default(200),
  h:              z.number().default(100),
  text:           z.string().default(''),
  highlightColor: z.string().default('#fef3c7'),
  annotationType: z.string().default('highlight'),
  label:          z.string().default(''),
  showBadge:      z.boolean().default(true),
}).default({});

const timelineSchema = z.object({
  w:         z.number().default(480),
  h:         z.number().default(160),
  events:    jsonArrayString(DEFAULT_EVENTS).default(DEFAULT_EVENTS),
  title:     z.string().default(''),
  lineColor: z.string().default('#475569'),
}).default({});

// ── Schema map ────────────────────────────────────────────────────────────

const EH_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'story-mountain': storyMountainSchema,
  'annotation':     annotationSchema,
  'timeline':       timelineSchema,
};

// ── ActionUtil class ──────────────────────────────────────────────────────

export class EnglishHumanitiesActionUtil extends BaseActionUtil<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>> {
  override readonly types = ['story-mountain', 'annotation', 'timeline'];

  override readonly schema = z.record(z.unknown()).default({});

  override validateProps(rawProps: unknown, type?: string): Record<string, unknown> {
    const perTypeSchema = type ? EH_SCHEMAS[type] : undefined;
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

    const w = (props.w as number | undefined) ?? 380;
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
      '## English / Humanities diagrams',
      '- "story-mountain": {"title":"Story Mountain","stages":"[{\\"label\\":\\"Exposition\\",\\"description\\":\\"Setting the scene\\"},{\\"label\\":\\"Rising Action\\",\\"description\\":\\"Tension builds\\"},{\\"label\\":\\"Climax\\",\\"description\\":\\"Peak moment\\"},{\\"label\\":\\"Falling Action\\",\\"description\\":\\"Aftermath\\"},{\\"label\\":\\"Resolution\\",\\"description\\":\\"Conclusion\\"}]"}',
      '- "annotation": {"text":"Key term","annotationType":"highlight","label":"","showBadge":true}',
      '- "timeline": {"events":"[{\\"label\\":\\"Battle of Hastings\\",\\"date\\":\\"1066\\",\\"color\\":\\"#3b82f6\\"},{\\"label\\":\\"Magna Carta\\",\\"date\\":\\"1215\\",\\"color\\":\\"#8b5cf6\\"}]","title":""}',
    ].join('\n');
  }
}
