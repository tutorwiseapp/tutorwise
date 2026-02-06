/**
 * Filename: apps/web/src/lib/email/commission-available.ts
 * Purpose: Email notifications for referral commission payouts
 * Created: 2025-02-05
 * Updated: 2025-02-05 - Aligned with existing email template style
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, infoRow, tokens } from '../email-templates/base';

export interface CommissionEmailData {
  to: string;
  userName: string;
  amount: number;
  transactionId?: string;
  payoutId?: string;
  estimatedArrival?: Date;
  totalBalance?: number;
}

/**
 * Send email when commission is available for withdrawal
 */
export async function sendCommissionAvailableEmail({
  to,
  userName,
  amount,
  totalBalance,
}: CommissionEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const subject = `£${amount.toFixed(2)} Commission Available for Withdrawal`;

  const body = `
    ${paragraph(`Great news! Your referral commission of ${bold(`£${amount.toFixed(2)}`)} has cleared the 7-day holding period and is now available for withdrawal.`)}

    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('Amount Available', `£${amount.toFixed(2)}`)}
      ${totalBalance ? infoRow('Total Balance', `£${totalBalance.toFixed(2)}`) : ''}
      ${infoRow('Status', 'Ready for withdrawal')}
    </div>

    <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.successLight}; border-left: 4px solid ${tokens.colors.success}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0; font-size: 14px; color: #065f46;">
        <strong>Automatic payouts:</strong> If you don't withdraw manually, this will be automatically paid out on the next Friday at 10am.
      </p>
    </div>

    ${paragraph("You can withdraw your available balance anytime, or let it accumulate for the weekly automatic payout.")}
  `;

  const html = generateEmailTemplate({
    headline: 'Commission Available',
    variant: 'success',
    recipientName: userName,
    body,
    cta: {
      text: 'Withdraw Now',
      url: `${siteUrl}/financials/payouts`,
    },
    footerNote: 'Minimum withdrawal amount is £25.',
  });

  return sendEmail({ to, subject, html });
}

/**
 * Send email when automatic payout is processed
 */
export async function sendPayoutProcessedEmail({
  to,
  userName,
  amount,
  estimatedArrival,
  payoutId,
}: CommissionEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const subject = `Weekly Payout Processed - £${amount.toFixed(2)}`;

  const arrivalDate = estimatedArrival
    ? new Date(estimatedArrival).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '2-3 business days';

  const body = `
    ${paragraph(`Your weekly commission payout has been processed and the funds are on their way to your bank account.`)}

    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('Amount', `£${amount.toFixed(2)}`)}
      ${payoutId ? infoRow('Payout Reference', payoutId) : ''}
      ${infoRow('Estimated Arrival', arrivalDate)}
      ${infoRow('Type', 'Weekly automatic payout')}
    </div>

    <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.successLight}; border-left: 4px solid ${tokens.colors.success}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0; font-size: 14px; color: #065f46;">
        <strong>Funds in transit:</strong> Your commission is being transferred to your bank. Arrival times depend on your bank's processing speed.
      </p>
    </div>

    ${paragraph("Thank you for being part of the Tutorwise referral network! Keep referring to earn more commissions.")}
  `;

  const html = generateEmailTemplate({
    headline: 'Weekly Payout Processed',
    variant: 'success',
    recipientName: userName,
    body,
    cta: {
      text: 'View Transaction History',
      url: `${siteUrl}/financials`,
    },
    footerNote: 'Keep this email for your records.',
  });

  return sendEmail({ to, subject, html });
}

/**
 * Send email when a payout fails
 */
export async function sendPayoutFailedEmail({
  to,
  userName,
  amount,
  reason,
}: CommissionEmailData & { reason?: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const subject = `Payout Failed - £${amount.toFixed(2)}`;

  let body = paragraph(`Unfortunately, your weekly commission payout of ${bold(`£${amount.toFixed(2)}`)} could not be processed.`);

  if (reason) {
    body += `
      <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.errorLight}; border-left: 4px solid ${tokens.colors.error}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason:</p>
        <p style="margin: 0; font-size: 15px; color: #991b1b;">${reason}</p>
      </div>
    `;
  }

  body += `
    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('Amount', `£${amount.toFixed(2)}`)}
      ${infoRow('Status', 'Failed - will retry next Friday')}
    </div>
  `;

  body += paragraph('Your funds remain in your Tutorwise balance. We will automatically retry the payout next Friday. If this issue persists, please check your bank account details or contact support.');

  const html = generateEmailTemplate({
    headline: 'Payout Failed',
    variant: 'error',
    recipientName: userName,
    body,
    cta: {
      text: 'Check Payment Settings',
      url: `${siteUrl}/financials/setup`,
    },
    footerNote: 'Need help? Contact support@tutorwise.io',
  });

  return sendEmail({ to, subject, html });
}
