/**
 * Filename: src/app/api/admin/email-config/route.ts
 * Purpose: API endpoint to fetch Email/SMTP configuration
 * Created: 2025-12-29
 * Pattern: Server-only API route with real environment data
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface EmailConfigResponse {
  smtp: {
    host: string;
    port: number;
    username: string;
    password: string; // Show full API key for admin
  };
  fromEmail: string;
  fromName: string;
  // Email notification toggles would come from database
  notifications: {
    enableBookingConfirmations: boolean;
    enablePaymentReceipts: boolean;
    enableDisputeNotifications: boolean;
    enableWeeklyReports: boolean;
    enableWelcomeEmails: boolean;
  };
}

/**
 * GET /api/admin/email-config
 * Fetch Email/SMTP configuration from environment
 */
export async function GET() {
  try {
    // Verify user is authenticated and is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get email configuration from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@tutorwise.io';

    // Parse email from format: "Name <email@domain.com>" or just "email@domain.com"
    let fromEmail = resendFromEmail;
    let fromName = 'Tutorwise Platform';

    const emailMatch = resendFromEmail.match(/(.*?)\s*<(.+?)>/);
    if (emailMatch) {
      fromName = emailMatch[1].trim();
      fromEmail = emailMatch[2].trim();
    }

    // Determine SMTP settings based on Resend
    const smtpHost = 'smtp.resend.com';
    const smtpPort = 587;
    const smtpUsername = 'resend';

    // TODO: Fetch notification preferences from database
    // For now, using defaults
    const notifications = {
      enableBookingConfirmations: true,
      enablePaymentReceipts: true,
      enableDisputeNotifications: true,
      enableWeeklyReports: true,
      enableWelcomeEmails: true,
    };

    const config: EmailConfigResponse = {
      smtp: {
        host: smtpHost,
        port: smtpPort,
        username: smtpUsername,
        password: resendApiKey || '', // Show full API key for admin
      },
      fromEmail,
      fromName,
      notifications,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching email config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email configuration' },
      { status: 500 }
    );
  }
}
