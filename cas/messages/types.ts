/**
 * CAS Message Bus Type Definitions
 *
 * Standardized message envelope for inter-agent communication.
 * Supports Lexi, Sage, and CAS agent communication.
 *
 * @module cas/messages
 */

// --- Message Envelope ---

/**
 * Standardized message envelope for all CAS agent communication.
 * Follows A2A-ready JSON format for future protocol compatibility.
 */
export interface MessageEnvelope<T = unknown> {
  /** Unique message identifier (UUID v4) */
  id: string;

  /** Source agent identifier */
  from: AgentIdentifier;

  /** Target agent identifier */
  to: AgentIdentifier;

  /** Message type categorization */
  type: MessageType;

  /** Typed payload based on message type */
  payload: T;

  /** Request/response correlation ID for async matching */
  correlation_id?: string;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Protocol version for backwards compatibility */
  version: string;

  /** Optional metadata for tracing and debugging */
  metadata?: MessageMetadata;
}

// --- Agent Identifiers ---

/**
 * Agent identifier types.
 * Format: "{system}:{agent}" for namespacing.
 */
export type AgentIdentifier =
  | 'lexi'                    // Lexi platform assistant
  | 'sage'                    // Sage AI tutor
  | 'cas:planner'             // CAS Planner agent
  | 'cas:analyst'             // CAS Analyst agent
  | 'cas:developer'           // CAS Developer agent
  | 'cas:tester'              // CAS Tester agent
  | 'cas:qa'                  // CAS QA agent
  | 'cas:security'            // CAS Security agent
  | 'cas:engineer'            // CAS Engineer agent
  | 'cas:marketer'            // CAS Marketer agent
  | 'cas:optimization'        // DSPy optimization service
  | 'external:user'           // End user (for feedback)
  | 'external:webhook'        // External webhook
  | string;                   // Custom agent identifiers

// --- Message Types ---

/**
 * Categorization of message types.
 */
export type MessageType =
  // Feedback messages (user → agent)
  | 'feedback.submitted'
  | 'feedback.processed'

  // Request/Response patterns
  | 'request.chat'
  | 'request.action'
  | 'response.chat'
  | 'response.action'

  // Session lifecycle
  | 'session.started'
  | 'session.ended'
  | 'session.updated'

  // Optimization events
  | 'optimization.started'
  | 'optimization.completed'
  | 'optimization.failed'

  // CAS agent events
  | 'task.assigned'
  | 'task.started'
  | 'task.completed'
  | 'task.blocked'
  | 'task.handoff'

  // Knowledge events
  | 'knowledge.uploaded'
  | 'knowledge.embedded'
  | 'knowledge.deleted'

  // System events
  | 'system.health'
  | 'system.error'
  | 'system.metric';

// --- Payload Types ---

/**
 * Feedback payload for user feedback messages.
 */
export interface FeedbackPayload {
  session_id: string;
  message_id?: string;
  rating: 'thumbs_up' | 'thumbs_down';
  rating_value?: number;  // 1-5 scale
  comment?: string;
  context: FeedbackContext;
}

export interface FeedbackContext {
  agent_type: 'sage' | 'lexi';
  persona?: string;
  subject?: string;
  level?: string;
  topic?: string;
  user_role?: string;
}

/**
 * Chat request payload.
 */
export interface ChatRequestPayload {
  session_id: string;
  message: string;
  context?: Record<string, unknown>;
  stream?: boolean;
}

/**
 * Chat response payload.
 */
export interface ChatResponsePayload {
  session_id: string;
  message_id: string;
  content: string;
  suggestions?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Session event payload.
 */
export interface SessionPayload {
  session_id: string;
  user_id: string;
  agent_type: 'sage' | 'lexi';
  persona?: string;
  context?: Record<string, unknown>;
}

/**
 * Optimization event payload.
 */
export interface OptimizationPayload {
  agent_type: 'sage' | 'lexi';
  signature?: string;
  metrics?: {
    before: number;
    after: number;
    improvement: number;
  };
  samples_used?: number;
  error?: string;
}

/**
 * Task event payload (CAS agents).
 */
export interface TaskPayload {
  task_id: string;
  feature?: string;
  assigned_to?: AgentIdentifier;
  assigned_by?: AgentIdentifier;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  blocker_reason?: string;
  deliverables?: string[];
}

/**
 * Knowledge event payload.
 */
export interface KnowledgePayload {
  file_id: string;
  filename: string;
  namespace: string;
  subject?: string;
  level?: string;
  chunk_count?: number;
  embedding_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

// --- Metadata ---

export interface MessageMetadata {
  /** Trace ID for distributed tracing */
  trace_id?: string;

  /** Span ID for distributed tracing */
  span_id?: string;

  /** Parent span ID */
  parent_span_id?: string;

  /** Priority level (1-10, 1 = highest) */
  priority?: number;

  /** Time-to-live in milliseconds */
  ttl_ms?: number;

  /** Retry count for failed deliveries */
  retry_count?: number;

  /** Original timestamp if retried */
  original_timestamp?: string;

  /** Custom key-value pairs */
  custom?: Record<string, unknown>;
}

// --- Constants ---

/** Current message protocol version */
export const MESSAGE_VERSION = '1.0.0';

/** Default TTL for messages (1 hour) */
export const DEFAULT_TTL_MS = 60 * 60 * 1000;

/** Maximum retry attempts */
export const MAX_RETRY_COUNT = 3;
