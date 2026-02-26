/**
 * LangGraph Runtime
 *
 * Alternative runtime using LangGraph for stateful, multi-agent workflows.
 *
 * Features:
 * - Graph-based workflow orchestration
 * - State management across agent executions
 * - Conditional routing between agents
 * - Workflow visualization
 * - Checkpointing and resumability
 *
 * Installation required:
 * npm install @langchain/langgraph @langchain/core
 *
 * Phase: 3-4 (Advanced orchestration)
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import type {
  AgentRuntimeInterface,
  AgentTask,
  AgentResult,
  AgentConfig,
  RuntimeConfig
} from './AgentRuntimeInterface';
import { AgentRegistry } from '../agents/AgentRegistry';
import type { AgentExecutionContext } from '../agents/AgentExecutorInterface';
import { LangGraphSupabaseAdapter } from './supabase/LangGraphSupabaseAdapter';
import { CircuitBreaker, CircuitState, createAICircuitBreaker } from './CircuitBreaker';

/**
 * State shared across agent executions in a workflow
 */
export interface WorkflowState {
  // Current step in the workflow
  currentStep: string;

  // Input data for the workflow
  input: any;

  // Results from each agent execution
  agentResults: Record<string, any>;

  // Shared context that gets updated as workflow progresses
  context: Record<string, any>;

  // Workflow metadata
  metadata: {
    workflowId: string;
    startedAt: Date;
    completedSteps: string[];
    errors: Array<{ step: string; error: string }>;
  };
}

/**
 * LangGraph-based runtime for multi-agent workflows
 */
export class LangGraphRuntime implements AgentRuntimeInterface {
  private initialized = false;
  private agentRegistry: AgentRegistry;
  private workflows: Map<string, StateGraph<WorkflowState>> = new Map();
  private supabaseAdapter: LangGraphSupabaseAdapter;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(config?: RuntimeConfig) {
    this.agentRegistry = new AgentRegistry();
    this.supabaseAdapter = new LangGraphSupabaseAdapter();
  }

  // ============================================================================
  // Circuit Breaker Management
  // ============================================================================

