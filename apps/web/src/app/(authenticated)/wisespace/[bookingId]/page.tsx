/**
 * Filename: page.tsx
 * Purpose: WiseSpace virtual classroom page (v5.8)
 * Path: /wisespace/[bookingId]
 * Created: 2025-11-15
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { WiseSpaceClient } from './WiseSpaceClient';

interface WiseSpacePageProps {
  params: Promise<{
    bookingId: string;
  }>;
}

export default async function WiseSpacePage(props: WiseSpacePageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const { bookingId } = params;

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Fetch booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      tutor_id,
      student_id,
      service_name,
      session_start_time,
      session_duration,
      status,
      session_artifacts
    `)
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    redirect('/dashboard?error=booking_not_found');
  }

  // Validate user is a participant
  if (booking.tutor_id !== user.id && booking.student_id !== user.id) {
    redirect('/dashboard?error=access_denied');
  }

  // Fetch participant profiles for better UX
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', [booking.tutor_id, booking.student_id].filter(Boolean));

  const tutor = profiles?.find(p => p.id === booking.tutor_id);
  const student = profiles?.find(p => p.id === booking.student_id);

  return (
    <WiseSpaceClient
      bookingId={bookingId}
      sessionTitle={booking.service_name}
      currentUserId={user.id}
      tutorName={tutor?.full_name || 'Tutor'}
      studentName={student?.full_name || 'Student'}
    />
  );
}
