/**
 * Filename: google-meet.ts
 * Purpose: Google Meet API integration utilities for WiseSpace (v5.8)
 * Created: 2025-11-15
 */

/**
 * Generate a Google Meet link for a session
 *
 * For Phase 1, we'll use meet.new which creates instant meetings.
 * For Phase 2 (future), we can integrate with Google Calendar API to create
 * scheduled meetings with proper calendar invites.
 *
 * @param bookingId - The booking ID for tracking purposes
 * @param sessionTitle - Optional title for the meeting
 * @returns Google Meet URL
 */
export function generateGoogleMeetLink(_bookingId: string, _sessionTitle?: string): string {
  // Phase 1: Use instant meeting creation
  // meet.new automatically creates a new meeting and redirects
  return 'https://meet.new';

  // Phase 2 (Future): Use Google Calendar API
  // This would require:
  // 1. OAuth 2.0 authentication
  // 2. Google Calendar API integration
  // 3. Creating a calendar event with conferencing details
  // 4. Returning the generated meet link from the event
  //
  // Example future implementation:
  // const event = await createCalendarEvent({
  //   summary: sessionTitle || `Tutorwise Session ${bookingId}`,
  //   start: booking.session_start_time,
  //   end: booking.session_end_time,
  //   conferenceData: {
  //     createRequest: {
  //       requestId: bookingId,
  //       conferenceSolutionKey: { type: 'hangoutsMeet' }
  //     }
  //   }
  // });
  // return event.hangoutLink;
}

/**
 * Create a Google Meet link with better UX by opening in a new window
 * with specific dimensions
 *
 * @param bookingId - The booking ID
 * @param sessionTitle - Optional session title
 */
export function openGoogleMeetWindow(bookingId: string, sessionTitle?: string): void {
  const meetUrl = generateGoogleMeetLink(bookingId, sessionTitle);

  // Open in a new window with specific dimensions for better UX
  const width = 1280;
  const height = 720;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  window.open(
    meetUrl,
    'GoogleMeet',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}

/**
 * Store Google Meet session details in localStorage for tracking
 * This helps us correlate WiseSpace whiteboard sessions with video calls
 *
 * @param bookingId - The booking ID
 * @param meetingUrl - The Google Meet URL (if available)
 */
export function trackMeetSession(bookingId: string, meetingUrl?: string): void {
  const sessionData = {
    bookingId,
    meetingUrl: meetingUrl || 'meet.new',
    startedAt: new Date().toISOString(),
  };

  localStorage.setItem(`wisespace_meet_${bookingId}`, JSON.stringify(sessionData));
}

/**
 * Get tracked meeting session data
 *
 * @param bookingId - The booking ID
 * @returns Session data if exists, null otherwise
 */
export function getMeetSessionData(bookingId: string): {
  bookingId: string;
  meetingUrl: string;
  startedAt: string;
} | null {
  const data = localStorage.getItem(`wisespace_meet_${bookingId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Clear meeting session data (called when session is completed)
 *
 * @param bookingId - The booking ID
 */
export function clearMeetSessionData(bookingId: string): void {
  localStorage.removeItem(`wisespace_meet_${bookingId}`);
}
