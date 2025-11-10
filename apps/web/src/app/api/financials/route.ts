/*
 * Filename: src/app/api/financials/route.ts
 * Purpose: Provides GET endpoint for transaction history (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 8.5
 * Change Summary: New API endpoint for the /financials hub
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * GET /api/financials
 * Fetches transaction history for the authenticated user
 * Query params:
 * - type (optional): filters by transaction type ('Booking Payment', 'Tutoring Payout', 'Referral Commission', etc.)
 * - status (optional): filters by transaction status ('Pending', 'Paid', 'Failed', 'Cancelled')
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

    // 3. Build query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        booking:booking_id(id, service_name, session_start_time)
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

    return NextResponse.json({ transactions: transactions || [] });

  } catch (error) {
    console.error("API GET /api/financials error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
