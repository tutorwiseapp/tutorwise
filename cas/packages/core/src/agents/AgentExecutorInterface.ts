/**
 * Agent Executor Interface
 *
 * Defines the contract for agent execution logic
 * Each of the 8 agents (Marketer, Analyst, Planner, Developer, Tester, QA, Engineer, Security)
 * implements this interface with domain-specific logic
 */

export interface AgentExecutionContext {
  taskId: string;
  agentId: string;
  input: any;
  state?: any;
  onProgress?: (progress: number, message: string) => void;
  onLog?: (level: string, message: string, metadata?: any) => void;
  isCancelled?: () => boolean;
}

export interface AgentExecutionResult {
  output: any;
  status: 'success' | 'error' | 'cancelled';
  error?: string;
  metadata?: any;
}

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema?: any;
  outputSchema?: any;
}

export interface AgentExecutorInterface {
  /**
   * Agent ID (e.g., 'marketer', 'analyst')
   */
  readonly agentId: string;

  /**
   * Agent display name
   */
  readonly name: string;

  /**
   * Agent description
   */
  readonly description: string;

  /**
   * List of agent capabilities
   */
  readonly capabilities: AgentCapability[];

  /**
   * Initialize the agent
   */
  initialize(): Promise<void>;

  /**
   * Execute a task
   */
  execute(context: AgentExecutionContext): Promise<AgentExecutionResult>;

  /**
   * Validate input for a specific capability
   */
  validateInput(capability: string, input: any): boolean;

  /**
   * Get agent health status
   */
  getHealth(): Promise<{ healthy: boolean; message?: string }>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}
