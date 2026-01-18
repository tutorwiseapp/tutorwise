/**
 * Filename: apps/web/src/lib/email/referral-reminder.ts
 * Purpose: Referral reminder email template
 * Created: 2025-12-07
 */

import { sendEmail } from '../email';

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

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Referral Reminder</title>
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
                Your invitation is waiting
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi ${referredName},
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                <strong>${referrerName}</strong> invited you to join Tutorwise <strong>${daysSinceReferral} ${daysSinceReferral === 1 ? 'day' : 'days'} ago</strong>.
              </p>
              <p style="margin: 0 0 30px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Don't miss out on the opportunity to connect with a growing network of tutors, agents, and clients—and start earning commissions on referrals!
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${referralLink}"
                       style="display: inline-block; background: linear-gradient(135deg, #006c67 0%, #004a47 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 108, 103, 0.3);">
                      Get Started
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #8E8E8E; font-size: 14px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:<br/>
                <a href="${referralLink}" style="color: #006c67; text-decoration: none; word-break: break-all;">
                  ${referralLink}
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
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/help-centre" style="color: #006c67; text-decoration: none; margin: 0 10px;">Get Help</a>
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
