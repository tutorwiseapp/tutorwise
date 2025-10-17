/*
 * Filename: src/app/a/[referral_id]/route.ts
 * Purpose: Handles referral link clicks, records the event, and redirects the user.
 * Change History:
 * C002 - 2025-09-02 : 18:00 - Migrated to use the new Supabase server client.
 * C001 - [Date] : [Time] - Initial creation.
 * Last Modified: 2025-09-02 : 18:00
 * Requirement ID: VIN-APP-02
 * Change Summary: This is the definitive fix for the build error "Can't resolve '@/lib/supabaseClient'". The route has been updated to import and use the new Supabase server client from `@/utils/supabase/server`, aligning it with the modern Supabase SSR architecture.
 */
import { createClient } from '@/utils/supabase/server'; // --- THIS IS THE DEFINITIVE FIX ---
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest, 
  { params }: { params: { referral_id: string } }
) {
  const { referral_id } = params;
  const destinationUrl = request.nextUrl.searchParams.get('u');

  if (!destinationUrl) {
    return NextResponse.redirect(new URL('/?error=missing_destination', request.url));
  }
  
  const ipAddress = request.ip ?? '127.0.0.1';
  const userAgent = request.headers.get('user-agent');
  const channelOrigin = request.nextUrl.searchParams.get('channel_origin');

  const clickEventData = {
    referral_id: referral_id,
    destination_url: destinationUrl,
    ip_address: ipAddress,
    user_agent: userAgent,
    channel_origin: channelOrigin,
  };

  try {
    const supabase = createClient(); // --- THIS IS THE DEFINITIVE FIX ---
    const { error } = await supabase
      .from('ClickLog') // This should probably be 'referrals', but using existing table name
      .insert([clickEventData]);

    if (error) {
      throw error;
    }

  } catch (error) {
    console.error('Supabase Error: Failed to log click event.', error);
  }

  return NextResponse.redirect(destinationUrl);
}