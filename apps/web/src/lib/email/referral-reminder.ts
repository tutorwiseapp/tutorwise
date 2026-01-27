/**
 * Filename: apps/web/src/lib/email/referral-reminder.ts
 * Purpose: Referral reminder email template
 * Created: 2025-12-07
 * Updated: 2025-01-27 - Refactored to use base email template
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, link } from '../email-templates/base';

/**
 * Send referral reminder email
 */
export async function sendReferralReminderEmail({
  to,
  referredName,
  referrerName,
  daysSinceReferral,
  referralLink,
}: {
  to: string;
  referredName: string;
  referrerName: string;
  daysSinceReferral: number;
  referralLink: string;
}) {
  const subject = 'Your connection is waiting for you on Tutorwise';

  const daysText = daysSinceReferral === 1 ? 'day' : 'days';

  const body = `
    ${paragraph(`${bold(referrerName)} invited you to join Tutorwise ${bold(`${daysSinceReferral} ${daysText} ago`)}.`)}
    ${paragraph("Don't miss out on the opportunity to connect with a growing network of tutors, agents, and clients—and start earning commissions on referrals!")}
  `;

  const html = generateEmailTemplate({
    headline: 'Your invitation is waiting',
    variant: 'default',
    recipientName: referredName,
    body,
    cta: {
      text: 'Get Started',
      url: referralLink,
    },
    footerNote: `Or copy and paste this link: ${link(referralLink, referralLink)}`,
  });

  return sendEmail({ to, subject, html });
}
