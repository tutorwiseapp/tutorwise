/**
 * Sage Math Renderer Utilities
 *
 * Detects LaTeX expressions in LLM output for client-side KaTeX rendering.
 * Also detects Mermaid diagram blocks for SVG rendering.
 *
 * These utilities help the frontend identify which parts of a response
 * need special rendering (math, diagrams, step-by-step reveals).
 *
 * @module sage/rendering/math-renderer
 */

// --- Types ---

export type ContentBlockType = 'text' | 'latex_inline' | 'latex_display' | 'mermaid' | 'step_reveal';

export interface ContentBlock {
  type: ContentBlockType;
  content: string;
  /** For step_reveal: ordered steps */
  steps?: string[];
}

// --- Detection ---

/**
 * Check if a response contains LaTeX expressions.
 */
export function containsLatex(text: string): boolean {
  return /\$[^$]+\$/.test(text) || /\$\$[^$]+\$\$/.test(text) || /\\[({]/.test(text);
}

/**
 * Check if a response contains a Mermaid diagram.
 */
export function containsMermaid(text: string): boolean {
  return /```mermaid\n[\s\S]+?```/.test(text);
}

/**
 * Check if a response contains a step-by-step solution.
 * Looks for numbered steps or "Step 1:", "Step 2:" patterns.
 */
export function containsSteps(text: string): boolean {
  const stepPattern = /(?:^|\n)\s*(?:Step\s+\d+[:.)]|(?:\d+)[.)]\s)/m;
  const matches = text.match(/(?:^|\n)\s*(?:Step\s+\d+|(?:\d+)[.)])/gm);
  return stepPattern.test(text) && (matches?.length || 0) >= 2;
}

/**
 * Parse a response into content blocks for rich rendering.
 * The frontend can use these blocks to render LaTeX, Mermaid, and step reveals.
 */
export function parseContentBlocks(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let remaining = text;

  // Extract Mermaid diagrams first
  const mermaidRegex = /```mermaid\n([\s\S]+?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mermaidRegex.exec(remaining)) !== null) {
    // Text before the diagram
    if (match.index > lastIndex) {
      const textBefore = remaining.slice(lastIndex, match.index).trim();
      if (textBefore) {
        blocks.push({ type: 'text', content: textBefore });
      }
    }

    blocks.push({ type: 'mermaid', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last mermaid block
  if (lastIndex < remaining.length) {
    const rest = remaining.slice(lastIndex).trim();
    if (rest) {
      // Check if it contains steps for step reveal
      if (containsSteps(rest)) {
        const steps = extractSteps(rest);
        if (steps.length >= 2) {
          blocks.push({ type: 'step_reveal', content: rest, steps });
        } else {
          blocks.push({ type: 'text', content: rest });
        }
      } else {
        blocks.push({ type: 'text', content: rest });
      }
    }
  }

  // If no mermaid blocks were found, parse the whole text
  if (blocks.length === 0 && text.trim()) {
    if (containsSteps(text)) {
      const steps = extractSteps(text);
      if (steps.length >= 2) {
        blocks.push({ type: 'step_reveal', content: text, steps });
      } else {
        blocks.push({ type: 'text', content: text });
      }
    } else {
      blocks.push({ type: 'text', content: text });
    }
  }

  return blocks;
}

/**
 * Extract ordered steps from a step-by-step solution.
 */
export function extractSteps(text: string): string[] {
  const steps: string[] = [];

  // Try "Step N:" pattern first
  const stepPattern = /Step\s+(\d+)[:.)\s]+([\s\S]*?)(?=Step\s+\d+[:.)\s]|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = stepPattern.exec(text)) !== null) {
    const content = match[2].trim();
    if (content) steps.push(content);
  }

  if (steps.length >= 2) return steps;

  // Fallback: try numbered list pattern "1. " or "1) "
  const numberedPattern = /(?:^|\n)\s*(\d+)[.)]\s+([\s\S]*?)(?=(?:^|\n)\s*\d+[.)]\s|$)/gm;
  steps.length = 0;

  while ((match = numberedPattern.exec(text)) !== null) {
    const content = match[2].trim();
    if (content) steps.push(content);
  }

  return steps;
}

/**
 * Add rendering hints to SSE metadata.
 * Frontend uses these to decide which renderer to activate.
 */
export function getRenderingHints(fullResponse: string): {
  hasLatex: boolean;
  hasMermaid: boolean;
  hasSteps: boolean;
  blockCount: number;
} {
  return {
    hasLatex: containsLatex(fullResponse),
    hasMermaid: containsMermaid(fullResponse),
    hasSteps: containsSteps(fullResponse),
    blockCount: parseContentBlocks(fullResponse).length,
  };
}
