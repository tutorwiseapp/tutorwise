/**
 * Filename: src/app/api/admin/stripe-config/route.ts
 * Purpose: API endpoint to fetch and update Stripe configuration and verify connection status
 * Created: 2025-12-29
 * Pattern: Server-only API route with real-time Stripe verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface StripeConfigResponse {
  testMode: {
    publishableKey: string;
    secretKey: string; // Show full secret key for admin
    connectionStatus: 'Connected' | 'Not Connected' | 'Invalid';
  };
  liveMode: {
    publishableKey: string;
    secretKey: string; // Show full secret key for admin
    connectionStatus: 'Connected' | 'Not Connected' | 'Invalid';
  };
  platformFee: number;
  minimumBookingAmount: number;
  currencyProcessingFeePercent: number;
  fixedTransactionFee: number;
}

/**
 * Verify Stripe connection by attempting to retrieve account info
 */
async function verifyStripeConnection(secretKey: string | undefined): Promise<'Connected' | 'Not Connected' | 'Invalid'> {
  if (!secretKey) {
    return 'Not Connected';
  }

  try {
    // Create a temporary Stripe instance with the provided key
    const testStripe = new (await import('stripe')).default(secretKey, {
      typescript: true,
    });

    // Try to retrieve account info to verify the key is valid
    await testStripe.accounts.retrieve();
    return 'Connected';
  } catch (error) {
    console.error('Stripe verification failed:', error);
    return 'Invalid';
  }
}

/**
 * Mask secret key for display (show only first 7 and last 4 characters)
 */
function _maskSecretKey(key: string | undefined): string {
  if (!key || key.length < 15) return '';
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

/**
 * GET /api/admin/stripe-config
 * Fetch Stripe configuration and verify connection status
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

    // Get Stripe keys from environment
    const testPublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    const testSecretKey = process.env.STRIPE_SECRET_KEY;

    // Live keys (currently commented out in .env.local)
    const livePublishableKey = process.env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY || '';
    const liveSecretKey = process.env.STRIPE_LIVE_SECRET_KEY;

    // Verify connections
    const [testStatus, liveStatus] = await Promise.all([
      verifyStripeConnection(testSecretKey),
      verifyStripeConnection(liveSecretKey),
    ]);

    // Fetch payment settings from database
    const { data: paymentSettings, error: paymentError } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (paymentError || !paymentSettings) {
      console.error('Error fetching payment settings:', paymentError);
      return NextResponse.json(
        { error: 'Failed to fetch payment settings' },
        { status: 500 }
      );
    }

    const platformFee = Number(paymentSettings.platform_fee_percent);
    const minimumBookingAmount = Number(paymentSettings.minimum_booking_amount);
    const currencyProcessingFeePercent = Number(paymentSettings.currency_processing_fee_percent);
    const fixedTransactionFee = Number(paymentSettings.fixed_transaction_fee);

    const config: StripeConfigResponse = {
      testMode: {
        publishableKey: testPublishableKey,
        secretKey: testSecretKey || '', // Show full secret key for admin
        connectionStatus: testStatus,
      },
      liveMode: {
        publishableKey: livePublishableKey,
        secretKey: liveSecretKey || '', // Show full secret key for admin
        connectionStatus: liveStatus,
      },
      platformFee,
      minimumBookingAmount,
      currencyProcessingFeePercent,
      fixedTransactionFee,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/stripe-config
 * Update payment fee settings
 */
export async function PUT(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const {
      platformFee,
      minimumBookingAmount,
      currencyProcessingFeePercent,
      fixedTransactionFee,
    } = body;

    // Update payment settings in database
    const { error: updateError } = await supabase
      .from('payment_settings')
      .update({
        platform_fee_percent: platformFee,
        minimum_booking_amount: minimumBookingAmount,
        currency_processing_fee_percent: currencyProcessingFeePercent,
        fixed_transaction_fee: fixedTransactionFee,
      })
      .eq('id', 1);

    if (updateError) {
      console.error('Error updating payment settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating Stripe config:', error);
    return NextResponse.json(
      { error: 'Failed to update Stripe configuration' },
      { status: 500 }
    );
  }
}
