/**
 * Agent Runtime Interface
 *
 * Abstract interface for agent runtime implementations.
 * Allows switching between custom runtime and LangGraph without
 * affecting the control plane (API, DB, UI).
 *
 * Pattern: Adapter Pattern
 * Purpose: Decouple agent orchestration from specific implementation
 */

export interface AgentTask {
  id: string;
  agentId: string;
  input: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentResult {
  taskId: string;
  output: Record<string, any>;
  status: 'success' | 'error' | 'partial';
  error?: string;
  metrics?: {
    duration_ms: number;
    tokens_used?: number;
    cost_usd?: number;
  };
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  persona?: string;
  model?: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export interface AgentMetrics {
  total_runs: number;
  avg_duration_ms: number;
  error_rate: number;
  success_rate: number;
  last_run_at?: Date;
  uptime_seconds?: number;
}

export interface LogFilter {
  level?: 'debug' | 'info' | 'warn' | 'error';
  startTime?: Date;
  endTime?: Date;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface AgentLog {
  id: string;
  agent_id: string;
  level: string;
  message: string;
  context: Record<string, any>;
  timestamp: Date;
}

export interface AgentStatus {
  agent_id: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  uptime_seconds: number;
  last_activity_at?: Date;
  error_message?: string;
  metadata?: Record<string, any>;
}

/**
 * AgentRuntimeInterface
 *
 * Core interface that all agent runtimes must implement.
 * Enables runtime switching via environment variable (CAS_RUNTIME).
 */
export interface AgentRuntimeInterface {
  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Initialize the runtime (connect to services, load configurations)
   */
  initialize(): Promise<void>;

  /**
   * Gracefully shutdown the runtime
   */
  shutdown(): Promise<void>;

  /**
   * Check if runtime is healthy and ready
   */
  healthCheck(): Promise<boolean>;

  // ============================================================================
  // Agent Registration
  // ============================================================================

  /**
   * Register an agent with the runtime
   */
  registerAgent(agentId: string, config: AgentConfig): Promise<void>;

  /**
   * Unregister an agent from the runtime
   */
  unregisterAgent(agentId: string): Promise<void>;

  /**
   * List all registered agents
   */
  listAgents(): Promise<string[]>;

  /**
   * Get agent status
   */
  getAgentStatus(agentId: string): Promise<AgentStatus>;

  // ============================================================================
  // Task Execution
  // ============================================================================

  /**
   * Execute a task synchronously (wait for result)
   */
  executeTask(task: AgentTask): Promise<AgentResult>;

  /**
   * Execute a task with streaming results (async generator)
   */
  streamTask(task: AgentTask): AsyncGenerator<AgentResult>;

  /**
   * Cancel a running task
   */
  cancelTask(taskId: string): Promise<void>;

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Get current agent state
   */
  getAgentState(agentId: string): Promise<any>;

  /**
   * Update agent state
   */
  updateAgentState(agentId: string, state: any): Promise<void>;

  /**
   * Reset agent state to initial
   */
  resetAgentState(agentId: string): Promise<void>;

  // ============================================================================
  // Observability
  // ============================================================================

  /**
   * Get agent metrics (performance, success rate, etc.)
   */
  getMetrics(agentId: string): Promise<AgentMetrics>;

  /**
   * Get agent logs with filtering
   */
  getLogs(agentId: string, filter?: LogFilter): Promise<AgentLog[]>;

  /**
   * Get event history for an agent
   */
  getEventHistory(agentId: string, limit?: number): Promise<any[]>;

  // ============================================================================
  // Workflow (Multi-Agent Coordination)
  // ============================================================================

  /**
   * Execute a multi-agent workflow
   */
  executeWorkflow(workflowId: string, input: any): Promise<any>;

  /**
   * Execute workflow with streaming updates
   */
  streamWorkflow(workflowId: string, input: any): AsyncGenerator<any>;
}

/**
 * Runtime Types
 */
export enum RuntimeType {
  CUSTOM = 'custom',
  LANGGRAPH = 'langgraph'
}

/**
 * Message Bus Type
 */
export type MessageBusType = 'memory' | 'redis';

/**
 * Runtime Configuration
 */
export interface RuntimeConfig {
  type: RuntimeType;
  messageBus?: MessageBusType; // 'memory' (default) or 'redis'
  redisUrl?: string; // For Redis message bus
  redisToken?: string; // For Redis message bus (Upstash)
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  langsmithApiKey?: string;
  enableTracing?: boolean;
  enableCheckpointing?: boolean;
}
