/**
 * Supabase Adapter for LangGraph Runtime
 *
 * Provides persistence layer for:
 * - Workflow state checkpointing
 * - Task logging
 * - Agent results
 * - Event logging
 * - Metrics collection
 *
 * Tables used:
 * - cas_workflow_states: Workflow state checkpoints with versioning
 * - cas_tasks: Task execution records
 * - cas_agent_results: Agent execution results
 * - cas_workflow_events: Workflow lifecycle events
 * - cas_agent_events: Agent execution events
 * - cas_metrics_timeseries: Performance metrics
 * - cas_agent_logs: Structured logs
 */

import { SupabaseClient, createClient } from '@supabase/supabase-js';
import type { WorkflowState } from '../LangGraphRuntime';

export interface WorkflowCheckpoint {
  id: string;
  workflow_id: string;
  version: number;
  state: WorkflowState;
  created_at: string;
  thread_id?: string;
}

export interface TaskRecord {
  id: string;
  workflow_id?: string;
  agent_id: string;
  input: any;
  output?: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  error?: string;
  metadata?: any;
}

export interface AgentResultRecord {
  id: string;
  task_id: string;
  agent_id: string;
  output: any;
  status: string;
  execution_time_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  created_at: string;
}

export interface WorkflowEventRecord {
  id: string;
  workflow_id: string;
  event_type: 'started' | 'completed' | 'failed' | 'cancelled' | 'checkpoint_saved';
  event_data?: any;
  created_at: string;
}

export interface CircuitBreakerStateRecord {
  agent_id: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failure_count: number;
  success_count: number;
  total_requests: number;
  last_failure_at?: string;
  last_success_at?: string;
  state_changed_at: string;
  next_attempt_at?: string;
  metadata?: any;
  updated_at: string;
}

export interface LogFilter {
  level?: 'debug' | 'info' | 'warn' | 'error';
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

/**
 * Supabase adapter for LangGraph workflow persistence
 */
export class LangGraphSupabaseAdapter {
  private supabase: SupabaseClient;
  private initialized = false;

