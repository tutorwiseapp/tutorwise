/*
 * Filename: src/lib/stripe/payouts.ts
 * Purpose: Stripe Connect payout helper functions (SDD v4.9)
 * Created: 2025-11-11
 * Specification: SDD v4.9, Section 3.3 - Stripe Connect Payout Integration
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  error?: string;
  estimatedArrival?: Date;
}

/**
 * Creates a payout to a Stripe Connect account
 * @param connectAccountId - The Stripe Connect account ID
 * @param amount - Amount in GBP (will be converted to pence)
 * @param description - Description for the payout
 * @returns PayoutResult
 */
export async function createConnectPayout(
  connectAccountId: string,
  amount: number,
  description: string
): Promise<PayoutResult> {
  try {
    // Convert amount from GBP to pence (Stripe uses smallest currency unit)
    const amountInPence = Math.round(amount * 100);

    // Create a payout to the Connect account
    const payout = await stripe.payouts.create(
      {
        amount: amountInPence,
        currency: 'gbp',
        description: description,
        statement_descriptor: 'TUTORWISE PAYOUT',
      },
      {
        stripeAccount: connectAccountId, // This makes the payout go to the Connect account
      }
    );

    // Calculate estimated arrival date (typically 2-3 business days)
    const estimatedArrival = new Date();
    estimatedArrival.setDate(estimatedArrival.getDate() + 3);

    return {
      success: true,
      payoutId: payout.id,
      estimatedArrival,
    };
  } catch (error) {
    console.error('Stripe payout creation error:', error);

    let errorMessage = 'Failed to create payout';
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message;
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

    let errorMessage = 'Failed to retrieve payout status';
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message;
    }

    return {
      status: 'failed',
      error: errorMessage,
    };
  }
}

/**
 * Checks if a Connect account is ready to receive payouts
 * @param connectAccountId - The Stripe Connect account ID
 * @returns Boolean indicating if account can receive payouts
 */
export async function canReceivePayouts(
  connectAccountId: string
): Promise<{ ready: boolean; reason?: string }> {
  try {
    const account = await stripe.accounts.retrieve(connectAccountId);

    // Check if payouts are enabled
    if (!account.payouts_enabled) {
      return {
        ready: false,
        reason: 'Account not yet verified for payouts',
      };
    }

    // Check if account has external accounts (bank account/debit card)
    if (!account.external_accounts || account.external_accounts.data.length === 0) {
      return {
        ready: false,
        reason: 'No bank account connected',
      };
    }

    return { ready: true };
  } catch (error) {
    console.error('Stripe account check error:', error);

    let errorMessage = 'Failed to verify account status';
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message;
    }

    return {
      ready: false,
      reason: errorMessage,
    };
  }
}
