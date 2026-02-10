/**
 * Filename: apps/web/src/lib/email-templates/booking.ts
 * Purpose: Booking-related email templates
 * Created: 2025-01-27
 * Updated: 2026-02-05 - Added scheduling email templates (v6.0)
 *
 * Email types:
 * - Booking Request (to tutor) - New booking request received
 * - Booking Confirmed (to client) - Tutor/admin confirmed the booking
 * - Booking Cancelled (to both) - Booking was cancelled
 * - Session Reminder (to both) - Upcoming session reminder
 * - Time Proposed (to other party) - v6.0: Time has been proposed
 * - Schedule Confirmed (to both) - v6.0: Schedule has been confirmed
 * - Reschedule Requested (to other party) - v6.0: Reschedule has been requested
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, infoRow, tokens } from './base';

export interface BookingEmailData {
  bookingId: string;
  serviceName: string;
  sessionDate: Date;
  sessionDuration: number; // minutes
  amount: number;
  subjects?: string[];
  deliveryMode?: 'online' | 'in_person' | 'hybrid';
  locationCity?: string;
  tutorName: string;
  tutorEmail: string;
  clientName: string;
  clientEmail: string;
  // Agent/referral fields (optional)
  agentName?: string;
  agentEmail?: string;
  bookingType?: 'direct' | 'referred' | 'agent_job';
}

/**
 * v6.0 Scheduling email data (extends BookingEmailData)
 */
export interface SchedulingEmailData extends Omit<BookingEmailData, 'sessionDate'> {
  proposedTime: Date;
  proposedByName: string;
  proposedByRole: 'tutor' | 'client' | 'other';
  slotExpiresAt?: Date;
  rescheduleCount?: number;
  action?: 'withdrawn' | 'declined'; // For withdraw/decline emails
}

/**
 * Format date for email display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format time for email display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${mins}m`;
}

/**
 * Format location for display
 */
function formatLocation(deliveryMode?: string, locationCity?: string): string {
  if (deliveryMode === 'online') return 'Online Session';
  if (deliveryMode === 'in_person' && locationCity) return `In Person - ${locationCity}`;
  if (deliveryMode === 'hybrid') return 'Online or In Person';
  return 'To be confirmed';
}

/**
 * Create booking details section
 */
function bookingDetailsSection(data: BookingEmailData): string {
  const sessionDate = new Date(data.sessionDate);
  const subjects = data.subjects?.length ? data.subjects.join(', ') : data.serviceName;

  return `
    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('Date', formatDate(sessionDate))}
      ${infoRow('Time', formatTime(sessionDate))}
      ${infoRow('Duration', formatDuration(data.sessionDuration))}
      ${infoRow('Subject', subjects)}
      ${infoRow('Location', formatLocation(data.deliveryMode, data.locationCity))}
      ${infoRow('Price', `£${data.amount.toFixed(2)}`)}
    </div>
  `;
}

/**
 * Send email to tutor when a new booking request is received
 */
export async function sendBookingRequestEmail(data: BookingEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const subject = `New Booking Request from ${data.clientName}`;

  const body = `
    ${paragraph(`You have a new booking request from ${bold(data.clientName)}.`)}
    ${bookingDetailsSection(data)}
    ${paragraph('Please review and confirm this booking as soon as possible.')}
  `;

  const html = generateEmailTemplate({
    headline: 'New Booking Request',
    variant: 'default',
    recipientName: data.tutorName,
    body,
    cta: {
      text: 'View Booking',
      url: `${siteUrl}/bookings`,
    },
    footerNote: 'Log in to your dashboard to confirm or decline this request.',
  });

  return sendEmail({
    to: data.tutorEmail,
    subject,
    html,
  });
}

/**
 * Send email to client when booking is confirmed
 */
