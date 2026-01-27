/**
 * Filename: apps/web/src/lib/email-templates/dispute.ts
 * Purpose: Dispute-related email templates
 * Created: 2025-01-27
 *
 * Email types:
 * - Dispute Opened (to both parties) - When a dispute is filed
 * - Dispute Resolved (to both parties) - When dispute is settled
 * - Dispute Update (to both parties) - Status or message update
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, infoRow, tokens } from './base';

export interface DisputeEmailData {
  disputeId: string;
  bookingId: string;
  serviceName: string;
  sessionDate: Date;
  amount: number;
  tutorName: string;
  tutorEmail: string;
  clientName: string;
  clientEmail: string;
  filedBy: 'client' | 'tutor';
  reason: string;
}

export interface DisputeResolutionData extends DisputeEmailData {
  resolution: 'refund_full' | 'refund_partial' | 'no_refund' | 'cancelled';
  refundAmount?: number;
  resolutionNotes?: string;
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
 * Create dispute details section
 */
function disputeDetailsSection(data: DisputeEmailData): string {
  const sessionDate = new Date(data.sessionDate);

  return `
    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('Booking', data.serviceName)}
      ${infoRow('Session Date', formatDate(sessionDate))}
      ${infoRow('Amount', `£${data.amount.toFixed(2)}`)}
      ${infoRow('Tutor', data.tutorName)}
      ${infoRow('Client', data.clientName)}
    </div>
  `;
}

/**
 * Send dispute opened email to client
 */
export async function sendDisputeOpenedToClientEmail(data: DisputeEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const subject = `Dispute Opened - ${data.serviceName}`;

  const isClientWhoFiled = data.filedBy === 'client';

  let body = '';

  if (isClientWhoFiled) {
    body = `
      ${paragraph(`We've received your dispute for your booking with ${bold(data.tutorName)}.`)}
      ${disputeDetailsSection(data)}
      <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.warningLight}; border-left: 4px solid ${tokens.colors.warning}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.warning}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Your Reason</p>
        <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${data.reason}</p>
      </div>
      ${paragraph('Our team will review your dispute and respond within 2-3 business days. We may contact you for additional information.')}
    `;
  } else {
    body = `
      ${paragraph(`A dispute has been opened for your booking with ${bold(data.tutorName)}.`)}
      ${disputeDetailsSection(data)}
      <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.warningLight}; border-left: 4px solid ${tokens.colors.warning}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.warning}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason Given</p>
        <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${data.reason}</p>
      </div>
      ${paragraph('Our team will review this dispute and contact you if we need any additional information. No action is required from you at this time.')}
    `;
  }

  const html = generateEmailTemplate({
    headline: 'Dispute Opened',
    variant: 'warning',
    recipientName: data.clientName,
    body,
    cta: {
      text: 'View Booking',
      url: `${siteUrl}/bookings`,
    },
    footerNote: 'Questions? Contact us at support@tutorwise.io',
  });

  return sendEmail({
    to: data.clientEmail,
    subject,
    html,
  });
}

/**
 * Send dispute opened email to tutor
 */
export async function sendDisputeOpenedToTutorEmail(data: DisputeEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const subject = `Dispute Opened - ${data.serviceName}`;

  const isTutorWhoFiled = data.filedBy === 'tutor';

  let body = '';

  if (isTutorWhoFiled) {
    body = `
      ${paragraph(`We've received your dispute for your booking with ${bold(data.clientName)}.`)}
      ${disputeDetailsSection(data)}
      <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.warningLight}; border-left: 4px solid ${tokens.colors.warning}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.warning}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Your Reason</p>
        <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${data.reason}</p>
      </div>
      ${paragraph('Our team will review your dispute and respond within 2-3 business days. We may contact you for additional information.')}
    `;
  } else {
    body = `
      ${paragraph(`A dispute has been opened for your booking with ${bold(data.clientName)}.`)}
      ${disputeDetailsSection(data)}
      <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.warningLight}; border-left: 4px solid ${tokens.colors.warning}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.warning}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason Given</p>
        <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${data.reason}</p>
      </div>
      ${paragraph('Our team will review this dispute and contact you if we need any additional information. Funds related to this booking may be held until the dispute is resolved.')}
    `;
  }

  const html = generateEmailTemplate({
    headline: 'Dispute Opened',
    variant: 'warning',
    recipientName: data.tutorName,
    body,
    cta: {
      text: 'View Booking',
      url: `${siteUrl}/bookings`,
    },
    footerNote: 'Questions? Contact us at support@tutorwise.io',
  });

  return sendEmail({
    to: data.tutorEmail,
    subject,
    html,
  });
}

/**
 * Send dispute resolved email to client
 */
export async function sendDisputeResolvedToClientEmail(data: DisputeResolutionData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const subject = `Dispute Resolved - ${data.serviceName}`;

  let resolutionText = '';
  switch (data.resolution) {
    case 'refund_full':
      resolutionText = `We've issued a full refund of £${data.amount.toFixed(2)} to your original payment method.`;
      break;
    case 'refund_partial':
      resolutionText = `We've issued a partial refund of £${data.refundAmount?.toFixed(2) || '0.00'} to your original payment method.`;
      break;
    case 'no_refund':
      resolutionText = 'After careful review, we determined that a refund is not applicable in this case.';
      break;
    case 'cancelled':
      resolutionText = 'This dispute has been cancelled.';
      break;
  }

  let body = `
    ${paragraph(`Your dispute for the booking with ${bold(data.tutorName)} has been resolved.`)}
    ${disputeDetailsSection(data)}
    <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.successLight}; border-left: 4px solid ${tokens.colors.success}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.success}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Resolution</p>
      <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${resolutionText}</p>
    </div>
  `;

  if (data.resolutionNotes) {
    body += paragraph(`${bold('Additional Notes:')} ${data.resolutionNotes}`);
  }

  if (data.resolution === 'refund_full' || data.resolution === 'refund_partial') {
    body += paragraph('Refunds typically appear in your account within 5-10 business days.');
  }

  const html = generateEmailTemplate({
    headline: 'Dispute Resolved',
    variant: 'success',
    recipientName: data.clientName,
    body,
    cta: {
      text: 'View My Bookings',
      url: `${siteUrl}/bookings`,
    },
    footerNote: 'Questions about this resolution? Contact us at support@tutorwise.io',
  });

  return sendEmail({
    to: data.clientEmail,
    subject,
    html,
  });
}

