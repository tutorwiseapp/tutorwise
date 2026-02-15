/**
 * VirtualSpace Session Page (v5.9)
 *
 * Unified session view for all modes:
 * - Standalone: Ad-hoc whiteboard rooms
 * - Booking: Linked to bookings with CaaS
 * - Free Help: Instant whiteboard sessions
 *
 * @path /virtualspace/[sessionId]
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { VirtualSpaceClient } from './VirtualSpaceClient';
import {
  createVirtualSpaceResolver,
  VirtualSpaceAccessError,
} from '@/lib/virtualspace';

interface VirtualSpacePageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function VirtualSpacePage(props: VirtualSpacePageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const { sessionId } = params;

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?redirect=/virtualspace/${sessionId}`);
  }

  // Resolve session context
  try {
    const resolver = await createVirtualSpaceResolver();
    const context = await resolver.resolve(sessionId, user.id);

    // Update activity timestamp
    await resolver.updateActivity(sessionId);

    return <VirtualSpaceClient context={context} />;
  } catch (error) {
    if (error instanceof VirtualSpaceAccessError) {
      switch (error.code) {
        case 'NOT_FOUND':
          return redirect('/dashboard?error=session_not_found');
        case 'FORBIDDEN':
          return redirect('/dashboard?error=access_denied');
        case 'EXPIRED':
          return redirect('/dashboard?error=session_expired');
        default:
          return redirect('/dashboard?error=session_error');
      }
    }

    // Unexpected error
    console.error('VirtualSpace error:', error);
    redirect('/dashboard?error=unexpected_error');
  }
}
