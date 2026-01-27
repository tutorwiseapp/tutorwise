/**
 * Filename: apps/web/src/lib/referral-emails.ts
 * Purpose: Email templates and automation for referral system
 * Created: 2025-12-31
 * Updated: 2025-01-27 (Refactored to use base email template)
 */

import { sendEmail } from './email';
import {
  generateEmailTemplate,
  paragraph,
  bold,
  stageTransition,
} from './email-templates/base';

interface ReferralEmailBaseParams {
  to: string;
  referrerName: string;
  organisationName: string;
}

const stageLabels: Record<string, string> = {
  referred: 'New Lead',
  contacted: 'Contacted',
  meeting: 'Meeting Scheduled',
  proposal: 'Proposal Sent',
  negotiating: 'Negotiating',
  converted: 'Converted',
  lost: 'Lost',
};

function getReferralUrl(organisationName: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/organisation/${organisationName.toLowerCase().replace(/\s+/g, '-')}/referrals`;
}

/**
 * Send email when a new referral is created
 */
export async function sendNewReferralEmail(
  params: ReferralEmailBaseParams & {
    referredName: string;
    referredEmail: string;
  }
) {
  const { to, referrerName, organisationName, referredName, referredEmail } =
    params;

  const subject = `🎉 New Referral: ${referredName} joined through your link!`;

  const body = `
    ${paragraph(`Great news! ${bold(referredName)} (${referredEmail}) just joined ${bold(organisationName)} through your referral link.`)}
    ${paragraph(`Your referral is now in your pipeline as a ${bold('New Lead')}. You can track their progress and earn commission when they convert to a booking.`)}
  `;

  const html = generateEmailTemplate({
    headline: 'New Referral!',
    variant: 'default',
    recipientName: referrerName,
    body,
    cta: {
      text: 'View Your Pipeline',
      url: getReferralUrl(organisationName),
    },
    footerNote: 'Keep sharing your referral link to earn more commissions!',
  });

  return sendEmail({ to, subject, html });
}

/**
 * Send email when referral stage changes
 */
export async function sendStageChangeEmail(
  params: ReferralEmailBaseParams & {
    referredName: string;
    oldStage: string;
    newStage: string;
    estimatedValue?: number;
  }
) {
  const {
    to,
    referrerName,
    organisationName,
    referredName,
    oldStage,
    newStage,
    estimatedValue,
  } = params;

  const subject = `📈 Referral Update: ${referredName} → ${stageLabels[newStage]}`;

  const isConverted = newStage === 'converted';
  const variant = isConverted ? 'success' : 'default';

  let body = `
    ${paragraph(`Your referral ${bold(referredName)} has moved forward in the pipeline!`)}
    ${stageTransition(stageLabels[oldStage], stageLabels[newStage])}
  `;

  if (isConverted) {
    body += paragraph(
      `🎉 Congratulations! Your referral has converted! You'll earn commission once payment is processed.`
    );
  }

  const html = generateEmailTemplate({
    headline: 'Referral Progress Update',
    variant,
    recipientName: referrerName,
    body,
    highlight: estimatedValue
      ? {
          label: 'Estimated Value',
          value: `£${estimatedValue.toLocaleString()}`,
        }
      : undefined,
    cta: {
      text: 'View Full Pipeline',
      url: getReferralUrl(organisationName),
    },
  });

  return sendEmail({ to, subject, html });
}

/**
 * Send email when commission is earned
 */
export async function sendCommissionEarnedEmail(
  params: ReferralEmailBaseParams & {
    referredName: string;
    commissionAmount: number;
    totalCommission: number;
  }
) {
  const {
    to,
    referrerName,
    organisationName,
    referredName,
    commissionAmount,
    totalCommission,
  } = params;

  const subject = `💰 You earned £${commissionAmount.toFixed(2)} commission!`;

  const body = `
    ${paragraph(`Congratulations! Your referral ${bold(referredName)} has completed their booking and you've earned commission!`)}
    ${paragraph(`Your commission will be paid out according to ${organisationName}'s payout schedule. You can track all your earnings in your referral dashboard.`)}
  `;

  const html = generateEmailTemplate({
    headline: 'Commission Earned!',
    variant: 'success',
    recipientName: referrerName,
    body,
    highlight: {
      label: 'Commission Earned',
      value: `£${commissionAmount.toFixed(2)}`,
      sublabel: 'Total Lifetime Earnings',
      subvalue: `£${totalCommission.toFixed(2)}`,
    },
    cta: {
      text: 'View Your Earnings',
      url: getReferralUrl(organisationName),
    },
    footerNote: 'Keep referring to earn even more commissions!',
  });

  return sendEmail({ to, subject, html });
}

/**
 * Send email when achievement is unlocked
 */
export async function sendAchievementUnlockedEmail(
  params: ReferralEmailBaseParams & {
    achievementName: string;
    achievementDescription: string;
    achievementTier: string;
    achievementPoints: number;
    totalPoints: number;
  }
) {
  const {
    to,
    referrerName,
    organisationName,
    achievementName,
    achievementDescription,
    achievementTier,
    achievementPoints,
    totalPoints,
  } = params;

  const subject = `🏆 Achievement Unlocked: ${achievementName}!`;

  const body = `
    ${paragraph(`Congratulations! You've unlocked a new achievement in your ${organisationName} referral program!`)}
    ${paragraph(`${bold(achievementName)} (${achievementTier.charAt(0).toUpperCase() + achievementTier.slice(1)} Tier)`)}
    ${paragraph(achievementDescription)}
  `;

  const html = generateEmailTemplate({
    headline: 'Achievement Unlocked!',
    variant: 'success',
    recipientName: referrerName,
    body,
    highlight: {
      label: 'Points Earned',
      value: `+${achievementPoints}`,
      sublabel: 'Total Points',
      subvalue: totalPoints.toLocaleString(),
    },
    cta: {
      text: 'View All Achievements',
      url: getReferralUrl(organisationName),
    },
    footerNote: 'Keep going to unlock more achievements and earn rewards!',
  });

  return sendEmail({ to, subject, html });
}
