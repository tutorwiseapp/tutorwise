/*
 * API endpoint for fetching payment disputes
 * Created: 2026-02-07
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Fetch disputed transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id,
        booking_id,
        amount,
        status,
        created_at,
        booking:bookings(
          id,
          service_name,
          client:profiles!bookings_client_id_fkey(full_name),
          tutor:profiles!bookings_tutor_id_fkey(full_name)
        )
      `)
      .eq('status', 'disputed')
      .order('created_at', { ascending: false });

    const disputes = (transactions || []).map((txn: any) => ({
      id: txn.id,
      booking_id: txn.booking_id,
      amount: Math.abs(txn.amount),
      status: 'under_review',
      reason: 'Chargeback filed',
      created_at: txn.created_at,
      booking_reference: txn.booking?.id?.substring(0, 8) || 'N/A',
      client_name: txn.booking?.client?.full_name || 'Unknown',
      tutor_name: txn.booking?.tutor?.full_name || 'Unknown',
    }));

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error('Disputes API error:', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
