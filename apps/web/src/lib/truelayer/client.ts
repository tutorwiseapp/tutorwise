/**
 * Filename: apps/web/src/lib/truelayer/client.ts
 * Purpose: TrueLayer PISP client — token management and authenticated fetch
 * Created: 2026-02-10
 *
 * Stub mode: when TRUELAYER_CLIENT_ID / TRUELAYER_CLIENT_SECRET are still placeholders,
 * isConfigured() returns false and callers should skip TrueLayer API calls.
 */

const PLACEHOLDER_CLIENT_ID = 'your_truelayer_client_id_here';
const PLACEHOLDER_CLIENT_SECRET = 'your_truelayer_client_secret_here';

/** Returns true only when real TrueLayer credentials are present. */
export function isConfigured(): boolean {
  const id = process.env.TRUELAYER_CLIENT_ID;
  const secret = process.env.TRUELAYER_CLIENT_SECRET;
  return (
    !!id &&
    !!secret &&
    id !== PLACEHOLDER_CLIENT_ID &&
    secret !== PLACEHOLDER_CLIENT_SECRET
  );
}

function getBaseUrls(): { auth: string; payments: string; hosted: string } {
  const isSandbox =
    !process.env.TRUELAYER_ENVIRONMENT ||
    process.env.TRUELAYER_ENVIRONMENT === 'sandbox';

  if (isSandbox) {
    return {
      auth: 'https://auth.truelayer-sandbox.com',
      payments: 'https://api.truelayer-sandbox.com',
      hosted: 'https://payment.truelayer-sandbox.com',
    };
  }
  return {
    auth: 'https://auth.truelayer.com',
    payments: 'https://api.truelayer.com',
    hosted: 'https://payment.truelayer.com',
  };
}

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/** Fetch a client_credentials access token, with in-memory cache. */
export async function getTruelayerAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const { auth } = getBaseUrls();
  const res = await fetch(`${auth}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.TRUELAYER_CLIENT_ID!,
      client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
      scope: 'payments',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TrueLayer token request failed ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = json.access_token;
  tokenExpiresAt = now + json.expires_in * 1000;
  return cachedToken;
}

/** Authenticated fetch against the TrueLayer Payments API. */
export async function truelayerFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { payments } = getBaseUrls();
  const token = await getTruelayerAccessToken();

  return fetch(`${payments}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

export function getHostedPaymentBaseUrl(): string {
  return getBaseUrls().hosted;
}
