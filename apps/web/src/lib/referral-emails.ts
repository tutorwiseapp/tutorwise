/**
 * Filename: apps/web/src/lib/referral-emails.ts
 * Purpose: Email templates and automation for referral system
 * Created: 2025-12-31
 */

import { sendEmail } from './email';

interface ReferralEmailBaseParams {
  to: string;
  referrerName: string;
  organisationName: string;
}

/**
 * Send email when a new referral is created
 */
export async function sendNewReferralEmail(params: ReferralEmailBaseParams & {
  referredName: string;
  referredEmail: string;
}) {
  const { to, referrerName, organisationName, referredName, referredEmail } = params;

  const subject = `🎉 New Referral: ${referredName} joined through your link!`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Referral</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🎉 New Referral!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi ${referrerName},
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Great news! <strong>${referredName}</strong> (${referredEmail}) just joined <strong>${organisationName}</strong> through your referral link.
              </p>

              <!-- Stats Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 25px; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius: 12px; border: 2px solid #667eea;">
                    <p style="margin: 0 0 10px; color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Next Steps
                    </p>
                    <p style="margin: 0; color: #4B4B4B; font-size: 15px; line-height: 1.6;">
                      Your referral is now in your pipeline as a <strong>New Lead</strong>. You can track their progress and earn commission when they convert to a booking.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/organisation/${organisationName.toLowerCase().replace(/\s+/g, '-')}/referrals"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                      View Your Pipeline
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #8E8E8E; font-size: 14px; line-height: 1.6; text-align: center;">
                Keep sharing your referral link to earn more commissions!
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
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings" style="color: #667eea; text-decoration: none; margin: 0 10px;">Notification Settings</a>
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

  return sendEmail({ to, subject, html });
}

/**
 * Send email when referral stage changes
 */
