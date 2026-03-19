/**
 * canvasBlockParser
 *
 * Parses [CANVAS]...[/CANVAS] blocks from Sage LLM streaming responses.
 * Handles 3 known failure modes:
 *   1. Valid JSON with wrong field names (missing "type" or "props")
 *   2. [CANVAS] block inside a markdown code fence (treated as literal text)
 *   3. Multiple blocks where the second could be lost if not handled (all extracted in order)
 *
 * @module components/feature/virtualspace/canvas/canvasBlockParser
 */

export interface SageCanvasShapeSpec {
  type: string;
  props: Record<string, unknown>;
}

/** Parse all complete [CANVAS] blocks from a string. Returns display text + shapes. */
export function parseCanvasBlocks(content: string): {
  displayText: string;
  shapes: SageCanvasShapeSpec[];
} {
  const shapes: SageCanvasShapeSpec[] = [];
  const codeFenceRanges = getCodeFenceRanges(content);

  const CANVAS_RE = /\[CANVAS\]([\s\S]*?)\[\/CANVAS\]/g;
  let match: RegExpExecArray | null;

  while ((match = CANVAS_RE.exec(content)) !== null) {
    // Failure mode 2: skip blocks inside code fences
    if (isInsideCodeFence(match.index, codeFenceRanges)) continue;

    try {
      const parsed = JSON.parse(match[1].trim());
      // Failure mode 1: validate required fields
      if (typeof parsed.type !== 'string' || !parsed.type) {
        console.warn('[SageCanvas] Block missing "type":', match[1].slice(0, 80));
        continue;
      }
      if (!parsed.props || typeof parsed.props !== 'object' || Array.isArray(parsed.props)) {
        console.warn('[SageCanvas] Block missing "props":', match[1].slice(0, 80));
        continue;
      }
      shapes.push({ type: parsed.type, props: parsed.props as Record<string, unknown> });
    } catch {
      console.warn('[SageCanvas] Could not parse canvas block JSON:', match[1].slice(0, 80));
    }
  }

  // Replace canvas blocks with inline indicator (skip code-fenced ones)
  const displayText = content.replace(
    /\[CANVAS\]([\s\S]*?)\[\/CANVAS\]/g,
    (full, _json, offset) =>
      isInsideCodeFence(offset as number, codeFenceRanges)
        ? full
        : '\n*↗ Added to canvas*\n'
  );

  return { displayText, shapes };
}

/**
 * Incrementally parse a streaming buffer.
 * If an incomplete [CANVAS] block is in progress, hides it from the display
 * and returns it as `remainingBuffer` to accumulate more chunks.
 * Failure mode 3: multiple blocks are all extracted in order.
 */
export function parseStreamingBuffer(rawBuffer: string): {
  displayText: string;
  shapes: SageCanvasShapeSpec[];
  remainingBuffer: string;
} {
  const openIdx = rawBuffer.lastIndexOf('[CANVAS]');
  const closeIdx = rawBuffer.lastIndexOf('[/CANVAS]');

  // Incomplete block in progress — hide it from display
  if (openIdx !== -1 && (closeIdx === -1 || closeIdx < openIdx)) {
    const before = rawBuffer.slice(0, openIdx);
    const { displayText, shapes } = parseCanvasBlocks(before);
    return { displayText, shapes, remainingBuffer: rawBuffer.slice(openIdx) };
  }

  // No incomplete block — parse everything
  const { displayText, shapes } = parseCanvasBlocks(rawBuffer);
  return { displayText, shapes, remainingBuffer: '' };
}

function getCodeFenceRanges(content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const re = /```[\s\S]*?```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) ranges.push([m.index, m.index + m[0].length]);
  return ranges;
}

function isInsideCodeFence(pos: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([s, e]) => pos >= s && pos < e);
}
