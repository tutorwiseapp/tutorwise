/**
 * Filename: src/app/api/referrals/remind/route.ts
 * Purpose: Send reminder email to referred user
 * Created: 2025-12-07
 *
 * POST /api/referrals/remind
 * Body: { referralId: string }
 *
 * Sends reminder email to user who clicked referral link but hasn't signed up yet
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendReferralReminderEmail } from '@/lib/email/referral-reminder';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { referralId } = await request.json();

    if (!referralId) {
      return NextResponse.json({ error: 'Referral ID is required' }, { status: 400 });
    }

    // Fetch referral with related data
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select(`
        id,
        referral_code,
        referred_user_id,
        status,
        created_at,
        last_reminder_sent_at,
        reminder_count,
        referred_user:user_profiles!referrals_referred_user_id_fkey (
          id,
          full_name,
          email
        ),
        referrer:user_profiles!referrals_referrer_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('id', referralId)
      .eq('referrer_user_id', user.id)
      .single();

    if (fetchError || !referral) {
      return NextResponse.json(
        { error: 'Referral not found or you do not have permission' },
        { status: 404 }
      );
    }

    // Validate referral status
    if (referral.status !== 'Referred') {
      return NextResponse.json(
        { error: 'Can only send reminders to users with "Referred" status' },
        { status: 400 }
      );
    }

    // Check if referred user has email
    const referredUser = Array.isArray(referral.referred_user) ? referral.referred_user[0] : referral.referred_user;
    if (!referredUser?.email) {
      return NextResponse.json(
        { error: 'Referred user does not have an email address' },
        { status: 400 }
      );
    }

    // Rate limiting: Don't allow reminders more frequently than once per 24 hours
    if (referral.last_reminder_sent_at) {
      const lastReminderTime = new Date(referral.last_reminder_sent_at).getTime();
      const now = Date.now();
      const hoursSinceLastReminder = (now - lastReminderTime) / (1000 * 60 * 60);

      if (hoursSinceLastReminder < 24) {
        return NextResponse.json(
          { error: 'Please wait 24 hours between reminders' },
          { status: 429 }
        );
      }
    }

    // Calculate days since referral
    const daysSinceReferral = Math.floor(
      (Date.now() - new Date(referral.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Generate referral link (use NEXT_PUBLIC_BASE_URL with production fallback)
    const referralLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.tutorwise.io'}?ref=${referral.referral_code}`;

    // Send reminder email
    const referrer = Array.isArray(referral.referrer) ? referral.referrer[0] : referral.referrer;
    try {
      await sendReferralReminderEmail({
        to: referredUser.email,
        referredName: referredUser.full_name || 'there',
        referrerName: referrer?.full_name || 'A friend',
        daysSinceReferral,
        referralLink,
      });
    } catch (emailError) {
      console.error('Failed to send reminder email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send reminder email' },
        { status: 500 }
      );
    }

    // Update reminder tracking
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        last_reminder_sent_at: new Date().toISOString(),
        reminder_count: (referral.reminder_count || 0) + 1,
      })
      .eq('id', referralId);

    if (updateError) {
      console.error('Failed to update reminder tracking:', updateError);
      // Don't fail the request since email was sent
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder sent successfully',
    });
  } catch (error) {
    console.error('Error sending referral reminder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
