/**
 * CAS Event Persistence
 *
 * Writes agent events and metrics to Supabase tables:
 * - cas_agent_events: Agent activity audit trail
 * - cas_metrics_timeseries: Numeric metrics over time
 *
 * Graceful: logs warning if no credentials, does not throw.
 *
 * @module cas/packages/core/src/services/cas-events
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
let _warned = false;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (!_warned) {
      console.warn('⚠️ CAS Events: No Supabase credentials. Event persistence disabled.');
      _warned = true;
    }
    return null;
  }

  _supabase = createClient(url, key);
  return _supabase;
}

/**
 * Persist an agent event to cas_agent_events.
 */
export async function persistEvent(
  agentId: string,
  eventType: string,
  eventData: object
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('cas_agent_events').insert({
      agent_id: agentId,
      event_type: eventType,
      event_data: eventData,
    });

    if (error) {
      console.warn(`⚠️ CAS Events: Failed to persist event for ${agentId}: ${error.message}`);
    }
  } catch (err: any) {
    console.warn(`⚠️ CAS Events: Event persistence error: ${err.message}`);
  }
}

/**
 * Persist a numeric metric to cas_metrics_timeseries.
 */
export async function persistMetric(
  agentId: string,
  metricName: string,
  value: number,
  labels?: Record<string, string>
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('cas_metrics_timeseries').insert({
      agent_id: agentId,
      metric_name: metricName,
      metric_value: value,
      labels: labels || {},
    });

    if (error) {
      console.warn(`⚠️ CAS Events: Failed to persist metric for ${agentId}: ${error.message}`);
    }
  } catch (err: any) {
    console.warn(`⚠️ CAS Events: Metric persistence error: ${err.message}`);
  }
}

/**
 * Query recent events for an agent (for regression detection, etc).
 */
export async function queryRecentEvents(
  agentId: string,
  eventType: string,
  limit: number = 10
): Promise<any[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('cas_agent_events')
      .select('*')
      .eq('agent_id', agentId)
      .eq('event_type', eventType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`⚠️ CAS Events: Failed to query events: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (err: any) {
    console.warn(`⚠️ CAS Events: Query error: ${err.message}`);
    return [];
  }
}
