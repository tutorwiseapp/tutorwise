/**
 * Filename: apps/web/src/lib/truelayer/webhook.ts
 * Purpose: TrueLayer webhook signature verification and event types
 * Created: 2026-02-10
 *
 * Full ES512 JWT verification is required for live mode.
 * In sandbox / stub mode this always returns true.
 * TODO: Implement full JWS verification (ES512) when going live:
 *   - Fetch TrueLayer JWKS from https://webhooks.truelayer.com/.well-known/jwks
 *   - Verify the Tl-Signature header using the jose library
 */

// ============================================================================
// Types
// ============================================================================

export type TruelayerPaymentEventType =
  | 'payment_executed'
  | 'payment_failed'
  | 'payment_settled'
  | 'payment_authorized';

export interface TruelayerPaymentEvent {
  type: TruelayerPaymentEventType;
  event_id: string;
  event_version: number;
  payload: {
    payment_id: string;
    payment_source?: {
      account_holder_name?: string;
    };
    failed_at?: string;
    executed_at?: string;
    settled_at?: string;
  };
}

// ============================================================================
// Verification
// ============================================================================

/**
 * Verifies the TrueLayer webhook signature.
 *
 * Sandbox / stub mode: always returns true (no real signing key).
 * Live mode: TODO implement ES512 JWS verification.
 */
export async function verifyTruelayerWebhook(
  _body: string,
  _signature: string | null
): Promise<boolean> {
  const environment = process.env.TRUELAYER_ENVIRONMENT ?? 'sandbox';

  if (environment === 'sandbox') {
    // Sandbox webhooks are not signed — accept all
    return true;
  }

  // TODO: Live verification
  // 1. Fetch https://webhooks.truelayer.com/.well-known/jwks
  // 2. Parse Tl-Signature JWT header to get kid
  // 3. Verify ES512 signature using matching public key
  // 4. Return true only if valid
  console.warn('[TrueLayer Webhook] Live signature verification not yet implemented');
  return false;
}
