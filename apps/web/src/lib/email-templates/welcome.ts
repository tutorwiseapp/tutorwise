/**
 * Filename: apps/web/src/lib/email-templates/welcome.ts
 * Purpose: Welcome email sent after email confirmation
 * Created: 2025-01-27
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, tokens } from './base';

/**
 * Helper to create a feature list item for welcome email
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

export interface WelcomeEmailParams {
  to: string;
  userName: string;
}

/**
 * Send welcome email to new users after email confirmation
 */
export async function sendWelcomeEmail({ to, userName }: WelcomeEmailParams) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

  const subject = `Welcome to Tutorwise, ${userName}!`;

  const body = `
    ${paragraph(`We're excited to have you join the Tutorwise community! Your account is now active and ready to go.`)}

    ${paragraph(`${bold("Here's how to get started:")}`)}

    <div style="margin: 24px 0;">
      ${featureItem('👤', 'Complete Your Profile', 'Add your details, skills, and a photo to help others find you')}
      ${featureItem('🔍', 'Explore the Marketplace', 'Discover tutors, listings, and opportunities that match your interests')}
      ${featureItem('🤝', 'Build Your Network', 'Connect with tutors, agents, and clients to grow together')}
    </div>

    ${paragraph(`Need help getting started? Visit our ${`<a href="${siteUrl}/help-centre" style="color: ${tokens.colors.primary}; text-decoration: underline;">Help Centre</a>`} for guides and FAQs.`)}
  `;

  const html = generateEmailTemplate({
    headline: 'Welcome to Tutorwise!',
    variant: 'success',
    recipientName: userName,
    body,
    cta: {
      text: 'Get Started',
      url: `${siteUrl}/onboarding`,
    },
    footerNote: "Questions? We're here to help at support@tutorwise.io",
  });

  return sendEmail({ to, subject, html });
}
