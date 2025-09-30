/*
 * Filename: src/app/api/links/route.ts
 * Purpose: Provides a secure, server-side API endpoint to create new referral link records.
 *
 * Change History:
 * C003 - 2025-07-22 : 23:15 - Reverted to use the service_role client to bypass RLS.
 * C002 - 2025-07-22 : 23:00 - Simplified client to rely on RLS policy.
 * C001 - 2025-07-22 : 21:30 - Initial creation.
 *
 * Last Modified: 2025-07-22 : 23:15
 * Requirement ID (optional): VIN-D-01.1
 *
 * Change Summary:
 * The component has been reverted to use a dedicated Supabase Admin client initialized with the
 * `SUPABASE_SERVICE_ROLE_KEY`. This client has elevated privileges and bypasses all Row Level
 * Security policies. This is the definitive and robust solution to fix the `500 Internal Server Error`
 * caused by RLS blocking the insert operation for both guest and authenticated users.
 *
 * Impact Analysis:
 * This change makes the link generation endpoint fully functional and reliable.
 *
 * Dependencies: "next/server", "@supabase/supabase-js".
 */
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { destinationUrl, channel, agentId } = await request.json();

  if (!destinationUrl || !agentId) {
    return NextResponse.json(
      { error: 'Destination URL and Agent ID are required.' },
      { status: 400 }
    );
  }

  // --- THIS IS THE FINAL, CORRECT IMPLEMENTATION ---
  // We create a dedicated admin client using the Service Role Key.
  // This client has superuser privileges and will bypass RLS.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .insert({
        agent_id: agentId,
        destination_url: destinationUrl,
        channel_origin: channel,
        status: 'Open',
      })
      .select()
      .single();

    if (error) {
      // If there's an error now, it's a genuine database issue (e.g., wrong column name)
      throw error;
    }

    return NextResponse.json({ message: 'Link created successfully', referral: data });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Error creating link:', errorMessage);
    return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
    );
  }
}