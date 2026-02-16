/**
 * Agent Context System
 *
 * Provides context-aware execution for CAS agents, enabling them to behave
 * differently based on whether they're operating in admin mode (internal dev)
 * or user mode (Lexi-facing operations).
 *
 * @module cas/core/context
 */

// --- Context Mode Types ---

export type ContextMode = 'admin' | 'user';

export type UserRole = 'agent' | 'tutor' | 'client' | 'student' | 'organisation';

export interface UserInfo {
  id: string;
  role: UserRole;
  organisationId?: string;
  permissions: string[];
  metadata?: Record<string, unknown>;
}

export interface SessionInfo {
  sessionId: string;
  startedAt: Date;
  lastActivityAt: Date;
  deviceType?: 'web' | 'mobile' | 'api';
  locale?: string;
  timezone?: string;
}

// --- Agent Context Interface ---

export interface AgentContext {
  /** Operating mode: 'admin' for internal dev, 'user' for Lexi-facing */
  mode: ContextMode;

  /** User information when in user mode */
  user?: UserInfo;

  /** Session information for tracking */
  session?: SessionInfo;

  /** Request tracing ID for logging */
  traceId: string;

  /** Parent context if this is a nested operation */
  parentContext?: AgentContext;

  /** Feature flags for this context */
  features?: Record<string, boolean>;

  /** Additional context-specific data */
  metadata?: Record<string, unknown>;
}

// --- Context Factory ---

/**
 * Creates an admin context for internal CAS operations
 */
export function createAdminContext(options?: {
  traceId?: string;
  metadata?: Record<string, unknown>;
}): AgentContext {
  return {
    mode: 'admin',
    traceId: options?.traceId || generateTraceId(),
    metadata: options?.metadata,
  };
}

/**
 * Creates a user context for Lexi-facing operations
 */
export function createUserContext(options: {
  user: UserInfo;
  session?: SessionInfo;
  traceId?: string;
  features?: Record<string, boolean>;
  metadata?: Record<string, unknown>;
}): AgentContext {
  return {
    mode: 'user',
    user: options.user,
    session: options.session || createSession(),
    traceId: options.traceId || generateTraceId(),
    features: options.features,
    metadata: options.metadata,
  };
}

/**
 * Creates a child context inheriting from a parent
 */
export function createChildContext(
  parent: AgentContext,
  overrides?: Partial<AgentContext>
): AgentContext {
  return {
    ...parent,
    ...overrides,
    parentContext: parent,
    traceId: overrides?.traceId || `${parent.traceId}.${generateShortId()}`,
  };
}

// --- Context Guards ---

/**
 * Type guard to check if context is in admin mode
 */
export function isAdminContext(ctx: AgentContext): boolean {
  return ctx.mode === 'admin';
}

/**
 * Type guard to check if context is in user mode
 */
export function isUserContext(ctx: AgentContext): ctx is AgentContext & { user: UserInfo } {
  return ctx.mode === 'user' && ctx.user !== undefined;
}

/**
 * Check if user has a specific role
 */
export function hasRole(ctx: AgentContext, role: UserRole): boolean {
  return isUserContext(ctx) && ctx.user.role === role;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(ctx: AgentContext, permission: string): boolean {
  if (isAdminContext(ctx)) return true; // Admin has all permissions
  return isUserContext(ctx) && ctx.user.permissions.includes(permission);
}

/**
 * Check if a feature flag is enabled for this context
 */
export function isFeatureEnabled(ctx: AgentContext, feature: string): boolean {
  return ctx.features?.[feature] ?? false;
}

// --- Context Utilities ---

/**
 * Extract user role from context, returns 'admin' for admin contexts
 */
export function getContextRole(ctx: AgentContext): UserRole | 'admin' {
  if (isAdminContext(ctx)) return 'admin';
  return ctx.user?.role || 'client';
}

/**
 * Get organisation ID if available
 */
export function getOrganisationId(ctx: AgentContext): string | undefined {
  return isUserContext(ctx) ? ctx.user.organisationId : undefined;
}

/**
 * Create audit log entry from context
 */
export function createAuditEntry(
  ctx: AgentContext,
  action: string,
  details?: Record<string, unknown>
): {
  traceId: string;
  mode: ContextMode;
  userId?: string;
  role?: UserRole | 'admin';
  organisationId?: string;
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
} {
  return {
    traceId: ctx.traceId,
    mode: ctx.mode,
    userId: ctx.user?.id,
    role: getContextRole(ctx),
    organisationId: getOrganisationId(ctx),
    action,
    timestamp: new Date().toISOString(),
    details,
  };
}

// --- Private Helpers ---

function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `ctx_${timestamp}_${random}`;
}

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 6);
}

