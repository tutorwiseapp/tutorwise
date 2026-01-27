/**
 * Filename: apps/web/src/lib/email-templates/admin.ts
 * Purpose: Email templates for admin notifications
 * Created: 2025-12-23
 * Updated: 2025-01-27 - Refactored to use base email template
 */

import {
  generateEmailTemplate,
  paragraph,
  bold,
  link,
  stageTransition,
  tokens,
} from './base';

export interface AdminEmailData {
  recipientName?: string;
  actorName: string;
  actorEmail: string;
  role?: string;
  reason?: string;
  adminUrl: string;
}

/**
 * Helper to create a warning/notice box
 */
function warningBox(content: string): string {
  return `
    <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.warningLight}; border-left: 4px solid ${tokens.colors.warning}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">${content}</p>
    </div>
  `;
}

/**
 * Helper to create a reason box
 */
function reasonBox(reason: string, variant: 'default' | 'error' = 'default'): string {
  const borderColor = variant === 'error' ? tokens.colors.error : tokens.colors.primary;
  const bgColor = variant === 'error' ? tokens.colors.errorLight : tokens.colors.background;

  return `
    <div style="margin: 24px 0; padding: 16px 20px; background: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: ${tokens.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason:</p>
      <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary}; line-height: 1.6;">${reason}</p>
    </div>
  `;
}

/**
 * Email template for when admin access is granted
 */
export function adminAccessGrantedEmail(data: AdminEmailData): { subject: string; html: string } {
  const { recipientName, actorName, actorEmail, role, reason, adminUrl } = data;

  const subject = `Admin Access Granted - Tutorwise`;

  let body = paragraph(`You have been granted ${bold(role || 'admin')} access to the Tutorwise Admin Dashboard by ${bold(actorName)} (${actorEmail}).`);

  if (reason) {
    body += reasonBox(reason);
  }

  body += warningBox(`<strong>⚠️ Important:</strong> As an admin, you have special permissions to manage the Tutorwise platform. Please use these permissions responsibly and follow our admin guidelines.`);

  const html = generateEmailTemplate({
    headline: 'Admin Access Granted',
    variant: 'success',
    recipientName: recipientName || undefined,
    body,
    cta: {
      text: 'Access Admin Dashboard',
      url: adminUrl,
    },
    footerNote: `Or copy and paste this link: ${link(adminUrl, adminUrl)}`,
  });

  return { subject, html };
}

/**
 * Email template for when admin role is changed
 */
export function adminRoleChangedEmail(data: AdminEmailData & { oldRole: string; newRole: string }): { subject: string; html: string } {
  const { recipientName, actorName, actorEmail, oldRole, newRole, reason, adminUrl } = data;

  const subject = `Admin Role Updated - Tutorwise`;

  let body = paragraph(`Your admin role has been updated by ${bold(actorName)} (${actorEmail}).`);
  body += stageTransition(oldRole, newRole);

  if (reason) {
    body += reasonBox(reason);
  }

  const html = generateEmailTemplate({
    headline: 'Admin Role Updated',
    variant: 'default',
    recipientName: recipientName || undefined,
    body,
    cta: {
      text: 'Access Admin Dashboard',
      url: adminUrl,
    },
    footerNote: `Or copy and paste this link: ${link(adminUrl, adminUrl)}`,
  });

  return { subject, html };
}

/**
 * Email template for when admin access is revoked
 */
export function adminAccessRevokedEmail(data: AdminEmailData): { subject: string; html: string } {
  const { recipientName, actorName, actorEmail, role, reason, adminUrl } = data;

  const subject = `Admin Access Revoked - Tutorwise`;

  let body = paragraph(`Your ${bold(role || 'admin')} access to the Tutorwise Admin Dashboard has been revoked by ${bold(actorName)} (${actorEmail}).`);

  if (reason) {
    body += reasonBox(reason, 'error');
  }

  body += `
    <div style="margin: 24px 0; padding: 16px 20px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0; font-size: 14px; color: ${tokens.colors.textPrimary}; line-height: 1.6;">
        You no longer have access to the admin dashboard. If you believe this is a mistake, please contact the Tutorwise team.
      </p>
    </div>
  `;

  const html = generateEmailTemplate({
    headline: 'Admin Access Revoked',
    variant: 'error',
    recipientName: recipientName || undefined,
    body,
    cta: {
      text: 'Visit Tutorwise',
      url: adminUrl.replace('/admin', ''),
    },
  });

  return { subject, html };
}
