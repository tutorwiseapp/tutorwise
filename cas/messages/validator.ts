/**
 * CAS Message Validator
 *
 * Schema validation for message envelopes.
 * Ensures type safety and data integrity for inter-agent communication.
 *
 * @module cas/messages
 */

import {
  type MessageEnvelope,
  type MessageType,
  type FeedbackPayload,
  type ChatRequestPayload,
  type ChatResponsePayload,
  type SessionPayload,
  type OptimizationPayload,
  type TaskPayload,
  type KnowledgePayload,
  MESSAGE_VERSION,
} from './types';

// --- Validation Result ---

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: ValidationErrorCode;
}

export type ValidationErrorCode =
  | 'REQUIRED_FIELD'
  | 'INVALID_TYPE'
  | 'INVALID_FORMAT'
  | 'INVALID_VALUE'
  | 'UNKNOWN_TYPE'
  | 'VERSION_MISMATCH';

// --- Main Validator ---

/**
 * Validate a message envelope structure and payload.
 */
export function validateEnvelope<T>(envelope: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Check envelope is an object
  if (!envelope || typeof envelope !== 'object') {
    return {
      valid: false,
      errors: [{
        field: 'envelope',
        message: 'Envelope must be an object',
        code: 'INVALID_TYPE',
      }],
    };
  }

  const env = envelope as Record<string, unknown>;

  // Validate required fields
  validateRequired(env, 'id', 'string', errors);
  validateRequired(env, 'from', 'string', errors);
  validateRequired(env, 'to', 'string', errors);
  validateRequired(env, 'type', 'string', errors);
  validateRequired(env, 'payload', 'object', errors);
  validateRequired(env, 'timestamp', 'string', errors);
  validateRequired(env, 'version', 'string', errors);

  // Validate UUID format for id
  if (typeof env.id === 'string' && !isValidUUID(env.id)) {
    errors.push({
      field: 'id',
      message: 'ID must be a valid UUID',
      code: 'INVALID_FORMAT',
    });
  }

  // Validate ISO 8601 timestamp
  if (typeof env.timestamp === 'string' && !isValidISO8601(env.timestamp)) {
    errors.push({
      field: 'timestamp',
      message: 'Timestamp must be ISO 8601 format',
      code: 'INVALID_FORMAT',
    });
  }

  // Validate version compatibility
  if (typeof env.version === 'string') {
    const [major] = env.version.split('.');
    const [currentMajor] = MESSAGE_VERSION.split('.');
    if (major !== currentMajor) {
      errors.push({
        field: 'version',
        message: `Version ${env.version} incompatible with ${MESSAGE_VERSION}`,
        code: 'VERSION_MISMATCH',
      });
    }
  }

  // Validate message type
  if (typeof env.type === 'string' && !isValidMessageType(env.type)) {
    errors.push({
      field: 'type',
      message: `Unknown message type: ${env.type}`,
      code: 'UNKNOWN_TYPE',
    });
  }

  // Validate payload based on message type
  if (typeof env.type === 'string' && env.payload && typeof env.payload === 'object') {
    const payloadErrors = validatePayload(env.type as MessageType, env.payload as Record<string, unknown>);
    errors.push(...payloadErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// --- Payload Validators ---

function validatePayload(type: MessageType, payload: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (type) {
    case 'feedback.submitted':
    case 'feedback.processed':
      validateFeedbackPayload(payload, errors);
      break;

    case 'request.chat':
      validateChatRequestPayload(payload, errors);
      break;

    case 'response.chat':
      validateChatResponsePayload(payload, errors);
      break;

    case 'session.started':
    case 'session.ended':
    case 'session.updated':
      validateSessionPayload(payload, errors);
      break;

    case 'optimization.started':
    case 'optimization.completed':
    case 'optimization.failed':
      validateOptimizationPayload(payload, errors);
      break;

    case 'task.assigned':
    case 'task.started':
    case 'task.completed':
    case 'task.blocked':
    case 'task.handoff':
      validateTaskPayload(payload, errors);
      break;

    case 'knowledge.uploaded':
    case 'knowledge.embedded':
    case 'knowledge.deleted':
      validateKnowledgePayload(payload, errors);
      break;
  }

  return errors;
}

function validateFeedbackPayload(payload: Record<string, unknown>, errors: ValidationError[]): void {
  validateRequired(payload, 'session_id', 'string', errors, 'payload.');

  if (payload.rating !== undefined) {
    if (payload.rating !== 'thumbs_up' && payload.rating !== 'thumbs_down') {
      errors.push({
        field: 'payload.rating',
        message: 'Rating must be "thumbs_up" or "thumbs_down"',
        code: 'INVALID_VALUE',
      });
    }
  }

  if (payload.rating_value !== undefined) {
    const value = payload.rating_value as number;
    if (typeof value !== 'number' || value < 1 || value > 5) {
      errors.push({
        field: 'payload.rating_value',
        message: 'Rating value must be between 1 and 5',
        code: 'INVALID_VALUE',
      });
    }
  }

  if (payload.context !== undefined && typeof payload.context !== 'object') {
    errors.push({
      field: 'payload.context',
      message: 'Context must be an object',
      code: 'INVALID_TYPE',
    });
  }
}

function validateChatRequestPayload(payload: Record<string, unknown>, errors: ValidationError[]): void {
  validateRequired(payload, 'session_id', 'string', errors, 'payload.');
  validateRequired(payload, 'message', 'string', errors, 'payload.');
}

function validateChatResponsePayload(payload: Record<string, unknown>, errors: ValidationError[]): void {
  validateRequired(payload, 'session_id', 'string', errors, 'payload.');
  validateRequired(payload, 'message_id', 'string', errors, 'payload.');
  validateRequired(payload, 'content', 'string', errors, 'payload.');
}

function validateSessionPayload(payload: Record<string, unknown>, errors: ValidationError[]): void {
  validateRequired(payload, 'session_id', 'string', errors, 'payload.');
  validateRequired(payload, 'user_id', 'string', errors, 'payload.');
  validateRequired(payload, 'agent_type', 'string', errors, 'payload.');

  if (payload.agent_type !== undefined) {
    if (payload.agent_type !== 'sage' && payload.agent_type !== 'lexi') {
      errors.push({
        field: 'payload.agent_type',
        message: 'Agent type must be "sage" or "lexi"',
        code: 'INVALID_VALUE',
      });
    }
  }
}

function validateOptimizationPayload(payload: Record<string, unknown>, errors: ValidationError[]): void {
  validateRequired(payload, 'agent_type', 'string', errors, 'payload.');

  if (payload.agent_type !== undefined) {
    if (payload.agent_type !== 'sage' && payload.agent_type !== 'lexi') {
      errors.push({
        field: 'payload.agent_type',
        message: 'Agent type must be "sage" or "lexi"',
        code: 'INVALID_VALUE',
      });
    }
  }
}

function validateTaskPayload(payload: Record<string, unknown>, errors: ValidationError[]): void {
  validateRequired(payload, 'task_id', 'string', errors, 'payload.');
}

function validateKnowledgePayload(payload: Record<string, unknown>, errors: ValidationError[]): void {
  validateRequired(payload, 'file_id', 'string', errors, 'payload.');
  validateRequired(payload, 'filename', 'string', errors, 'payload.');
  validateRequired(payload, 'namespace', 'string', errors, 'payload.');
}

// --- Utility Functions ---

function validateRequired(
  obj: Record<string, unknown>,
  field: string,
  expectedType: string,
  errors: ValidationError[],
  prefix = ''
): void {
  const value = obj[field];

  if (value === undefined || value === null) {
    errors.push({
      field: `${prefix}${field}`,
      message: `${field} is required`,
      code: 'REQUIRED_FIELD',
    });
    return;
  }

  const actualType = typeof value;
  if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value))) {
    errors.push({
      field: `${prefix}${field}`,
      message: `${field} must be an object`,
      code: 'INVALID_TYPE',
    });
  } else if (expectedType !== 'object' && actualType !== expectedType) {
    errors.push({
      field: `${prefix}${field}`,
      message: `${field} must be a ${expectedType}`,
      code: 'INVALID_TYPE',
    });
  }
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidISO8601(str: string): boolean {
  const date = new Date(str);
  return !isNaN(date.getTime()) && str.includes('T');
}

const VALID_MESSAGE_TYPES: Set<string> = new Set([
  'feedback.submitted',
  'feedback.processed',
  'request.chat',
  'request.action',
  'response.chat',
  'response.action',
  'session.started',
  'session.ended',
  'session.updated',
  'optimization.started',
  'optimization.completed',
  'optimization.failed',
  'task.assigned',
  'task.started',
  'task.completed',
  'task.blocked',
  'task.handoff',
  'knowledge.uploaded',
  'knowledge.embedded',
  'knowledge.deleted',
  'system.health',
  'system.error',
  'system.metric',
]);

function isValidMessageType(type: string): boolean {
  return VALID_MESSAGE_TYPES.has(type);
}

// --- Type Guards ---

/**
 * Type guard for FeedbackPayload.
 */
export function isFeedbackPayload(payload: unknown): payload is FeedbackPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.session_id === 'string' &&
    (p.rating === 'thumbs_up' || p.rating === 'thumbs_down' || p.rating === undefined);
}

/**
 * Type guard for ChatRequestPayload.
 */
export function isChatRequestPayload(payload: unknown): payload is ChatRequestPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.session_id === 'string' && typeof p.message === 'string';
}

/**
 * Type guard for ChatResponsePayload.
 */
export function isChatResponsePayload(payload: unknown): payload is ChatResponsePayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.session_id === 'string' &&
    typeof p.message_id === 'string' &&
    typeof p.content === 'string';
}

/**
 * Type guard for SessionPayload.
 */
export function isSessionPayload(payload: unknown): payload is SessionPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.session_id === 'string' &&
    typeof p.user_id === 'string' &&
    (p.agent_type === 'sage' || p.agent_type === 'lexi');
}

/**
 * Type guard for TaskPayload.
 */
export function isTaskPayload(payload: unknown): payload is TaskPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.task_id === 'string';
}

/**
 * Type guard for KnowledgePayload.
 */
export function isKnowledgePayload(payload: unknown): payload is KnowledgePayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.file_id === 'string' &&
    typeof p.filename === 'string' &&
    typeof p.namespace === 'string';
}
