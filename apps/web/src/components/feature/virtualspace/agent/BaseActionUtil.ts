/**
 * BaseActionUtil — mirrors TLDraw Agent Starter Kit AgentActionUtil.
 *
 * Each shape group extends this to provide:
 *   - A Zod schema with defaults for all props
 *   - A human-readable system prompt snippet for the LLM
 *   - The shape type string(s) it handles
 *
 * NOTE: No top-level imports from 'tldraw' or client-only modules.
 * applyToEditor() uses dynamic imports so this module is safe to evaluate
 * server-side (e.g. from API routes calling buildSystemPrompt()).
 *
 * @module components/feature/virtualspace/agent/BaseActionUtil
 */

import { z } from 'zod';
import type { Editor } from '@tldraw/editor';
import type { SageCanvasShapeSpec } from '../canvas/canvasBlockParser';

export abstract class BaseActionUtil<TSchema extends z.ZodTypeAny> {
  /** The tldraw shape type(s) this util handles */
  abstract readonly types: string[];

  /** Zod schema for the shape props — must have .default() on all fields so parse({}) succeeds */
  abstract readonly schema: TSchema;

  /** System prompt snippet describing this shape group to the LLM */
  abstract buildPromptSnippet(): string;

  /**
   * Validate and fill defaults for incoming props from LLM.
   * Subclasses can override to use per-type schema dispatch.
   */
  validateProps(rawProps: unknown, _type?: string): z.output<TSchema> {
    return this.schema.parse(rawProps ?? {});
  }

  /**
   * Apply a validated shape spec to the tldraw editor.
   * Reads w/h from the validated props to compute stamp position.
   * Uses dynamic imports for tldraw so this class is server-safe.
   */
  async applyToEditor(editor: Editor, spec: SageCanvasShapeSpec, index: number): Promise<void> {
    let props: Record<string, unknown>;
    try {
      props = this.validateProps(spec.props, spec.type) as Record<string, unknown>;
    } catch {
      try {
        props = this.validateProps({}, spec.type) as Record<string, unknown>;
      } catch {
        props = {};
      }
    }

    const w = (props.w as number | undefined) ?? 200;
    const h = (props.h as number | undefined) ?? 200;

    // Dynamic imports — tldraw and SageCanvasWriter are client-only;
    // dynamic import defers evaluation until applyToEditor() is called (always client-side).
    const [{ createShapeId }, { findStampPosition }] = await Promise.all([
      import('tldraw'),
      import('../canvas/SageCanvasWriter'),
    ]);

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
}
