/**
 * AgentActionRegistry — mirrors TLDraw Agent Starter Kit AgentModeDefinitions.
 *
 * Single source of truth for:
 *   - All registered ActionUtils (lazy-loaded to avoid circular deps)
 *   - System prompt generation (used by API routes instead of hardcoded strings)
 *   - Shape validation + stamping via the correct ActionUtil
 *
 * @module components/feature/virtualspace/agent/AgentActionRegistry
 */

import type { Editor } from '@tldraw/editor';
import type { BaseActionUtil } from './BaseActionUtil';
import type { SageCanvasShapeSpec } from '../canvas/canvasBlockParser';

// Lazy-loaded to avoid circular imports — populated by registerActionUtils()
const _utils: BaseActionUtil<any>[] = [];
let _registered = false;

async function ensureRegistered(): Promise<void> {
  if (_registered) return;
  _registered = true;
  const { registerActionUtils } = await import('./actions');
  registerActionUtils(_utils);
}

export const AgentActionRegistry = {
  /** Get the ActionUtil for a given shape type */
  async getUtil(type: string): Promise<BaseActionUtil<any> | undefined> {
    await ensureRegistered();
    return _utils.find(u => u.types.includes(type));
  },

  /**
   * Generate the full canvas system prompt from all registered ActionUtils.
   * Each util contributes a section via buildPromptSnippet().
   */
  async buildSystemPrompt(): Promise<string> {
    await ensureRegistered();
    const snippets = _utils.map(u => u.buildPromptSnippet()).filter(Boolean);
    return [
      '## Canvas Writing',
      'You can draw shapes on the whiteboard. When a visual aid would genuinely help, include a [CANVAS] block. The JSON MUST have exactly two keys: "type" and "props".',
      '',
      'Example:',
      '[CANVAS]',
      '{"type":"graph-axes","props":{"xMin":-1,"xMax":5,"yMin":-1,"yMax":4,"showGrid":true}}',
      '[/CANVAS]',
      '',
      'Rules:',
      '- JSON must be: {"type":"<type>","props":{<props>}} — never flatten props to top level.',
      '- Only add a shape when it genuinely aids understanding.',
      '- Put [CANVAS] on its own line — never inside a markdown code fence.',
      '- At most one [CANVAS] block per response.',
      '- Valid JSON only — no comments, no trailing commas.',
      '- For array fields (segments, bars, events, steps, forces, stages, branches, functions, shells): value must be a JSON array serialised as a string.',
      '',
      ...snippets,
    ].join('\n');
  },

  /**
   * Apply a shape spec to the editor using the appropriate ActionUtil.
   * Logs a warning and no-ops if no util is registered for the type.
   */
  async applySpec(
    editor: Editor,
    spec: SageCanvasShapeSpec,
    index: number,
  ): Promise<void> {
    await ensureRegistered();
    const util = _utils.find(u => u.types.includes(spec.type));
    if (!util) {
      console.warn('[AgentActionRegistry] No util registered for type:', spec.type);
      return;
    }
    await util.applyToEditor(editor, spec, index);
  },
};
