import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export interface CasAgentStatus {
  agent_id: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  last_activity_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cas_agent_status')
      .select('agent_id, status, last_activity_at, error_message, metadata, updated_at')
      .order('agent_id');

    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error('[GET /api/admin/cas/agents/status]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch CAS agent status' }, { status: 500 });
  }
}
