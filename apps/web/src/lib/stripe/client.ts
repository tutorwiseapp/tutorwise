/*
 * Filename: src/lib/stripe/client.ts
 * Purpose: Centralized Stripe client configuration for all server-side operations
 * Created: 2025-11-11
 * Specification: Production-grade Stripe integration with consistent API versioning
 *
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for Stripe configuration.
 * All Stripe operations must import from this file to ensure consistency.
 */

import Stripe from 'stripe';

// Lazy-loaded Stripe instance
let stripeInstance: Stripe | null = null;

/**
 * Get Stripe client instance with lazy initialization
 * Validates environment at runtime, not build time
 */
function getStripeClient(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set in environment variables. ' +
      'Payment processing cannot function without this critical configuration.'
    );
  }

  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // Use library default API version for maximum stability
    // This prevents version mismatch issues across different modules
    typescript: true,

    // Stripe Connect operations can take longer
    timeout: 80000, // 80 seconds

    // Automatic retry with exponential backoff
    maxNetworkRetries: 2,

    // Application info for Stripe dashboard analytics
    appInfo: {
      name: 'Tutorwise',
      version: '1.0.0',
    },
  });

  return stripeInstance;
}

/**
 * Centralized Stripe client instance
 * Lazily initialized to avoid build-time errors
 */
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    const client = getStripeClient();
    return (client as any)[prop];
  },
});

/**
 * Stripe Connect account types
 */
export const CONNECT_ACCOUNT_TYPES = {
  EXPRESS: 'express' as const,
  STANDARD: 'standard' as const,
  CUSTOM: 'custom' as const,
};

/**
 * Payment processing constants
 */
export const PAYMENT_CONSTANTS = {
  // Minimum withdrawal amount in GBP
  MIN_WITHDRAWAL_AMOUNT: 10,

  // Maximum withdrawal amount in GBP (for security)
  MAX_WITHDRAWAL_AMOUNT: 50000,

  // Clearing period in days
  CLEARING_PERIOD_DAYS: 7,

  // Currency
  CURRENCY: 'gbp' as const,

  // Statement descriptors
  PLATFORM_NAME: 'TUTORWISE',
  PAYOUT_DESCRIPTOR: 'TUTORWISE PAYOUT',

  // Stripe processing fees (UK/EU cards)
  // Source: https://stripe.com/gb/pricing
  STRIPE_FEE_PERCENT: 1.5,      // 1.5% for UK/European cards
  STRIPE_FEE_FIXED_GBP: 0.20,   // £0.20 fixed fee
} as const;

/**
 * Stripe error type guards
 */
export function isStripeError(error: unknown): error is Stripe.errors.StripeError {
  return error instanceof Stripe.errors.StripeError;
}

export function isStripeCardError(error: unknown): error is Stripe.errors.StripeCardError {
  return error instanceof Stripe.errors.StripeCardError;
}

export function isStripeInvalidRequestError(error: unknown): error is Stripe.errors.StripeInvalidRequestError {
  return error instanceof Stripe.errors.StripeInvalidRequestError;
}

/**
 * Get human-readable error message from Stripe error
 */
export function getStripeErrorMessage(error: unknown): string {
  if (isStripeError(error)) {
    // Return Stripe's user-friendly message
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred during payment processing';
}

/**
 * Export Stripe types for convenience
 */
export type { Stripe };