/**
 * Send dispute resolved email to tutor
 */
export async function sendDisputeResolvedToTutorEmail(data: DisputeResolutionData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const subject = `Dispute Resolved - ${data.serviceName}`;

  let resolutionText = '';
  switch (data.resolution) {
    case 'refund_full':
      resolutionText = `A full refund of £${data.amount.toFixed(2)} has been issued to the client. Your earnings from this booking have been adjusted accordingly.`;
      break;
    case 'refund_partial':
      resolutionText = `A partial refund of £${data.refundAmount?.toFixed(2) || '0.00'} has been issued to the client. Your earnings have been partially adjusted.`;
      break;
    case 'no_refund':
      resolutionText = 'After careful review, we determined that a refund is not applicable. Your earnings from this booking remain unchanged.';
      break;
    case 'cancelled':
      resolutionText = 'This dispute has been cancelled. Your earnings remain unchanged.';
      break;
  }

  let body = `
    ${paragraph(`The dispute for your booking with ${bold(data.clientName)} has been resolved.`)}
    ${disputeDetailsSection(data)}
    <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.successLight}; border-left: 4px solid ${tokens.colors.success}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.success}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Resolution</p>
      <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${resolutionText}</p>
    </div>
  `;

  if (data.resolutionNotes) {
    body += paragraph(`${bold('Additional Notes:')} ${data.resolutionNotes}`);
  }

  const html = generateEmailTemplate({
    headline: 'Dispute Resolved',
    variant: 'success',
    recipientName: data.tutorName,
    body,
    cta: {
      text: 'View My Earnings',
      url: `${siteUrl}/wallet`,
    },
    footerNote: 'Questions about this resolution? Contact us at support@tutorwise.io',
  });

  return sendEmail({
    to: data.tutorEmail,
    subject,
    html,
  });
}

/**
 * Send dispute emails to both parties
 */
export async function sendDisputeOpenedEmails(data: DisputeEmailData) {
  const results = { client: false, tutor: false };

  try {
    await sendDisputeOpenedToClientEmail(data);
    results.client = true;
  } catch (err) {
    console.error('[Dispute Email] Failed to send to client:', err);
  }

  try {
    await sendDisputeOpenedToTutorEmail(data);
    results.tutor = true;
  } catch (err) {
    console.error('[Dispute Email] Failed to send to tutor:', err);
  }

  return results;
}

/**
 * Send dispute resolution emails to both parties
 */
export async function sendDisputeResolvedEmails(data: DisputeResolutionData) {
  const results = { client: false, tutor: false };

  try {
    await sendDisputeResolvedToClientEmail(data);
    results.client = true;
  } catch (err) {
    console.error('[Dispute Email] Failed to send resolution to client:', err);
  }

  try {
    await sendDisputeResolvedToTutorEmail(data);
    results.tutor = true;
  } catch (err) {
    console.error('[Dispute Email] Failed to send resolution to tutor:', err);
  }

  return results;
}
