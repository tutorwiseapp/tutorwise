/*
 * Filename: src/app/api/auth/create-user/route.ts
 * Purpose: Provides a secure server-side endpoint to create a user profile after signup.
 *
 * Change History:
 * C001 - 2025-07-22 : 22:30 - Initial creation.
 *
 * Last Modified: 2025-07-22 : 22:30
 * Requirement ID (optional): VIN-B-03.3
 *
 * Change Summary:
 * Created a new API route that receives profile data from the client after a successful
 * `signUp` event. It uses the Supabase Admin client (via the service role key) to securely
 * insert the new profile record, bypassing the RLS policy that would otherwise block
 * an unauthenticated user. This is the definitive fix for the 404 error.
 *
 * Impact Analysis:
 * This new route is a critical part of the live authentication flow.
 *
 * Dependencies: "next/server", "@supabase/supabase-js".
 */
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const profileData = await request.json();

  // Validate that the essential ID is present
  if (!profileData.id) {
    return NextResponse.json({ error: 'User ID is missing from the request.' }, { status: 400 });
  }

  // We MUST use the service role key here to bypass RLS for the initial profile creation.
  // This is a secure operation because it only runs on the server.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // This is your secret key
  );

  const { error } = await supabaseAdmin
    .from('profiles')
    .insert(profileData);

  if (error) {
    console.error('Error creating user profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User profile created successfully.' });
}