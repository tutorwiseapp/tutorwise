/**
 * Filename: apps/web/src/lib/email-templates/account.ts
 * Purpose: Account-related email templates (deletion, etc.)
 * Created: 2025-01-27
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, infoRow, tokens } from './base';

export interface AccountDeletedEmailData {
  userName: string;
  userEmail: string;
  userId: string;
  deletedAt: Date;
  hadStripeAccount?: boolean;
  hadStripeCustomer?: boolean;
}

/**
 * Send confirmation email when user deletes their account
 */
export async function sendAccountDeletedEmail(data: AccountDeletedEmailData) {
  const { userName, userEmail, deletedAt } = data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

  const subject = 'Your Tutorwise Account Has Been Deleted';

  const formattedDate = deletedAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const body = `
    ${paragraph(`We're sorry to see you go. Your Tutorwise account has been successfully deleted on ${bold(formattedDate)}.`)}

    <div style="margin: 24px 0; padding: 20px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0 0 12px 0; font-size: 15px; color: ${tokens.colors.textPrimary}; font-weight: 600;">What's been deleted:</p>
      <ul style="margin: 0; padding-left: 20px; color: ${tokens.colors.textMuted}; font-size: 14px; line-height: 1.8;">
        <li>Your profile and personal information</li>
        <li>All bookings and session history</li>
        <li>Reviews you've given and received</li>
        <li>Payment methods and transaction history</li>
        <li>Connected Stripe accounts</li>
      </ul>
    </div>

    ${paragraph("If you didn't request this deletion or believe this was done in error, please contact our support team immediately.")}

    <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.warningLight}; border-left: 4px solid ${tokens.colors.warning}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Note:</strong> Some anonymised data may be retained for legal and compliance purposes as outlined in our Privacy Policy.
      </p>
    </div>

    ${paragraph('Thank you for being part of the Tutorwise community. We hope to see you again in the future!')}
  `;

  const html = generateEmailTemplate({
    headline: 'Account Deleted',
    variant: 'default',
    recipientName: userName,
    body,
    cta: {
      text: 'Visit Tutorwise',
      url: siteUrl,
    },
    footerNote: 'Changed your mind? You can always create a new account at tutorwise.io',
  });

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

/**
 * Send notification to admin when a user deletes their account
 */
export async function sendAccountDeletedAdminNotification(data: AccountDeletedEmailData) {
  const { userName, userEmail, userId, deletedAt, hadStripeAccount, hadStripeCustomer } = data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@tutorwise.io';

  const subject = `User Account Deleted - ${userName}`;

  const formattedDate = deletedAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = deletedAt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const body = `
    ${paragraph(`A user has deleted their Tutorwise account.`)}

    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      ${infoRow('User Name', userName)}
      ${infoRow('Email', userEmail)}
      ${infoRow('User ID', userId)}
      ${infoRow('Deleted At', `${formattedDate} at ${formattedTime}`)}
      ${infoRow('Had Stripe Connect', hadStripeAccount ? 'Yes (Deleted)' : 'No')}
      ${infoRow('Had Stripe Customer', hadStripeCustomer ? 'Yes (Deleted)' : 'No')}
    </div>

    ${paragraph('All associated data has been cascade deleted from the database. Anonymised records may be retained for compliance purposes.')}
  `;

  const html = generateEmailTemplate({
    headline: 'User Account Deleted',
    variant: 'warning',
    body,
    cta: {
      text: 'View Admin Dashboard',
      url: `${siteUrl}/admin`,
    },
  });

  return sendEmail({
    to: adminEmail,
    subject,
    html,
  });
}

/**
 * Send email when admin deletes/deactivates a user account
 */
export async function sendAdminDeletedAccountEmail(data: AccountDeletedEmailData & {
  deletionType: 'soft' | 'hard';
  reason?: string;
  adminName?: string;
}) {
  const { userName, userEmail, deletedAt, deletionType, reason } = data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

  const subject = deletionType === 'soft'
    ? 'Your Tutorwise Account Has Been Deactivated'
    : 'Your Tutorwise Account Has Been Deleted';

  const formattedDate = deletedAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const headline = deletionType === 'soft' ? 'Account Deactivated' : 'Account Deleted';

  let body = '';

  if (deletionType === 'soft') {
    body = `
      ${paragraph(`Your Tutorwise account has been deactivated by an administrator on ${bold(formattedDate)}.`)}

      <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.warningLight}; border-left: 4px solid ${tokens.colors.warning}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          Your account has been deactivated and your personal information has been anonymised. You can no longer access the platform with this account.
        </p>
      </div>

      ${reason ? `
        <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius};">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason provided:</p>
          <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${reason}</p>
        </div>
      ` : ''}

      ${paragraph('If you believe this was done in error, please contact our support team.')}
    `;
  } else {
    body = `
      ${paragraph(`Your Tutorwise account has been permanently deleted by an administrator on ${bold(formattedDate)}.`)}

      <div style="margin: 24px 0; padding: 20px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius};">
        <p style="margin: 0 0 12px 0; font-size: 15px; color: ${tokens.colors.textPrimary}; font-weight: 600;">What's been deleted:</p>
        <ul style="margin: 0; padding-left: 20px; color: ${tokens.colors.textMuted}; font-size: 14px; line-height: 1.8;">
          <li>Your profile and personal information</li>
          <li>All bookings and session history</li>
          <li>Reviews you've given and received</li>
          <li>Payment methods and transaction history</li>
        </ul>
      </div>

      ${reason ? `
        <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius};">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason provided:</p>
          <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">${reason}</p>
        </div>
      ` : ''}

      ${paragraph('If you believe this was done in error, please contact our support team immediately.')}
    `;
  }

  const html = generateEmailTemplate({
    headline,
    variant: deletionType === 'soft' ? 'warning' : 'error',
    recipientName: userName,
    body,
    cta: {
      text: 'Contact Support',
      url: `${siteUrl}/help-centre`,
    },
  });

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

/**
 * Send admin-initiated deletion emails (to user and admin)
 */
export async function sendAdminDeletionEmails(data: AccountDeletedEmailData & {
  deletionType: 'soft' | 'hard';
  reason?: string;
  adminName?: string;
}) {
  const results = {
    user: false,
    admin: false,
  };

  // Send to user
  try {
    await sendAdminDeletedAccountEmail(data);
    results.user = true;
    console.log('[Account Email] Sent admin deletion notification to user:', data.userEmail);
  } catch (err) {
    console.error('[Account Email] Failed to send to user:', err);
  }

  // Send to admin (confirmation of action)
  try {
    await sendAccountDeletedAdminNotification(data);
    results.admin = true;
    console.log('[Account Email] Sent admin deletion confirmation to admin');
  } catch (err) {
    console.error('[Account Email] Failed to send to admin:', err);
  }

  return results;
}

/**
 * Send both user confirmation and admin notification for account deletion
 */
export async function sendAccountDeletionEmails(data: AccountDeletedEmailData) {
  const results = {
    user: false,
    admin: false,
  };

  // Send to user
  try {
    await sendAccountDeletedEmail(data);
    results.user = true;
    console.log('[Account Email] Sent deletion confirmation to user:', data.userEmail);
  } catch (err) {
    console.error('[Account Email] Failed to send to user:', err);
  }

  // Send to admin
  try {
    await sendAccountDeletedAdminNotification(data);
    results.admin = true;
    console.log('[Account Email] Sent deletion notification to admin');
  } catch (err) {
    console.error('[Account Email] Failed to send to admin:', err);
  }

  return results;
}
