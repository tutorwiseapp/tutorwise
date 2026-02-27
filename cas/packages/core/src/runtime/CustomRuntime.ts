/**
 * Custom Agent Runtime
 *
 * @deprecated This runtime is DEPRECATED as of 2026-02-27 (Phase 7).
 * Use LangGraphRuntime instead for all new implementations.
 *
 * CustomRuntime will be removed in Phase 8 (scheduled for March 2026).
 *
 * Migration: LangGraphRuntime is now the PRIMARY runtime with full feature parity.
 * Set CAS_RUNTIME=langgraph (default) to use the new runtime.
 *
 * Implementation of AgentRuntimeInterface using the legacy CAS custom runtime.
 * This wraps the existing message bus, agent registry, and Edge Functions.
 *
 * Phase: 1-2 (Legacy implementation - DEPRECATED)
 * Replaced by: LangGraphRuntime (Phase 6 complete)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  AgentRuntimeInterface,
  AgentTask,
  AgentResult,
  AgentConfig,
  AgentMetrics,
  AgentStatus,
  AgentLog,
  LogFilter,
  RuntimeConfig
} from './AgentRuntimeInterface';
import { InMemoryMessageBus } from '../messaging/InMemoryMessageBus';
import { RedisMessageBus } from '../messaging/RedisMessageBus';
import type { MessageBusInterface, TaskMessage, TaskResultMessage } from '../messaging/MessageBusInterface';
import { AgentRegistry } from '../agents/AgentRegistry';
import type { AgentExecutionContext } from '../agents/AgentExecutorInterface';
import { RetryUtility } from './RetryUtility';
import { CircuitBreaker, CircuitState, createAICircuitBreaker } from './CircuitBreaker';

export class CustomAgentRuntime implements AgentRuntimeInterface {
  private initialized = false;
  private config?: RuntimeConfig;
  private agents: Map<string, AgentConfig> = new Map();
  private supabase: SupabaseClient;
  private messageBus: MessageBusInterface;
  private agentRegistry: AgentRegistry;
  private activeTasks: Map<string, { cancelled: boolean }> = new Map();
  private streamCallbacks: Map<string, (update: any) => void> = new Map();

  // Circuit breakers for AI API protection (one per agent)
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(config?: RuntimeConfig) {
    // ⚠️ DEPRECATION WARNING
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.warn('⚠️  DEPRECATION WARNING: CustomAgentRuntime is DEPRECATED');
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.warn('');
    console.warn('CustomRuntime is deprecated as of 2026-02-27 (Phase 7).');
    console.warn('This runtime will be REMOVED in Phase 8 (March 2026).');
    console.warn('');
    console.warn('✅ RECOMMENDED: Use LangGraphRuntime instead');
    console.warn('   - Full feature parity (Phase 6 complete)');
    console.warn('   - Better observability (LangSmith tracing)');
    console.warn('   - Simpler architecture (no message bus)');
    console.warn('   - Set CAS_RUNTIME=langgraph (default)');
    console.warn('');
    console.warn('📚 Migration Guide: cas/docs/LANGGRAPH_MIGRATION_PLAN.md');
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    this.config = config;

    // Initialize message bus based on config or environment
    const messageBusType = config?.messageBus || (process.env.CAS_MESSAGE_BUS as any) || 'memory';

    console.log(`[CustomRuntime] Using ${messageBusType} message bus`);

    if (messageBusType === 'redis') {
      // Use Redis message bus
      this.messageBus = new RedisMessageBus({
        url: config?.redisUrl || process.env.UPSTASH_REDIS_REST_URL,
        token: config?.redisToken || process.env.UPSTASH_REDIS_REST_TOKEN
      });
    } else {
      // Use in-memory message bus (default)
      this.messageBus = new InMemoryMessageBus();
    }

    // Initialize agent registry with all 8 agents
    this.agentRegistry = new AgentRegistry();

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('[CustomRuntime] Missing Supabase credentials. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log('[CustomRuntime] Supabase client initialized');
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[CustomRuntime] Initializing...');

    try {
      // 1. Test database connection
      const { data, error } = await this.supabase
        .from('cas_agent_status')
        .select('agent_id')
        .limit(1);

      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }

      console.log('[CustomRuntime] Database connection successful');

      // 2. Connect to message bus
      await this.messageBus.connect();
      console.log('[CustomRuntime] Message bus connected');

      // 3. Initialize all agents
      await this.agentRegistry.initialize();
      console.log('[CustomRuntime] Agent registry initialized');

      // 4. Subscribe to task results from all agents
      for (const agentId of this.agentRegistry.getAgentIds()) {
        await this.messageBus.subscribeToResults(agentId, this.handleTaskResult.bind(this));
      }
      console.log('[CustomRuntime] Subscribed to agent results');

      this.initialized = true;
      console.log('[CustomRuntime] Initialized successfully');
    } catch (error: any) {
      console.error('[CustomRuntime] Initialization failed:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log('[CustomRuntime] Shutting down...');

    try {
      // 1. Cleanup agent registry
      await this.agentRegistry.cleanup();

      // 2. Disconnect from message bus
      await this.messageBus.disconnect();

      // 3. Clear active tasks
      this.activeTasks.clear();
      this.streamCallbacks.clear();

      this.initialized = false;
      console.log('[CustomRuntime] Shutdown complete');
    } catch (error: any) {
      console.error('[CustomRuntime] Shutdown error:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      // Check database connection
      const { error } = await this.supabase
        .from('cas_agent_status')
        .select('agent_id')
        .limit(1);

      if (error) {
        console.error('[CustomRuntime] Health check failed (database):', error);
        return false;
      }

      // Check message bus connection
      const messageBusHealthy = await this.messageBus.healthCheck();
      if (!messageBusHealthy) {
        console.error('[CustomRuntime] Health check failed (message bus)');
        return false;
      }

      // Check agent health (sample check)
      const agentsHealth = await this.agentRegistry.getAllAgentsHealth();
      const unhealthyAgents = Object.entries(agentsHealth).filter(([_, health]) => !health.healthy);
      if (unhealthyAgents.length > 0) {
        console.warn('[CustomRuntime] Some agents unhealthy:', unhealthyAgents);
        // Don't fail health check for individual agents, just warn
      }

      return true;
    } catch (error) {
      console.error('[CustomRuntime] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get circuit breaker statistics for all agents
   */
  getCircuitBreakerStats() {
    const stats: Record<string, any> = {};
    for (const [agentId, circuitBreaker] of this.circuitBreakers.entries()) {
      stats[agentId] = circuitBreaker.getStats();
    }
    return stats;
  }

  /**
   * Reset circuit breaker for a specific agent
   */
  resetCircuitBreaker(agentId: string): void {
    const circuitBreaker = this.circuitBreakers.get(agentId);
    if (circuitBreaker) {
      circuitBreaker.reset();
      console.log(`[CustomRuntime] Circuit breaker reset for agent: ${agentId}`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const [agentId, circuitBreaker] of this.circuitBreakers.entries()) {
      circuitBreaker.reset();
    }
    console.log(`[CustomRuntime] All circuit breakers reset`);
  }

  // ============================================================================
  // Agent Registration
  // ============================================================================

  async registerAgent(agentId: string, config: AgentConfig): Promise<void> {
    console.log(`[CustomRuntime] Registering agent: ${agentId}`);

    try {
      this.agents.set(agentId, config);

      // Log registration event
      const { error } = await this.supabase
        .from('cas_agent_events')
        .insert({
          agent_id: agentId,
          event_type: 'agent_registered',
          event_data: {
            config,
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error(`[CustomRuntime] Failed to log registration event:`, error);
        // Don't throw - registration succeeded in memory
      }

      // Update agent status to running
      const { error: statusError } = await this.supabase
        .from('cas_agent_status')
        .upsert({
          agent_id: agentId,
          status: 'running',
          last_activity_at: new Date().toISOString(),
          metadata: config
        }, { onConflict: 'agent_id' });

      if (statusError) {
        console.error(`[CustomRuntime] Failed to update agent status:`, statusError);
      }

      console.log(`[CustomRuntime] Agent ${agentId} registered successfully`);
    } catch (error: any) {
      console.error(`[CustomRuntime] Error registering agent:`, error);
      throw error;
    }
  }

  async unregisterAgent(agentId: string): Promise<void> {
    console.log(`[CustomRuntime] Unregistering agent: ${agentId}`);

    try {
      this.agents.delete(agentId);

      // Log unregistration event
      const { error } = await this.supabase
        .from('cas_agent_events')
        .insert({
          agent_id: agentId,
          event_type: 'agent_unregistered',
          event_data: {
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error(`[CustomRuntime] Failed to log unregistration event:`, error);
      }

      // Update agent status to stopped
      const { error: statusError } = await this.supabase
        .from('cas_agent_status')
        .update({
          status: 'stopped',
          last_activity_at: new Date().toISOString()
        })
        .eq('agent_id', agentId);

      if (statusError) {
        console.error(`[CustomRuntime] Failed to update agent status:`, statusError);
      }

      console.log(`[CustomRuntime] Agent ${agentId} unregistered successfully`);
    } catch (error: any) {
      console.error(`[CustomRuntime] Error unregistering agent:`, error);
      throw error;
    }
  }

  async listAgents(): Promise<string[]> {
    return Array.from(this.agents.keys());
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    try {
      const { data, error } = await this.supabase
        .from('cas_agent_status')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();

      if (error) {
        console.error(`[CustomRuntime] Failed to get status for agent ${agentId}:`, error);
        throw new Error(`Failed to get agent status: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Agent ${agentId} not found`);
      }

      return {
        agent_id: data.agent_id,
        status: data.status as 'running' | 'paused' | 'stopped' | 'error',
        uptime_seconds: data.uptime_seconds || 0,
        last_activity_at: data.last_activity_at,
        error_message: data.error_message,
        metadata: data.metadata || {}
      };
    } catch (error: any) {
      console.error(`[CustomRuntime] Error getting agent status:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Task Execution
  // ============================================================================

  async executeTask(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();

    console.log(`[CustomRuntime] Executing task ${task.id} for agent ${task.agentId}`);

    try {
      // Mark task as active
      this.activeTasks.set(task.id, { cancelled: false });

      // Log task started event
      await this.supabase
        .from('cas_agent_events')
        .insert({
          agent_id: task.agentId,
          event_type: 'task_started',
          event_data: {
            task_id: task.id,
            input: task.input,
            timestamp: new Date().toISOString()
          }
        });

      // Get the agent executor
      const agent = this.agentRegistry.getAgent(task.agentId);
      if (!agent) {
        throw new Error(`Agent ${task.agentId} not found`);
      }

      // Get agent state from database
      const state = await this.getAgentState(task.agentId);

      // Create execution context
      const context: AgentExecutionContext = {
        taskId: task.id,
        agentId: task.agentId,
        input: task.input,
        state,
        onProgress: (progress: number, message: string) => {
          console.log(`[${task.agentId}] Task ${task.id} progress: ${Math.round(progress * 100)}% - ${message}`);
          // Stream progress updates
          const callback = this.streamCallbacks.get(task.id);
          if (callback) {
            callback({ type: 'progress', progress, message });
          }
        },
        onLog: (level: string, message: string, metadata?: any) => {
          console.log(`[${task.agentId}] ${level.toUpperCase()}: ${message}`);
          // Log to database (fire and forget, don't block execution)
          this.supabase.from('cas_agent_logs').insert({
            agent_id: task.agentId,
            level,
            message,
            metadata: metadata || {},
            task_id: task.id
          }).then(({ error }) => {
            if (error) console.error('Failed to log:', error);
          });
        },
        isCancelled: () => {
          const taskState = this.activeTasks.get(task.id);
          return taskState?.cancelled || false;
        }
      };

      // Get or create circuit breaker for this agent
      if (!this.circuitBreakers.has(task.agentId)) {
        this.circuitBreakers.set(task.agentId, createAICircuitBreaker());
      }
      const circuitBreaker = this.circuitBreakers.get(task.agentId)!;

      // Execute the task with circuit breaker + retry logic
      const retryResult = await RetryUtility.withRetry(
        async () => {
          // Wrap agent execution with circuit breaker
          return await circuitBreaker.execute(async () => {
            return await agent.execute(context);
          });
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          onRetry: (attempt, error, delayMs) => {
            console.log(
              `[CustomRuntime] Task ${task.id} retry ${attempt}: ${error.message}. ` +
              `Retrying in ${Math.round(delayMs)}ms...`
            );

            // Classify error for better logging
            const errorClass = RetryUtility.classifyError(error);
            context.onLog?.(
              'warn',
              `Retry attempt ${attempt}: ${errorClass.type} error - ${errorClass.message}`,
              { error: error.message, delay_ms: delayMs, retryable: errorClass.retryable }
            );
          }
        }
      );

      // Check if retry succeeded
      if (!retryResult.success || !retryResult.result) {
        const errorClass = RetryUtility.classifyError(retryResult.error);
        throw new Error(
          `Task execution failed after ${retryResult.attempts} attempts: ${errorClass.message}`
        );
      }

      const executionResult = retryResult.result;

      // Check if cancelled
      if (executionResult.status === 'cancelled') {
        throw new Error('Task was cancelled');
      }

      const duration_ms = Date.now() - startTime;

      const result: AgentResult = {
        taskId: task.id,
        output: executionResult.output,
        status: executionResult.status,
        error: executionResult.error,
        metrics: {
          duration_ms,
          ...executionResult.metadata
        }
      };

      // Log task completed event
      await this.supabase
        .from('cas_agent_events')
        .insert({
          agent_id: task.agentId,
          event_type: 'task_completed',
          event_data: {
            task_id: task.id,
            output: result.output,
            duration_ms,
            timestamp: new Date().toISOString()
          }
        });

      // Update agent last activity
      await this.supabase
        .from('cas_agent_status')
        .update({
          last_activity_at: new Date().toISOString()
        })
        .eq('agent_id', task.agentId);

      // Record metrics in timeseries
      await this.supabase
        .from('cas_metrics_timeseries')
        .insert({
          agent_id: task.agentId,
          metric_name: 'task_execution',
          metric_value: duration_ms,
          metric_type: 'duration_ms',
          tags: {
            task_id: task.id,
            status: result.status
          }
        });

      // Cleanup
      this.activeTasks.delete(task.id);

      return result;
    } catch (error: any) {
      console.error(`[CustomRuntime] Task ${task.id} failed:`, error);

      const duration_ms = Date.now() - startTime;

      // Log task failed event
      const { error: logError } = await this.supabase
        .from('cas_agent_events')
        .insert({
          agent_id: task.agentId,
          event_type: 'task_failed',
          event_data: {
            task_id: task.id,
            error: error.message,
            duration_ms,
            timestamp: new Date().toISOString()
          }
        });

      if (logError) {
        console.error('[CustomRuntime] Failed to log error event:', logError);
      }

      // Update agent status to error
      const { error: statusError } = await this.supabase
        .from('cas_agent_status')
        .update({
          status: 'error',
          error_message: error.message,
          last_activity_at: new Date().toISOString()
        })
        .eq('agent_id', task.agentId);

      if (statusError) {
        console.error('[CustomRuntime] Failed to update status:', statusError);
      }

      // Cleanup
      this.activeTasks.delete(task.id);

      return {
        taskId: task.id,
        output: {},
        status: 'error',
        error: error.message,
        metrics: {
          duration_ms
        }
      };
    }
  }

  async *streamTask(task: AgentTask): AsyncGenerator<AgentResult> {
    console.log(`[CustomRuntime] Streaming task ${task.id} for agent ${task.agentId}`);

    // Set up streaming callback
    const updates: any[] = [];
    let completed = false;
    let finalResult: AgentResult | null = null;

    this.streamCallbacks.set(task.id, (update: any) => {
      updates.push(update);
    });

    // Execute task in background
    this.executeTask(task).then(result => {
      finalResult = result;
      completed = true;
    }).catch(error => {
      finalResult = {
        taskId: task.id,
        output: {},
        status: 'error',
        error: error.message
      };
      completed = true;
    });

    // Yield initial status
    yield {
      taskId: task.id,
      output: { status: 'started' },
      status: 'partial'
    };

    // Stream progress updates
    while (!completed) {
      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Yield any new updates
      while (updates.length > 0) {
        const update = updates.shift();
        yield {
          taskId: task.id,
          output: update,
          status: 'partial'
        };
      }
    }

    // Cleanup stream callback
    this.streamCallbacks.delete(task.id);

    // Yield final result
    if (finalResult) {
      yield finalResult;
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    console.log(`[CustomRuntime] Cancelling task ${taskId}`);

    try {
      // Mark task as cancelled
      const taskState = this.activeTasks.get(taskId);
      if (taskState) {
        taskState.cancelled = true;
        console.log(`[CustomRuntime] Task ${taskId} marked as cancelled`);
      } else {
        console.warn(`[CustomRuntime] Task ${taskId} not found in active tasks`);
      }

      // Publish cancellation to message bus
      await this.messageBus.publishCancellation(taskId);

      // Log cancellation event
      await this.supabase
        .from('cas_agent_events')
        .insert({
          agent_id: 'system',
          event_type: 'task_cancelled',
          event_data: {
            task_id: taskId,
            timestamp: new Date().toISOString()
          }
        });

      console.log(`[CustomRuntime] Task ${taskId} cancellation request sent`);
    } catch (error: any) {
      console.error(`[CustomRuntime] Failed to cancel task ${taskId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // State Management
  // ============================================================================

  async getAgentState(agentId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('cas_agent_config')
        .select('config')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .single();

      if (error) {
        // If no state exists, return empty object
        if (error.code === 'PGRST116') {
          return {};
        }
        console.error(`[CustomRuntime] Failed to get state for agent ${agentId}:`, error);
        return {};
      }

      return data?.config || {};
    } catch (error: any) {
      console.error(`[CustomRuntime] Error getting agent state:`, error);
      return {};
    }
  }

  async updateAgentState(agentId: string, state: any): Promise<void> {
    console.log(`[CustomRuntime] Updating state for agent ${agentId}`);

    try {
      // Check if config exists
      const { data: existing } = await this.supabase
        .from('cas_agent_config')
        .select('id')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .single();

      if (existing) {
        // Update existing config
        // First get current version
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
          console.error(`[CustomRuntime] Failed to update state:`, error);
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
          console.error(`[CustomRuntime] Failed to insert state:`, error);
          throw new Error(`Failed to insert agent state: ${error.message}`);
        }
      }

      // Log state change event
      await this.supabase
        .from('cas_agent_events')
        .insert({
          agent_id: agentId,
          event_type: 'state_updated',
          event_data: {
            state,
            timestamp: new Date().toISOString()
          }
        });

      console.log(`[CustomRuntime] State updated successfully for agent ${agentId}`);
    } catch (error: any) {
      console.error(`[CustomRuntime] Error updating agent state:`, error);
      throw error;
    }
  }

  async resetAgentState(agentId: string): Promise<void> {
    console.log(`[CustomRuntime] Resetting state for agent ${agentId}`);

    try {
      // Mark existing configs as inactive instead of deleting (for audit trail)
      const { error } = await this.supabase
        .from('cas_agent_config')
        .update({ is_active: false })
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) {
        console.error(`[CustomRuntime] Failed to reset state:`, error);
        throw new Error(`Failed to reset agent state: ${error.message}`);
      }

      // Log reset event
      await this.supabase
        .from('cas_agent_events')
        .insert({
          agent_id: agentId,
          event_type: 'state_reset',
          event_data: {
            timestamp: new Date().toISOString()
          }
        });

      console.log(`[CustomRuntime] State reset successfully for agent ${agentId}`);
    } catch (error: any) {
      console.error(`[CustomRuntime] Error resetting agent state:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Observability
  // ============================================================================

  async getMetrics(agentId: string): Promise<AgentMetrics> {
    try {
      // Get agent status for uptime
      const { data: statusData } = await this.supabase
        .from('cas_agent_status')
        .select('uptime_seconds')
        .eq('agent_id', agentId)
        .single();

      // Count task completions and failures
      const { data: eventsData } = await this.supabase
        .from('cas_agent_events')
        .select('event_type')
        .eq('agent_id', agentId)
        .in('event_type', ['task_completed', 'task_failed']);

      const total_runs = eventsData?.length || 0;
      const failed_runs = eventsData?.filter(e => e.event_type === 'task_failed').length || 0;
      const success_runs = total_runs - failed_runs;

      const error_rate = total_runs > 0 ? failed_runs / total_runs : 0;
      const success_rate = total_runs > 0 ? success_runs / total_runs : 1.0;

      // Get average duration from metrics
      const { data: metricsData } = await this.supabase
        .from('cas_metrics_timeseries')
        .select('metric_value')
        .eq('agent_id', agentId)
        .eq('metric_name', 'task_execution')
        .eq('metric_type', 'duration_ms');

      let avg_duration_ms = 0;
      if (metricsData && metricsData.length > 0) {
        const total_duration = metricsData.reduce((sum, m) => sum + (m.metric_value || 0), 0);
        avg_duration_ms = total_duration / metricsData.length;
      }

      return {
        total_runs,
        avg_duration_ms,
        error_rate,
        success_rate,
        uptime_seconds: statusData?.uptime_seconds || 0
      };
    } catch (error: any) {
      console.error(`[CustomRuntime] Error getting metrics for agent ${agentId}:`, error);
      return {
        total_runs: 0,
        avg_duration_ms: 0,
        error_rate: 0,
        success_rate: 1.0,
        uptime_seconds: 0
      };
    }
  }

  async getLogs(agentId: string, filter?: LogFilter): Promise<AgentLog[]> {
    try {
      let query = this.supabase
        .from('cas_agent_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter?.level) {
        query = query.eq('level', filter.level);
      }

      if (filter?.startDate) {
        query = query.gte('created_at', filter.startDate);
      }

      if (filter?.endDate) {
        query = query.lte('created_at', filter.endDate);
      }

      if (filter?.limit) {
        query = query.limit(filter.limit);
      } else {
        query = query.limit(100); // Default limit
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[CustomRuntime] Failed to get logs for agent ${agentId}:`, error);
        return [];
      }

      return (data || []).map(log => ({
        timestamp: log.created_at,
        level: log.level,
        message: log.message,
        metadata: log.metadata || {}
      }));
    } catch (error: any) {
      console.error(`[CustomRuntime] Error getting logs:`, error);
      return [];
    }
  }

  async getEventHistory(agentId: string, limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('cas_agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error(`[CustomRuntime] Failed to get event history for agent ${agentId}:`, error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error(`[CustomRuntime] Error getting event history:`, error);
      return [];
    }
  }

  // ============================================================================
  // Internal Helper Methods
  // ============================================================================

  private handleTaskResult(result: TaskResultMessage): void {
    console.log(`[CustomRuntime] Received task result: ${result.taskId} - ${result.status}`);

    // Handle stream updates
    if (result.status === 'partial') {
      const callback = this.streamCallbacks.get(result.taskId);
      if (callback) {
        callback(result.output);
      }
    }

    // Future: handle result routing, error recovery, etc.
  }

  // ============================================================================
  // Workflow (Multi-Agent Coordination)
  // ============================================================================

  async executeWorkflow(workflowId: string, input: any): Promise<any> {
    console.log(`[CustomRuntime] Executing workflow: ${workflowId}`);

    try {
      // Workflow definition - can be loaded from database or config
      const workflow = this.getWorkflowDefinition(workflowId);

      const results: any[] = [];
      let context = { ...input };

      // Execute workflow steps
      for (const step of workflow.steps) {
        console.log(`[CustomRuntime] Executing workflow step: ${step.name}`);

        if (step.type === 'parallel') {
          // Execute tasks in parallel
          const parallelResults = await Promise.all(
            step.tasks.map(task =>
              this.executeTask({
                id: `${workflowId}-${step.name}-${task.agentId}`,
                agentId: task.agentId,
                input: { ...context, ...task.input }
              })
            )
          );

          results.push({ step: step.name, results: parallelResults });

          // Merge results into context
          context = { ...context, [step.name]: parallelResults };
        } else {
          // Execute tasks sequentially
          for (const task of step.tasks) {
            const result = await this.executeTask({
              id: `${workflowId}-${step.name}-${task.agentId}`,
              agentId: task.agentId,
              input: { ...context, ...task.input }
            });

            results.push({ step: step.name, task: task.agentId, result });

            // Add result to context for next step
            context = { ...context, [task.agentId]: result.output };
          }
        }
      }

      return {
        workflow_id: workflowId,
        status: 'completed',
        results,
        final_context: context
      };
    } catch (error: any) {
      console.error(`[CustomRuntime] Workflow ${workflowId} failed:`, error);
      return {
        workflow_id: workflowId,
        status: 'error',
        error: error.message
      };
    }
  }

  private getWorkflowDefinition(workflowId: string): any {
    // Predefined workflows - can be extended to load from database
    const workflows: Record<string, any> = {
      'content-marketing': {
        name: 'Content Marketing Workflow',
        description: 'Create and optimize marketing content',
        steps: [
          {
            name: 'research',
            type: 'sequential',
            tasks: [
              { agentId: 'analyst', input: { action: 'identify_insights', topic: 'market_trends' } }
            ]
          },
          {
            name: 'creation',
            type: 'parallel',
            tasks: [
              { agentId: 'marketer', input: { action: 'create_content', content_type: 'blog' } },
              { agentId: 'marketer', input: { action: 'create_content', content_type: 'social' } }
            ]
          },
          {
            name: 'optimization',
            type: 'sequential',
            tasks: [
              { agentId: 'marketer', input: { action: 'seo_optimize' } }
            ]
          }
        ]
      },
      'feature-development': {
        name: 'Feature Development Workflow',
        description: 'Plan, develop, and test a new feature',
        steps: [
          {
            name: 'planning',
            type: 'sequential',
            tasks: [
              { agentId: 'planner', input: { action: 'create_plan' } },
              { agentId: 'engineer', input: { action: 'design_architecture' } }
            ]
          },
          {
            name: 'development',
            type: 'sequential',
            tasks: [
              { agentId: 'developer', input: { action: 'generate_code' } }
            ]
          },
          {
            name: 'quality',
            type: 'parallel',
            tasks: [
              { agentId: 'tester', input: { action: 'generate_tests' } },
              { agentId: 'qa', input: { action: 'quality_audit' } },
              { agentId: 'security', input: { action: 'security_audit' } }
            ]
          }
        ]
      }
    };

    const workflow = workflows[workflowId];
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    return workflow;
  }

  async *streamWorkflow(workflowId: string, input: any): AsyncGenerator<any> {
    console.log(`[CustomRuntime] Streaming workflow: ${workflowId}`);

    try {
      const workflow = this.getWorkflowDefinition(workflowId);

      yield {
        type: 'workflow_started',
        workflow_id: workflowId,
        workflow_name: workflow.name,
        total_steps: workflow.steps.length
      };

      const results: any[] = [];
      let context = { ...input };

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];

        yield {
          type: 'step_started',
          step_number: i + 1,
          step_name: step.name,
          step_type: step.type
        };

        if (step.type === 'parallel') {
          const parallelResults = await Promise.all(
            step.tasks.map(task =>
              this.executeTask({
                id: `${workflowId}-${step.name}-${task.agentId}`,
                agentId: task.agentId,
                input: { ...context, ...task.input }
              })
            )
          );

          yield {
            type: 'step_completed',
            step_number: i + 1,
            step_name: step.name,
            results: parallelResults
          };

          results.push({ step: step.name, results: parallelResults });
          context = { ...context, [step.name]: parallelResults };
        } else {
          const stepResults = [];

          for (const task of step.tasks) {
            yield {
              type: 'task_started',
              step_name: step.name,
              agent_id: task.agentId
            };

            const result = await this.executeTask({
              id: `${workflowId}-${step.name}-${task.agentId}`,
              agentId: task.agentId,
              input: { ...context, ...task.input }
            });

            yield {
              type: 'task_completed',
              step_name: step.name,
              agent_id: task.agentId,
              result
            };

            stepResults.push(result);
            context = { ...context, [task.agentId]: result.output };
          }

          yield {
            type: 'step_completed',
            step_number: i + 1,
            step_name: step.name,
            results: stepResults
          };

          results.push({ step: step.name, results: stepResults });
        }
      }

      yield {
        type: 'workflow_completed',
        workflow_id: workflowId,
        status: 'completed',
        results,
        final_context: context
      };
    } catch (error: any) {
      yield {
        type: 'workflow_error',
        workflow_id: workflowId,
        error: error.message
      };
    }
  }
}
