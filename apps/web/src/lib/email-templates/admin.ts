/**
 * Filename: apps/web/src/lib/email-templates/admin.ts
 * Purpose: Email templates for admin notifications
 * Created: 2025-12-23
 */

export interface AdminEmailData {
  recipientName?: string;
  actorName: string;
  actorEmail: string;
  role?: string;
  reason?: string;
  adminUrl: string;
}

/**
 * Email template for when admin access is granted
 */
export function adminAccessGrantedEmail(data: AdminEmailData): { subject: string; html: string } {
  const { recipientName, actorName, actorEmail, role, reason, adminUrl } = data;

  const subject = `Admin Access Granted - Tutorwise`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Access Granted</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #006c67 0%, #004a47 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🎉 Admin Access Granted
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi ${recipientName || 'there'},
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                You have been granted <strong>${role}</strong> access to the Tutorwise Admin Dashboard by <strong>${actorName}</strong> (${actorEmail}).
              </p>

              ${reason ? `
              <!-- Reason -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-left: 4px solid #006c67; border-radius: 8px;">
                    <p style="margin: 0; color: #8E8E8E; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                      Reason:
                    </p>
                    <p style="margin: 10px 0 0; color: #4B4B4B; font-size: 15px; line-height: 1.6;">
                      ${reason}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Role Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      <strong>⚠️ Important:</strong> As an admin, you have special permissions to manage the Tutorwise platform. Please use these permissions responsibly and follow our admin guidelines.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #006c67 0%, #004a47 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 108, 103, 0.3);">
                      Access Admin Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #8E8E8E; font-size: 14px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:<br/>
                <a href="${adminUrl}" style="color: #006c67; text-decoration: none; word-break: break-all;">
                  ${adminUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0 0 10px; color: #8E8E8E; font-size: 14px;">
                © 2025 Tutorwise. All rights reserved.
              </p>
              <p style="margin: 0; color: #8E8E8E; font-size: 12px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/terms-of-service" style="color: #006c67; text-decoration: none; margin: 0 10px;">Terms</a> |
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/privacy-policy" style="color: #006c67; text-decoration: none; margin: 0 10px;">Privacy</a> |
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/contact" style="color: #006c67; text-decoration: none; margin: 0 10px;">Contact</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Email template for when admin role is changed
 */
export function adminRoleChangedEmail(data: AdminEmailData & { oldRole: string; newRole: string }): { subject: string; html: string } {
  const { recipientName, actorName, actorEmail, oldRole, newRole, reason, adminUrl } = data;

  const subject = `Admin Role Updated - Tutorwise`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Role Updated</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #006c67 0%, #004a47 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🔄 Admin Role Updated
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi ${recipientName || 'there'},
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Your admin role has been updated by <strong>${actorName}</strong> (${actorEmail}).
              </p>

              <!-- Role Change -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; color: #8E8E8E; font-size: 14px;">Previous Role</p>
                    <p style="margin: 10px 0; color: #4B4B4B; font-size: 18px; font-weight: 600;">${oldRole}</p>
                    <p style="margin: 10px 0; color: #8E8E8E; font-size: 24px;">↓</p>
                    <p style="margin: 10px 0; color: #8E8E8E; font-size: 14px;">New Role</p>
                    <p style="margin: 10px 0 0; color: #006c67; font-size: 18px; font-weight: 600;">${newRole}</p>
                  </td>
                </tr>
              </table>

              ${reason ? `
              <!-- Reason -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-left: 4px solid #006c67; border-radius: 8px;">
                    <p style="margin: 0; color: #8E8E8E; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                      Reason:
                    </p>
                    <p style="margin: 10px 0 0; color: #4B4B4B; font-size: 15px; line-height: 1.6;">
                      ${reason}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #006c67 0%, #004a47 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 108, 103, 0.3);">
                      Access Admin Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #8E8E8E; font-size: 14px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:<br/>
                <a href="${adminUrl}" style="color: #006c67; text-decoration: none; word-break: break-all;">
                  ${adminUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0 0 10px; color: #8E8E8E; font-size: 14px;">
                © 2025 Tutorwise. All rights reserved.
              </p>
              <p style="margin: 0; color: #8E8E8E; font-size: 12px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/terms-of-service" style="color: #006c67; text-decoration: none; margin: 0 10px;">Terms</a> |
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/privacy-policy" style="color: #006c67; text-decoration: none; margin: 0 10px;">Privacy</a> |
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/contact" style="color: #006c67; text-decoration: none; margin: 0 10px;">Contact</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Email template for when admin access is revoked
 */
export function adminAccessRevokedEmail(data: AdminEmailData): { subject: string; html: string } {
  const { recipientName, actorName, actorEmail, role, reason, adminUrl } = data;

  const subject = `Admin Access Revoked - Tutorwise`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Access Revoked</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                Admin Access Revoked
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi ${recipientName || 'there'},
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Your <strong>${role}</strong> access to the Tutorwise Admin Dashboard has been revoked by <strong>${actorName}</strong> (${actorEmail}).
              </p>

              ${reason ? `
              <!-- Reason -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px;">
                    <p style="margin: 0; color: #991b1b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                      Reason:
                    </p>
                    <p style="margin: 10px 0 0; color: #4B4B4B; font-size: 15px; line-height: 1.6;">
                      ${reason}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                    <p style="margin: 0; color: #4B4B4B; font-size: 14px; line-height: 1.6;">
                      You no longer have access to the admin dashboard. If you believe this is a mistake, please contact the Tutorwise team.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #006c67 0%, #004a47 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 108, 103, 0.3);">
                      Visit Tutorwise
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0 0 10px; color: #8E8E8E; font-size: 14px;">
                © 2025 Tutorwise. All rights reserved.
              </p>
              <p style="margin: 0; color: #8E8E8E; font-size: 12px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/terms-of-service" style="color: #006c67; text-decoration: none; margin: 0 10px;">Terms</a> |
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/privacy-policy" style="color: #006c67; text-decoration: none; margin: 0 10px;">Privacy</a> |
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/contact" style="color: #006c67; text-decoration: none; margin: 0 10px;">Contact</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}
