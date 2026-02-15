/**
 * Sage Tool Types
 *
 * Type definitions for OpenAI-compatible tool calling.
 *
 * @module sage/tools/types
 */

export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface Tool {
  type: 'function';
  function: ToolFunction;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
