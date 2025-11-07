/**
 * Filename: apps/web/src/lib/email.ts
 * Purpose: Email service using Resend API
 * Created: 2025-11-07
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Invitation</title>
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
                You're invited to Tutorwise
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi there,
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                <strong>${senderName}</strong> has invited you to join Tutorwise, a professional tutoring network where tutors, agents, and clients connect to grow together.
              </p>

              <!-- Features List -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 15px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                    <p style="margin: 0; color: #4B4B4B; font-size: 15px;">
                      <strong style="color: #006c67;">🤝 Build Your Network</strong><br/>
                      <span style="color: #8E8E8E; font-size: 14px;">Connect with tutors, agents, and clients in your field</span>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                    <p style="margin: 0; color: #4B4B4B; font-size: 15px;">
                      <strong style="color: #006c67;">💰 Earn Commissions</strong><br/>
                      <span style="color: #8E8E8E; font-size: 14px;">Refer others and earn 10% lifetime commission on their bookings</span>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f9fafb; border-radius: 8px;">
                    <p style="margin: 0; color: #4B4B4B; font-size: 15px;">
                      <strong style="color: #006c67;">🚀 Grow Together</strong><br/>
                      <span style="color: #8E8E8E; font-size: 14px;">Collaborate with your network to amplify your reach</span>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${referralUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #006c67 0%, #004a47 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 108, 103, 0.3);">
                      Join Tutorwise
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #8E8E8E; font-size: 14px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:<br/>
                <a href="${referralUrl}" style="color: #006c67; text-decoration: none; word-break: break-all;">
                  ${referralUrl}
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

  return sendEmail({
    to,
    subject,
    html,
  });
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

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Request</title>
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
                New Connection Request
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi there,
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                <strong>${senderName}</strong> (${senderEmail}) has sent you a connection request on Tutorwise.
              </p>

              ${message ? `
              <!-- Personal Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-left: 4px solid #006c67; border-radius: 8px;">
                    <p style="margin: 0; color: #8E8E8E; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                      Message:
                    </p>
                    <p style="margin: 10px 0 0; color: #4B4B4B; font-size: 15px; line-height: 1.6; font-style: italic;">
                      "${message}"
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${networkUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #006c67 0%, #004a47 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 108, 103, 0.3);">
                      View Request
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #8E8E8E; font-size: 14px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:<br/>
                <a href="${networkUrl}" style="color: #006c67; text-decoration: none; word-break: break-all;">
                  ${networkUrl}
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
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings" style="color: #006c67; text-decoration: none; margin: 0 10px;">Unsubscribe</a>
              </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}