function createSession(): SessionInfo {
  const now = new Date();
  return {
    sessionId: `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
    startedAt: now,
    lastActivityAt: now,
  };
}

// --- Role-Based Access Control ---

export interface RBACConfig {
  role: UserRole;
  allowedOperations: string[];
  deniedOperations?: string[];
}

const DEFAULT_RBAC: Record<UserRole, RBACConfig> = {
  agent: {
    role: 'agent',
    allowedOperations: ['*'], // Full access
  },
  tutor: {
    role: 'tutor',
    allowedOperations: [
      // Resource-based permissions
      'lesson:*',
      'resource:read',
      'resource:create',
      'student:read',
      'booking:*',
      'feedback:read',
      'analytics:own',
      // Lexi intent-based permissions (scheduling, billing, etc.)
      'scheduling:*',
      'billing:*',
      'progress:*',
      'marketplace:*',
      'resources:*',
      'credibility:*',
      'network:*',
      'account:*',
      'organisation:*',
      'virtualspace:*',
      'edupay:*',
      'referrals:*',
      'support:*',
      'learning:*',
      'general:*',
    ],
  },
  client: {
    role: 'client',
    allowedOperations: [
      // Resource-based permissions
      'tutor:search',
      'tutor:view',
      'booking:create',
      'booking:read:own',
      'booking:cancel:own',
      'payment:own',
      'review:create',
      // Lexi intent-based permissions
      'scheduling:*',
      'billing:view',
      'billing:transactions',
      'progress:*',
      'marketplace:*',
      'resources:access',
      'credibility:view',
      'network:*',
      'account:*',
      'virtualspace:*',
      'edupay:*',
      'referrals:*',
      'support:*',
      'learning:*',
      'feedback:*',
      'general:*',
    ],
  },
  student: {
    role: 'student',
    allowedOperations: [
      // Resource-based permissions
      'lesson:attend',
      'resource:read:assigned',
      'progress:read:own',
      'feedback:create',
      // Lexi intent-based permissions
      'scheduling:*',
      'billing:view',
      'progress:*',
      'marketplace:*',
      'resources:access',
      'credibility:view',
      'network:*',
      'account:*',
      'virtualspace:*',
      'edupay:*',
      'referrals:*',
      'support:*',
      'learning:*',
      'feedback:*',
      'general:*',
    ],
  },
  organisation: {
    role: 'organisation',
    allowedOperations: [
      // Resource-based permissions
      'tutor:manage',
      'student:manage',
      'analytics:org',
      'billing:org',
      'settings:org',
      // Lexi intent-based permissions
      'scheduling:*',
      'billing:*',
      'progress:*',
      'marketplace:*',
      'resources:*',
      'credibility:*',
      'network:*',
      'account:*',
      'organisation:*',
      'virtualspace:*',
      'edupay:*',
      'referrals:*',
      'support:*',
      'learning:*',
      'general:*',
    ],
  },
};

/**
 * Check if an operation is allowed for the given context
 */
export function isOperationAllowed(ctx: AgentContext, operation: string): boolean {
  // Admin mode allows everything
  if (isAdminContext(ctx)) return true;

  if (!isUserContext(ctx)) return false;

  const rbac = DEFAULT_RBAC[ctx.user.role];
  if (!rbac) return false;

  // Check denied operations first
  if (rbac.deniedOperations?.some(op => matchOperation(operation, op))) {
    return false;
  }

  // Check allowed operations
  return rbac.allowedOperations.some(op => matchOperation(operation, op));
}

/**
 * Match operation against pattern (supports wildcards)
 */
function matchOperation(operation: string, pattern: string): boolean {
  if (pattern === '*') return true;

  const [resource, action] = operation.split(':');
  const [patternResource, patternAction] = pattern.split(':');

  const resourceMatch = patternResource === '*' || patternResource === resource;
  const actionMatch = !patternAction || patternAction === '*' || patternAction === action;

  return resourceMatch && actionMatch;
}

export default {
  createAdminContext,
  createUserContext,
  createChildContext,
  isAdminContext,
  isUserContext,
  hasRole,
  hasPermission,
  isFeatureEnabled,
  isOperationAllowed,
  getContextRole,
  getOrganisationId,
  createAuditEntry,
};
