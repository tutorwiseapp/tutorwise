/**
 * CAS Message Envelope Factory
 *
 * Creates standardized message envelopes for inter-agent communication.
 *
 * @module cas/messages
 */

import { randomUUID } from 'crypto';
import {
  type MessageEnvelope,
  type AgentIdentifier,
  type MessageType,
  type MessageMetadata,
  MESSAGE_VERSION,
} from './types';

// --- Envelope Factory ---

/**
 * Create a new message envelope with default values.
 */
export function createEnvelope<T>(options: {
  from: AgentIdentifier;
  to: AgentIdentifier;
  type: MessageType;
  payload: T;
  correlation_id?: string;
  metadata?: MessageMetadata;
}): MessageEnvelope<T> {
  return {
    id: randomUUID(),
    from: options.from,
    to: options.to,
    type: options.type,
    payload: options.payload,
    correlation_id: options.correlation_id,
    timestamp: new Date().toISOString(),
    version: MESSAGE_VERSION,
    metadata: options.metadata,
  };
}

/**
 * Create a response envelope correlated to a request.
 */
export function createResponseEnvelope<T, R>(
  request: MessageEnvelope<T>,
  responseType: MessageType,
  payload: R,
  metadata?: MessageMetadata
): MessageEnvelope<R> {
  return createEnvelope({
    from: request.to,  // Swap sender/receiver
    to: request.from,
    type: responseType,
    payload,
    correlation_id: request.id,  // Correlate to original request
    metadata: {
      ...metadata,
      parent_span_id: request.metadata?.span_id,
      trace_id: request.metadata?.trace_id,
    },
  });
}

// --- Specialized Envelope Factories ---

import type {
  FeedbackPayload,
  ChatRequestPayload,
  ChatResponsePayload,
  SessionPayload,
  OptimizationPayload,
  TaskPayload,
  KnowledgePayload,
} from './types';

/**
 * Create a feedback message envelope.
 */
export function createFeedbackEnvelope(
  agentType: 'sage' | 'lexi',
  payload: FeedbackPayload
): MessageEnvelope<FeedbackPayload> {
  return createEnvelope({
    from: 'external:user',
    to: agentType,
    type: 'feedback.submitted',
    payload,
  });
}

/**
 * Create a chat request envelope.
 */
export function createChatRequestEnvelope(
  to: AgentIdentifier,
  payload: ChatRequestPayload
): MessageEnvelope<ChatRequestPayload> {
  return createEnvelope({
    from: 'external:user',
    to,
    type: 'request.chat',
    payload,
  });
}

/**
 * Create a chat response envelope.
 */
export function createChatResponseEnvelope(
  request: MessageEnvelope<ChatRequestPayload>,
  payload: ChatResponsePayload
): MessageEnvelope<ChatResponsePayload> {
  return createResponseEnvelope(request, 'response.chat', payload);
}

/**
 * Create a session started envelope.
 */
export function createSessionStartedEnvelope(
  agentType: 'sage' | 'lexi',
  payload: SessionPayload
): MessageEnvelope<SessionPayload> {
  return createEnvelope({
    from: agentType,
    to: 'cas:optimization',  // Notify optimization service
    type: 'session.started',
    payload,
  });
}

/**
 * Create a session ended envelope.
 */
export function createSessionEndedEnvelope(
  agentType: 'sage' | 'lexi',
  payload: SessionPayload
): MessageEnvelope<SessionPayload> {
  return createEnvelope({
    from: agentType,
    to: 'cas:optimization',
    type: 'session.ended',
    payload,
  });
}

/**
 * Create an optimization completed envelope.
 */
export function createOptimizationCompletedEnvelope(
  payload: OptimizationPayload
): MessageEnvelope<OptimizationPayload> {
  return createEnvelope({
    from: 'cas:optimization',
    to: payload.agent_type,
    type: 'optimization.completed',
    payload,
  });
}

/**
 * Create a task assigned envelope (CAS agents).
 */
export function createTaskAssignedEnvelope(
  assignee: AgentIdentifier,
  payload: TaskPayload
): MessageEnvelope<TaskPayload> {
  return createEnvelope({
    from: 'cas:planner',
    to: assignee,
    type: 'task.assigned',
    payload: {
      ...payload,
      assigned_to: assignee,
      assigned_by: 'cas:planner',
    },
  });
}

/**
 * Create a task handoff envelope (CAS agents).
 */
export function createTaskHandoffEnvelope(
  from: AgentIdentifier,
  to: AgentIdentifier,
  payload: TaskPayload
): MessageEnvelope<TaskPayload> {
  return createEnvelope({
    from,
    to,
    type: 'task.handoff',
    payload,
  });
}

/**
 * Create a knowledge uploaded envelope.
 */
export function createKnowledgeUploadedEnvelope(
  agentType: 'sage' | 'lexi',
  payload: KnowledgePayload
): MessageEnvelope<KnowledgePayload> {
  return createEnvelope({
    from: 'external:user',
    to: agentType,
    type: 'knowledge.uploaded',
    payload,
  });
}
