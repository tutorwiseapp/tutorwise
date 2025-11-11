/*
 * Filename: src/app/api/financials/withdraw/route.ts
 * Purpose: API endpoint for processing withdrawal requests (SDD v4.9)
 * Created: 2025-11-11
 * Specification: SDD v4.9, Section 3.3 - Payout Processing
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createConnectPayout, canReceivePayouts } from '@/lib/stripe/payouts';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * POST /api/financials/withdraw
 * Initiates a withdrawal request for the authenticated user
 * Body: { amount: number }
 */
export async function POST(req: Request) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request body
    const body = await req.json();
    const { amount } = body;

    // 3. Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Invalid withdrawal amount' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check minimum withdrawal amount (£10)
    const MIN_WITHDRAWAL = 10;
    if (amount < MIN_WITHDRAWAL) {
      return new NextResponse(
        JSON.stringify({
          message: `Minimum withdrawal amount is £${MIN_WITHDRAWAL.toFixed(2)}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Get available balance using RPC function
    const { data: availableBalance, error: balanceError } = await supabase
      .rpc('get_available_balance', { p_profile_id: user.id });

    if (balanceError) {
      console.error('Error fetching available balance:', balanceError);
      return new NextResponse(
        JSON.stringify({ message: 'Failed to fetch balance' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Validate sufficient balance
    if (!availableBalance || availableBalance < amount) {
      return new NextResponse(
        JSON.stringify({
          message: `Insufficient balance. Available: £${(availableBalance || 0).toFixed(2)}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Get user profile for Stripe Connect account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, full_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return new NextResponse(
        JSON.stringify({ message: 'User profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8. Check if user has Stripe Connect account
    if (!profile.stripe_connect_account_id) {
      return new NextResponse(
        JSON.stringify({
          message: 'Please connect your bank account before withdrawing funds',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8a. Verify Connect account can receive payouts
    const { ready, reason } = await canReceivePayouts(profile.stripe_connect_account_id);
    if (!ready) {
      return new NextResponse(
        JSON.stringify({
          message: reason || 'Your bank account is not ready to receive payouts',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 9. Create withdrawal transaction record (status: 'clearing' initially)
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        profile_id: user.id,
        type: 'Withdrawal',
        description: `Withdrawal to ${profile.stripe_connect_account_id.slice(0, 15)}...`,
        amount: -amount, // Negative for debit
        status: 'clearing',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return new NextResponse(
        JSON.stringify({ message: 'Failed to create withdrawal transaction' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 10. Process Stripe payout
    const payoutResult = await createConnectPayout(
      profile.stripe_connect_account_id,
      amount,
      `Tutorwise withdrawal for ${profile.full_name || profile.email}`
    );

    if (!payoutResult.success) {
      // Payout failed - update transaction status to 'failed'
      await supabase
        .from('transactions')
        .update({ status: 'Failed', description: `Failed: ${payoutResult.error}` })
        .eq('id', transaction.id);

      return new NextResponse(
        JSON.stringify({
          message: `Payout failed: ${payoutResult.error}`,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Payout successful - update transaction with Stripe payout ID
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'paid_out',
        stripe_payout_id: payoutResult.payoutId,
        description: `Withdrawal to ${profile.stripe_connect_account_id.slice(0, 15)}... (${payoutResult.payoutId})`,
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction status:', updateError);
      // Transaction created but status update failed - log this for manual review
    }

    // 11. Mark all available funds as paid_out (update their status)
    const { error: markPaidError } = await supabase
      .from('transactions')
      .update({ status: 'paid_out' })
      .eq('profile_id', user.id)
      .eq('status', 'available')
      .lte('available_at', new Date().toISOString());

    if (markPaidError) {
      console.error('Error marking transactions as paid out:', markPaidError);
      // Non-critical error - the withdrawal was recorded
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      transaction: {
        id: transaction.id,
        amount: Math.abs(transaction.amount),
        status: 'paid_out',
        created_at: transaction.created_at,
      },
    });
  } catch (error) {
    console.error('API POST /api/financials/withdraw error:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
