/*
 * Filename: src/app/api/financials/route.ts
 * Purpose: Provides GET endpoint for transaction history and wallet balances (SDD v4.9)
 * Created: 2025-11-02
 * Updated: 2025-11-11 - v4.9: Added balance calculations using RPC functions
 * Specification: SDD v4.9, Section 3.2 - Wallet Balance & Transaction Status
 * Change Summary: Updated to use v4.9 balance RPC functions and new transaction statuses
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * GET /api/financials
 * Fetches transaction history and wallet balances for the authenticated user
 * Query params:
 * - type (optional): filters by transaction type ('Booking Payment', 'Tutoring Payout', 'Referral Commission', 'Withdrawal', etc.)
 * - status (optional): filters by transaction status (v4.9: 'clearing', 'available', 'paid_out', 'disputed', 'refunded')
 */
export async function GET(req: Request) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');

    // 3. Build query (v4.9: Include nested client and tutor profiles for TransactionCard)
    let query = supabase
      .from('transactions')
      .select(`
        *,
        booking:bookings!booking_id(
          id,
          service_name,
          session_start_time,
          client_id,
          tutor_id,
          client:profiles!client_id(id, full_name, avatar_url),
          tutor:profiles!tutor_id(id, full_name, avatar_url)
        )
      `)
      .eq('profile_id', user.id);

    // Apply filters
    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // 4. Execute query with ordering
    const { data: transactions, error: transactionsError } = await query
      .order('created_at', { ascending: false });

    if (transactionsError) throw transactionsError;

    // 5. Fetch wallet balances using v4.9 RPC functions
    const { data: availableBalance, error: availableError } = await supabase
      .rpc('get_available_balance', { p_profile_id: user.id });

    const { data: pendingBalance, error: pendingError } = await supabase
      .rpc('get_pending_balance', { p_profile_id: user.id });

    const { data: totalEarnings, error: totalError } = await supabase
      .rpc('get_total_earnings', { p_profile_id: user.id });

    // Handle RPC errors (non-critical - return 0 if fails)
    const balances = {
      available: availableError ? 0 : (availableBalance || 0),
      pending: pendingError ? 0 : (pendingBalance || 0),
      total: totalError ? 0 : (totalEarnings || 0),
    };

    if (availableError) console.warn('get_available_balance error:', availableError);
    if (pendingError) console.warn('get_pending_balance error:', pendingError);
    if (totalError) console.warn('get_total_earnings error:', totalError);

    return NextResponse.json({
      transactions: transactions || [],
      balances,
    });

  } catch (error) {
    console.error("API GET /api/financials error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
