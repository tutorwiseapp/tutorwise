/**
 * CAS Tool Types
 *
 * OpenAI-compatible tool calling types for CAS agent actions.
 *
 * @module cas/tools/actions/types
 */

// --- OpenAI-Compatible Tool Types ---

export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: { type: string };
  properties?: Record<string, ToolParameter>;
}

export interface Tool {
  type: 'function';
  function: ToolFunction;
}

// --- Tool Call Types ---

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallResult {
  tool_call_id: string;
  role: 'tool';
  content: string;
}

// --- Tool Execution Context ---

export interface CASToolContext {
  agentType: string;
  traceId: string;
  correlationId?: string;
  userId?: string;
}

export type ToolExecutor<T = unknown, R = unknown> = (
  args: T,
  context: CASToolContext
) => Promise<R>;

// --- Specific Tool Argument Types ---

export interface RunSecurityScanArgs {
  target?: string;
  scanType?: 'full' | 'quick' | 'dependencies' | 'secrets';
}

export interface OptimizeDspyArgs {
  agent: 'lexi' | 'sage';
  signature?: string;
  maxExamples?: number;
}

export interface DispatchTaskArgs {
  targetAgent: string;
  taskType: string;
  payload: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface GetAgentStatusArgs {
  agentType?: string;
}

export interface RunRetrospectiveArgs {
  period?: 'day' | 'week' | 'sprint';
  includeCommits?: boolean;
  includeFeedback?: boolean;
}

export interface GenerateReportArgs {
  reportType: 'security' | 'metrics' | 'qa' | 'growth' | 'performance';
  period?: string;
  format?: 'json' | 'markdown' | 'html';
}

export interface DeployServiceArgs {
  environment: 'staging' | 'production';
  service?: string;
  version?: string;
}

export interface GetMetricsArgs {
  source: 'lexi' | 'sage' | 'platform' | 'all';
  period?: 'hour' | 'day' | 'week' | 'month';
  groupBy?: 'role' | 'persona' | 'subject';
}