export async function sendStageChangeEmail(params: ReferralEmailBaseParams & {
  referredName: string;
  oldStage: string;
  newStage: string;
  estimatedValue?: number;
}) {
  const { to, referrerName, organisationName, referredName, oldStage, newStage, estimatedValue } = params;

  const stageLabels: Record<string, string> = {
    referred: 'New Lead',
    contacted: 'Contacted',
    meeting: 'Meeting Scheduled',
    proposal: 'Proposal Sent',
    negotiating: 'Negotiating',
    converted: 'Converted ✅',
    lost: 'Lost',
  };

  const subject = `📈 Referral Update: ${referredName} → ${stageLabels[newStage]}`;

  const stageColors: Record<string, string> = {
    referred: '#94a3b8',
    contacted: '#3b82f6',
    meeting: '#8b5cf6',
    proposal: '#f59e0b',
    negotiating: '#ec4899',
    converted: '#10b981',
    lost: '#ef4444',
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Referral Stage Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: ${stageColors[newStage]}; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                📈 Referral Progress Update
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi ${referrerName},
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Your referral <strong>${referredName}</strong> has moved forward in the pipeline!
              </p>

              <!-- Progress Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 25px; background-color: #f9fafb; border-radius: 12px; border: 2px solid ${stageColors[newStage]};">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding: 15px;">
                          <p style="margin: 0 0 5px; color: #8E8E8E; font-size: 13px; text-transform: uppercase;">Previous Stage</p>
                          <p style="margin: 0; color: #4B4B4B; font-size: 18px; font-weight: 600;">${stageLabels[oldStage]}</p>
                        </td>
                        <td style="text-align: center; padding: 0 20px;">
                          <p style="margin: 0; color: ${stageColors[newStage]}; font-size: 32px;">→</p>
                        </td>
                        <td style="text-align: center; padding: 15px;">
                          <p style="margin: 0 0 5px; color: #8E8E8E; font-size: 13px; text-transform: uppercase;">Current Stage</p>
                          <p style="margin: 0; color: ${stageColors[newStage]}; font-size: 18px; font-weight: 600;">${stageLabels[newStage]}</p>
                        </td>
                      </tr>
                    </table>
                    ${estimatedValue ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 5px; color: #8E8E8E; font-size: 13px; text-transform: uppercase;">Estimated Value</p>
                          <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700;">£${estimatedValue.toLocaleString()}</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
              </table>

              ${newStage === 'converted' ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%); border-radius: 12px; text-align: center;">
                    <p style="margin: 0 0 10px; color: #065f46; font-size: 18px; font-weight: 700;">🎉 Congratulations!</p>
                    <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
                      Your referral has converted! You'll earn commission once payment is processed.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/organisation/${organisationName.toLowerCase().replace(/\s+/g, '-')}/referrals"
                       style="display: inline-block; background: ${stageColors[newStage]}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);">
                      View Full Pipeline
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
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings" style="color: #667eea; text-decoration: none; margin: 0 10px;">Notification Settings</a>
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

  return sendEmail({ to, subject, html });
}

/**
 * Send email when commission is earned
 */
export async function sendCommissionEarnedEmail(params: ReferralEmailBaseParams & {
  referredName: string;
  commissionAmount: number;
  totalCommission: number;
}) {
  const { to, referrerName, organisationName, referredName, commissionAmount, totalCommission } = params;

  const subject = `💰 You earned £${commissionAmount.toFixed(2)} commission!`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Commission Earned</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                💰 Commission Earned!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi ${referrerName},
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Congratulations! Your referral <strong>${referredName}</strong> has completed their booking and you've earned commission!
              </p>

              <!-- Commission Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 30px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; text-align: center; border: 3px solid #fbbf24;">
                    <p style="margin: 0 0 10px; color: #78350f; font-size: 14px; font-weight: 600; text-transform: uppercase;">Commission Earned</p>
                    <p style="margin: 0 0 20px; color: #78350f; font-size: 48px; font-weight: 700;">£${commissionAmount.toFixed(2)}</p>
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      Your total commissions: <strong>£${totalCommission.toFixed(2)}</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                    <p style="margin: 0 0 10px; color: #667eea; font-size: 14px; font-weight: 600;">Payment Information</p>
                    <p style="margin: 0; color: #4B4B4B; font-size: 14px; line-height: 1.6;">
                      Your commission will be paid out according to ${organisationName}'s payout schedule. You can track all your earnings in your referral dashboard.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/organisation/${organisationName.toLowerCase().replace(/\s+/g, '-')}/referrals"
                       style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);">
                      View Your Earnings
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #8E8E8E; font-size: 14px; line-height: 1.6; text-align: center;">
                Keep referring to earn even more commissions!
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
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings" style="color: #667eea; text-decoration: none; margin: 0 10px;">Notification Settings</a>
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

  return sendEmail({ to, subject, html });
}

/**
 * Send email when achievement is unlocked
 */
export async function sendAchievementUnlockedEmail(params: ReferralEmailBaseParams & {
  achievementName: string;
  achievementDescription: string;
  achievementTier: string;
  achievementPoints: number;
  totalPoints: number;
}) {
  const { to, referrerName, organisationName, achievementName, achievementDescription, achievementTier, achievementPoints, totalPoints } = params;

  const subject = `🏆 Achievement Unlocked: ${achievementName}!`;

  const tierColors: Record<string, string> = {
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#e5e4e2',
    diamond: '#b9f2ff',
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Achievement Unlocked</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${tierColors[achievementTier]} 0%, ${tierColors[achievementTier]}dd 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🏆 Achievement Unlocked!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Hi ${referrerName},
              </p>
              <p style="margin: 0 0 20px; color: #4B4B4B; font-size: 16px; line-height: 1.6;">
                Congratulations! You've unlocked a new achievement in your ${organisationName} referral program!
              </p>

              <!-- Achievement Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 40px; background-color: #f9fafb; border-radius: 12px; text-align: center; border: 3px solid ${tierColors[achievementTier]};">
                    <p style="margin: 0 0 20px; font-size: 64px;">🏆</p>
                    <p style="margin: 0 0 10px; color: ${tierColors[achievementTier]}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      ${achievementTier}
                    </p>
                    <p style="margin: 0 0 15px; color: #1e293b; font-size: 24px; font-weight: 700;">
                      ${achievementName}
                    </p>
                    <p style="margin: 0 0 20px; color: #64748b; font-size: 15px; line-height: 1.6;">
                      ${achievementDescription}
                    </p>
                    <p style="margin: 0; color: #10b981; font-size: 18px; font-weight: 600;">
                      +${achievementPoints} points
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #8E8E8E; font-size: 13px; text-transform: uppercase;">Total Points</p>
                    <p style="margin: 0; color: #667eea; font-size: 32px; font-weight: 700;">${totalPoints}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/organisation/${organisationName.toLowerCase().replace(/\s+/g, '-')}/referrals"
                       style="display: inline-block; background: linear-gradient(135deg, ${tierColors[achievementTier]} 0%, ${tierColors[achievementTier]}dd 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);">
                      View All Achievements
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #8E8E8E; font-size: 14px; line-height: 1.6; text-align: center;">
                Keep going to unlock more achievements and earn rewards!
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
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings" style="color: #667eea; text-decoration: none; margin: 0 10px;">Notification Settings</a>
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

  return sendEmail({ to, subject, html });
}
