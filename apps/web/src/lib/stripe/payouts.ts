/*
 * Filename: src/lib/stripe/payouts.ts
 * Purpose: Stripe Connect payout helper functions (SDD v4.9)
 * Created: 2025-11-11
 * Updated: 2025-11-11 - Production hardening with comprehensive error handling
 * Specification: SDD v4.9, Section 3.3 - Stripe Connect Payout Integration
 *
 * CRITICAL: This module handles real money transfers. All operations must be:
 * - Idempotent
 * - Properly logged
 * - Error resilient
 * - Auditable
 */

import { stripe, getStripeErrorMessage, isStripeError, PAYMENT_CONSTANTS, type Stripe } from './client';

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  error?: string;
  estimatedArrival?: Date;
}

/**
 * Creates a payout to a Stripe Connect account
 *
 * CRITICAL OPERATION: This transfers real money.
 *
 * Safety measures:
 * - Validates amount bounds
 * - Converts currency correctly
 * - Logs all operations
 * - Returns detailed error information
 *
 * @param connectAccountId - The Stripe Connect account ID
 * @param amount - Amount in GBP (will be converted to pence)
 * @param description - Description for the payout
 * @param idempotencyKey - Optional idempotency key to prevent duplicate payouts
 * @returns PayoutResult
 */
export async function createConnectPayout(
  connectAccountId: string,
  amount: number,
  description: string,
  idempotencyKey?: string
): Promise<PayoutResult> {
  // Input validation
  if (!connectAccountId || !connectAccountId.startsWith('acct_')) {
    console.error('[PAYOUT] Invalid Connect account ID:', connectAccountId);
    return {
      success: false,
      error: 'Invalid Stripe Connect account ID',
    };
  }

  if (amount < PAYMENT_CONSTANTS.MIN_WITHDRAWAL_AMOUNT) {
    return {
      success: false,
      error: `Minimum withdrawal amount is £${PAYMENT_CONSTANTS.MIN_WITHDRAWAL_AMOUNT}`,
    };
  }

  if (amount > PAYMENT_CONSTANTS.MAX_WITHDRAWAL_AMOUNT) {
    return {
      success: false,
      error: `Maximum withdrawal amount is £${PAYMENT_CONSTANTS.MAX_WITHDRAWAL_AMOUNT}`,
    };
  }

  try {
    console.log('[PAYOUT] Initiating payout:', {
      account: connectAccountId.slice(0, 15) + '...',
      amount: `£${amount.toFixed(2)}`,
      hasIdempotencyKey: !!idempotencyKey,
    });

    // Convert amount from GBP to pence (Stripe uses smallest currency unit)
    const amountInPence = Math.round(amount * 100);

    // Validate conversion
    if (amountInPence <= 0 || !Number.isInteger(amountInPence)) {
      console.error('[PAYOUT] Invalid amount after conversion:', amountInPence);
      return {
        success: false,
        error: 'Invalid payment amount',
      };
    }

    // Prepare request options with idempotency
    const requestOptions: Stripe.RequestOptions = {
      stripeAccount: connectAccountId,
    };

    if (idempotencyKey) {
      requestOptions.idempotencyKey = idempotencyKey;
    }

    // Create a payout to the Connect account
    const payout = await stripe.payouts.create(
      {
        amount: amountInPence,
        currency: PAYMENT_CONSTANTS.CURRENCY,
        description: description,
        statement_descriptor: PAYMENT_CONSTANTS.PAYOUT_DESCRIPTOR,
      },
      requestOptions
    );

    console.log('[PAYOUT] Success:', {
      payoutId: payout.id,
      status: payout.status,
      arrival_date: payout.arrival_date,
    });

    // Calculate estimated arrival date
    const estimatedArrival = payout.arrival_date
      ? new Date(payout.arrival_date * 1000)
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // Default 3 days

    return {
      success: true,
      payoutId: payout.id,
      estimatedArrival,
    };
  } catch (error) {
    console.error('[PAYOUT] Error:', error);

    const errorMessage = getStripeErrorMessage(error);

    // Log specific error types for debugging
    if (isStripeError(error)) {
      console.error('[PAYOUT] Stripe error details:', {
        type: error.type,
        code: error.code,
        decline_code: error.decline_code,
        param: error.param,
      });
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Retrieves the status of a payout
 * @param payoutId - The Stripe payout ID
 * @param connectAccountId - The Stripe Connect account ID
 * @returns Payout status information
 */
export async function getPayoutStatus(
  payoutId: string,
  connectAccountId: string
): Promise<{ status: string; arrivalDate?: Date; error?: string }> {
  try {
    const payout = await stripe.payouts.retrieve(payoutId, {
      stripeAccount: connectAccountId,
    });

    return {
      status: payout.status,
      arrivalDate: payout.arrival_date
        ? new Date(payout.arrival_date * 1000)
        : undefined,
    };
  } catch (error) {
    console.error('Stripe payout retrieval error:', error);

    const errorMessage = getStripeErrorMessage(error);

    return {
      status: 'failed',
      error: errorMessage,
    };
  }
}

/**
 * Checks if a Connect account is ready to receive payouts
 *
 * Validation checks:
 * - Account exists
 * - Payouts are enabled
 * - Has connected bank account
 * - No holds or restrictions
 *
 * @param connectAccountId - The Stripe Connect account ID
 * @returns Object with ready status and reason if not ready
 */
export async function canReceivePayouts(
  connectAccountId: string
): Promise<{ ready: boolean; reason?: string }> {
  // Input validation
  if (!connectAccountId || !connectAccountId.startsWith('acct_')) {
    console.error('[PAYOUT_CHECK] Invalid Connect account ID:', connectAccountId);
    return {
      ready: false,
      reason: 'Invalid Stripe Connect account ID',
    };
  }

  try {
    console.log('[PAYOUT_CHECK] Verifying account:', connectAccountId.slice(0, 15) + '...');

    const account = await stripe.accounts.retrieve(connectAccountId);

    // Check if payouts are enabled
    if (!account.payouts_enabled) {
      console.warn('[PAYOUT_CHECK] Payouts not enabled');
      return {
        ready: false,
        reason: 'Account verification incomplete. Please complete your Stripe onboarding.',
      };
    }

    // Check if account has external accounts (bank account/debit card)
    if (!account.external_accounts || account.external_accounts.data.length === 0) {
      console.warn('[PAYOUT_CHECK] No external accounts');
      return {
        ready: false,
        reason: 'No bank account connected. Please add a bank account in your Stripe dashboard.',
      };
    }

    // Check for any requirements that need attention
    if (account.requirements) {
      const { currently_due, eventually_due: _eventually_due, past_due } = account.requirements;

      if (past_due && past_due.length > 0) {
        console.warn('[PAYOUT_CHECK] Past due requirements:', past_due);
        return {
          ready: false,
          reason: 'Account has overdue verification requirements. Please complete verification.',
        };
      }

      if (currently_due && currently_due.length > 0) {
        console.warn('[PAYOUT_CHECK] Current requirements:', currently_due);
        return {
          ready: false,
          reason: 'Additional verification required before payouts can be processed.',
        };
      }
    }

    console.log('[PAYOUT_CHECK] Account verified and ready');
    return { ready: true };
  } catch (error) {
    console.error('[PAYOUT_CHECK] Error:', error);

    const errorMessage = getStripeErrorMessage(error);

    return {
      ready: false,
      reason: errorMessage,
    };
  }
}
