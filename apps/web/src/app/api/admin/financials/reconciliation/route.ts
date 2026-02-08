/*
 * Filename: route.ts (admin/financials/reconciliation)
 * Purpose: API endpoint for financial reconciliation between Stripe and Supabase
 * Created: 2026-02-07
 * Specification: Admin Financials Enhancement - Balance comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (role check)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Calculate Supabase balance from transactions
    // Sum of all transactions = total money flow
    // Platform balance = sum of Platform Fee transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, type, status')
      .not('status', 'in', '(refunded,failed,disputed)'); // Exclude reversed/failed transactions

    if (txError) {
      console.error('Transaction fetch error:', txError);
      return NextResponse.json(
        { message: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Calculate platform balance (Platform Fee transactions)
    const supabaseBalance = transactions
      .filter((txn) => txn.type === 'Platform Fee' && txn.status === 'paid_out')
      .reduce((sum, txn) => sum + txn.amount, 0);

    // Fetch Stripe balance
    let stripeBalance = 0;
    try {
      const balance = await stripe.balance.retrieve();
      // Stripe balance is in smallest currency unit (pence for GBP)
      // Convert to pounds
      stripeBalance = balance.available[0]?.amount
        ? balance.available[0].amount / 100
        : 0;
    } catch (stripeError) {
      console.error('Stripe balance fetch error:', stripeError);
      // Continue with 0 balance if Stripe fetch fails
    }

    // Calculate discrepancy
    const discrepancy = supabaseBalance - stripeBalance;

    return NextResponse.json({
      supabaseBalance,
      stripeBalance,
      discrepancy,
      lastSynced: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reconciliation API error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
