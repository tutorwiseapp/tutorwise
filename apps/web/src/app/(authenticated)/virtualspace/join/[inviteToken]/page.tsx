/**
 * VirtualSpace Join Page (v5.9)
 *
 * Handles joining a session via invite link.
 *
 * Flow:
 * 1. User receives invite link: /virtualspace/join/[inviteToken]
 * 2. This page validates the token and adds user as participant
 * 3. Redirects to /virtualspace/[sessionId]
 *
 * @path /virtualspace/join/[inviteToken]
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  createVirtualSpaceResolver,
  VirtualSpaceAccessError,
} from '@/lib/virtualspace';

interface JoinPageProps {
  params: Promise<{
    inviteToken: string;
  }>;
}

export default async function JoinPage(props: JoinPageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const { inviteToken } = params;

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Save the invite token for after login
    redirect(`/login?redirect=/virtualspace/join/${inviteToken}`);
  }

  try {
    const resolver = await createVirtualSpaceResolver();
    const { sessionId } = await resolver.joinSession(inviteToken, user.id);

    // Redirect to the session
    redirect(`/virtualspace/${sessionId}`);
  } catch (error) {
    if (error instanceof VirtualSpaceAccessError) {
      switch (error.code) {
        case 'NOT_FOUND':
          redirect('/dashboard?error=invalid_invite');
        case 'EXPIRED':
          redirect('/dashboard?error=invite_expired');
        case 'FORBIDDEN':
          redirect('/dashboard?error=session_full');
        default:
          redirect('/dashboard?error=join_failed');
      }
    }

    // Handle redirect error (thrown by Next.js redirect)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }

    console.error('VirtualSpace join error:', error);
    redirect('/dashboard?error=unexpected_error');
  }
}