export async function sendBookingConfirmedEmail(data: BookingEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const sessionDate = new Date(data.sessionDate);
  const subject = `Booking Confirmed - ${formatDate(sessionDate)}`;

  const body = `
    ${paragraph(`Great news! Your booking with ${bold(data.tutorName)} has been confirmed.`)}
    ${bookingDetailsSection(data)}
    ${paragraph("We'll send you a reminder before your session. If you need to make any changes, please contact your tutor or visit your dashboard.")}
  `;

  const html = generateEmailTemplate({
    headline: 'Booking Confirmed!',
    variant: 'success',
    recipientName: data.clientName,
    body,
    cta: {
      text: 'View My Bookings',
      url: `${siteUrl}/bookings`,
    },
    footerNote: `Need help? Visit our Help Centre at ${siteUrl}/help-centre`,
  });

  return sendEmail({
    to: data.clientEmail,
    subject,
    html,
  });
}

/**
 * Send email to tutor when booking is confirmed (confirmation copy)
 */
export async function sendBookingConfirmedToTutorEmail(data: BookingEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const sessionDate = new Date(data.sessionDate);
  const subject = `Booking Confirmed with ${data.clientName} - ${formatDate(sessionDate)}`;

  const body = `
    ${paragraph(`Your booking with ${bold(data.clientName)} has been confirmed.`)}
    ${bookingDetailsSection(data)}
    ${paragraph('Make sure to prepare for the session and be ready at the scheduled time.')}
  `;

  const html = generateEmailTemplate({
    headline: 'Booking Confirmed',
    variant: 'success',
    recipientName: data.tutorName,
    body,
    cta: {
      text: 'View My Schedule',
      url: `${siteUrl}/bookings`,
    },
  });

  return sendEmail({
    to: data.tutorEmail,
    subject,
    html,
  });
}

/**
 * Send email when booking is cancelled
 */
