/**
 * applyAgentActions — thin wrapper over AgentActionRegistry.applySpec.
 *
 * Can be called from EmbeddedWhiteboard (via editorRef) as an alternative to
 * stampShapesOnEditor. Processes specs sequentially so each shape lands before
 * the next position calculation runs.
 *
 * @module components/feature/virtualspace/agent/applyAgentActions
 */

import type { Editor } from '@tldraw/editor';
import type { SageCanvasShapeSpec } from '../canvas/canvasBlockParser';
import { AgentActionRegistry } from './AgentActionRegistry';

/**
 * Apply an array of SageCanvasShapeSpec objects to the editor,
 * delegating to the registered ActionUtil for each shape type.
 */
export async function applyAgentActions(
  editor: Editor,
  specs: SageCanvasShapeSpec[],
): Promise<void> {
  for (let i = 0; i < specs.length; i++) {
    await AgentActionRegistry.applySpec(editor, specs[i], i);
  }
}
