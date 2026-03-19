/**
 * Unit tests for canvasBlockParser
 *
 * Covers the 3 failure modes documented in §16 Phase 2 of the
 * Sage × VirtualSpace solution design:
 *   1. Valid JSON with wrong field names (missing "type" or "props")
 *   2. [CANVAS] block wrapped inside a markdown code fence
 *   3. Multiple blocks — second block must not be dropped
 */

import { parseCanvasBlocks, parseStreamingBuffer } from '../canvasBlockParser';

// ── parseCanvasBlocks ──────────────────────────────────────────────────────

describe('parseCanvasBlocks', () => {
  describe('happy path', () => {
    it('extracts a valid single block', () => {
      const content = 'Before [CANVAS]{"type":"arrow","props":{"text":"A→B"}}[/CANVAS] After';
      const { shapes, displayText } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('arrow');
      expect(shapes[0].props).toEqual({ text: 'A→B' });
      expect(displayText).not.toContain('[CANVAS]');
      expect(displayText).toContain('Added to canvas');
    });
  });

  // ── Failure mode 1: wrong field names ───────────────────────────────────
  describe('failure mode 1 — missing required fields', () => {
    it('drops block with no "type" field', () => {
      const content = '[CANVAS]{"shape":"arrow","props":{"color":"red"}}[/CANVAS]';
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(0);
    });

    it('drops block with empty "type" string', () => {
      const content = '[CANVAS]{"type":"","props":{"color":"red"}}[/CANVAS]';
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(0);
    });

    it('drops block with no "props" field', () => {
      const content = '[CANVAS]{"type":"arrow","data":{"color":"red"}}[/CANVAS]';
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(0);
    });

    it('drops block where "props" is an array instead of object', () => {
      const content = '[CANVAS]{"type":"arrow","props":["color","red"]}[/CANVAS]';
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(0);
    });

    it('drops block where "props" is a primitive', () => {
      const content = '[CANVAS]{"type":"arrow","props":true}[/CANVAS]';
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(0);
    });

    it('drops block with invalid JSON', () => {
      const content = '[CANVAS]{type: arrow, props: {}}[/CANVAS]';
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(0);
    });

    it('still extracts a valid block that follows a bad block', () => {
      const bad  = '[CANVAS]{"shape":"arrow","props":{}}[/CANVAS]';
      const good = '[CANVAS]{"type":"box","props":{"label":"OK"}}[/CANVAS]';
      const { shapes } = parseCanvasBlocks(`${bad} ${good}`);
      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('box');
    });
  });

  // ── Failure mode 2: block inside a markdown code fence ──────────────────
  describe('failure mode 2 — block inside markdown code fence', () => {
    it('ignores a [CANVAS] block wrapped in triple-backtick fence', () => {
      const content = '```\n[CANVAS]{"type":"arrow","props":{}}[/CANVAS]\n```';
      const { shapes, displayText } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(0);
      // The raw [CANVAS] tag should be preserved inside the fence
      expect(displayText).toContain('[CANVAS]');
    });

    it('extracts block outside fence even when another is inside', () => {
      const insideFence  = '```\n[CANVAS]{"type":"bad","props":{}}[/CANVAS]\n```';
      const outsideFence = '[CANVAS]{"type":"good","props":{"x":1}}[/CANVAS]';
      const { shapes } = parseCanvasBlocks(`${insideFence}\n${outsideFence}`);
      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('good');
    });

    it('treats block inside single-backtick as normal (not a code fence)', () => {
      // single backticks are inline code, not fences — block should still be parsed
      const content = '`some code` and [CANVAS]{"type":"note","props":{}}[/CANVAS]';
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(1);
      expect(shapes[0].type).toBe('note');
    });
  });

  // ── Failure mode 3: multiple blocks ─────────────────────────────────────
  describe('failure mode 3 — multiple blocks all extracted', () => {
    it('extracts two valid blocks in order', () => {
      const content = [
        '[CANVAS]{"type":"arrow","props":{"from":"A","to":"B"}}[/CANVAS]',
        'some text',
        '[CANVAS]{"type":"box","props":{"label":"Step 2"}}[/CANVAS]',
      ].join('\n');
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(2);
      expect(shapes[0].type).toBe('arrow');
      expect(shapes[1].type).toBe('box');
    });

    it('extracts three blocks in order', () => {
      const content = [
        '[CANVAS]{"type":"a","props":{}}[/CANVAS]',
        '[CANVAS]{"type":"b","props":{}}[/CANVAS]',
        '[CANVAS]{"type":"c","props":{}}[/CANVAS]',
      ].join(' ');
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(3);
      expect(shapes.map(s => s.type)).toEqual(['a', 'b', 'c']);
    });

    it('skips bad blocks but keeps all valid ones from a mixed sequence', () => {
      const content = [
        '[CANVAS]{"type":"first","props":{}}[/CANVAS]',
        '[CANVAS]{"shape":"bad","props":{}}[/CANVAS]',  // missing type
        '[CANVAS]{"type":"third","props":{}}[/CANVAS]',
      ].join(' ');
      const { shapes } = parseCanvasBlocks(content);
      expect(shapes).toHaveLength(2);
      expect(shapes[0].type).toBe('first');
      expect(shapes[1].type).toBe('third');
    });

    it('replaces each valid block with inline indicator separately', () => {
      const content = [
        '[CANVAS]{"type":"a","props":{}}[/CANVAS]',
        'middle',
        '[CANVAS]{"type":"b","props":{}}[/CANVAS]',
      ].join(' ');
      const { displayText } = parseCanvasBlocks(content);
      const indicatorCount = (displayText.match(/Added to canvas/g) ?? []).length;
      expect(indicatorCount).toBe(2);
    });
  });
});

// ── parseStreamingBuffer ───────────────────────────────────────────────────

describe('parseStreamingBuffer', () => {
  it('returns empty remainingBuffer when no incomplete block', () => {
    const raw = 'Hello [CANVAS]{"type":"a","props":{}}[/CANVAS] world';
    const { shapes, remainingBuffer } = parseStreamingBuffer(raw);
    expect(shapes).toHaveLength(1);
    expect(remainingBuffer).toBe('');
  });

  it('hides incomplete block from displayText and returns it as remainingBuffer', () => {
    const raw = 'Before text [CANVAS]{"type":"a",';
    const { displayText, shapes, remainingBuffer } = parseStreamingBuffer(raw);
    expect(shapes).toHaveLength(0);
    expect(displayText).toBe('Before text ');
    expect(remainingBuffer).toBe('[CANVAS]{"type":"a",');
  });

  it('extracts completed blocks that appear before the incomplete one', () => {
    const raw = '[CANVAS]{"type":"done","props":{}}[/CANVAS] text [CANVAS]{"type":"wip",';
    const { shapes, remainingBuffer } = parseStreamingBuffer(raw);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('done');
    expect(remainingBuffer).toContain('[CANVAS]');
    expect(remainingBuffer).toContain('"wip"');
  });

  it('parses everything normally once the block is complete', () => {
    const raw = 'text [CANVAS]{"type":"final","props":{"x":1}}[/CANVAS]';
    const { shapes, remainingBuffer } = parseStreamingBuffer(raw);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('final');
    expect(remainingBuffer).toBe('');
  });
});
