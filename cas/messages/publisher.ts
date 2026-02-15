/**
 * CAS Message Publisher
 *
 * Publishes messages to CAS agents and external services.
 * Supports multiple transports: in-memory, Redis, and database.
 *
 * @module cas/messages
 */

import type {
  MessageEnvelope,
  AgentIdentifier,
  MessageType,
  FeedbackPayload,
} from './types';
import { validateEnvelope, type ValidationResult } from './validator';

// --- Publisher Types ---

export type TransportType = 'memory' | 'redis' | 'database' | 'http';

export interface PublishOptions {
  /** Retry failed deliveries */
  retry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Delay between retries in ms */
  retryDelayMs?: number;
  /** Validate envelope before publishing */
  validate?: boolean;
  /** Timeout for delivery in ms */
  timeoutMs?: number;
}

export interface PublishResult {
  success: boolean;
  messageId: string;
  deliveredTo: AgentIdentifier[];
  errors?: string[];
}

export interface SubscriptionHandler<T = unknown> {
  (envelope: MessageEnvelope<T>): Promise<void> | void;
}

// --- In-Memory Transport (for testing and single-process) ---

const subscriptions = new Map<string, Set<SubscriptionHandler>>();
const messageQueue: MessageEnvelope[] = [];

/**
 * Subscribe to messages of a specific type.
 */
export function subscribe<T>(
  type: MessageType | '*',
  handler: SubscriptionHandler<T>
): () => void {
  const key = type;
  if (!subscriptions.has(key)) {
    subscriptions.set(key, new Set());
  }
  subscriptions.get(key)!.add(handler as SubscriptionHandler);

  // Return unsubscribe function
  return () => {
    subscriptions.get(key)?.delete(handler as SubscriptionHandler);
  };
}

/**
 * Subscribe to messages for a specific agent.
 */
export function subscribeToAgent<T>(
  agentId: AgentIdentifier,
  handler: SubscriptionHandler<T>
): () => void {
  const key = `agent:${agentId}`;
  if (!subscriptions.has(key)) {
    subscriptions.set(key, new Set());
  }
  subscriptions.get(key)!.add(handler as SubscriptionHandler);

  return () => {
    subscriptions.get(key)?.delete(handler as SubscriptionHandler);
  };
}

/**
 * Publish a message to the bus.
 */
export async function publish<T>(
  envelope: MessageEnvelope<T>,
  options: PublishOptions = {}
): Promise<PublishResult> {
  const {
    validate = true,
    retry = true,
    maxRetries = 3,
    retryDelayMs = 1000,
  } = options;

  // Validate envelope
  if (validate) {
    const validation = validateEnvelope(envelope);
    if (!validation.valid) {
      return {
        success: false,
        messageId: envelope.id,
        deliveredTo: [],
        errors: validation.errors.map(e => `${e.field}: ${e.message}`),
      };
    }
  }

  const deliveredTo: AgentIdentifier[] = [];
  const errors: string[] = [];

  // Get handlers for this message type
  const typeHandlers = subscriptions.get(envelope.type) || new Set();
  const wildcardHandlers = subscriptions.get('*') || new Set();
  const agentHandlers = subscriptions.get(`agent:${envelope.to}`) || new Set();

  const allHandlers = new Set([
    ...typeHandlers,
    ...wildcardHandlers,
    ...agentHandlers,
  ]);

  // Deliver to all subscribers
  for (const handler of allHandlers) {
    let attempt = 0;
    let delivered = false;

    while (!delivered && attempt <= (retry ? maxRetries : 0)) {
      try {
        await handler(envelope);
        delivered = true;
        deliveredTo.push(envelope.to);
      } catch (error) {
        attempt++;
        if (attempt <= maxRetries && retry) {
          await delay(retryDelayMs * attempt);
        } else {
          errors.push(`Delivery failed after ${attempt} attempts: ${error}`);
        }
      }
    }
  }

  // Store in queue for persistence (if no handlers)
  if (allHandlers.size === 0) {
    messageQueue.push(envelope as MessageEnvelope);
  }

  return {
    success: errors.length === 0,
    messageId: envelope.id,
    deliveredTo,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// --- Database Transport (Supabase) ---

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize database transport with Supabase client.
 */
export function initDatabaseTransport(client: SupabaseClient): void {
  supabaseClient = client;
}

/**
 * Publish feedback to the ai_feedback table.
 */
export async function publishFeedbackToDatabase(
  envelope: MessageEnvelope<FeedbackPayload>
): Promise<PublishResult> {
  if (!supabaseClient) {
    return {
      success: false,
      messageId: envelope.id,
      deliveredTo: [],
      errors: ['Database transport not initialized'],
    };
  }

  const { payload } = envelope;

  try {
    const { error } = await supabaseClient
      .from('ai_feedback')
      .insert({
        agent_type: payload.context.agent_type,
        session_id: payload.session_id,
        message_id: payload.message_id,
        rating: payload.rating,
        rating_value: payload.rating_value,
        comment: payload.comment,
        context: payload.context,
      });

    if (error) {
      return {
        success: false,
        messageId: envelope.id,
        deliveredTo: [],
        errors: [error.message],
      };
    }

    return {
      success: true,
      messageId: envelope.id,
      deliveredTo: ['cas:optimization'],
    };
  } catch (error) {
    return {
      success: false,
      messageId: envelope.id,
      deliveredTo: [],
      errors: [(error as Error).message],
    };
  }
}

// --- HTTP Transport (for external services) ---

export interface HTTPTransportConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

const httpTransports = new Map<AgentIdentifier, HTTPTransportConfig>();

/**
 * Register an HTTP transport for an agent.
 */
export function registerHTTPTransport(
  agentId: AgentIdentifier,
  config: HTTPTransportConfig
): void {
  httpTransports.set(agentId, config);
}

/**
 * Publish a message via HTTP.
 */
export async function publishHTTP<T>(
  envelope: MessageEnvelope<T>
): Promise<PublishResult> {
  const config = httpTransports.get(envelope.to);

  if (!config) {
    return {
      success: false,
      messageId: envelope.id,
      deliveredTo: [],
      errors: [`No HTTP transport registered for ${envelope.to}`],
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeout || 30000
    );

    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(envelope),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        messageId: envelope.id,
        deliveredTo: [],
        errors: [`HTTP ${response.status}: ${response.statusText}`],
      };
    }

    return {
      success: true,
      messageId: envelope.id,
      deliveredTo: [envelope.to],
    };
  } catch (error) {
    return {
      success: false,
      messageId: envelope.id,
      deliveredTo: [],
      errors: [(error as Error).message],
    };
  }
}

// --- Utility Functions ---

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get pending messages from the queue.
 */
export function getPendingMessages(): MessageEnvelope[] {
  return [...messageQueue];
}

/**
 * Clear the message queue.
 */
export function clearMessageQueue(): void {
  messageQueue.length = 0;
}

/**
 * Get subscription count for debugging.
 */
export function getSubscriptionCount(): number {
  let count = 0;
  for (const handlers of subscriptions.values()) {
    count += handlers.size;
  }
  return count;
}

/**
 * Clear all subscriptions (for testing).
 */
export function clearSubscriptions(): void {
  subscriptions.clear();
}
