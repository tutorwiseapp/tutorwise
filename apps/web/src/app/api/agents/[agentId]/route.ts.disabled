/*
 * Filename: src/app/api/agents/[agentId]/route.ts
 * Purpose: Provides a public API endpoint to fetch a single agent's profile data.
 * Change History:
 * C002 - 2025-08-08 : 12:00 - Definitive fix using Supabase Admin Client.
 * C001 - 2025-07-27 : 09:00 - Initial creation.
 * Last Modified: 2025-08-08 : 12:00
 * Requirement ID: VIN-C-03.3
 * Change Summary: This is the definitive fix for the "Agent Not Found" error. The route has been refactored to use a dedicated Supabase Admin Client, which is initialized with the `SUPABASE_SERVICE_ROLE_KEY`. This client has elevated privileges and bypasses Row Level Security, guaranteeing that it can read the profile data created by the webhook. This resolves the data access failure and makes the public profile page fully functional.
 * Impact Analysis: This change fixes a critical user journey bug. It makes the backend API for fetching profiles robust and reliable without impacting any other part of the application.
 * Dependencies: "next/server", "@supabase/supabase-js".
 */
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// --- THIS IS THE FIX ---
// We create a dedicated admin client that can bypass RLS for this public data lookup.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'temp-key'
);

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;

  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
  }

  try {
    // We now use the admin client to perform the query.
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('agent_id, display_name, bio, categories, custom_picture_url, cover_photo_url') // Select only public-safe columns
      .eq('agent_id', agentId)
      .single();

    if (error || !profile) {
      console.error('Supabase query error for agent:', agentId, error);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(profile);

  } catch (error) {
    console.error('Server error fetching agent profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}