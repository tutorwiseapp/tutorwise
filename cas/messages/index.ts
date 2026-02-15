/**
 * CAS Message Bus
 *
 * Standardized inter-agent communication for Lexi, Sage, and CAS agents.
 * Supports A2A-ready JSON envelope format.
 *
 * @module cas/messages
 *
 * @example
 * ```typescript
 * import {
 *   createFeedbackEnvelope,
 *   publish,
 *   subscribe,
 * } from '@cas/messages';
 *
 * // Subscribe to feedback messages
 * subscribe('feedback.submitted', async (envelope) => {
 *   console.log('Feedback received:', envelope.payload);
 * });
 *
 * // Publish feedback
 * const envelope = createFeedbackEnvelope('sage', {
 *   session_id: 'session_123',
 *   rating: 'thumbs_up',
 *   context: { agent_type: 'sage', subject: 'maths' },
 * });
 *
 * await publish(envelope);
 * ```
 */

// --- Types ---
export type {
  MessageEnvelope,
  AgentIdentifier,
  MessageType,
  FeedbackPayload,
  FeedbackContext,
  ChatRequestPayload,
  ChatResponsePayload,
  SessionPayload,
  OptimizationPayload,
  TaskPayload,
  KnowledgePayload,
  MessageMetadata,
} from './types';

export {
  MESSAGE_VERSION,
  DEFAULT_TTL_MS,
  MAX_RETRY_COUNT,
} from './types';

// --- Envelope Factory ---
export {
  createEnvelope,
  createResponseEnvelope,
  createFeedbackEnvelope,
  createChatRequestEnvelope,
  createChatResponseEnvelope,
  createSessionStartedEnvelope,
  createSessionEndedEnvelope,
  createOptimizationCompletedEnvelope,
  createTaskAssignedEnvelope,
  createTaskHandoffEnvelope,
  createKnowledgeUploadedEnvelope,
} from './envelope';

// --- Validator ---
export type {
  ValidationResult,
  ValidationError,
  ValidationErrorCode,
} from './validator';

export {
  validateEnvelope,
  isFeedbackPayload,
  isChatRequestPayload,
  isChatResponsePayload,
  isSessionPayload,
  isTaskPayload,
  isKnowledgePayload,
} from './validator';

// --- Publisher ---
export type {
  TransportType,
  PublishOptions,
  PublishResult,
  SubscriptionHandler,
  HTTPTransportConfig,
} from './publisher';

export {
  subscribe,
  subscribeToAgent,
  publish,
  initDatabaseTransport,
  publishFeedbackToDatabase,
  registerHTTPTransport,
  publishHTTP,
  getPendingMessages,
  clearMessageQueue,
  getSubscriptionCount,
  clearSubscriptions,
} from './publisher';
