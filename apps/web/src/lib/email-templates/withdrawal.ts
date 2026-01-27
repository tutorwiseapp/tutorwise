/**
 * Filename: apps/web/src/lib/email-templates/withdrawal.ts
 * Purpose: Withdrawal/Payout email templates
 * Created: 2025-01-27
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, infoRow, tokens } from './base';

export interface WithdrawalEmailData {
  userName: string;
  userEmail: string;
  amount: number;
  transactionId: string;
  payoutId?: string;
  estimatedArrival?: Date;
  bankLast4?: string;
}

/**
 * Send email when withdrawal/payout is processed successfully
 */
export async function sendWithdrawalProcessedEmail(data: WithdrawalEmailData) {
  const { userName, userEmail, amount, transactionId, payoutId, estimatedArrival, bankLast4 } = data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

  const subject = `Withdrawal Processed - £${amount.toFixed(2)}`;

  const arrivalDate = estimatedArrival
    ? new Date(estimatedArrival).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '2-3 business days';

  const body = `
    ${paragraph(`Your withdrawal request has been processed and the funds are on their way to your bank account.`)}

    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('Amount', `£${amount.toFixed(2)}`)}
      ${infoRow('Transaction ID', transactionId)}
      ${payoutId ? infoRow('Payout Reference', payoutId) : ''}
      ${bankLast4 ? infoRow('Bank Account', `****${bankLast4}`) : ''}
      ${infoRow('Estimated Arrival', arrivalDate)}
    </div>

    <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.successLight}; border-left: 4px solid ${tokens.colors.success}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0; font-size: 14px; color: #065f46;">
        <strong>Funds in transit:</strong> Your money is being transferred to your bank. Arrival times depend on your bank's processing speed.
      </p>
    </div>

    ${paragraph("If you don't see the funds in your account after 5 business days, please contact our support team with your transaction ID.")}
  `;

  const html = generateEmailTemplate({
    headline: 'Withdrawal Processed',
    variant: 'success',
    recipientName: userName,
    body,
    cta: {
      text: 'View Transaction History',
      url: `${siteUrl}/financials`,
    },
    footerNote: 'Keep this email for your records.',
  });

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

/**
 * Send email when withdrawal fails
 */
export async function sendWithdrawalFailedEmail(data: WithdrawalEmailData & { reason?: string }) {
  const { userName, userEmail, amount, transactionId, reason } = data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

  const subject = `Withdrawal Failed - £${amount.toFixed(2)}`;

  let body = paragraph(`Unfortunately, your withdrawal request for ${bold(`£${amount.toFixed(2)}`)} could not be processed.`);

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
      ${infoRow('Transaction ID', transactionId)}
      ${infoRow('Status', 'Failed')}
    </div>
  `;

  body += paragraph('Your funds remain in your Tutorwise balance. Please check your bank account details and try again, or contact support if the issue persists.');

  const html = generateEmailTemplate({
    headline: 'Withdrawal Failed',
    variant: 'error',
    recipientName: userName,
    body,
    cta: {
      text: 'Check Payment Settings',
      url: `${siteUrl}/financials/setup`,
    },
    footerNote: 'Need help? Contact support@tutorwise.io',
  });

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}
