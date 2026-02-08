/**
 * Filename: apps/web/src/lib/email.ts
 * Purpose: Email service using Resend API
 * Created: 2025-11-07
 * Updated: 2025-01-27 - Refactored to use base email template
 */

import { Resend } from 'resend';
import { generateEmailTemplate, paragraph, bold, link, tokens } from './email-templates/base';

// Lazy initialization to avoid build-time errors when env var is not set
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send email using Resend
 */
export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html, from, replyTo } = options;

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: from || process.env.RESEND_FROM_EMAIL || 'Tutorwise <noreply@tutorwise.io>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: replyTo || process.env.RESEND_REPLY_TO_EMAIL,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('[email] Send error:', error);
    throw error;
  }
}

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
 * Send connection invitation email to new users
 */
export async function sendConnectionInvitation({
  to,
  senderName,
  referralUrl,
}: {
  to: string;
  senderName: string;
  referralUrl: string;
}) {
  const subject = `${senderName} invited you to join Tutorwise`;

  const body = `
    ${paragraph(`${bold(senderName)} has invited you to join Tutorwise, a professional tutoring network where tutors, agents, and clients connect to grow together.`)}
    <div style="margin: 24px 0;">
      ${featureItem('🤝', 'Build Your Network', 'Connect with tutors, agents, and clients in your field')}
      ${featureItem('💰', 'Earn Commissions', 'Refer others and earn 10% lifetime commission on their bookings')}
      ${featureItem('🚀', 'Grow Together', 'Collaborate with your network to amplify your reach')}
    </div>
  `;

  const html = generateEmailTemplate({
    headline: "You're invited to Tutorwise",
    variant: 'default',
    body,
    cta: {
      text: 'Join Tutorwise',
      url: referralUrl,
    },
    footerNote: `Or copy and paste this link: ${link(referralUrl, referralUrl)}`,
  });

  return sendEmail({ to, subject, html });
}

/**
 * Send connection request notification to existing user
 */
export async function sendConnectionRequestNotification({
  to,
  senderName,
  senderEmail,
  message,
  networkUrl,
}: {
  to: string;
  senderName: string;
  senderEmail: string;
  message?: string;
  networkUrl: string;
}) {
  const subject = `${senderName} wants to connect with you on Tutorwise`;

  let body = paragraph(`${bold(senderName)} (${senderEmail}) has sent you a connection request on Tutorwise.`);

  if (message) {
    body += `
      <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.background}; border-left: 4px solid ${tokens.colors.primary}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Message:</p>
        <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary}; font-style: italic;">"${message}"</p>
      </div>
    `;
  }

  const html = generateEmailTemplate({
    headline: 'New Connection Request',
    variant: 'default',
    body,
    cta: {
      text: 'View Request',
      url: networkUrl,
    },
    footerNote: `Or copy and paste this link: ${link(networkUrl, networkUrl)}`,
  });

  return sendEmail({ to, subject, html });
}

/**
 * Send organisation invitation email to new users
 */
export async function sendOrganisationInvitation({
  to,
  senderName,
  organisationName,
  referralUrl,
}: {
  to: string;
  senderName: string;
  organisationName: string;
  referralUrl: string;
}) {
  const subject = `${senderName} invited you to join ${organisationName} on Tutorwise`;

  const body = `
    ${paragraph(`${bold(senderName)} has invited you to join ${bold(organisationName)} on Tutorwise - a professional tutoring network where organisations, tutors, and clients connect to grow together.`)}
    <div style="margin: 24px 0;">
      ${featureItem('🏢', 'Join an Organisation', `Become part of ${organisationName} and collaborate with your team`)}
      ${featureItem('🤝', 'Build Your Network', 'Connect with tutors, agents, and clients in your field')}
      ${featureItem('🚀', 'Grow Together', 'Collaborate with your organisation to amplify your reach')}
    </div>
  `;

  const html = generateEmailTemplate({
    headline: `Join ${organisationName}`,
    variant: 'default',
    body,
    cta: {
      text: 'Join Tutorwise',
      url: referralUrl,
    },
    footerNote: `Or copy and paste this link: ${link(referralUrl, referralUrl)}`,
  });

  return sendEmail({ to, subject, html });
}

/**
 * Send student invitation email (Guardian Link)
 * Guardian invites a student to create an account and link with them
 */
export async function sendStudentInvitation({
  to,
  guardianName,
  guardianEmail,
  invitationUrl,
}: {
  to: string;
  guardianName: string;
  guardianEmail: string;
  invitationUrl: string;
}) {
  const subject = `${guardianName} invited you to join Tutorwise`;

  const body = `
    ${paragraph(`${bold(guardianName)} has invited you to create a student account on Tutorwise.`)}

    ${paragraph(`Once you accept this invitation, ${guardianName} will be able to book and manage tutoring sessions on your behalf.`)}

    ${paragraph(`${bold("What you'll get:")}`)}

    <div style="margin: 24px 0;">
      ${featureItem('📚', 'Personalized Learning', 'Access one-to-one tutoring tailored to your needs')}
      ${featureItem('🎯', 'Track Your Progress', 'Your guardian can help you stay on top of your sessions')}
      ${featureItem('⭐', 'Quality Tutors', 'Connect with verified, credible tutors in your subjects')}
    </div>

    ${paragraph(`<span style="color: ${tokens.colors.textMuted}; font-size: 14px;">This invitation will expire in 7 days. If you have any questions, please contact ${guardianEmail}.</span>`)}
  `;

  const html = generateEmailTemplate({
    headline: "You're invited to Tutorwise",
    variant: 'default',
    body,
    cta: {
      text: 'Accept Invitation',
      url: invitationUrl,
    },
    footerNote: `Questions? Contact ${guardianEmail}`,
  });

  return sendEmail({ to, subject, html });
}
