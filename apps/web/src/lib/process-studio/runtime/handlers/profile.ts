/**
 * Handler: profile.activate
 * Activates a tutor profile by setting profiles.status = 'active'.
 * Uses the service role client to bypass RLS.
 *
 * Context inputs:  { profile_id: string }
 * Context outputs: { activated: boolean, profile_id: string }
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

export async function handleProfileActivate(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const profileId = context.profile_id as string | undefined;

  if (!profileId) {
    throw new Error('profile.activate: profile_id is required in context');
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  if (error) {
    throw new Error(`profile.activate: failed to update profile — ${error.message}`);
  }

  console.log(`[profile.activate] Activated profile ${profileId}`);

  return { activated: true, profile_id: profileId };
}
