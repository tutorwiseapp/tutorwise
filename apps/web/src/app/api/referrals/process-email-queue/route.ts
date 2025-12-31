/**
 * Filename: /api/referrals/process-email-queue/route.ts
 * Purpose: Process pending emails from the referral email queue
 * Created: 2025-12-31
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import {
  sendNewReferralEmail,
  sendStageChangeEmail,
  sendCommissionEarnedEmail,
  sendAchievementUnlockedEmail,
} from '@/lib/referral-emails';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for cron job

interface QueuedEmail {
  id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  body: string;
  metadata: {
    template: 'new_referral' | 'stage_change' | 'commission_earned' | 'achievement_unlocked';
    referrer_name: string;
    organisation_name: string;
    [key: string]: any;
  };
  status: string;
}

export async function POST(request: Request) {
  try {
    // Verify authorization (optional: add API key or cron secret)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get pending emails (limit to 50 per run to avoid timeout)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('referral_email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching pending emails:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending emails to process',
        processed: 0,
      });
    }

    let successCount = 0;
    let failureCount = 0;

    // Process each email
    for (const email of pendingEmails as QueuedEmail[]) {
      try {
        const { metadata, recipient_email, recipient_name } = email;
        const baseParams = {
          to: recipient_email,
          referrerName: metadata.referrer_name,
          organisationName: metadata.organisation_name,
        };

        // Send email based on template
        switch (metadata.template) {
          case 'new_referral':
            await sendNewReferralEmail({
              ...baseParams,
              referredName: metadata.referred_name,
              referredEmail: metadata.referred_email,
            });
            break;

          case 'stage_change':
            await sendStageChangeEmail({
              ...baseParams,
              referredName: metadata.referred_name,
              oldStage: metadata.old_stage,
              newStage: metadata.new_stage,
              estimatedValue: metadata.estimated_value,
            });
            break;

          case 'commission_earned':
            await sendCommissionEarnedEmail({
              ...baseParams,
              referredName: metadata.referred_name,
              commissionAmount: metadata.commission_amount,
              totalCommission: metadata.total_commission,
            });
            break;

          case 'achievement_unlocked':
            await sendAchievementUnlockedEmail({
              ...baseParams,
              achievementName: metadata.achievement_name,
              achievementDescription: metadata.achievement_description,
              achievementTier: metadata.achievement_tier,
              achievementPoints: metadata.achievement_points,
              totalPoints: metadata.total_points,
            });
            break;

          default:
            throw new Error(`Unknown template: ${metadata.template}`);
        }

        // Mark as sent
        const { error: updateError } = await supabase
          .from('referral_email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', email.id);

        if (updateError) {
          console.error(`Error updating email ${email.id} status:`, updateError);
          failureCount++;
        } else {
          successCount++;
        }
      } catch (emailError: any) {
        console.error(`Error sending email ${email.id}:`, emailError);

        // Mark as failed with error message
        await supabase
          .from('referral_email_queue')
          .update({
            status: 'failed',
            error_message: emailError.message || 'Unknown error',
          })
          .eq('id', email.id);

        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingEmails.length} emails`,
      processed: successCount,
      failed: failureCount,
      total: pendingEmails.length,
    });
  } catch (error: any) {
    console.error('Error processing email queue:', error);
    return NextResponse.json(
      {
        error: 'Failed to process email queue',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: Request) {
  return POST(request);
}
