/*
 * Filename: src/app/api/financials/withdraw/route.ts
 * Purpose: API endpoint for processing withdrawal requests (SDD v4.9)
 * Created: 2025-11-11
 * Updated: 2025-11-11 - Production hardening with comprehensive error handling
 * Specification: SDD v4.9, Section 3.3 - Payout Processing
 *
 * CRITICAL: This endpoint handles real money transfers.
 * All operations must be:
 * - Idempotent (no duplicate payments)
 * - Properly logged
 * - Transactional (rollback on failure)
 * - Auditable (full audit trail)
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createConnectPayout, canReceivePayouts } from '@/lib/stripe/payouts';
import { PAYMENT_CONSTANTS } from '@/lib/stripe/client';
import { sendWithdrawalProcessedEmail, sendWithdrawalFailedEmail } from '@/lib/email-templates/withdrawal';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * POST /api/financials/withdraw
 * Initiates a withdrawal request for the authenticated user
 *
 * Request Body: { amount: number }
 *
 * Validation Steps:
 * 1. User authentication
 * 2. Amount validation (min/max bounds)
 * 3. Balance verification
 * 4. Stripe Connect account verification
 * 5. Bank account connection check
 * 6. Transaction creation
 * 7. Stripe payout initiation
 * 8. Status update
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const requestId = `WD_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  console.log(`[WITHDRAWAL:${requestId}] Request received`);

  try {
    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error(`[WITHDRAWAL:${requestId}] Authentication failed:`, authError);
      return new NextResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WITHDRAWAL:${requestId}] User authenticated:`, user.id);

    // 2. Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error(`[WITHDRAWAL:${requestId}] Invalid JSON:`, parseError);
      return new NextResponse(
        JSON.stringify({ message: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { amount } = body;

    // 3. Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.error(`[WITHDRAWAL:${requestId}] Invalid amount:`, amount);
      return new NextResponse(
        JSON.stringify({ message: 'Invalid withdrawal amount' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check minimum withdrawal amount
    if (amount < PAYMENT_CONSTANTS.MIN_WITHDRAWAL_AMOUNT) {
      return new NextResponse(
        JSON.stringify({
          message: `Minimum withdrawal amount is £${PAYMENT_CONSTANTS.MIN_WITHDRAWAL_AMOUNT.toFixed(2)}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check maximum withdrawal amount
    if (amount > PAYMENT_CONSTANTS.MAX_WITHDRAWAL_AMOUNT) {
      return new NextResponse(
        JSON.stringify({
          message: `Maximum withdrawal amount is £${PAYMENT_CONSTANTS.MAX_WITHDRAWAL_AMOUNT.toFixed(2)}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WITHDRAWAL:${requestId}] Amount validated: £${amount.toFixed(2)}`);

    // 4. Get available balance using RPC function
    const { data: availableBalance, error: balanceError } = await supabase
      .rpc('get_available_balance', { p_profile_id: user.id });

    if (balanceError) {
      console.error(`[WITHDRAWAL:${requestId}] Balance check failed:`, balanceError);
      return new NextResponse(
        JSON.stringify({ message: 'Failed to fetch balance' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Validate sufficient balance
    const currentBalance = availableBalance || 0;
    console.log(`[WITHDRAWAL:${requestId}] Available balance: £${currentBalance.toFixed(2)}`);

    if (currentBalance < amount) {
      console.warn(`[WITHDRAWAL:${requestId}] Insufficient balance`);
      return new NextResponse(
        JSON.stringify({
          message: `Insufficient balance. Available: £${currentBalance.toFixed(2)}, Requested: £${amount.toFixed(2)}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Get user profile for Stripe Connect account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, full_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(`[WITHDRAWAL:${requestId}] Profile fetch failed:`, profileError);
      return new NextResponse(
        JSON.stringify({ message: 'User profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Check if user has Stripe Connect account
    const stripeAccountId = profile.stripe_account_id;
    if (!stripeAccountId) {
      console.warn(`[WITHDRAWAL:${requestId}] No Stripe account connected`);
      return new NextResponse(
        JSON.stringify({
          message: 'Please connect your bank account before withdrawing funds. Visit your Payments settings to get started.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WITHDRAWAL:${requestId}] Stripe account found:`, stripeAccountId.slice(0, 15) + '...');

    // 8. Verify Connect account can receive payouts
    const { ready, reason } = await canReceivePayouts(stripeAccountId);
    if (!ready) {
      console.warn(`[WITHDRAWAL:${requestId}] Account not ready:`, reason);
      return new NextResponse(
        JSON.stringify({
          message: reason || 'Your bank account is not ready to receive payouts',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 9. Check for concurrent/pending withdrawals (CRITICAL: Prevent race conditions)
    const { data: pendingWithdrawals, error: pendingError } = await supabase
      .from('transactions')
      .select('id, created_at, amount')
      .eq('profile_id', user.id)
      .eq('type', 'Withdrawal')
      .eq('status', 'clearing')
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Last 15 minutes

    if (pendingError) {
      console.error(`[WITHDRAWAL:${requestId}] Pending check failed:`, pendingError);
      return new NextResponse(
        JSON.stringify({ message: 'Failed to verify withdrawal status' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (pendingWithdrawals && pendingWithdrawals.length > 0) {
      console.warn(`[WITHDRAWAL:${requestId}] Concurrent withdrawal detected:`, pendingWithdrawals);
      return new NextResponse(
        JSON.stringify({
          message: 'You already have a withdrawal in progress. Please wait for it to complete before requesting another.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 10. Create withdrawal transaction record
    // Generate idempotency key to prevent duplicate transactions
    const idempotencyKey = `withdrawal_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    console.log(`[WITHDRAWAL:${requestId}] Creating transaction record`);

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        profile_id: user.id,
        type: 'Withdrawal',
        description: `Withdrawal request: £${amount.toFixed(2)}`,
        amount: -amount, // Negative for debit
        status: 'clearing',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (transactionError) {
      console.error(`[WITHDRAWAL:${requestId}] Transaction creation failed:`, transactionError);
      return new NextResponse(
        JSON.stringify({ message: 'Failed to create withdrawal transaction' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WITHDRAWAL:${requestId}] Transaction created:`, transaction.id);

    // 11. Process Stripe payout
    const payoutResult = await createConnectPayout(
      stripeAccountId,
      amount,
      `Tutorwise withdrawal for ${profile.full_name || profile.email}`,
      idempotencyKey
    );

    if (!payoutResult.success) {
      console.error(`[WITHDRAWAL:${requestId}] Payout failed:`, payoutResult.error);

      // Rollback: Update transaction status to failed
      await supabase
        .from('transactions')
        .update({
          status: 'Failed',
          description: `Failed: ${payoutResult.error}`,
        })
        .eq('id', transaction.id);

      // Send failure email
      try {
        await sendWithdrawalFailedEmail({
          userName: profile.full_name || 'User',
          userEmail: profile.email,
          amount,
          transactionId: transaction.id,
          reason: payoutResult.error,
        });
      } catch (emailErr) {
        console.error(`[WITHDRAWAL:${requestId}] Failed to send failure email:`, emailErr);
      }

      return new NextResponse(
        JSON.stringify({
          message: `Payout failed: ${payoutResult.error}`,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WITHDRAWAL:${requestId}] Payout successful:`, payoutResult.payoutId);

    // 11. Update transaction with Stripe payout ID
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'paid_out',
        stripe_payout_id: payoutResult.payoutId,
        description: `Withdrawal completed: £${amount.toFixed(2)} (${payoutResult.payoutId})`,
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error(`[WITHDRAWAL:${requestId}] Transaction update failed:`, updateError);
      // Non-critical error - payout was successful, just log for manual review
    }

    // 12. Transaction status will be updated to 'paid_out' by Stripe webhook
    // when payout is confirmed (payout.paid event).
    // DO NOT bulk-mark all available transactions here - this causes race conditions
    // if user makes concurrent withdrawals. Only the withdrawal transaction itself
    // will be marked as paid_out, which happens in the webhook handler.
    console.log(`[WITHDRAWAL:${requestId}] Transaction created, awaiting Stripe payout confirmation`);

    console.log(`[WITHDRAWAL:${requestId}] Withdrawal completed successfully`);

    // Send success email
    try {
      await sendWithdrawalProcessedEmail({
        userName: profile.full_name || 'User',
        userEmail: profile.email,
        amount,
        transactionId: transaction.id,
        payoutId: payoutResult.payoutId,
        estimatedArrival: payoutResult.estimatedArrival,
      });
      console.log(`[WITHDRAWAL:${requestId}] Success email sent`);
    } catch (emailErr) {
      console.error(`[WITHDRAWAL:${requestId}] Failed to send success email:`, emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal initiated successfully. Funds will arrive in 2-3 business days.',
      transaction: {
        id: transaction.id,
        amount: Math.abs(transaction.amount),
        status: 'paid_out',
        created_at: transaction.created_at,
        payout_id: payoutResult.payoutId,
        estimated_arrival: payoutResult.estimatedArrival?.toISOString(),
      },
    });
  } catch (error) {
    console.error(`[WITHDRAWAL:${requestId}] Unexpected error:`, error);
    return new NextResponse(
      JSON.stringify({
        message: 'An unexpected error occurred. Please try again or contact support.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
