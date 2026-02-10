/**
 * Filename: apps/web/src/lib/email-templates/payment.ts
 * Purpose: Payment-related email templates
 * Created: 2025-01-27
 *
 * Email types:
 * - Payment Receipt (to client) - Confirmation after successful payment
 * - Payment Failed (to client) - Notification of failed payment
 * - Refund Processed (to client) - Confirmation of refund
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, infoRow, tokens } from './base';

export interface PaymentEmailData {
  bookingId: string;
  serviceName: string;
  sessionDate: Date;
  sessionDuration: number;
  amount: number;
  subjects?: string[];
  tutorName: string;
  clientName: string;
  clientEmail: string;
  paymentMethod?: string; // e.g., "Visa ending in 4242"
  stripeReceiptUrl?: string;
}

export interface RefundEmailData {
  bookingId: string;
  serviceName: string;
  sessionDate: Date;
  amount: number;
  refundAmount: number;
  tutorName: string;
  clientName: string;
  clientEmail: string;
  reason?: string;
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
 * Create payment details section
 */
function paymentDetailsSection(data: PaymentEmailData): string {
  const sessionDate = new Date(data.sessionDate);
  const subjects = data.subjects?.length ? data.subjects.join(', ') : data.serviceName;

  return `
    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('Service', data.serviceName)}
      ${infoRow('Tutor', data.tutorName)}
      ${infoRow('Date', formatDate(sessionDate))}
      ${infoRow('Time', formatTime(sessionDate))}
      ${infoRow('Duration', formatDuration(data.sessionDuration))}
      ${data.subjects?.length ? infoRow('Subject', subjects) : ''}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0; border-top: 1px solid ${tokens.colors.border}; margin-top: 8px; padding-top: 8px;">
        <tr>
          <td style="padding: 8px 0; color: ${tokens.colors.textPrimary}; font-size: 16px; font-weight: 600;">Total Paid</td>
          <td style="padding: 8px 0; color: ${tokens.colors.success}; font-weight: 700; font-size: 18px; text-align: right;">£${data.amount.toFixed(2)}</td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Send payment receipt email to client after successful payment
 */
export async function sendPaymentReceiptEmail(data: PaymentEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const _sessionDate = new Date(data.sessionDate);
  const subject = `Payment Confirmed - £${data.amount.toFixed(2)}`;

  let body = `
    ${paragraph(`Thank you for your payment! Your booking with ${bold(data.tutorName)} is confirmed.`)}
    ${paymentDetailsSection(data)}
  `;

  if (data.paymentMethod) {
    body += paragraph(`Payment method: ${data.paymentMethod}`);
  }

  body += paragraph(`We'll send you a reminder before your session. If you need to make any changes, please visit your dashboard.`);

  // Add receipt link if available
  if (data.stripeReceiptUrl) {
    body += `
      <div style="margin: 16px 0; padding: 12px 16px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0; font-size: 14px; color: ${tokens.colors.textMuted};">
          <a href="${data.stripeReceiptUrl}" style="color: ${tokens.colors.primary}; text-decoration: underline;">View your receipt on Stripe</a>
        </p>
      </div>
    `;
  }

  const html = generateEmailTemplate({
    headline: 'Payment Confirmed',
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
 * Send payment failed notification to client
 */
export async function sendPaymentFailedEmail(data: PaymentEmailData, failureReason?: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const subject = `Payment Failed - Action Required`;

  let body = `
    ${paragraph(`Unfortunately, we were unable to process your payment for the booking with ${bold(data.tutorName)}.`)}
  `;

  if (failureReason) {
    body += `
      <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.errorLight}; border-left: 4px solid ${tokens.colors.error}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.error}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason</p>
        <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${failureReason}</p>
      </div>
    `;
  }

  body += `
    ${paragraph(`Amount: ${bold(`£${data.amount.toFixed(2)}`)}`)}
    ${paragraph(`Please try again with a different payment method, or contact your bank if the issue persists.`)}
  `;

  const html = generateEmailTemplate({
    headline: 'Payment Failed',
    variant: 'error',
    recipientName: data.clientName,
    body,
    cta: {
      text: 'Retry Payment',
      url: `${siteUrl}/bookings`,
    },
    footerNote: `Need help? Contact us at support@tutorwise.io`,
  });

  return sendEmail({
    to: data.clientEmail,
    subject,
    html,
  });
}

/**
 * Send refund confirmation email to client
 */
export async function sendRefundProcessedEmail(data: RefundEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const sessionDate = new Date(data.sessionDate);
  const subject = `Refund Processed - £${data.refundAmount.toFixed(2)}`;

  let body = `
    ${paragraph(`Your refund has been processed successfully. The funds should appear in your account within 5-10 business days.`)}

    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('Original Booking', data.serviceName)}
      ${infoRow('Tutor', data.tutorName)}
      ${infoRow('Session Date', formatDate(sessionDate))}
      ${infoRow('Original Amount', `£${data.amount.toFixed(2)}`)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0; border-top: 1px solid ${tokens.colors.border}; margin-top: 8px; padding-top: 8px;">
        <tr>
          <td style="padding: 8px 0; color: ${tokens.colors.textPrimary}; font-size: 16px; font-weight: 600;">Refund Amount</td>
          <td style="padding: 8px 0; color: ${tokens.colors.success}; font-weight: 700; font-size: 18px; text-align: right;">£${data.refundAmount.toFixed(2)}</td>
        </tr>
      </table>
    </div>
  `;

  if (data.reason) {
    body += `
      <div style="margin: 16px 0; padding: 12px 16px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: ${tokens.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Reason</p>
        <p style="margin: 0; font-size: 14px; color: ${tokens.colors.textSecondary};">${data.reason}</p>
      </div>
    `;
  }

  body += paragraph(`If you have any questions about this refund, please don't hesitate to contact us.`);

  const html = generateEmailTemplate({
    headline: 'Refund Processed',
    variant: 'success',
    recipientName: data.clientName,
    body,
    cta: {
      text: 'Find Another Tutor',
      url: `${siteUrl}/search`,
    },
    footerNote: `Need help? Visit our Help Centre at ${siteUrl}/help-centre`,
  });

  return sendEmail({
    to: data.clientEmail,
    subject,
    html,
  });
}
