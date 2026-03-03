/**
 * Handler: notification.send
 * Template-based email notifications via Resend.
 *
 * handler_config.template selects which email to send:
 *   tutor_approved      — approval confirmation to tutor
 *   tutor_rejected      — rejection email to tutor
 *   payout_processed    — payout confirmation to creator
 *   referral_converted  — referral conversion notification to agent
 *
 * Context inputs:  { email?: string, profile_id?: string, full_name?: string, ... }
 * Context outputs: { notification_id: string, template: string }
 */

import { sendEmail } from '@/lib/email';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { generateEmailTemplate, paragraph, bold } from '@/lib/email-templates/base';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

export async function handleNotificationSend(
  context: HandlerContext,
  opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const template = opts.handlerConfig?.template as string | undefined;

  if (!template) {
    throw new Error('notification.send: handler_config.template is required');
  }

  // Resolve recipient email
  let recipientEmail = context.email as string | undefined;
  let recipientName = (context.full_name as string | undefined) ?? 'there';

  if (!recipientEmail && context.profile_id) {
    const supabase = createServiceRoleClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', context.profile_id as string)
      .single();

    recipientEmail = profile?.email ?? undefined;
    recipientName = profile?.full_name ?? recipientName;
  }

  if (!recipientEmail) {
    throw new Error('notification.send: could not resolve recipient email');
  }

  const { subject, html } = buildEmail(template, recipientName, context);

  const result = await sendEmail({ to: recipientEmail, subject, html });

  const notificationId = (result as { id?: string })?.id ?? `local-${Date.now()}`;

  console.log(`[notification.send] Sent "${template}" to ${recipientEmail} — id: ${notificationId}`);

  return { notification_id: notificationId, template };
}

function buildEmail(
  template: string,
  name: string,
  context: HandlerContext
): { subject: string; html: string } {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

  switch (template) {
    case 'tutor_approved': {
      const subject = 'Your TutorWise application has been approved!';
      const body = `
        ${paragraph(`Hi ${bold(name)},`)}
        ${paragraph(`We're delighted to let you know that your TutorWise tutor application has been <strong>approved</strong>! Your profile is now live on the platform.`)}
        ${paragraph(`Students can now find and book sessions with you. Log in to set your availability and start accepting bookings.`)}
      `;
      return {
        subject,
        html: generateEmailTemplate({
          headline: 'Application Approved',
          variant: 'success',
          body,
          cta: { text: 'Go to Dashboard', url: `${siteUrl}/dashboard` },
        }),
      };
    }

    case 'tutor_rejected': {
      const subject = 'Update on your TutorWise application';
      const body = `
        ${paragraph(`Hi ${bold(name)},`)}
        ${paragraph(`Thank you for your interest in becoming a tutor on TutorWise. After reviewing your application, we're unable to approve it at this time.`)}
        ${paragraph(`If you believe this was an error or would like to provide additional information, please contact our support team.`)}
      `;
      return {
        subject,
        html: generateEmailTemplate({
          headline: 'Application Update',
          body,
          cta: { text: 'Contact Support', url: `${siteUrl}/support` },
        }),
      };
    }

    case 'payout_processed': {
      const amount = context.payout_amount as number | undefined;
      const payoutId = context.payout_id as string | undefined;
      const subject = `Your TutorWise payout has been processed`;
      const body = `
        ${paragraph(`Hi ${bold(name)},`)}
        ${paragraph(`Your commission payout${amount ? ` of ${bold(`£${amount.toFixed(2)}`)}` : ''} has been processed and is on its way to your bank account.`)}
        ${payoutId ? paragraph(`Payout reference: <code>${payoutId}</code>`) : ''}
        ${paragraph(`Funds typically arrive within 1–3 business days depending on your bank.`)}
      `;
      return {
        subject,
        html: generateEmailTemplate({
          headline: 'Payout Processed',
          variant: 'success',
          body,
          cta: { text: 'View Earnings', url: `${siteUrl}/dashboard/earnings` },
        }),
      };
    }

    case 'referral_converted': {
      const serviceName = (context.service_name as string | undefined) ?? 'a tutoring session';
      const subject = 'Your referral has converted — commission incoming!';
      const body = `
        ${paragraph(`Hi ${bold(name)},`)}
        ${paragraph(`Great news! Someone you referred has just booked ${bold(serviceName)} on TutorWise.`)}
        ${paragraph(`Your referral commission is being processed and will appear in your earnings shortly (typically within 7 days).`)}
      `;
      return {
        subject,
        html: generateEmailTemplate({
          headline: 'Referral Converted',
          variant: 'success',
          body,
          cta: { text: 'View Earnings', url: `${siteUrl}/dashboard/earnings` },
        }),
      };
    }

    default:
      throw new Error(`notification.send: unknown template "${template}"`);
  }
}
