/**
 * DSPy Signature Types
 *
 * Shared type definitions for all subject DSPy engines.
 *
 * @module sage/subjects/dspy-types
 */

export interface DSPySignature {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  chainOfThought: boolean;
  examples?: DSPyExample[];
}

export interface DSPyExample {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  reasoning?: string;
}

export interface DSPyModule {
  subject: string;
  signatures: DSPySignature[];
  getSignature: (name: string) => DSPySignature | undefined;
}
