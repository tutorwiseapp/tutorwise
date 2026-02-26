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
}
