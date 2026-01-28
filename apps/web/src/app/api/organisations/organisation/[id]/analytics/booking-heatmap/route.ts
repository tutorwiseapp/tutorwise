/**
 * Filename: src/app/api/organisation/[id]/analytics/booking-heatmap/route.ts
 * Purpose: API endpoint for booking frequency heatmap data
 * Created: 2025-12-15
 * Version: v7.0 - Organisation Premium Performance Analytics
 *
 * GET /api/organisation/[id]/analytics/booking-heatmap?weeks=4
 * Returns booking frequency by day of week and hour
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const organisationId = params.id;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get weeks from query params (default: 4)
    const { searchParams } = new URL(req.url);
    const weeks = parseInt(searchParams.get('weeks') || '4', 10);

    // Verify user owns this organisation
    const { data: org, error: orgError } = await supabase
      .from('connection_groups')
      .select('profile_id')
      .eq('id', organisationId)
      .eq('type', 'organisation')
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      );
    }

    if (org.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this organisation' },
        { status: 403 }
      );
    }

    // Call RPC function to get heatmap data
    const { data, error } = await supabase
      .rpc('get_organisation_booking_heatmap', {
        org_id: organisationId,
        weeks
      });

    if (error) {
      console.error('Error fetching booking heatmap:', error);
      throw error;
    }

    return NextResponse.json({
      data: (data || []).map((row: any) => ({
        day_of_week: row.day_of_week,
        day_name: row.day_name?.trim(),
        hour: row.hour,
        bookings_count: row.bookings_count || 0,
      }))
    });

  } catch (error) {
    console.error('Booking heatmap API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
