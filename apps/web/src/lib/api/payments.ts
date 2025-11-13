/**
 * Filename: lib/api/payments.ts
 * Purpose: API functions for payment methods management
 * Created: 2025-11-13
 * Pattern: React Query compatible API layer
 */

export interface SavedCard {
  id: string;
  brand: string | undefined;
  last4: string | undefined;
  exp_month: number | undefined;
  exp_year: number | undefined;
}

export interface StripeAccount {
  details_submitted: boolean;
}

export interface PaymentData {
  account: StripeAccount | null;
  cards: SavedCard[];
  defaultPaymentMethodId: string | null;
}

/**
 * Fetch Stripe Connect account status
 */
export async function getStripeAccount(): Promise<StripeAccount | null> {
  const response = await fetch('/api/stripe/get-connect-account', {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Stripe account');
  }

  const data = await response.json();
  return data.account;
}

/**
 * Fetch saved cards for current user
 */
export async function getSavedCards(customerId?: string): Promise<{
  cards: SavedCard[];
  defaultPaymentMethodId: string | null;
}> {
  if (!customerId) {
    return { cards: [], defaultPaymentMethodId: null };
  }

  const response = await fetch('/api/stripe/get-cards-by-customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch saved cards');
  }

  const data = await response.json();
  return {
    cards: data.cards || [],
    defaultPaymentMethodId: data.defaultPaymentMethodId,
  };
}

/**
 * Fetch all payment data (account + cards)
 */
export async function getPaymentData(customerId?: string): Promise<PaymentData> {
  const [account, cardsData] = await Promise.all([
    getStripeAccount(),
    getSavedCards(customerId),
  ]);

  return {
    account,
    cards: cardsData.cards,
    defaultPaymentMethodId: cardsData.defaultPaymentMethodId,
  };
}

/**
 * Set default payment method
 */
export async function setDefaultCard(paymentMethodId: string): Promise<void> {
  const response = await fetch('/api/stripe/set-default-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId }),
  });

  if (!response.ok) {
    throw new Error('Failed to set default card');
  }
}

/**
 * Remove a payment method
 */
export async function removeCard(paymentMethodId: string): Promise<void> {
  const response = await fetch('/api/stripe/remove-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId }),
  });

  if (!response.ok) {
    throw new Error('Failed to remove card');
  }
}

/**
 * Connect Stripe account (returns redirect URL)
 */
export async function connectStripeAccount(): Promise<string> {
  const response = await fetch('/api/stripe/connect-account');

  if (!response.ok) {
    throw new Error('Could not connect to Stripe');
  }

  const { url } = await response.json();
  return url;
}

/**
 * Disconnect Stripe account
 */
export async function disconnectStripeAccount(): Promise<void> {
  const response = await fetch('/api/stripe/disconnect-account', {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error('Failed to disconnect Stripe account');
  }
}

/**
 * Create checkout session for adding a new card
 */
export async function createCheckoutSession(): Promise<string> {
  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Could not create Stripe session');
  }

  const { sessionId } = await response.json();

  if (!sessionId) {
    throw new Error('Invalid session ID received');
  }

  return sessionId;
}

/**
 * Verify and get cards after checkout (for polling)
 */
export async function verifyAndGetCards(customerId: string): Promise<{
  cards: SavedCard[];
  defaultPaymentMethodId: string | null;
}> {
  const response = await fetch('/api/stripe/verify-and-get-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Verification API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    cards: data.cards || [],
    defaultPaymentMethodId: data.defaultPaymentMethodId,
  };
}