export async function sendBookingCancelledEmail(
  data: BookingEmailData,
  recipientType: 'client' | 'tutor',
  cancelledBy: string,
  reason?: string
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const sessionDate = new Date(data.sessionDate);
  const isClient = recipientType === 'client';

  const recipientName = isClient ? data.clientName : data.tutorName;
  const recipientEmail = isClient ? data.clientEmail : data.tutorEmail;
  const otherPartyName = isClient ? data.tutorName : data.clientName;

  const subject = `Booking Cancelled - ${formatDate(sessionDate)}`;

  let body = paragraph(`Your booking with ${bold(otherPartyName)} on ${bold(formatDate(sessionDate))} has been cancelled by ${cancelledBy}.`);

  if (reason) {
    body += `
      <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.background}; border-left: 4px solid ${tokens.colors.warning}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason:</p>
        <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${reason}</p>
      </div>
    `;
  }

  body += paragraph(isClient
    ? 'If you have any questions, please contact the tutor directly or visit our Help Centre.'
    : 'If you have any questions, please contact the client directly or visit our Help Centre.'
  );

  const html = generateEmailTemplate({
    headline: 'Booking Cancelled',
    variant: 'warning',
    recipientName,
    body,
    cta: {
      text: isClient ? 'Find Another Tutor' : 'View Schedule',
      url: isClient ? `${siteUrl}/search` : `${siteUrl}/bookings`,
    },
    footerNote: `Need help? Visit ${siteUrl}/help-centre`,
  });

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

/**
 * Send session reminder email (typically 24h before)
 */
export async function sendSessionReminderEmail(
  data: BookingEmailData,
  recipientType: 'client' | 'tutor'
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const _sessionDate = new Date(data.sessionDate);
  const isClient = recipientType === 'client';

  const recipientName = isClient ? data.clientName : data.tutorName;
  const recipientEmail = isClient ? data.clientEmail : data.tutorEmail;
  const otherPartyName = isClient ? data.tutorName : data.clientName;

  const subject = `Reminder: Session Tomorrow with ${otherPartyName}`;

  const body = `
    ${paragraph(`This is a friendly reminder about your upcoming session with ${bold(otherPartyName)}.`)}
    ${bookingDetailsSection(data)}
    ${paragraph(isClient
      ? 'Make sure you have any materials ready and know how to join the session.'
      : 'Make sure you have prepared the lesson and are ready to start on time.'
    )}
  `;

  const html = generateEmailTemplate({
    headline: 'Session Reminder',
    variant: 'default',
    recipientName,
    body,
    cta: {
      text: 'View Booking Details',
      url: `${siteUrl}/bookings`,
    },
  });

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

/**
 * Send email to agent when a referral booking is confirmed
 */
export async function sendBookingConfirmedToAgentEmail(data: BookingEmailData) {
  if (!data.agentEmail || !data.agentName) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const _sessionDate = new Date(data.sessionDate);
  const subject = `Referral Booking Confirmed - ${data.clientName} with ${data.tutorName}`;

  const body = `
    ${paragraph(`Great news! Your referral has resulted in a confirmed booking.`)}
    ${paragraph(`${bold(data.clientName)} has booked a session with ${bold(data.tutorName)}.`)}
    ${bookingDetailsSection(data)}
    ${paragraph('You may be eligible for commission on this booking. Track your referrals in your dashboard.')}
  `;

  const html = generateEmailTemplate({
    headline: 'Referral Booking Confirmed!',
    variant: 'success',
    recipientName: data.agentName,
    body,
    cta: {
      text: 'View My Referrals',
      url: `${siteUrl}/referrals`,
    },
    footerNote: 'Keep referring to earn more commissions!',
  });

  return sendEmail({
    to: data.agentEmail,
    subject,
    html,
  });
}

/**
 * Send booking confirmation emails to all relevant parties
 * - Always: Client + Tutor
 * - If referral booking: Agent
 */
export async function sendBookingConfirmationEmails(data: BookingEmailData) {
  const results = {
    client: false,
    tutor: false,
    agent: false,
  };

  // Send to client
  try {
    await sendBookingConfirmedEmail(data);
    results.client = true;
    console.log('[Booking Email] Sent confirmation to client:', data.clientEmail);
  } catch (err) {
    console.error('[Booking Email] Failed to send to client:', err);
  }

  // Send to tutor
  try {
    await sendBookingConfirmedToTutorEmail(data);
    results.tutor = true;
    console.log('[Booking Email] Sent confirmation to tutor:', data.tutorEmail);
  } catch (err) {
    console.error('[Booking Email] Failed to send to tutor:', err);
  }

  // Send to agent if this is a referral booking
  if (data.agentEmail && data.agentName && (data.bookingType === 'referred' || data.bookingType === 'agent_job')) {
    try {
      await sendBookingConfirmedToAgentEmail(data);
      results.agent = true;
      console.log('[Booking Email] Sent confirmation to agent:', data.agentEmail);
    } catch (err) {
      console.error('[Booking Email] Failed to send to agent:', err);
    }
  }

  return results;
}

/**
 * Send booking cancellation emails to all relevant parties
 */
export async function sendBookingCancellationEmails(
  data: BookingEmailData,
  cancelledBy: string,
  reason?: string
) {
  const results = {
    client: false,
    tutor: false,
    agent: false,
  };

  // Send to client
  try {
    await sendBookingCancelledEmail(data, 'client', cancelledBy, reason);
    results.client = true;
  } catch (err) {
    console.error('[Booking Email] Failed to send cancellation to client:', err);
  }

  // Send to tutor
  try {
    await sendBookingCancelledEmail(data, 'tutor', cancelledBy, reason);
    results.tutor = true;
  } catch (err) {
    console.error('[Booking Email] Failed to send cancellation to tutor:', err);
  }

  // Send to agent if this is a referral booking
  if (data.agentEmail && data.agentName && (data.bookingType === 'referred' || data.bookingType === 'agent_job')) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
    const sessionDate = new Date(data.sessionDate);

    const body = `
      ${paragraph(`A booking from your referral has been cancelled.`)}
      ${paragraph(`${bold(data.clientName)}'s session with ${bold(data.tutorName)} scheduled for ${bold(formatDate(sessionDate))} was cancelled by ${cancelledBy}.`)}
      ${reason ? paragraph(`Reason: ${reason}`) : ''}
    `;

    const html = generateEmailTemplate({
      headline: 'Referral Booking Cancelled',
      variant: 'warning',
      recipientName: data.agentName,
      body,
      cta: {
        text: 'View My Referrals',
        url: `${siteUrl}/referrals`,
      },
    });

    try {
      await sendEmail({
        to: data.agentEmail,
        subject: `Referral Booking Cancelled - ${data.clientName}`,
        html,
      });
      results.agent = true;
    } catch (err) {
      console.error('[Booking Email] Failed to send cancellation to agent:', err);
    }
  }

  return results;
}

// ============================================================================
// v6.0 Scheduling Email Templates
// ============================================================================

/**
 * Create scheduling details section for emails
 */
function schedulingDetailsSection(data: SchedulingEmailData): string {
  const proposedTime = new Date(data.proposedTime);
  const subjects = data.subjects?.length ? data.subjects.join(', ') : data.serviceName;

  return `
    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('Proposed Date', formatDate(proposedTime))}
      ${infoRow('Proposed Time', formatTime(proposedTime) + ' (UK time)')}
      ${infoRow('Duration', formatDuration(data.sessionDuration))}
      ${infoRow('Subject', subjects)}
      ${infoRow('Location', formatLocation(data.deliveryMode, data.locationCity))}
      ${data.amount > 0 ? infoRow('Price', `£${data.amount.toFixed(2)}`) : infoRow('Price', 'Free Session')}
    </div>
  `;
}

/**
 * v6.0: Send email when a time is proposed (to the other party)
 */
export async function sendTimeProposedEmail(data: SchedulingEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const _proposedTime = new Date(data.proposedTime);

  // Determine recipient (the other party)
  const isProposedByTutor = data.proposedByRole === 'tutor';
  const recipientName = isProposedByTutor ? data.clientName : data.tutorName;
  const recipientEmail = isProposedByTutor ? data.clientEmail : data.tutorEmail;
  const proposerName = data.proposedByName;

  const subject = `${proposerName} Proposed a Session Time - Please Confirm`;

  const body = `
    ${paragraph(`${bold(proposerName)} has proposed a time for your upcoming tutoring session.`)}
    ${schedulingDetailsSection(data)}
    ${paragraph(`${bold('Important:')} This slot is reserved for 15 minutes. Please confirm or suggest a different time before the reservation expires.`)}
    ${paragraph('If this time works for you, click the button below to confirm and proceed to payment.')}
  `;

  const html = generateEmailTemplate({
    headline: 'New Session Time Proposed',
    variant: 'default',
    recipientName,
    body,
    cta: {
      text: 'Review & Confirm',
      url: `${siteUrl}/bookings`,
    },
    footerNote: 'The proposed slot will expire in 15 minutes if not confirmed.',
  });

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

/**
 * v6.0: Send email when schedule is confirmed (to both parties)
 */
export async function sendScheduleConfirmedEmail(
  data: SchedulingEmailData,
  recipientType: 'client' | 'tutor'
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const confirmedTime = new Date(data.proposedTime);
  const isClient = recipientType === 'client';

  const recipientName = isClient ? data.clientName : data.tutorName;
  const recipientEmail = isClient ? data.clientEmail : data.tutorEmail;
  const otherPartyName = isClient ? data.tutorName : data.clientName;

  const subject = `Session Scheduled - ${formatDate(confirmedTime)} at ${formatTime(confirmedTime)}`;

  const body = `
    ${paragraph(`Great news! Your session with ${bold(otherPartyName)} has been scheduled.`)}
    ${schedulingDetailsSection(data)}
    ${paragraph(isClient
      ? data.amount > 0
        ? 'Your payment has been processed. You will receive a session link before the scheduled time.'
        : 'This is a free session. You will receive a session link before the scheduled time.'
      : 'Make sure you are prepared and ready at the scheduled time.'
    )}
  `;

  const html = generateEmailTemplate({
    headline: 'Session Scheduled!',
    variant: 'success',
    recipientName,
    body,
    cta: {
      text: 'View Booking Details',
      url: `${siteUrl}/bookings`,
    },
    footerNote: "We'll send you a reminder 24 hours before your session.",
  });

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

/**
 * v6.0: Send email when a reschedule is requested (to the other party)
 */
export async function sendRescheduleRequestedEmail(data: SchedulingEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const _newProposedTime = new Date(data.proposedTime);

  // Determine recipient (the other party)
  const isProposedByTutor = data.proposedByRole === 'tutor';
  const recipientName = isProposedByTutor ? data.clientName : data.tutorName;
  const recipientEmail = isProposedByTutor ? data.clientEmail : data.tutorEmail;
  const proposerName = data.proposedByName;

  const rescheduleInfo = data.rescheduleCount !== undefined
    ? ` (Reschedule ${data.rescheduleCount} of 4)`
    : '';

  const subject = `Reschedule Request from ${proposerName}${rescheduleInfo}`;

  const body = `
    ${paragraph(`${bold(proposerName)} has requested to reschedule your session.`)}
    <div style="margin: 16px 0; padding: 16px; background: ${tokens.colors.warningLight}; border-left: 4px solid ${tokens.colors.warning}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0; color: ${tokens.colors.warning}; font-weight: 600;">New Proposed Time</p>
    </div>
    ${schedulingDetailsSection(data)}
    ${paragraph(`${bold('Note:')} This new slot is reserved for 15 minutes. Please confirm or suggest an alternative time.`)}
    ${data.rescheduleCount !== undefined ? paragraph(`This is reschedule ${data.rescheduleCount} of 4 allowed for this booking.`) : ''}
  `;

  const html = generateEmailTemplate({
    headline: 'Reschedule Requested',
    variant: 'warning',
    recipientName,
    body,
    cta: {
      text: 'Review New Time',
      url: `${siteUrl}/bookings`,
    },
    footerNote: 'Each booking can be rescheduled up to 4 times (2 per party).',
  });

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

/**
 * v6.0: Send email when a time proposal is withdrawn or declined
 */
export async function sendTimeWithdrawnEmail(data: SchedulingEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const proposedTime = new Date(data.proposedTime);

  // Determine recipient (the other party)
  const isProposedByTutor = data.proposedByRole === 'tutor';
  const recipientName = isProposedByTutor ? data.clientName : data.tutorName;
  const recipientEmail = isProposedByTutor ? data.clientEmail : data.tutorEmail;
  const proposerName = data.proposedByName;
  const action = data.action || 'withdrawn';

  const subject = `Time Proposal ${action === 'withdrawn' ? 'Withdrawn' : 'Declined'} by ${proposerName}`;

  const body = `
    ${paragraph(`${bold(proposerName)} has ${action === 'withdrawn' ? 'withdrawn their' : 'declined the'} proposed time for your session.`)}
    <div style="margin: 16px 0; padding: 16px; background: ${tokens.colors.errorLight}; border-left: 4px solid ${tokens.colors.error}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0; color: ${tokens.colors.error}; font-weight: 600;">${action === 'withdrawn' ? 'Proposal Withdrawn' : 'Proposal Declined'}</p>
      <p style="margin: 8px 0 0; font-size: 14px;">The proposed time was: ${proposedTime.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Europe/London',
      })}</p>
    </div>
    ${paragraph(`Please propose a new time that works for both of you.`)}
    ${schedulingDetailsSection(data)}
  `;

  const html = generateEmailTemplate({
    headline: `Time Proposal ${action === 'withdrawn' ? 'Withdrawn' : 'Declined'}`,
    variant: 'error',
    recipientName,
    body,
    cta: {
      text: 'Propose New Time',
      url: `${siteUrl}/bookings`,
    },
    footerNote: 'You can propose as many times as needed until you find a mutually convenient time.',
  });

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

/**
 * v6.0: Send scheduling confirmation emails to all relevant parties
 */
export async function sendSchedulingConfirmationEmails(data: SchedulingEmailData) {
  const results = {
    client: false,
    tutor: false,
  };

  // Send to client
  try {
    await sendScheduleConfirmedEmail(data, 'client');
    results.client = true;
    console.log('[Scheduling Email] Sent confirmation to client:', data.clientEmail);
  } catch (err) {
    console.error('[Scheduling Email] Failed to send to client:', err);
  }

  // Send to tutor
  try {
    await sendScheduleConfirmedEmail(data, 'tutor');
    results.tutor = true;
    console.log('[Scheduling Email] Sent confirmation to tutor:', data.tutorEmail);
  } catch (err) {
    console.error('[Scheduling Email] Failed to send to tutor:', err);
  }

  return results;
}

/**
 * No-Show Alert Email Data
 * v7.0: Sends notification when a no-show is detected
 */
export interface NoShowAlertData {
  bookingId: string;
  serviceName: string;
  sessionDate: Date;
  sessionDuration: number;
  noShowParty: 'client' | 'tutor';
  tutorName: string;
  tutorEmail: string;
  clientName: string;
  clientEmail: string;
  detectedAt: Date;
}

/**
 * v7.0: Sends no-show alert email to both parties
 * Notifies when a session has been automatically detected as a no-show
 *
 * @param data - No-show alert email data
 * @param recipient - 'tutor' | 'client' | 'both'
 */
export async function sendNoShowAlertEmail(
  data: NoShowAlertData,
  recipient: 'tutor' | 'client' | 'both' = 'both'
) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    }).format(date);
  };

  const noShowPartyName = data.noShowParty === 'client' ? data.clientName : data.tutorName;

  // Determine which party to send to
  const shouldSendToTutor = recipient === 'tutor' || recipient === 'both';
  const shouldSendToClient = recipient === 'client' || recipient === 'both';

  // Send to tutor
  if (shouldSendToTutor) {
    const tutorSubject = `⚠️ No-Show Alert: ${data.serviceName}`;

    const tutorBody = `
      ${paragraph(
        `We've detected that the scheduled session with ${bold(data.clientName)} was not attended.`
      )}
      <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
        ${infoRow('Session', data.serviceName)}
        ${infoRow('Scheduled Time', formatDate(data.sessionDate))}
        ${infoRow('Duration', `${data.sessionDuration} minutes`)}
        ${infoRow('No-Show Party', noShowPartyName)}
        ${infoRow('Detected At', formatDate(data.detectedAt))}
      </div>
      ${paragraph(
        `This no-show has been recorded and ${data.noShowParty === 'client' ? 'the client will not receive a refund. You will receive full payment for this session.' : 'the client will be fully refunded.'}`
      )}
      ${paragraph(
        'If you believe this detection was incorrect, please contact support immediately.'
      )}
    `;

    const tutorHtml = generateEmailTemplate({
      headline: '⚠️ No-Show Detected',
      variant: 'warning',
      recipientName: data.tutorName,
      body: tutorBody,
      cta: {
        text: 'View Booking Details',
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings?id=${data.bookingId}`,
      },
      footerNote: 'This is an automated notification. For support, contact support@tutorwise.com',
    });

    await sendEmail({
      to: data.tutorEmail,
      subject: tutorSubject,
      html: tutorHtml,
    });
  }

  // Send to client
  if (shouldSendToClient) {
    const clientSubject = `⚠️ No-Show Alert: ${data.serviceName}`;

    const clientBody = `
      ${paragraph(
        `We've detected that your scheduled session with ${bold(data.tutorName)} was not attended.`
      )}
      <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
        ${infoRow('Session', data.serviceName)}
        ${infoRow('Scheduled Time', formatDate(data.sessionDate))}
        ${infoRow('Duration', `${data.sessionDuration} minutes`)}
        ${infoRow('No-Show Party', noShowPartyName)}
        ${infoRow('Detected At', formatDate(data.detectedAt))}
      </div>
      ${paragraph(
        `This no-show has been recorded. ${data.noShowParty === 'client' ? 'Unfortunately, no refund can be issued for missed sessions. The tutor will receive full payment.' : 'You will receive a full refund for this session.'}`
      )}
      ${paragraph(
        'If you believe this detection was incorrect, please contact support immediately.'
      )}
    `;

    const clientHtml = generateEmailTemplate({
      headline: '⚠️ No-Show Detected',
      variant: 'warning',
      recipientName: data.clientName,
      body: clientBody,
      cta: {
        text: 'View Booking Details',
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings?id=${data.bookingId}`,
      },
      footerNote: 'This is an automated notification. For support, contact support@tutorwise.com',
    });

    await sendEmail({
      to: data.clientEmail,
      subject: clientSubject,
      html: clientHtml,
    });
  }
}
