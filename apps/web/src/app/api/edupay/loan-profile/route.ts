/**
 * Filename: apps/web/src/app/api/edupay/loan-profile/route.ts
 * Purpose: GET and POST user's student loan profile for EP projection
 * Routes:
 *   GET  /api/edupay/loan-profile — fetch current profile
 *   POST /api/edupay/loan-profile — create or update profile
 * Created: 2026-02-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/edupay/loan-profile
 * Returns the user's loan profile or null if not set up yet.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: loanProfile, error } = await supabase
    .from('edupay_loan_profiles')
    .select('user_id, loan_plan, estimated_balance, annual_salary, graduation_year, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[EduPay Loan Profile] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch loan profile' }, { status: 500 });
  }

  return NextResponse.json({ loanProfile: loanProfile ?? null });
}

/**
 * POST /api/edupay/loan-profile
 * Creates or updates the user's loan profile (upsert).
 * Body: { loan_plan, estimated_balance, annual_salary, graduation_year }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    loan_plan?: string;
    estimated_balance?: number;
    annual_salary?: number;
    graduation_year?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { loan_plan, estimated_balance, annual_salary, graduation_year } = body;

  if (!loan_plan || !['plan1', 'plan2', 'plan5', 'postgrad'].includes(loan_plan)) {
    return NextResponse.json(
      { error: 'loan_plan must be one of: plan1, plan2, plan5, postgrad' },
      { status: 400 }
    );
  }

  const { data: loanProfile, error } = await supabase
    .from('edupay_loan_profiles')
    .upsert(
      {
        user_id: user.id,
        loan_plan,
        estimated_balance: estimated_balance ?? null,
        annual_salary: annual_salary ?? null,
        graduation_year: graduation_year ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[EduPay Loan Profile] POST error:', error);
    return NextResponse.json({ error: 'Failed to save loan profile' }, { status: 500 });
  }

  return NextResponse.json({ loanProfile });
}
