/**
 * Filename: apps/web/src/lib/email-templates/review.ts
 * Purpose: Review notification email templates
 * Created: 2025-01-27
 */

import { sendEmail } from '../email';
import { generateEmailTemplate, paragraph, bold, tokens } from './base';

export interface NewReviewEmailData {
  recipientName: string;
  recipientEmail: string;
  reviewerName: string;
  rating: number;
  comment?: string;
  serviceName?: string;
  sessionDate?: Date;
}

/**
 * Generate star rating HTML
 */
function starRating(rating: number): string {
  const fullStars = Math.floor(rating);
  const emptyStars = 5 - fullStars;

  let stars = '';
  for (let i = 0; i < fullStars; i++) {
    stars += '<span style="color: #f59e0b; font-size: 20px;">★</span>';
  }
  for (let i = 0; i < emptyStars; i++) {
    stars += '<span style="color: #d1d5db; font-size: 20px;">★</span>';
  }

  return `
    <div style="margin: 16px 0; text-align: center;">
      ${stars}
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${tokens.colors.textMuted};">${rating} out of 5 stars</p>
    </div>
  `;
}

/**
 * Send email notification when someone receives a new review
 */
export async function sendNewReviewEmail(data: NewReviewEmailData) {
  const { recipientName, recipientEmail, reviewerName, rating, comment, serviceName, sessionDate } = data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

  const subject = `${reviewerName} left you a ${rating}-star review!`;

  let sessionInfo = '';
  if (serviceName || sessionDate) {
    const parts = [];
    if (serviceName) parts.push(serviceName);
    if (sessionDate) {
      parts.push(new Date(sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }));
    }
    sessionInfo = `<p style="margin: 0 0 16px 0; font-size: 13px; color: ${tokens.colors.textMuted}; text-align: center;">${parts.join(' • ')}</p>`;
  }

  let body = paragraph(`Great news! ${bold(reviewerName)} has left you a review on Tutorwise.`);

  body += `
    <div style="margin: 24px 0; padding: 24px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; text-align: center;">
      ${sessionInfo}
      ${starRating(rating)}
      ${comment ? `
        <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary}; font-style: italic; line-height: 1.6;">"${comment}"</p>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: ${tokens.colors.textMuted};">— ${reviewerName}</p>
        </div>
      ` : ''}
    </div>
  `;

  if (rating >= 4) {
    body += paragraph('Keep up the great work! Positive reviews help you attract more students and grow your tutoring business.');
  } else if (rating >= 3) {
    body += paragraph('Thank you for your dedication to your students. Consider reaching out to discuss how you can improve their experience.');
  } else {
    body += paragraph("We're sorry this session didn't go as expected. Consider reviewing the feedback and reaching out to the student if appropriate.");
  }

  const html = generateEmailTemplate({
    headline: 'New Review Received!',
    variant: rating >= 4 ? 'success' : 'default',
    recipientName,
    body,
    cta: {
      text: 'View All Reviews',
      url: `${siteUrl}/reviews`,
    },
  });

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}
