/**
 * Handler: caas.score
 * Calls the CaaS calculation API for a profile and returns the score.
 *
 * Context inputs:  { profile_id: string }
 * Context outputs: { caas_score: number }
 */

import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

export async function handleCaasScore(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const profileId = context.profile_id as string | undefined;

  if (!profileId) {
    throw new Error('caas.score: profile_id is required in context');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Use service-to-service call with service role key to bypass auth
  const response = await fetch(`${appUrl}/api/caas/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Internal service-to-service header — the route also accepts this
      'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
    body: JSON.stringify({ profile_id: profileId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`caas.score: API call failed — ${response.status} ${JSON.stringify(error)}`);
  }

  const result = await response.json();

  const score = result?.data?.total_score ?? 0;

  return { caas_score: score };
}
