/**
 * Lexi LLM Provider Types
 *
 * Defines the interface for LLM providers that can be used
 * by Lexi to generate responses.
 *
 * @module lexi/providers/types
 */

import type { PersonaType, DetectedIntent, IntentCategory } from '../types';
import type { AgentContext } from '../../cas/packages/core/src/context';
import type { Tool, ToolCall } from '../tools/types';

// --- Provider Types ---

export type LLMProviderType = 'rules' | 'claude' | 'gemini' | 'deepseek';

export interface LLMProviderConfig {
  type: LLMProviderType;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

// --- Message Types ---

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionRequest {
  messages: LLMMessage[];
  persona: PersonaType;
  context: AgentContext;
  intent?: DetectedIntent;
  ragContext?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: Tool[];
}

export interface LLMCompletionResponse {
  content: string;
  toolCalls?: ToolCall[];
  intent?: DetectedIntent;
  suggestions?: string[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_call' | 'error';
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

// --- Provider Interface ---

export interface LLMProvider {
  /**
   * Provider type identifier
   */
  readonly type: LLMProviderType;

  /**
   * Provider display name
   */
  readonly name: string;

  /**
   * Check if the provider is available (has required config)
   */
  isAvailable(): boolean;

  /**
   * Generate a completion (non-streaming)
   */
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;

  /**
   * Generate a streaming completion
   */
  stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk>;

  /**
   * Detect intent from user message
   */
  detectIntent(
    message: string,
    persona: PersonaType,
    context: AgentContext
  ): Promise<DetectedIntent>;
}

// --- System Prompt Builder ---

export interface SystemPromptContext {
  persona: PersonaType;
  userName?: string;
  userRole?: string;
  organisationName?: string;
  capabilities: string[];
  conversationHistory?: LLMMessage[];
  ragContext?: string;
}

// --- Provider Factory ---

export interface LLMProviderFactory {
  create(config: LLMProviderConfig): LLMProvider;
  getAvailableProviders(): LLMProviderType[];
}
