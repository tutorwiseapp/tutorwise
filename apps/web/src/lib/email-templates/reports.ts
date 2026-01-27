/**
 * Filename: apps/web/src/lib/email-templates/reports.ts
 * Purpose: Weekly report email templates
 * Created: 2025-01-27
 *
 * Email types:
 * - Tutor Weekly Report - Activity summary with bookings, earnings, reviews
 * - Agent Weekly Report - Referral performance and commission summary
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, infoRow, tokens } from './base';

export interface TutorWeeklyReportData {
  tutorName: string;
  tutorEmail: string;
  weekStartDate: Date;
  weekEndDate: Date;
  // Bookings
  newBookings: number;
  completedSessions: number;
  cancelledBookings: number;
  upcomingSessions: number;
  // Earnings
  totalEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
  // Reviews
  newReviews: number;
  averageRating?: number;
  // Profile
  profileViews: number;
  listingViews: number;
}

export interface AgentWeeklyReportData {
  agentName: string;
  agentEmail: string;
  weekStartDate: Date;
  weekEndDate: Date;
  // Referrals
  newReferrals: number;
  signedUp: number;
  converted: number;
  totalActiveReferrals: number;
  // Commission
  commissionEarned: number;
  pendingCommission: number;
  totalCommissionAllTime: number;
  // Performance
  conversionRate: number;
  topPerformingReferral?: string;
}

/**
 * Format date range for email display
 */
function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const endStr = end.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${startStr} - ${endStr}`;
}

/**
 * Create a stat card for reports
 */
function statCard(label: string, value: string, subtext?: string): string {
  return `
    <td style="padding: 12px; text-align: center; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius};">
      <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${tokens.colors.primary};">${value}</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: ${tokens.colors.textMuted};">${label}</p>
      ${subtext ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: ${tokens.colors.textMuted};">${subtext}</p>` : ''}
    </td>
  `;
}

/**
 * Create earnings highlight box
 */
function earningsHighlight(label: string, amount: number, variant: 'primary' | 'success' = 'primary'): string {
  const bgColor = variant === 'success' ? tokens.colors.successLight : tokens.colors.primaryLight;
  const textColor = variant === 'success' ? tokens.colors.success : tokens.colors.primary;

  return `
    <div style="background: ${bgColor}; border-radius: ${tokens.borderRadius}; padding: 16px; text-align: center; margin: 8px 0;">
      <p style="margin: 0; font-size: 12px; color: ${tokens.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
      <p style="margin: 4px 0 0 0; font-size: 28px; font-weight: 700; color: ${textColor};">£${amount.toFixed(2)}</p>
    </div>
  `;
}

/**
 * Send weekly report to tutor
 */
export async function sendTutorWeeklyReport(data: TutorWeeklyReportData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const dateRange = formatDateRange(data.weekStartDate, data.weekEndDate);
  const subject = `Your Weekly Report - ${dateRange}`;

  // Stats section
  const statsSection = `
    <table width="100%" cellpadding="0" cellspacing="8" border="0" style="margin: 24px 0;">
      <tr>
        ${statCard('New Bookings', data.newBookings.toString())}
        ${statCard('Sessions Completed', data.completedSessions.toString())}
        ${statCard('Upcoming', data.upcomingSessions.toString())}
      </tr>
    </table>
  `;

  // Earnings section
  const earningsSection = `
    <div style="margin: 24px 0;">
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${tokens.colors.textPrimary};">Earnings This Week</p>
      ${earningsHighlight('Earned This Week', data.totalEarnings, 'success')}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 12px;">
        <tr>
          <td style="width: 50%; padding-right: 6px;">
            ${earningsHighlight('Pending', data.pendingEarnings)}
          </td>
          <td style="width: 50%; padding-left: 6px;">
            ${earningsHighlight('Available', data.availableBalance)}
          </td>
        </tr>
      </table>
    </div>
  `;

  // Performance section
  let performanceSection = '';
  if (data.profileViews > 0 || data.listingViews > 0 || data.newReviews > 0) {
    performanceSection = `
      <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${tokens.colors.textPrimary};">Profile Performance</p>
        ${data.profileViews > 0 ? infoRow('Profile Views', data.profileViews.toString()) : ''}
        ${data.listingViews > 0 ? infoRow('Listing Views', data.listingViews.toString()) : ''}
        ${data.newReviews > 0 ? infoRow('New Reviews', data.newReviews.toString()) : ''}
        ${data.averageRating ? infoRow('Average Rating', `${data.averageRating.toFixed(1)} ★`) : ''}
      </div>
    `;
  }

  const body = `
    ${paragraph(`Here's your activity summary for the week of ${bold(dateRange)}.`)}
    ${statsSection}
    ${earningsSection}
    ${performanceSection}
    ${data.cancelledBookings > 0 ? paragraph(`Note: ${data.cancelledBookings} booking(s) were cancelled this week.`) : ''}
  `;

  const html = generateEmailTemplate({
    headline: 'Your Weekly Report',
    variant: 'default',
    recipientName: data.tutorName,
    body,
    cta: {
      text: 'View Dashboard',
      url: `${siteUrl}/dashboard`,
    },
    footerNote: 'You can adjust your email preferences in Settings.',
  });

  return sendEmail({
    to: data.tutorEmail,
    subject,
    html,
  });
}

/**
 * Send weekly report to agent
 */
export async function sendAgentWeeklyReport(data: AgentWeeklyReportData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const dateRange = formatDateRange(data.weekStartDate, data.weekEndDate);
  const subject = `Your Referral Report - ${dateRange}`;

  // Referral stats section
  const statsSection = `
    <table width="100%" cellpadding="0" cellspacing="8" border="0" style="margin: 24px 0;">
      <tr>
        ${statCard('New Referrals', data.newReferrals.toString())}
        ${statCard('Signed Up', data.signedUp.toString())}
        ${statCard('Converted', data.converted.toString())}
      </tr>
    </table>
  `;

  // Commission section
  const commissionSection = `
    <div style="margin: 24px 0;">
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${tokens.colors.textPrimary};">Commission Earned</p>
      ${earningsHighlight('This Week', data.commissionEarned, 'success')}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 12px;">
        <tr>
          <td style="width: 50%; padding-right: 6px;">
            ${earningsHighlight('Pending', data.pendingCommission)}
          </td>
          <td style="width: 50%; padding-left: 6px;">
            ${earningsHighlight('All-Time', data.totalCommissionAllTime)}
          </td>
        </tr>
      </table>
    </div>
  `;

  // Performance section
  const performanceSection = `
    <div style="margin: 24px 0; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; padding: 20px;">
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${tokens.colors.textPrimary};">Performance Metrics</p>
      ${infoRow('Conversion Rate', `${(data.conversionRate * 100).toFixed(1)}%`)}
      ${infoRow('Active Referrals', data.totalActiveReferrals.toString())}
      ${data.topPerformingReferral ? infoRow('Top Performer', data.topPerformingReferral) : ''}
    </div>
  `;

  const body = `
    ${paragraph(`Here's your referral performance summary for the week of ${bold(dateRange)}.`)}
    ${statsSection}
    ${commissionSection}
    ${performanceSection}
    ${paragraph('Keep sharing your referral link to earn more commission!')}
  `;

  const html = generateEmailTemplate({
    headline: 'Your Referral Report',
    variant: 'default',
    recipientName: data.agentName,
    body,
    cta: {
      text: 'View Referrals',
      url: `${siteUrl}/referrals`,
    },
    footerNote: 'You can adjust your email preferences in Settings.',
  });

  return sendEmail({
    to: data.agentEmail,
    subject,
    html,
  });
}
