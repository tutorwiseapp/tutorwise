/*
 * Filename: src/app/api/agents/[agentId]/route.ts
 * Purpose: Provides a public API endpoint to fetch a single agent's profile data.
 *
 * Change History:
 * C001 - 2025-07-22 : 16:30 - Initial creation.
 *
 * Last Modified: 2025-07-22 : 16:30
 * Requirement ID (optional): VIN-C-03.3
 *
 * Change Summary:
 * Created a new public API route that fetches a specific agent's profile from the database
 * based on their public `agent_id`. This is the new data source for the public profile page.
 *
 * Impact Analysis:
 * This is a critical step in migrating the agent profile page off the mock data system.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We create a new server-side Supabase client here
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;

  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
  }

  // Fetch the profile from the database where the public agent_id matches
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*') // You can specify columns here for security, e.g., 'display_name, bio, ...'
    .eq('agent_id', agentId)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  return NextResponse.json(profile);
}