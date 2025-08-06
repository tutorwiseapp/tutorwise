/*
 * Filename: src/app/api/agents/[agentId]/route.ts
 * Purpose: Provides a public API endpoint to fetch a single agent's profile data.
 * Change History:
 * C001 - 2025-07-27 : 09:00 - Initial creation.
 * Last Modified: 2025-07-27 : 09:00
 * Requirement ID: VIN-C-03.3
 * Change Summary: This file was created as the definitive fix for the non-functional "View Public
 * Profile" link. It provides the essential, public-facing backend data source that was missing.
 * It securely queries the Supabase `profiles` table for the requested agent.
 * Impact Analysis: This is an additive change that makes the public profile page functional. It has
 * no impact on any other part of the application.
 * Dependencies: "next/server", "@supabase/supabase-js".
 */
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials are not set in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;

  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*') // You can specify columns here for security, e.g., 'display_name, bio'
      .eq('agent_id', agentId)
      .single();

    if (error || !profile) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(profile);

  } catch (error) {
    console.error('Server error fetching agent profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}