/*
 * Filename: src/app/api/referrals/route.ts
 * Purpose: Provides GET endpoint for referral lead pipeline (SDD v3.6)
 * Created: 2025-11-02 (Updated from legacy)
 * Specification: SDD v3.6, Section 8.3
 * Change Summary: Updated to use new v3.6 schema with agent_profile_id (migration 051)
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals
 * Fetches referral lead pipeline for the authenticated user
 * Query params:
 * - status (optional): filters by referral status ('Referred', 'Signed Up', 'Converted', 'Expired')
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
    const statusFilter = searchParams.get('status');

    // 3. Build query (migration 051: referrer_profile_id → agent_profile_id)
    // Note: We join with profiles to get the referred user's name
    let query = supabase
      .from('referrals')
      .select(`
        *,
        referred_user:referred_profile_id(id, full_name, avatar_url),
        first_booking:booking_id(id, service_name, amount),
        first_commission:transaction_id(id, amount)
      `)
      .eq('agent_profile_id', user.id);

    // Apply status filter
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // 4. Execute query with ordering
    const { data: referrals, error: referralsError } = await query
      .order('created_at', { ascending: false });

    if (referralsError) throw referralsError;

    return NextResponse.json({ referrals: referrals || [] });

  } catch (error) {
    console.error("API GET /api/referrals error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
