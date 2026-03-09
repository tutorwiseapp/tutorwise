/**
 * NodeHandlerRegistry
 *
 * Maps handler name strings (e.g. "stripe.connect_payout") to integration functions.
 * Enforces:
 *  - Shadow mode: returns { shadowed: true } without calling any external system
 *  - Idempotency keys: required for all stripe.* handlers (prevents double-charging)
 *
 * Design doc: fuchsia/process-execution-solution-design.md §4.3
 */

import { handleCaasScore } from './handlers/caas';
import { handleRulesEvaluate } from './handlers/rules';
import { handleProfileActivate } from './handlers/profile';
import { handleNotificationSend } from './handlers/notification';
import {
  handleCommissionQueryAvailable,
  handleCommissionCreate,
  handleCommissionVoid,
} from './handlers/commission';
import {
  handleStripeCharge,
  handleStripeRefund,
  handleStripeValidateConnectAccount,
  handleStripeConnectPayout,
} from './handlers/stripe';
import { handleSessionCreate, handleSessionWait } from './handlers/session';
import { handleAiAgentInvoke } from './handlers/ai-agent';
import { handleReviewRequest } from './handlers/review';
import { handleSchedulingNegotiate } from './handlers/scheduling';
import { handleReferralAttribute, handleReferralUpdateStatus } from './handlers/referral';
import { handleCasAgent } from './handlers/cas-agent';

export type HandlerContext = Record<string, unknown>;

export interface HandlerOptions {
  executionId: string;
  nodeId: string;
  executionMode: string;      // 'design' | 'shadow' | 'live'
  idempotencyKey?: string;
  handlerConfig?: Record<string, unknown>;
}

type HandlerFn = (
  context: HandlerContext,
  opts: HandlerOptions
) => Promise<Record<string, unknown>>;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const HANDLERS: Record<string, HandlerFn> = {
  // Phase 1 — Tutor Approval + Commission Payout
  'caas.score': handleCaasScore,
  'rules.evaluate': handleRulesEvaluate,
  'profile.activate': handleProfileActivate,
  'notification.send': handleNotificationSend,
  'commission.query_available': handleCommissionQueryAvailable,
  'stripe.validate_connect_account': handleStripeValidateConnectAccount,
  'stripe.connect_payout': handleStripeConnectPayout,

  // Phase 3 — Booking Lifecycle (shadow mode)
  'stripe.charge': handleStripeCharge,
  'stripe.refund': handleStripeRefund,
  'session.create': handleSessionCreate,
  'session.wait': handleSessionWait,
  'ai_agent.invoke': handleAiAgentInvoke,
  'review.request': handleReviewRequest,
  'commission.create': handleCommissionCreate,
  'commission.void': handleCommissionVoid,
  'scheduling.negotiate': handleSchedulingNegotiate,
  'referral.attribute': handleReferralAttribute,
  'referral.update_status': handleReferralUpdateStatus,

  // Phase 2 — Agent + Team nodes
  'cas_agent': handleCasAgent,
};

// ---------------------------------------------------------------------------
// Handlers that require idempotency keys (never call without one)
// ---------------------------------------------------------------------------

const IDEMPOTENCY_REQUIRED = new Set(['stripe.connect_payout', 'stripe.charge', 'stripe.refund']);

// ---------------------------------------------------------------------------
// NodeHandlerRegistry class
// ---------------------------------------------------------------------------

export class NodeHandlerRegistry {
  async execute(
    handlerName: string,
    context: HandlerContext,
    opts: HandlerOptions
  ): Promise<Record<string, unknown>> {
    // Shadow mode: record intent without calling any external system
    if (opts.executionMode === 'shadow') {
      console.log(`[NodeHandlerRegistry] Shadow: would execute "${handlerName}"`);
      return { shadowed: true, intended_handler: handlerName };
    }

    // Enforce idempotency keys for payment handlers
    if (IDEMPOTENCY_REQUIRED.has(handlerName) && !opts.idempotencyKey) {
      throw new Error(
        `NodeHandlerRegistry: idempotency key is required for handler "${handlerName}". ` +
        `Key format: {execution_id}:{node_id}:{attempt}`
      );
    }

    const handler = HANDLERS[handlerName];

    if (!handler) {
      throw new Error(
        `NodeHandlerRegistry: unknown handler "${handlerName}". ` +
        `Registered handlers: ${Object.keys(HANDLERS).join(', ')}`
      );
    }

    try {
      const result = await handler(context, opts);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[NodeHandlerRegistry] Handler "${handlerName}" failed:`, message);
      throw err;
    }
  }

  isRegistered(handlerName: string): boolean {
    return handlerName in HANDLERS;
  }

  listHandlers(): string[] {
    return Object.keys(HANDLERS);
  }
}

// Singleton — one registry instance shared across all requests
export const nodeHandlerRegistry = new NodeHandlerRegistry();
