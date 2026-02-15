/**
 * Sage Provider Types
 *
 * Type definitions for LLM providers in Sage.
 */

import type { AgentContext } from '../../cas/packages/core/src/context';
import type { SagePersona, SageSubject, SageLevel, SageDetectedIntent } from '../types';

// --- Provider Types ---

export type LLMProviderType = 'gemini' | 'claude' | 'rules';

export interface LLMProviderConfig {
  type: LLMProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// --- Message Types ---

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// --- Request/Response Types ---

export interface LLMCompletionRequest {
  messages: LLMMessage[];
  persona: SagePersona;
  subject?: SageSubject;
  level?: SageLevel;
  context: AgentContext;
  intent?: SageDetectedIntent;
  topic?: string;
  stream?: boolean;
}

export interface LLMCompletionResponse {
  content: string;
  suggestions?: string[];
  relatedTopics?: string[];
  practiceProblems?: string[];
  signatureUsed?: string;
  metadata?: Record<string, unknown>;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

// --- System Prompt Context ---

export interface SystemPromptContext {
  persona: SagePersona;
  subject?: SageSubject;
  level?: SageLevel;
  topic?: string;
  userName?: string;
  organisationName?: string;
  capabilities: string[];
  learningContext?: {
    currentTopic?: string;
    sessionGoal?: string;
    priorKnowledge?: string[];
    errorPatterns?: string[];
  };
}

// --- Provider Interface ---

export interface LLMProvider {
  readonly type: LLMProviderType;
  readonly name: string;

  isAvailable(): boolean;

  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;

  stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk>;

  detectIntent(
    message: string,
    persona: SagePersona,
    context: AgentContext,
    subject?: SageSubject,
    level?: SageLevel
  ): Promise<SageDetectedIntent>;
}
