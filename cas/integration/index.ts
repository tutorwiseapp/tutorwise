/**
 * CAS Integration Layer
 *
 * Bridges for connecting Lexi, Sage, and CAS agents
 * through the unified message bus.
 *
 * @module cas/integration
 */

// Lexi Bridge
export {
  LexiBridge,
  lexiBridge,
  type LexiFeedbackEvent,
  type LexiSessionEvent,
  type CASNotification,
} from './lexi-bridge';

// Sage Bridge
export {
  SageBridge,
  sageBridge,
  type SageFeedbackEvent,
  type SageSessionEvent,
  type SageProgressEvent,
} from './sage-bridge';

// --- Unified Integration API ---

import { lexiBridge } from './lexi-bridge';
import { sageBridge } from './sage-bridge';

/**
 * Get status of all integrations
 */
export async function getIntegrationStatus() {
  const [lexiStatus, sageStatus] = await Promise.all([
    lexiBridge.getStatus(),
    sageBridge.getStatus(),
  ]);

  return {
    lexi: lexiStatus,
    sage: sageStatus,
    overall: {
      connected: lexiStatus.connected && sageStatus.connected,
      pendingFeedback: lexiStatus.pendingFeedback + sageStatus.pendingFeedback,
    },
  };
}

/**
 * Initialize all integrations
 */
export function initializeIntegrations(): void {
  console.log('[CAS Integration] Initializing bridges...');

  // Bridges auto-initialize on import
  console.log('[CAS Integration] Lexi bridge ready');
  console.log('[CAS Integration] Sage bridge ready');
}

export default {
  lexiBridge,
  sageBridge,
  getIntegrationStatus,
  initializeIntegrations,
};
