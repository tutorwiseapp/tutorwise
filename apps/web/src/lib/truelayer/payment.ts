/**
 * Filename: apps/web/src/lib/truelayer/payment.ts
 * Purpose: TrueLayer payment creation, status polling, and consent URL builder
 * Created: 2026-02-10
 *
 * Beneficiary placeholders (SLC sort code / account number) — update when
 * confirmed with Student Loans Company.
 */

import { truelayerFetch, getHostedPaymentBaseUrl } from './client';

// ============================================================================
// Placeholder SLC bank details — replace when SLC partnership is confirmed
// ============================================================================
const SLC_SORT_CODE = '00-00-00'; // TODO: replace with real SLC sort code
const SLC_ACCOUNT_NUMBER = '00000000'; // TODO: replace with real SLC account number
const SLC_ACCOUNT_NAME = 'Student Loans Company';

// ============================================================================
// Types
// ============================================================================

export type TruelayerPaymentStatus =
  | 'authorization_required'
  | 'authorizing'
  | 'authorized'
  | 'executed'
  | 'failed'
  | 'settled';

export interface TruelayerPaymentResult {
  payment_id: string;
  resource_token: string;
  auth_uri: string;
}

// ============================================================================
// API
// ============================================================================

/**
 * Creates a GBP payment via TrueLayer PISP.
 * @param gbpPennies  Amount in pennies (e.g. 500 = £5.00)
 * @param returnUri   Where TrueLayer redirects after authorisation
 * @param reference   Payment reference visible on bank statement
 */
export async function createPayment(
  gbpPennies: number,
  returnUri: string,
  reference: string
): Promise<TruelayerPaymentResult> {
  const res = await truelayerFetch('/v3/payments', {
    method: 'POST',
    body: JSON.stringify({
      amount_in_minor: gbpPennies,
      currency: 'GBP',
      payment_method: {
        type: 'bank_transfer',
        provider_selection: { type: 'user_selected' },
        beneficiary: {
          type: 'external_account',
          name: SLC_ACCOUNT_NAME,
          reference,
          scheme_identifier: {
            type: 'sort_code_account_number',
            sort_code: SLC_SORT_CODE,
            account_number: SLC_ACCOUNT_NUMBER,
          },
        },
      },
      return_uri: returnUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TrueLayer createPayment failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    id: string;
    resource_token: string;
    user: unknown;
  };

  const auth_uri = buildConsentUrl(data.id, data.resource_token, returnUri);

  return {
    payment_id: data.id,
    resource_token: data.resource_token,
    auth_uri,
  };
}

/**
 * Polls TrueLayer for the current status of a payment.
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<{ status: TruelayerPaymentStatus }> {
  const res = await truelayerFetch(`/v3/payments/${paymentId}`);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TrueLayer getPaymentStatus failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { status: TruelayerPaymentStatus };
  return { status: data.status };
}

/**
 * Builds the TrueLayer hosted payment consent page URL.
 */
export function buildConsentUrl(
  paymentId: string,
  resourceToken: string,
  returnUri: string
): string {
  const base = getHostedPaymentBaseUrl();
  const params = new URLSearchParams({
    payment_id: paymentId,
    resource_token: resourceToken,
    return_uri: returnUri,
  });
  return `${base}/payments#${params.toString()}`;
}
