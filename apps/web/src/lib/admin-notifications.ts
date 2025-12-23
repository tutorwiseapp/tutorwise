/**
 * Filename: apps/web/src/lib/admin-notifications.ts
 * Purpose: Helper functions for admin notification emails
 * Created: 2025-12-23
 */

import {
  adminAccessGrantedEmail,
  adminRoleChangedEmail,
  adminAccessRevokedEmail,
  type AdminEmailData,
} from './email-templates/admin';

/**
 * Generate email content based on notification type
 */
export function generateAdminNotificationEmail(
  notificationType: string,
  metadata: any
): { subject: string; html: string } {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin`;

  switch (notificationType) {
    case 'admin_granted':
      return adminAccessGrantedEmail({
        recipientName: metadata.recipientName || metadata.targetName,
        actorName: metadata.actorName,
        actorEmail: metadata.actorEmail,
        role: metadata.role,
        reason: metadata.reason,
        adminUrl,
      });

    case 'admin_role_changed':
      return adminRoleChangedEmail({
        recipientName: metadata.recipientName || metadata.targetName,
        actorName: metadata.actorName,
        actorEmail: metadata.actorEmail,
        oldRole: metadata.oldRole,
        newRole: metadata.newRole,
        reason: metadata.reason,
        adminUrl,
      });

    case 'admin_revoked':
      return adminAccessRevokedEmail({
        recipientName: metadata.recipientName || metadata.targetName,
        actorName: metadata.actorName,
        actorEmail: metadata.actorEmail,
        role: metadata.role,
        reason: metadata.reason,
        adminUrl,
      });

    default:
      // Fallback for unknown notification types
      return {
        subject: `Admin Notification - Tutorwise`,
        html: `
          <p>You have a new admin notification.</p>
          <p>Visit the admin dashboard: <a href="${adminUrl}">${adminUrl}</a></p>
        `,
      };
  }
}
