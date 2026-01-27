/**
 * Filename: apps/web/src/app/api/admin/test-email/route.ts
 * Purpose: Send test emails for development/QA
 * Created: 2025-01-27
 *
 * Usage: POST /api/admin/test-email
 * Body: { "type": "booking_confirmation", "to": "admin@tutorwise.io" }
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

import { sendWelcomeEmail } from '@/lib/email-templates/welcome';
import {
  sendBookingRequestEmail,
  sendBookingConfirmedEmail,
  sendBookingCancelledEmail,
  sendSessionReminderEmail,
  type BookingEmailData,
} from '@/lib/email-templates/booking';
import {
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
  sendRefundProcessedEmail,
  type PaymentEmailData,
  type RefundEmailData,
} from '@/lib/email-templates/payment';
import {
  sendTutorWeeklyReport,
  sendAgentWeeklyReport,
  type TutorWeeklyReportData,
  type AgentWeeklyReportData,
} from '@/lib/email-templates/reports';
import { sendAccountDeletedEmail } from '@/lib/email-templates/account';
import { sendNewReviewEmail } from '@/lib/email-templates/review';
import { sendWithdrawalProcessedEmail, sendWithdrawalFailedEmail } from '@/lib/email-templates/withdrawal';

export const dynamic = 'force-dynamic';

// Sample data for testing
const sampleBookingData: BookingEmailData = {
  bookingId: 'test-booking-123',
  serviceName: 'Mathematics Tutoring',
  sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  sessionDuration: 60,
  amount: 45.00,
  subjects: ['Mathematics', 'GCSE'],
  locationType: 'online',
  tutorName: 'John Smith',
  tutorEmail: 'tutor@example.com',
  clientName: 'Sarah Johnson',
  clientEmail: 'client@example.com',
  bookingType: 'direct',
};

const samplePaymentData: PaymentEmailData = {
  bookingId: 'test-booking-123',
  serviceName: 'Mathematics Tutoring',
  sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  sessionDuration: 60,
  amount: 45.00,
  subjects: ['Mathematics', 'GCSE'],
  tutorName: 'John Smith',
  clientName: 'Sarah Johnson',
  clientEmail: 'client@example.com',
  paymentMethod: 'Visa ending in 4242',
};

const sampleTutorReport: TutorWeeklyReportData = {
  tutorName: 'John Smith',
  tutorEmail: 'tutor@example.com',
  weekStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  weekEndDate: new Date(),
  newBookings: 5,
  completedSessions: 4,
  cancelledBookings: 1,
  upcomingSessions: 3,
  totalEarnings: 180.00,
  pendingEarnings: 45.00,
  availableBalance: 135.00,
  newReviews: 2,
  averageRating: 4.8,
  profileViews: 127,
  listingViews: 89,
};

const sampleAgentReport: AgentWeeklyReportData = {
  agentName: 'Emma Wilson',
  agentEmail: 'agent@example.com',
  weekStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  weekEndDate: new Date(),
  newReferrals: 8,
  signedUp: 5,
  converted: 3,
  totalActiveReferrals: 24,
  commissionEarned: 27.00,
  pendingCommission: 13.50,
  totalCommissionAllTime: 342.00,
  conversionRate: 0.375,
  topPerformingReferral: 'John Smith',
};

export async function POST(request: NextRequest) {
  // Allow access via CRON_SECRET or admin auth
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  let isAuthorized = false;

  // Check CRON_SECRET first (for CLI/testing)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    isAuthorized = true;
  } else {
    // Check admin auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profile?.is_admin) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, to } = body;

    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }

    let result;

    switch (type) {
      case 'welcome':
        result = await sendWelcomeEmail({
          to,
          userName: 'Test User',
        });
        break;

      case 'booking_request':
        result = await sendBookingRequestEmail({
          ...sampleBookingData,
          tutorEmail: to,
        });
        break;

      case 'booking_confirmation':
        result = await sendBookingConfirmedEmail({
          ...sampleBookingData,
          clientEmail: to,
        });
        break;

      case 'booking_cancelled':
        result = await sendBookingCancelledEmail(
          { ...sampleBookingData, clientEmail: to },
          'client',
          'the tutor',
          'Schedule conflict'
        );
        break;

      case 'session_reminder':
        result = await sendSessionReminderEmail(
          { ...sampleBookingData, clientEmail: to },
          'client'
        );
        break;

      case 'payment_receipt':
        result = await sendPaymentReceiptEmail({
          ...samplePaymentData,
          clientEmail: to,
        });
        break;

      case 'payment_failed':
        result = await sendPaymentFailedEmail(
          { ...samplePaymentData, clientEmail: to },
          'Your card was declined. Please try a different payment method.'
        );
        break;

      case 'refund':
        result = await sendRefundProcessedEmail({
          bookingId: 'test-booking-123',
          serviceName: 'Mathematics Tutoring',
          sessionDate: new Date(),
          amount: 45.00,
          refundAmount: 45.00,
          tutorName: 'John Smith',
          clientName: 'Sarah Johnson',
          clientEmail: to,
          reason: 'Booking cancelled by tutor',
        });
        break;

      case 'tutor_report':
        result = await sendTutorWeeklyReport({
          ...sampleTutorReport,
          tutorEmail: to,
        });
        break;

      case 'agent_report':
        result = await sendAgentWeeklyReport({
          ...sampleAgentReport,
          agentEmail: to,
        });
        break;

      case 'account_deleted':
        result = await sendAccountDeletedEmail({
          userName: 'Test User',
          userEmail: to,
          userId: 'test-user-123',
          deletedAt: new Date(),
        });
        break;

      case 'new_review':
        result = await sendNewReviewEmail({
          recipientName: 'John Smith',
          recipientEmail: to,
          reviewerName: 'Sarah Johnson',
          rating: 5,
          comment: 'Excellent tutor! Very patient and explains concepts clearly. Highly recommended for anyone struggling with mathematics.',
          serviceName: 'Mathematics Tutoring',
          sessionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        });
        break;

      case 'withdrawal_processed':
        result = await sendWithdrawalProcessedEmail({
          userName: 'John Smith',
          userEmail: to,
          amount: 135.00,
          transactionId: 'txn_test_123456',
          payoutId: 'po_test_789012',
          estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        });
        break;

      case 'withdrawal_failed':
        result = await sendWithdrawalFailedEmail({
          userName: 'John Smith',
          userEmail: to,
          amount: 135.00,
          transactionId: 'txn_test_123456',
          reason: 'Bank account verification required. Please update your bank details in the Payments settings.',
        });
        break;

      default:
        return NextResponse.json({
          error: 'Invalid email type',
          validTypes: [
            'welcome',
            'booking_request',
            'booking_confirmation',
            'booking_cancelled',
            'session_reminder',
            'payment_receipt',
            'payment_failed',
            'refund',
            'tutor_report',
            'agent_report',
            'account_deleted',
            'new_review',
            'withdrawal_processed',
            'withdrawal_failed',
          ],
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      type,
      to,
      result,
    });
  } catch (error) {
    console.error('[Test Email] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