  /**
   * Get or create a circuit breaker for an agent
   */
  private getCircuitBreaker(agentId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(agentId)) {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,           // Open after 5 failures
        successThreshold: 2,            // Close after 2 successes in half-open
        timeout: 60000,                 // Wait 1 minute before trying again
        monitoringPeriod: 120000,       // 2-minute window for failures
        onStateChange: async (state: CircuitState) => {
          console.log(`[CircuitBreaker] ${agentId} state changed to: ${state}`);

          const stats = circuitBreaker.getStats();

          // Log state change event to Supabase
          try {
            await this.supabaseAdapter.logAgentEvent(
              agentId,
              'circuit_breaker_state_change',
              {
                new_state: state,
                stats
              }
            );
          } catch (error) {
            console.error(`[CircuitBreaker] Failed to log state change event for ${agentId}:`, error);
          }

          // Persist circuit breaker state to Supabase
          try {
            await this.supabaseAdapter.saveCircuitBreakerState({
              agent_id: agentId,
              state: stats.state as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
              failure_count: stats.failures,
              success_count: stats.successes,
              total_requests: stats.totalRequests,
              last_failure_at: stats.lastFailureTime,
              last_success_at: stats.lastSuccessTime,
              next_attempt_at: undefined, // Could be added to CircuitBreakerStats
              metadata: {
                state_changed_at: stats.stateChangedAt.toISOString()
              }
            });
          } catch (error) {
            console.error(`[CircuitBreaker] Failed to persist state for ${agentId}:`, error);
          }
        }
      });

      this.circuitBreakers.set(agentId, circuitBreaker);
      console.log(`[LangGraphRuntime] Created circuit breaker for agent: ${agentId}`);
    }

    return this.circuitBreakers.get(agentId)!;
  }

  /**
   * Execute an agent with circuit breaker protection
   */
  private async executeAgentWithCircuitBreaker(
    agentId: string,
    context: AgentExecutionContext
  ): Promise<any> {
    const circuitBreaker = this.getCircuitBreaker(agentId);

    return circuitBreaker.execute(async () => {
      const agent = this.agentRegistry.getAgent(agentId);
      if (!agent) {
        throw new Error(`${agentId} agent not found`);
      }

      return agent.execute(context);
    });
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[LangGraphRuntime] Initializing...');

    try {
      // Initialize Supabase adapter
      await this.supabaseAdapter.initialize();
      console.log('[LangGraphRuntime] Supabase adapter initialized');

      // Initialize agent registry
      await this.agentRegistry.initialize();
      console.log('[LangGraphRuntime] Agent registry initialized');

      // Create default workflows
      this.createContentStrategyWorkflow();
      this.createFeatureDevelopmentWorkflow();
      this.createSecurityAuditWorkflow();

      this.initialized = true;
      console.log('[LangGraphRuntime] Initialized successfully');
    } catch (error: any) {
      console.error('[LangGraphRuntime] Initialization failed:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log('[LangGraphRuntime] Shutting down...');

    try {
      // Cleanup agent registry
      await this.agentRegistry.cleanup();

      // Clear workflows
      this.workflows.clear();

      this.initialized = false;
      console.log('[LangGraphRuntime] Shutdown complete');
    } catch (error: any) {
      console.error('[LangGraphRuntime] Shutdown error:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      // Check Supabase connection
      const supabaseHealthy = await this.supabaseAdapter.healthCheck();
      if (!supabaseHealthy) {
        console.error('[LangGraphRuntime] Health check failed (Supabase)');
        return false;
      }

      // Check agent health
      const agentsHealth = await this.agentRegistry.getAllAgentsHealth();
      const unhealthyAgents = Object.entries(agentsHealth).filter(([_, health]) => !health.healthy);

      if (unhealthyAgents.length > 0) {
        console.warn('[LangGraphRuntime] Some agents unhealthy:', unhealthyAgents);
      }

      // Check circuit breaker states
      const openCircuits: string[] = [];
      for (const [agentId, breaker] of this.circuitBreakers.entries()) {
        const stats = breaker.getStats();
        if (stats.state === CircuitState.OPEN) {
          openCircuits.push(agentId);
        }
      }

      if (openCircuits.length > 0) {
        console.warn('[LangGraphRuntime] Circuit breakers OPEN for agents:', openCircuits);
      }

      return true;
    } catch (error) {
      console.error('[LangGraphRuntime] Health check failed:', error);
      return false;
    }
  }

  // ============================================================================
  // Workflow Creation
  // ============================================================================

  /**
   * Create Content Strategy Workflow (Analyst → Marketer)
   */
  private createContentStrategyWorkflow(): void {
    const workflow = new StateGraph<WorkflowState>({
      channels: {
        currentStep: null,
        input: null,
        agentResults: null,
        context: null,
        metadata: null
      }
    });

    // Define nodes (agent execution steps)
    workflow.addNode('analyst', async (state: WorkflowState) => {
      console.log('[Workflow] Executing Analyst step');

      const result = await this.executeAgentWithCircuitBreaker('analyst', {
        taskId: `${state.metadata.workflowId}-analyst`,
        agentId: 'analyst',
        input: state.input,
        state: {},
        onProgress: (p, m) => console.log(`[Analyst] ${Math.round(p * 100)}% - ${m}`),
        onLog: (l, m) => console.log(`[Analyst] ${l}: ${m}`),
        isCancelled: () => false
      });

      return {
        ...state,
        currentStep: 'analyst',
        agentResults: {
          ...state.agentResults,
          analyst: result.output
        },
        context: {
          ...state.context,
          insights: result.output
        },
        metadata: {
          ...state.metadata,
          completedSteps: [...state.metadata.completedSteps, 'analyst']
        }
      };
    });

    workflow.addNode('marketer', async (state: WorkflowState) => {
      console.log('[Workflow] Executing Marketer step');

      const result = await this.executeAgentWithCircuitBreaker('marketer', {
        taskId: `${state.metadata.workflowId}-marketer`,
        agentId: 'marketer',
        input: {
          ...state.input,
          insights: state.context.insights // Pass analyst insights
        },
        state: {},
        onProgress: (p, m) => console.log(`[Marketer] ${Math.round(p * 100)}% - ${m}`),
        onLog: (l, m) => console.log(`[Marketer] ${l}: ${m}`),
        isCancelled: () => false
      });

      return {
        ...state,
        currentStep: 'marketer',
        agentResults: {
          ...state.agentResults,
          marketer: result.output
        },
        metadata: {
          ...state.metadata,
          completedSteps: [...state.metadata.completedSteps, 'marketer']
        }
      };
    });

    // Define edges (workflow flow)
    workflow.addEdge(START, 'analyst');
    workflow.addEdge('analyst', 'marketer');
    workflow.addEdge('marketer', END);

    // Compile and store workflow
    const compiledWorkflow = workflow.compile();
    this.workflows.set('content-strategy', compiledWorkflow as any);

    console.log('[LangGraphRuntime] Content Strategy workflow created');
  }

  /**
   * Create Feature Development Workflow (Analyst → Planner → Developer → Tester → QA)
   */
  private createFeatureDevelopmentWorkflow(): void {
    const workflow = new StateGraph<WorkflowState>({
      channels: {
        currentStep: null,
        input: null,
        agentResults: null,
        context: null,
        metadata: null
      }
    });

    // Add agent nodes
    const agents = ['analyst', 'planner', 'developer', 'tester', 'qa'];

    for (const agentId of agents) {
      workflow.addNode(agentId, async (state: WorkflowState) => {
        console.log(`[Workflow] Executing ${agentId} step`);

        const result = await this.executeAgentWithCircuitBreaker(agentId, {
          taskId: `${state.metadata.workflowId}-${agentId}`,
          agentId,
          input: {
            ...state.input,
            ...state.context // Pass all context from previous steps
          },
          state: {},
          onProgress: (p, m) => console.log(`[${agentId}] ${Math.round(p * 100)}% - ${m}`),
          onLog: (l, m) => console.log(`[${agentId}] ${l}: ${m}`),
          isCancelled: () => false
        });

        return {
          ...state,
          currentStep: agentId,
          agentResults: {
            ...state.agentResults,
            [agentId]: result.output
          },
          context: {
            ...state.context,
            [agentId]: result.output
          },
          metadata: {
            ...state.metadata,
            completedSteps: [...state.metadata.completedSteps, agentId]
          }
        };
      });
    }

    // Define linear workflow: Analyst → Planner → Developer → Tester → QA
    workflow.addEdge(START, 'analyst');
    workflow.addEdge('analyst', 'planner');
    workflow.addEdge('planner', 'developer');
    workflow.addEdge('developer', 'tester');
    workflow.addEdge('tester', 'qa');
    workflow.addEdge('qa', END);

    // Compile and store workflow
    const compiledWorkflow = workflow.compile();
    this.workflows.set('feature-development', compiledWorkflow as any);

    console.log('[LangGraphRuntime] Feature Development workflow created');
  }

  /**
   * Create Security Audit Workflow (Security → Engineer)
   */
  private createSecurityAuditWorkflow(): void {
    const workflow = new StateGraph<WorkflowState>({
      channels: {
        currentStep: null,
        input: null,
        agentResults: null,
        context: null,
        metadata: null
      }
    });

    // Security node
    workflow.addNode('security', async (state: WorkflowState) => {
      const result = await this.executeAgentWithCircuitBreaker('security', {
        taskId: `${state.metadata.workflowId}-security`,
        agentId: 'security',
        input: state.input,
        state: {},
        onProgress: (p, m) => console.log(`[Security] ${Math.round(p * 100)}% - ${m}`),
        onLog: (l, m) => console.log(`[Security] ${l}: ${m}`),
        isCancelled: () => false
      });

      return {
        ...state,
        agentResults: { ...state.agentResults, security: result.output },
        context: { ...state.context, security_findings: result.output },
        metadata: {
          ...state.metadata,
          completedSteps: [...state.metadata.completedSteps, 'security']
        }
      };
    });

    // Conditional routing based on security findings
    workflow.addNode('engineer', async (state: WorkflowState) => {
      const result = await this.executeAgentWithCircuitBreaker('engineer', {
        taskId: `${state.metadata.workflowId}-engineer`,
        agentId: 'engineer',
        input: {
          ...state.input,
          security_findings: state.context.security_findings
        },
        state: {},
        onProgress: (p, m) => console.log(`[Engineer] ${Math.round(p * 100)}% - ${m}`),
        onLog: (l, m) => console.log(`[Engineer] ${l}: ${m}`),
        isCancelled: () => false
      });

      return {
        ...state,
        agentResults: { ...state.agentResults, engineer: result.output },
        metadata: {
          ...state.metadata,
          completedSteps: [...state.metadata.completedSteps, 'engineer']
        }
      };
    });

    workflow.addEdge(START, 'security');
    workflow.addEdge('security', 'engineer');
    workflow.addEdge('engineer', END);

    const compiledWorkflow = workflow.compile();
    this.workflows.set('security-audit', compiledWorkflow as any);

    console.log('[LangGraphRuntime] Security Audit workflow created');
  }

  // ============================================================================
  // Workflow Execution
  // ============================================================================

  /**
   * Execute a workflow by ID with Supabase persistence
   */
  async executeWorkflow(workflowId: string, input: any): Promise<any> {
    console.log(`[LangGraphRuntime] Executing workflow: ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Generate unique execution ID
    const executionId = `${workflowId}-${Date.now()}`;

    // Initialize workflow state
    const initialState: WorkflowState = {
      currentStep: START,
      input,
      agentResults: {},
      context: {},
      metadata: {
        workflowId: executionId,
        startedAt: new Date(),
        completedSteps: [],
        errors: []
      }
    };

    try {
      // Log workflow started event
      await this.supabaseAdapter.logWorkflowEvent(
        executionId,
        'started',
        { workflow_type: workflowId, input }
      );

      // Save initial checkpoint
      await this.supabaseAdapter.saveCheckpoint(executionId, initialState);

      // Execute workflow
      const result = await workflow.invoke(initialState);

      // Save final checkpoint
      await this.supabaseAdapter.saveCheckpoint(executionId, result);

      // Log workflow completed event
      await this.supabaseAdapter.logWorkflowEvent(
        executionId,
        'completed',
        {
          completed_steps: result.metadata.completedSteps,
          execution_time_ms: Date.now() - result.metadata.startedAt.getTime()
        }
      );

      // Save metrics
      await this.supabaseAdapter.saveMetrics({
        workflow_id: executionId,
        metric_name: 'workflow_execution_time_ms',
        metric_value: Date.now() - result.metadata.startedAt.getTime(),
        metadata: { workflow_type: workflowId }
      });

      return {
        workflow_id: executionId,
        status: 'completed',
        agent_results: result.agentResults,
        final_context: result.context,
        metadata: result.metadata
      };
    } catch (error: any) {
      console.error(`[LangGraphRuntime] Workflow execution failed:`, error);

      // Log workflow failed event
      await this.supabaseAdapter.logWorkflowEvent(
        executionId,
        'failed',
        { error: error.message }
      );

      throw error;
    }
  }

  /**
   * Resume a workflow from the latest checkpoint
   */
  async resumeWorkflow(workflowId: string): Promise<any> {
    console.log(`[LangGraphRuntime] Resuming workflow: ${workflowId}`);

    try {
      // Load latest checkpoint
      const checkpoint = await this.supabaseAdapter.loadCheckpoint(workflowId);
      if (!checkpoint) {
        throw new Error(`No checkpoint found for workflow: ${workflowId}`);
      }

      console.log(`[LangGraphRuntime] Loaded checkpoint v${checkpoint.version} for ${workflowId}`);

      // Extract workflow type from execution ID (format: workflowType-timestamp)
      const workflowType = workflowId.split('-')[0];
      const workflow = this.workflows.get(workflowType);
      if (!workflow) {
        throw new Error(`Workflow type not found: ${workflowType}`);
      }

      // Log workflow resumed event
      await this.supabaseAdapter.logWorkflowEvent(
        workflowId,
        'started', // Use 'started' to indicate resume
        {
          workflow_type: workflowType,
          resumed_from_version: checkpoint.version,
          resumed_from_step: checkpoint.state.currentStep
        }
      );

      // Resume workflow from checkpoint state
      const result = await workflow.invoke(checkpoint.state);

      // Save final checkpoint
      await this.supabaseAdapter.saveCheckpoint(workflowId, result);

      // Log workflow completed event
      await this.supabaseAdapter.logWorkflowEvent(
        workflowId,
        'completed',
        {
          completed_steps: result.metadata.completedSteps,
          resumed: true
        }
      );

      return {
        workflow_id: workflowId,
        status: 'completed',
        agent_results: result.agentResults,
        final_context: result.context,
        metadata: result.metadata,
        resumed_from_version: checkpoint.version
      };
    } catch (error: any) {
      console.error(`[LangGraphRuntime] Workflow resume failed:`, error);

      // Log workflow failed event
      await this.supabaseAdapter.logWorkflowEvent(
        workflowId,
        'failed',
        {
          error: error.message,
          resume_attempt: true
        }
      );

      throw error;
    }
  }

  /**
   * Rollback a workflow to a specific version and resume from there
   */
  async rollbackWorkflow(workflowId: string, toVersion: number): Promise<any> {
    console.log(`[LangGraphRuntime] Rolling back workflow ${workflowId} to version ${toVersion}`);

    try {
      // Load specific version checkpoint
      const checkpoint = await this.supabaseAdapter.loadCheckpointVersion(workflowId, toVersion);
      if (!checkpoint) {
        throw new Error(`Checkpoint version ${toVersion} not found for workflow: ${workflowId}`);
      }

      console.log(`[LangGraphRuntime] Loaded checkpoint v${toVersion} for rollback`);

      // Extract workflow type from execution ID
      const workflowType = workflowId.split('-')[0];
      const workflow = this.workflows.get(workflowType);
      if (!workflow) {
        throw new Error(`Workflow type not found: ${workflowType}`);
      }

      // Log workflow rollback event
      await this.supabaseAdapter.logWorkflowEvent(
        workflowId,
        'started',
        {
          workflow_type: workflowType,
          rolled_back_to_version: toVersion,
          rolled_back_from_step: checkpoint.state.currentStep
        }
      );

      // Resume workflow from rolled-back state
      const result = await workflow.invoke(checkpoint.state);

      // Save final checkpoint (will be a new version)
      await this.supabaseAdapter.saveCheckpoint(workflowId, result);

      // Log workflow completed event
      await this.supabaseAdapter.logWorkflowEvent(
        workflowId,
        'completed',
        {
          completed_steps: result.metadata.completedSteps,
          rolled_back_from_version: toVersion
        }
      );

      return {
        workflow_id: workflowId,
        status: 'completed',
        agent_results: result.agentResults,
        final_context: result.context,
        metadata: result.metadata,
        rolled_back_from_version: toVersion
      };
    } catch (error: any) {
      console.error(`[LangGraphRuntime] Workflow rollback failed:`, error);

      // Log workflow failed event
      await this.supabaseAdapter.logWorkflowEvent(
        workflowId,
        'failed',
        {
          error: error.message,
          rollback_attempt: true,
          target_version: toVersion
        }
      );

      throw error;
    }
  }

  /**
   * Get workflow state history for debugging/analysis
   */
  async getWorkflowHistory(workflowId: string): Promise<any[]> {
    try {
      const history = await this.supabaseAdapter.getStateHistory(workflowId);
      return history.map(checkpoint => ({
        version: checkpoint.version,
        created_at: checkpoint.created_at,
        current_step: checkpoint.state.currentStep,
        completed_steps: checkpoint.state.metadata.completedSteps,
        state_summary: {
          num_agent_results: Object.keys(checkpoint.state.agentResults).length,
          context_keys: Object.keys(checkpoint.state.context)
        }
      }));
    } catch (error: any) {
      console.error(`[LangGraphRuntime] Failed to get workflow history:`, error);
      return [];
    }
  }

  // ============================================================================
  // AgentRuntimeInterface Implementation
  // ============================================================================

  async executeTask(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // Create task record in Supabase
      await this.supabaseAdapter.createTask({
        id: task.id,
        agent_id: task.agentId,
        input: task.input,
        status: 'running',
        metadata: task.metadata
      });

      // Log task started event
      await this.supabaseAdapter.logAgentEvent(
        task.agentId,
        'task_started',
        { task_id: task.id }
      );

      // Execute task via agent registry with circuit breaker protection
      const result = await this.executeAgentWithCircuitBreaker(task.agentId, {
        taskId: task.id,
        agentId: task.agentId,
        input: task.input,
        state: {},
        onProgress: () => {},
        onLog: () => {},
        isCancelled: () => false
      });

      const executionTime = Date.now() - startTime;

      // Update task status in Supabase
      await this.supabaseAdapter.updateTaskStatus(
        task.id,
        result.status === 'success' ? 'completed' : 'failed',
        result.output,
        result.error
      );

      // Save agent result
      await this.supabaseAdapter.saveAgentResult({
        task_id: task.id,
        agent_id: task.agentId,
        output: result.output,
        status: result.status,
        execution_time_ms: executionTime
      });

      // Log task completed event
      await this.supabaseAdapter.logAgentEvent(
        task.agentId,
        'task_completed',
        {
          task_id: task.id,
          execution_time_ms: executionTime,
          status: result.status
        }
      );

      // Save metrics
      await this.supabaseAdapter.saveMetrics({
        agent_id: task.agentId,
        metric_name: 'task_execution_time_ms',
        metric_value: executionTime,
        metadata: { task_id: task.id }
      });

      return {
        taskId: task.id,
        output: result.output,
        status: result.status,
        error: result.error
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Update task status to failed
      await this.supabaseAdapter.updateTaskStatus(
        task.id,
        'failed',
        undefined,
        error.message
      );

      // Log task failed event
      await this.supabaseAdapter.logAgentEvent(
        task.agentId,
        'task_failed',
        {
          task_id: task.id,
          execution_time_ms: executionTime,
          error: error.message
        }
      );

      throw error;
    }
  }

  async *streamTask(task: AgentTask): AsyncGenerator<AgentResult> {
    // Streaming not implemented for LangGraph runtime
    const result = await this.executeTask(task);
    yield result;
  }

  async cancelTask(taskId: string): Promise<void> {
    // Cancellation not implemented for LangGraph runtime
    console.warn(`[LangGraphRuntime] Task cancellation not implemented: ${taskId}`);
  }

  async registerAgent(agentId: string, config: AgentConfig): Promise<void> {
    console.log(`[LangGraphRuntime] Agent registration handled by AgentRegistry: ${agentId}`);
  }

  async deregisterAgent(agentId: string): Promise<void> {
    console.log(`[LangGraphRuntime] Agent deregistration handled by AgentRegistry: ${agentId}`);
  }

  async getAgentStatus(agentId: string): Promise<any> {
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const health = await agent.getHealth();
    return {
      agent_id: agentId,
      status: health.healthy ? 'running' : 'error',
      uptime_seconds: 0,
      last_activity_at: new Date().toISOString(),
      metadata: {}
    };
  }

  async *streamWorkflow(workflowId: string, input: any): AsyncGenerator<any> {
    // Streaming not fully implemented - yield final result
    const result = await this.executeWorkflow(workflowId, input);
    yield { type: 'workflow_completed', result };
  }

  async getWorkflowStatus(workflowId: string): Promise<any> {
    return {
      workflow_id: workflowId,
      status: 'unknown',
      message: 'Workflow status tracking not implemented in LangGraph runtime'
    };
  }

  async getAgentMetrics(agentId: string, options?: any): Promise<any[]> {
    return [];
  }

  async getAgentLogs(agentId: string, filter?: any): Promise<any[]> {
    return [];
  }
}

/**
 * Create LangGraph runtime instance
 */
export function createLangGraphRuntime(config?: RuntimeConfig): LangGraphRuntime {
  return new LangGraphRuntime(config);
}
