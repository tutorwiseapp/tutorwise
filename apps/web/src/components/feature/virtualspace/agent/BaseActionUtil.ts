/**
 * BaseActionUtil — mirrors TLDraw Agent Starter Kit AgentActionUtil.
 *
 * Each shape group extends this to provide:
 *   - A Zod schema with defaults for all props
 *   - A human-readable system prompt snippet for the LLM
 *   - The shape type string(s) it handles
 *
 * @module components/feature/virtualspace/agent/BaseActionUtil
 */

import { z } from 'zod';
import type { Editor } from '@tldraw/editor';
import { createShapeId } from 'tldraw';
import type { SageCanvasShapeSpec } from '../canvas/canvasBlockParser';
import { findStampPosition } from '../canvas/SageCanvasWriter';

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
   */
  applyToEditor(editor: Editor, spec: SageCanvasShapeSpec, index: number): void {
    let props: Record<string, unknown>;
    try {
      props = this.validateProps(spec.props, spec.type) as Record<string, unknown>;
    } catch {
      // Fallback to schema defaults if props are completely invalid
      try {
        props = this.validateProps({}, spec.type) as Record<string, unknown>;
      } catch {
        props = {};
      }
    }

    const w = (props.w as number | undefined) ?? 200;
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
}
