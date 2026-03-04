/*
 * Filename: src/app/api/stripe/growth/portal/route.ts
 * Purpose: Growth Pro Stripe Billing Portal redirect
 * Created: 2026-03-05
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createGrowthBillingPortalSession } from '@/lib/stripe/growth-pro-subscription';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await createGrowthBillingPortalSession(user.id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Growth billing portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