  constructor() {
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('[LangGraphSupabaseAdapter] Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  }

  async initialize(): Promise<void> {
    console.log('[LangGraphSupabaseAdapter] Initializing...');

    try {
      // Test database connection
      const { error } = await this.supabase
        .from('cas_workflow_states')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }

      this.initialized = true;
      console.log('[LangGraphSupabaseAdapter] Initialized successfully');
    } catch (error: any) {
      console.error('[LangGraphSupabaseAdapter] Initialization failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // Workflow State Persistence
  // ============================================================================

  /**
   * Save workflow state checkpoint
   */
  async saveCheckpoint(workflowId: string, state: WorkflowState, threadId?: string): Promise<WorkflowCheckpoint> {
    try {
      // Get current version
      const { data: existing, error: fetchError } = await this.supabase
        .from('cas_workflow_states')
        .select('version')
        .eq('workflow_id', workflowId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
        throw fetchError;
      }

      const nextVersion = (existing?.version || 0) + 1;

      // Insert new checkpoint
      const checkpoint: Omit<WorkflowCheckpoint, 'id' | 'created_at'> = {
        workflow_id: workflowId,
        version: nextVersion,
        state,
        thread_id: threadId
      };

      const { data, error } = await this.supabase
        .from('cas_workflow_states')
        .insert(checkpoint)
        .select()
        .single();

      if (error) throw error;

      console.log(`[LangGraphSupabaseAdapter] Saved checkpoint v${nextVersion} for workflow ${workflowId}`);
      return data as WorkflowCheckpoint;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to save checkpoint:`, error);
      throw error;
    }
  }

  /**
   * Load latest workflow state checkpoint
   */
  async loadCheckpoint(workflowId: string): Promise<WorkflowCheckpoint | null> {
    try {
      const { data, error } = await this.supabase
        .from('cas_workflow_states')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      return data as WorkflowCheckpoint | null;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to load checkpoint:`, error);
      throw error;
    }
  }

  /**
   * Load specific version of workflow state
   */
  async loadCheckpointVersion(workflowId: string, version: number): Promise<WorkflowCheckpoint | null> {
    try {
      const { data, error } = await this.supabase
        .from('cas_workflow_states')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('version', version)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as WorkflowCheckpoint | null;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to load checkpoint version:`, error);
      throw error;
    }
  }

  /**
   * Get state history for a workflow
   */
  async getStateHistory(workflowId: string): Promise<WorkflowCheckpoint[]> {
    try {
      const { data, error } = await this.supabase
        .from('cas_workflow_states')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('version', { ascending: true });

      if (error) throw error;

      return (data as WorkflowCheckpoint[]) || [];
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to get state history:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Task Management
  // ============================================================================

  /**
   * Create task record
   */
  async createTask(task: Omit<TaskRecord, 'id' | 'started_at'>): Promise<TaskRecord> {
    try {
      const { data, error } = await this.supabase
        .from('cas_tasks')
        .insert({
          ...task,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return data as TaskRecord;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to create task:`, error);
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskRecord['status'],
    output?: any,
    error?: string
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        completed_at: status === 'completed' || status === 'failed' || status === 'cancelled'
          ? new Date().toISOString()
          : undefined
      };

      if (output !== undefined) updates.output = output;
      if (error !== undefined) updates.error = error;

      const { error: updateError } = await this.supabase
        .from('cas_tasks')
        .update(updates)
        .eq('id', taskId);

      if (updateError) throw updateError;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to update task status:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Agent Results
  // ============================================================================

  /**
   * Save agent execution result
   */
  async saveAgentResult(result: Omit<AgentResultRecord, 'id' | 'created_at'>): Promise<AgentResultRecord> {
    try {
      const { data, error } = await this.supabase
        .from('cas_agent_results')
        .insert({
          ...result,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return data as AgentResultRecord;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to save agent result:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Event Logging
  // ============================================================================

  /**
   * Log workflow event
   */
  async logWorkflowEvent(
    workflowId: string,
    eventType: WorkflowEventRecord['event_type'],
    eventData?: any
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cas_workflow_events')
        .insert({
          workflow_id: workflowId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to log workflow event:`, error);
      // Don't throw - logging failures shouldn't break workflow
    }
  }

  /**
   * Log agent event
   */
  async logAgentEvent(
    agentId: string,
    eventType: string,
    eventData?: any
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cas_agent_events')
        .insert({
          agent_id: agentId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to log agent event:`, error);
      // Don't throw - logging failures shouldn't break execution
    }
  }

  /**
   * Get workflow event history
   */
  async getWorkflowEventHistory(workflowId: string): Promise<WorkflowEventRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('cas_workflow_events')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data as WorkflowEventRecord[]) || [];
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to get event history:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Metrics Collection
  // ============================================================================

  /**
   * Save metrics
   */
  async saveMetrics(metrics: {
    workflow_id?: string;
    agent_id?: string;
    metric_name: string;
    metric_value: number;
    metadata?: any;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cas_metrics_timeseries')
        .insert({
          ...metrics,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to save metrics:`, error);
      // Don't throw - metrics failures shouldn't break workflow
    }
  }

  // ============================================================================
  // Log Persistence
  // ============================================================================

  /**
   * Save log entry
   */
  async saveLog(log: {
    workflow_id?: string;
    agent_id?: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cas_agent_logs')
        .insert({
          ...log,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to save log:`, error);
      // Don't throw - logging failures shouldn't break workflow
    }
  }

  // ============================================================================
  // Circuit Breaker State Persistence
  // ============================================================================

  /**
   * Save circuit breaker state
   */
  async saveCircuitBreakerState(state: {
    agent_id: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failure_count: number;
    success_count: number;
    total_requests: number;
    last_failure_at?: Date;
    last_success_at?: Date;
    next_attempt_at?: Date;
    metadata?: any;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('update_circuit_breaker_state', {
          p_agent_id: state.agent_id,
          p_state: state.state,
          p_failure_count: state.failure_count,
          p_success_count: state.success_count,
          p_total_requests: state.total_requests,
          p_last_failure_at: state.last_failure_at?.toISOString() || null,
          p_last_success_at: state.last_success_at?.toISOString() || null,
          p_next_attempt_at: state.next_attempt_at?.toISOString() || null,
          p_metadata: state.metadata || null
        });

      if (error) throw error;

      console.log(`[LangGraphSupabaseAdapter] Saved circuit breaker state for ${state.agent_id}: ${state.state}`);
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to save circuit breaker state:`, error);
      // Don't throw - state persistence failures shouldn't break agent execution
    }
  }

  /**
   * Load circuit breaker state
   */
  async loadCircuitBreakerState(agentId: string): Promise<CircuitBreakerStateRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('cas_circuit_breaker_state')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      return data as CircuitBreakerStateRecord | null;
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to load circuit breaker state:`, error);
      return null;
    }
  }

  /**
   * Get circuit breaker history for an agent
   */
  async getCircuitBreakerHistory(
    agentId: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('cas_circuit_breaker_history')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to get circuit breaker history:`, error);
      return [];
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('cas_workflow_states')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('[LangGraphSupabaseAdapter] Health check failed:', error);
      return false;
    }
  }

  /**
   * Load agent state from database
   */
  async loadAgentState(agentId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('cas_agent_config')
        .select('config')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .single();

      if (error) {
        // PGRST116 = no rows found (graceful degradation)
        if (error.code === 'PGRST116') {
          return {};
        }
        console.error(`[LangGraphSupabaseAdapter] Failed to load state for ${agentId}:`, error);
        return {};
      }

      return data?.config || {};
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Error loading agent state:`, error);
      return {}; // Never throw - return empty state
    }
  }

  /**
   * Save agent state to database with version tracking
   */
  async saveAgentState(agentId: string, state: any): Promise<void> {
    try {
      // Check if config exists
      const { data: existing } = await this.supabase
        .from('cas_agent_config')
        .select('id')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .single();

      if (existing) {
        // Update existing - get current version first
        const { data: currentConfig } = await this.supabase
          .from('cas_agent_config')
          .select('version')
          .eq('agent_id', agentId)
          .eq('is_active', true)
          .single();

        const newVersion = (currentConfig?.version || 1) + 1;

        const { error } = await this.supabase
          .from('cas_agent_config')
          .update({
            config: state,
            version: newVersion
          })
          .eq('agent_id', agentId)
          .eq('is_active', true);

        if (error) {
          throw new Error(`Failed to update agent state: ${error.message}`);
        }
      } else {
        // Insert new config
        const { error } = await this.supabase
          .from('cas_agent_config')
          .insert({
            agent_id: agentId,
            config: state
          });

        if (error) {
          throw new Error(`Failed to insert agent state: ${error.message}`);
        }
      }

      // Fire-and-forget event logging (don't await)
      this.logAgentEvent(agentId, 'state_updated', {
        state,
        timestamp: new Date().toISOString()
      }).catch(err =>
        console.error(`[LangGraphSupabaseAdapter] Event log failed:`, err)
      );

      console.log(`[LangGraphSupabaseAdapter] State updated for agent ${agentId}`);
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Error saving agent state:`, error);
      throw error;
    }
  }

  /**
   * Reset agent state (soft delete for audit trail)
   */
  async resetAgentState(agentId: string): Promise<void> {
    console.log(`[LangGraphSupabaseAdapter] Resetting state for agent ${agentId}`);

    try {
      // Soft delete (mark as inactive) for audit trail
      const { error } = await this.supabase
        .from('cas_agent_config')
        .update({ is_active: false })
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to reset agent state: ${error.message}`);
      }

      // Fire-and-forget event logging
      this.logAgentEvent(agentId, 'state_reset', {
        timestamp: new Date().toISOString()
      }).catch(err =>
        console.error(`[LangGraphSupabaseAdapter] Event log failed:`, err)
      );

      console.log(`[LangGraphSupabaseAdapter] State reset for agent ${agentId}`);
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Error resetting agent state:`, error);
      throw error;
    }
  }

  /**
   * Get agent state history (all versions)
   */
  async getAgentStateHistory(agentId: string, limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('cas_agent_config')
        .select('*')
        .eq('agent_id', agentId)
        .order('version', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(record => ({
        version: record.version,
        config: record.config,
        created_at: record.created_at,
        is_active: record.is_active
      }));
    } catch (error: any) {
      console.error(`[LangGraphSupabaseAdapter] Failed to get state history:`, error);
      return [];
    }
  }

  /**
   * Get metrics from the database
   * @param agentId - Optional agent ID to filter by
   * @param metricName - Optional metric name to filter by
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Array of metric records
   */
  async getMetrics(
    agentId?: string,
    metricName?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      let query = this.supabase
        .from('cas_metrics_timeseries')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (metricName) {
        query = query.eq('metric_name', metricName);
      }

      if (agentId) {
        // Filter by agent_id in labels JSONB column
        query = query.contains('labels', { agent_id: agentId });
      }

      const { data, error } = await query;

      if (error) {
        console.error('[LangGraphSupabaseAdapter] Failed to get metrics:', error);
        return [];
      }

      return (data || []).map(record => ({
        metric_name: record.metric_name,
        metric_value: record.metric_value,
        labels: record.labels,
        timestamp: record.timestamp
      }));
    } catch (error: any) {
      console.error('[LangGraphSupabaseAdapter] Error getting metrics:', error);
      return []; // Graceful degradation
    }
  }

  /**
   * Get logs from the database
   * @param agentId - Optional agent ID to filter by
   * @param filter - Optional filter criteria (level, time range, limit)
   * @returns Array of log records
   */
  async getLogs(
    agentId?: string,
    filter?: LogFilter
  ): Promise<any[]> {
    try {
      const limit = filter?.limit || 100;

      let query = this.supabase
        .from('cas_agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (filter?.level) {
        query = query.eq('level', filter.level);
      }

      if (filter?.startTime) {
        query = query.gte('created_at', filter.startTime.toISOString());
      }

      if (filter?.endTime) {
        query = query.lte('created_at', filter.endTime.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[LangGraphSupabaseAdapter] Failed to get logs:', error);
        return [];
      }

      return (data || []).map(record => ({
        id: record.id,
        workflow_id: record.workflow_id,
        agent_id: record.agent_id,
        level: record.level,
        message: record.message,
        metadata: record.metadata,
        created_at: record.created_at
      }));
    } catch (error: any) {
      console.error('[LangGraphSupabaseAdapter] Error getting logs:', error);
      return []; // Graceful degradation
    }
  }

  /**
   * Get event history from the database
   * @param agentId - Optional agent ID to filter by
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Array of event records
   */
  async getEventHistory(
    agentId?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      let query = this.supabase
        .from('cas_agent_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[LangGraphSupabaseAdapter] Failed to get event history:', error);
        return [];
      }

      return (data || []).map(record => ({
        id: record.id,
        agent_id: record.agent_id,
        event_type: record.event_type,
        event_data: record.event_data,
        created_at: record.created_at
      }));
    } catch (error: any) {
      console.error('[LangGraphSupabaseAdapter] Error getting event history:', error);
      return []; // Graceful degradation
    }
  }
}
