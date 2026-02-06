/**
 * Filename: apps/web/src/lib/email/referral-invitation.ts
 * Purpose: Referral invitation email for new user signups
 * Created: 2025-02-05
 * Spec: Sent when a user creates a referral via API or UI
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, link, tokens } from '../email-templates/base';

/**
 * Helper to create a feature list item
 */
function featureItem(emoji: string, title: string, description: string): string {
  return `
    <div style="padding: 12px 16px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; margin-bottom: 8px;">
      <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">
        <strong style="color: ${tokens.colors.primary};">${emoji} ${title}</strong><br/>
        <span style="color: ${tokens.colors.textMuted}; font-size: 14px;">${description}</span>
      </p>
    </div>
  `;
}

/**
 * Send referral invitation email to a new user
 */
export async function sendReferralInvitationEmail({
  to,
  referredName,
  referrerName,
  referralLink,
}: {
  to: string;
  referredName?: string;
  referrerName: string;
  referralLink: string;
}) {
  const subject = `${referrerName} invited you to join Tutorwise`;

  const body = `
    ${paragraph(`${bold(referrerName)} thinks you'd be a great fit for Tutorwise - the professional tutoring marketplace where tutors, agents, and clients connect to grow together.`)}
    <div style="margin: 24px 0;">
      ${featureItem('📚', 'Find or Offer Tutoring', 'Connect with tutors and clients in your field')}
      ${featureItem('💰', 'Earn Referral Commissions', 'Earn 10% lifetime commission when you refer others')}
      ${featureItem('🌐', 'Build Your Network', 'Grow your professional tutoring connections')}
    </div>
    ${paragraph("Join now and start building your tutoring network!")}
  `;

  const html = generateEmailTemplate({
    headline: "You're invited to Tutorwise",
    variant: 'default',
    recipientName: referredName,
    body,
    cta: {
      text: 'Accept Invitation',
      url: referralLink,
    },
    footerNote: `Or copy and paste this link: ${link(referralLink, referralLink)}`,
  });

  return sendEmail({ to, subject, html });
}
