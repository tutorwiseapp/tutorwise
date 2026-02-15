/**
 * VirtualSpace Booking Migration Route (v5.9)
 *
 * This route handles the transition from booking-based URLs to session-based URLs.
 * It finds or creates a VirtualSpace session for a booking, then redirects.
 *
 * Flow:
 * 1. User clicks "Join VirtualSpace" on BookingCard
 * 2. Navigates to /virtualspace/booking/[bookingId]
 * 3. This route finds/creates a virtualspace_session linked to the booking
 * 4. Redirects to /virtualspace/[sessionId]
 *
 * @path /virtualspace/booking/[bookingId]
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  createVirtualSpaceResolver,
  VirtualSpaceAccessError,
} from '@/lib/virtualspace';

interface BookingMigrationPageProps {
  params: Promise<{
    bookingId: string;
  }>;
}

export default async function BookingMigrationPage(props: BookingMigrationPageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const { bookingId } = params;

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?redirect=/virtualspace/booking/${bookingId}`);
  }

  try {
    const resolver = await createVirtualSpaceResolver();
    const context = await resolver.resolveForBooking(bookingId, user.id);

    // Redirect to the session
    redirect(`/virtualspace/${context.sessionId}`);
  } catch (error) {
    if (error instanceof VirtualSpaceAccessError) {
      switch (error.code) {
        case 'NOT_FOUND':
          redirect('/dashboard?error=booking_not_found');
        case 'FORBIDDEN':
          redirect('/dashboard?error=access_denied');
        default:
          redirect('/dashboard?error=session_error');
      }
    }

    // Handle redirect error (thrown by Next.js redirect)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }

    console.error('VirtualSpace booking migration error:', error);
    redirect('/dashboard?error=unexpected_error');
  }
}
