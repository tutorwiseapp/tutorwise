/**
 * Filename: src/app/api/admin/notifications/process/route.ts
 * Purpose: Process admin activity email notifications (cron job endpoint)
 * Created: 2025-12-23
 *
 * This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 * to process pending email notifications from the queue.
 *
 * Setup:
 * 1. Add to vercel.json crons array
 * 2. Or use external cron service to hit this endpoint every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateAdminNotificationEmail } from '@/lib/admin-notifications';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key-here';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch unsent notifications (limit to 50 per run to avoid timeouts)
    const { data: notifications, error: fetchError } = await supabase
      .from('admin_activity_notifications')
      .select('*')
      .eq('sent', false)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending notifications',
        processed: 0,
      });
    }

    let successCount = 0;
    let failureCount = 0;

    // Process each notification
    for (const notification of notifications) {
      try {
        // Generate email content using templates
        const { subject, html } = generateAdminNotificationEmail(
          notification.notification_type,
          notification.metadata
        );

        // Send email using Resend
        const emailSent = await sendEmail({
          to: notification.recipient_email,
          subject,
          body: html,
          metadata: notification.metadata,
        });

        if (emailSent) {
          // Mark as sent
          await supabase
            .from('admin_activity_notifications')
            .update({
              sent: true,
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id);

          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${successCount + failureCount} notifications`,
      successCount,
      failureCount,
    });
  } catch (error) {
    console.error('Notification processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Send email using Resend
 */
async function sendEmail({
  to,
  subject,
  body,
  metadata: _metadata,
}: {
  to: string;
  subject: string;
  body: string;
  metadata: any;
}): Promise<boolean> {
  try {
    const { sendEmail: sendResendEmail } = await import('@/lib/email');

    await sendResendEmail({
      to,
      subject,
      html: body,
      from: 'Tutorwise Admin <noreply@tutorwise.io>',
    });

    console.log('✅ Email sent successfully:', { to, subject });
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error);

    // Log detailed error for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return false;
  }
}
