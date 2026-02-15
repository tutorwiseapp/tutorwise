/**
 * CAS Tools Actions
 *
 * OpenAI-compatible tool calling interface for CAS agent actions.
 *
 * @module cas/tools/actions
 */

// Types
export type {
  Tool,
  ToolFunction,
  ToolParameter,
  ToolCall,
  ToolCallResult,
  CASToolContext,
  RunSecurityScanArgs,
  OptimizeDspyArgs,
  DispatchTaskArgs,
  GetAgentStatusArgs,
  RunRetrospectiveArgs,
  GenerateReportArgs,
  DeployServiceArgs,
  GetMetricsArgs,
} from './types';

// Tool Definitions
export {
  runSecurityScan,
  auditAccessControl,
  optimizeDspy,
  getDspyMetrics,
  dispatchTask,
  getAgentStatus,
  runRetrospective,
  generateReport,
  deployService,
  checkHealth,
  getMetrics,
  analyzeFeedback,
  getGrowthMetrics,
  TOOLS_BY_AGENT,
  ALL_CAS_TOOLS,
  getToolsForAgent,
  getToolByName,
} from './definitions';

// Tool Executor
export { CASToolExecutor, casToolExecutor } from './executor';
