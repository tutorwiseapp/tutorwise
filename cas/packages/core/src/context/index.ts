/**
 * Context Module
 *
 * Exports context-aware execution utilities for CAS agents.
 */

export {
  // Types
  type ContextMode,
  type UserRole,
  type UserInfo,
  type SessionInfo,
  type AgentContext,
  type RBACConfig,

  // Factory functions
  createAdminContext,
  createUserContext,
  createChildContext,

  // Guards
  isAdminContext,
  isUserContext,
  hasRole,
  hasPermission,
  isFeatureEnabled,
  isOperationAllowed,

  // Utilities
  getContextRole,
  getOrganisationId,
  createAuditEntry,
} from './agent-context';
