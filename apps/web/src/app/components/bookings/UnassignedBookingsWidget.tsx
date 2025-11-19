/**
 * UnassignedBookingsWidget.tsx
 * Widget to show and assign students to bookings without an assigned attendee (v5.0)
 *
 * Purpose: Allows Clients (Parents) to assign which student will attend each booked lesson
 * Displays bookings where student_id is NULL and provides a dropdown to select:
 * - The Client themselves (adult learner)
 * - Any linked student via Guardian Link
 * - Option to add a new student
 *
 * Updated: 2025-11-19 - Migrated to v2 design with SidebarComplexWidget
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { getMyStudents } from '@/lib/api/students';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import SidebarComplexWidget from '@/app/components/layout/sidebars/components/SidebarComplexWidget';
import toast from 'react-hot-toast';
import styles from './UnassignedBookingsWidget.module.css';

interface UnassignedBooking {
  id: string;
  tutor_name: string;
  session_start_time: string;
  status: string;
}

export default function UnassignedBookingsWidget() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);

  // Fetch unassigned bookings (where student_id is NULL)
  const { data: unassignedBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['unassigned-bookings', profile?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          session_start_time,
          status,
          tutor:tutor_id(full_name)
        `)
        .eq('client_id', profile?.id)
        .is('student_id', null)
        .gte('session_start_time', new Date().toISOString())
        .neq('status', 'Cancelled')
        .order('session_start_time', { ascending: true })
        .limit(5);

      if (error) throw error;

      return (data || []).map((booking: any) => ({
        id: booking.id,
        tutor_name: booking.tutor?.full_name || 'Unknown Tutor',
        session_start_time: booking.session_start_time,
        status: booking.status,
      }));
    },
    enabled: !!profile,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch linked students
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students', profile?.id],
    queryFn: getMyStudents,
    enabled: !!profile,
    staleTime: 5 * 60 * 1000,
  });

  // Assign student mutation
  const assignMutation = useMutation({
    mutationFn: async ({ bookingId, studentId }: { bookingId: string; studentId: string }) => {
      const response = await fetch('/api/bookings/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          student_id: studentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign student');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Student assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['unassigned-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setAssigningBookingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setAssigningBookingId(null);
    },
  });

  const handleAssign = (bookingId: string, studentId: string) => {
    setAssigningBookingId(bookingId);
    assignMutation.mutate({ bookingId, studentId });
  };

  // Don't render if no unassigned bookings
  if (!loadingBookings && unassignedBookings.length === 0) {
    return null;
  }

  return (
    <SidebarComplexWidget>
      <h3 className={styles.title}>Assign Attendees</h3>
      <p className={styles.subtitle}>
        Select who will attend each upcoming lesson
      </p>

      {loadingBookings ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.bookingsList}>
          {unassignedBookings.map((booking) => (
            <div key={booking.id} className={styles.bookingItem}>
              <div className={styles.bookingInfo}>
                <div className={styles.bookingTitle}>
                  Session with {booking.tutor_name}
                </div>
                <div className={styles.bookingDate}>
                  {new Date(booking.session_start_time).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className={styles.assignDropdown}>
                <select
                  className={styles.select}
                  onChange={(e) => handleAssign(booking.id, e.target.value)}
                  disabled={assigningBookingId === booking.id || loadingStudents}
                  value=""
                >
                  <option value="" disabled>
                    {assigningBookingId === booking.id ? 'Assigning...' : 'Assign Attendee...'}
                  </option>
                  <option value={profile?.id}>
                    Myself ({profile?.full_name})
                  </option>
                  {students.length > 0 && <option disabled>──────────</option>}
                  {students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.student?.full_name}
                    </option>
                  ))}
                  <option disabled>──────────</option>
                  <option value="add-new" onClick={(e) => {
                    e.preventDefault();
                    router.push('/my-students');
                  }}>
                    + Add a new student
                  </option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {unassignedBookings.length > 0 && (
        <div className={styles.footer}>
          <button
            onClick={() => router.push('/bookings')}
            className={styles.viewAllButton}
          >
            View All Bookings
          </button>
        </div>
      )}
    </SidebarComplexWidget>
  );
}
