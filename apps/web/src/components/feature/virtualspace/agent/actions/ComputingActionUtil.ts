/**
 * ComputingActionUtil — handles computing / technology diagram shape types.
 *
 * Types: flowchart
 *
 * The "steps" field is a JSON-array-as-string. A z.preprocess step coerces
 * LLM-provided arrays into strings automatically.
 *
 * @module components/feature/virtualspace/agent/actions/ComputingActionUtil
 */

import { z } from 'zod';
import type { Editor } from '@tldraw/editor';
import { BaseActionUtil } from '../BaseActionUtil';
import type { SageCanvasShapeSpec } from '../../canvas/canvasBlockParser';

const DEFAULT_STEPS = JSON.stringify([
  { type: 'start',    label: 'Start' },
  { type: 'process',  label: 'Get input' },
  { type: 'decision', label: 'Valid?' },
  { type: 'process',  label: 'Process data' },
  { type: 'end',      label: 'End' },
]);

// Coerces array → JSON string, leaves strings alone
const jsonArrayString = (defaultVal: string) =>
  z.preprocess(
    v => Array.isArray(v) ? JSON.stringify(v) : (typeof v === 'string' ? v : defaultVal),
    z.string(),
  );

const flowchartSchema = z.object({
  w:     z.number().default(260),
  h:     z.number().default(340),
  steps: jsonArrayString(DEFAULT_STEPS).default(DEFAULT_STEPS),
}).default({});

export class ComputingActionUtil extends BaseActionUtil<typeof flowchartSchema> {
  override readonly types = ['flowchart'];
  override readonly schema = flowchartSchema;

  override validateProps(rawProps: unknown, _type?: string): z.output<typeof flowchartSchema> {
    try {
      return flowchartSchema.parse(rawProps ?? {});
    } catch {
      return flowchartSchema.parse({});
    }
  }

  override async applyToEditor(editor: Editor, spec: SageCanvasShapeSpec, index: number): Promise<void> {
    let props: Record<string, unknown>;
    try {
      props = this.validateProps(spec.props, spec.type) as Record<string, unknown>;
    } catch {
      props = this.validateProps({}, spec.type) as Record<string, unknown>;
    }

    const w = (props.w as number | undefined) ?? 260;
    const h = (props.h as number | undefined) ?? 340;

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
      '## Technology / Computing diagrams',
      '- "flowchart": {"steps":"[{\\"type\\":\\"start\\",\\"label\\":\\"Start\\"},{\\"type\\":\\"process\\",\\"label\\":\\"Get input\\"},{\\"type\\":\\"decision\\",\\"label\\":\\"Valid?\\"},{\\"type\\":\\"process\\",\\"label\\":\\"Process data\\"},{\\"type\\":\\"end\\",\\"label\\":\\"End\\"}]"}',
    ].join('\n');
  }
}
