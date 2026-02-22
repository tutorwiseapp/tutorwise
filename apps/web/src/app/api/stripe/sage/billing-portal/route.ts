/*
 * Filename: src/app/api/stripe/sage/billing-portal/route.ts
 * Purpose: Create Stripe Billing Portal session for Sage Pro
 * Created: 2026-02-22
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createBillingPortalSession } from '@/lib/stripe/sage-pro-subscription';

/**
 * POST /api/stripe/sage/billing-portal
 * Create Stripe Billing Portal Session
 *
 * Allows users to:
 * - Update payment method
 * - Cancel subscription
 * - View invoices
 * - Download receipts
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body for optional return URL
    const body = await request.json().catch(() => ({}));
    const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_URL}/sage/billing`;

    // Create Billing Portal Session
    const session = await createBillingPortalSession(user.id, returnUrl);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error);

    // Handle specific error cases
    if (error instanceof Error && error.message === 'No active subscription found') {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
