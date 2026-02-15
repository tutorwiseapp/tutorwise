/**
 * CAS Tool Definitions
 *
 * OpenAI-compatible function definitions for CAS agent actions.
 *
 * @module cas/tools/actions/definitions
 */

import type { Tool } from './types';
import type { CASAgentType } from '../../agents';

// --- Security Tools ---

export const runSecurityScan: Tool = {
  type: 'function',
  function: {
    name: 'run_security_scan',
    description: 'Run a security scan on code, dependencies, or infrastructure',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Target to scan (e.g., apps/web, lexi, sage, edupay)',
        },
        scanType: {
          type: 'string',
          description: 'Type of security scan to run',
          enum: ['full', 'quick', 'dependencies', 'secrets'],
        },
      },
    },
  },
};

export const auditAccessControl: Tool = {
  type: 'function',
  function: {
    name: 'audit_access_control',
    description: 'Audit role-based access control implementation',
    parameters: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          description: 'Scope of audit (e.g., sage, lexi, api)',
        },
      },
    },
  },
};

// --- DSPy Tools ---

export const optimizeDspy: Tool = {
  type: 'function',
  function: {
    name: 'optimize_dspy',
    description: 'Run DSPy optimization pipeline for Lexi or Sage prompts',
    parameters: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          description: 'Agent to optimize prompts for',
          enum: ['lexi', 'sage'],
        },
        signature: {
          type: 'string',
          description: 'Specific signature to optimize (optional)',
        },
        maxExamples: {
          type: 'number',
          description: 'Maximum training examples to use',
        },
      },
      required: ['agent'],
    },
  },
};

export const getDspyMetrics: Tool = {
  type: 'function',
  function: {
    name: 'get_dspy_metrics',
    description: 'Get DSPy optimization metrics and improvement tracking',
    parameters: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          description: 'Agent to get metrics for',
          enum: ['lexi', 'sage', 'all'],
        },
      },
    },
  },
};

// --- Orchestration Tools ---

export const dispatchTask: Tool = {
  type: 'function',
  function: {
    name: 'dispatch_task',
    description: 'Dispatch a task to another CAS agent',
    parameters: {
      type: 'object',
      properties: {
        targetAgent: {
          type: 'string',
          description: 'Target agent to dispatch task to',
          enum: ['analyst', 'developer', 'tester', 'qa', 'security', 'engineer', 'marketer'],
        },
        taskType: {
          type: 'string',
          description: 'Type of task to dispatch',
        },
        payload: {
          type: 'object',
          description: 'Task payload data',
        },
        priority: {
          type: 'string',
          description: 'Task priority',
          enum: ['low', 'normal', 'high', 'urgent'],
        },
      },
      required: ['targetAgent', 'taskType', 'payload'],
    },
  },
};

export const getAgentStatus: Tool = {
  type: 'function',
  function: {
    name: 'get_agent_status',
    description: 'Get status of CAS agents including Lexi and Sage',
    parameters: {
      type: 'object',
      properties: {
        agentType: {
          type: 'string',
          description: 'Specific agent to check (optional, returns all if not specified)',
        },
      },
    },
  },
};

// --- Retrospective Tools ---

export const runRetrospective: Tool = {
  type: 'function',
  function: {
    name: 'run_retrospective',
    description: 'Run a retrospective analysis of recent development activity',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period to analyze',
          enum: ['day', 'week', 'sprint'],
        },
        includeCommits: {
          type: 'boolean',
          description: 'Include git commit analysis',
        },
        includeFeedback: {
          type: 'boolean',
          description: 'Include Lexi/Sage feedback analysis',
        },
      },
    },
  },
};

// --- Reporting Tools ---

export const generateReport: Tool = {
  type: 'function',
  function: {
    name: 'generate_report',
    description: 'Generate a report for security, metrics, QA, growth, or performance',
    parameters: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          description: 'Type of report to generate',
          enum: ['security', 'metrics', 'qa', 'growth', 'performance'],
        },
        period: {
          type: 'string',
          description: 'Time period for report (e.g., week, month)',
        },
        format: {
          type: 'string',
          description: 'Output format',
          enum: ['json', 'markdown', 'html'],
        },
      },
      required: ['reportType'],
    },
  },
};

// --- Deployment Tools ---

export const deployService: Tool = {
  type: 'function',
  function: {
    name: 'deploy_service',
    description: 'Deploy a service to staging or production',
    parameters: {
      type: 'object',
      properties: {
        environment: {
          type: 'string',
          description: 'Target environment',
          enum: ['staging', 'production'],
        },
        service: {
          type: 'string',
          description: 'Service to deploy (optional, defaults to web app)',
        },
        version: {
          type: 'string',
          description: 'Version to deploy (optional, defaults to latest)',
        },
      },
      required: ['environment'],
    },
  },
};

export const checkHealth: Tool = {
  type: 'function',
  function: {
    name: 'check_health',
    description: 'Check health status of services and infrastructure',
    parameters: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'Specific service to check (optional)',
        },
      },
    },
  },
};

// --- Metrics Tools ---

export const getMetrics: Tool = {
  type: 'function',
  function: {
    name: 'get_metrics',
    description: 'Get usage metrics from Lexi, Sage, or platform',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Metrics source',
          enum: ['lexi', 'sage', 'platform', 'all'],
        },
        period: {
          type: 'string',
          description: 'Time period',
          enum: ['hour', 'day', 'week', 'month'],
        },
        groupBy: {
          type: 'string',
          description: 'Group metrics by dimension',
          enum: ['role', 'persona', 'subject'],
        },
      },
      required: ['source'],
    },
  },
};

export const analyzeFeedback: Tool = {
  type: 'function',
  function: {
    name: 'analyze_feedback',
    description: 'Analyze AI feedback from Lexi and Sage',
    parameters: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          description: 'Agent to analyze feedback for',
          enum: ['lexi', 'sage', 'all'],
        },
        period: {
          type: 'string',
          description: 'Time period',
        },
        onlyNegative: {
          type: 'boolean',
          description: 'Only analyze negative feedback',
        },
      },
    },
  },
};

// --- Growth Tools ---

export const getGrowthMetrics: Tool = {
  type: 'function',
  function: {
    name: 'get_growth_metrics',
    description: 'Get user growth and retention metrics',
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'Specific metric to retrieve',
          enum: ['signups', 'retention', 'referrals', 'churn', 'engagement'],
        },
        period: {
          type: 'string',
          description: 'Time period',
        },
        byRole: {
          type: 'boolean',
          description: 'Break down by user role',
        },
      },
    },
  },
};

// --- Tool Collections by Agent ---

export const TOOLS_BY_AGENT: Record<CASAgentType, Tool[]> = {
  planner: [
    dispatchTask,
    getAgentStatus,
    runRetrospective,
    generateReport,
  ],
  analyst: [
    getMetrics,
    analyzeFeedback,
    generateReport,
    getDspyMetrics,
  ],
  developer: [
    getAgentStatus,
    checkHealth,
  ],
  tester: [
    getAgentStatus,
    generateReport,
  ],
  qa: [
    generateReport,
    getAgentStatus,
  ],
  security: [
    runSecurityScan,
    auditAccessControl,
    generateReport,
  ],
  engineer: [
    deployService,
    checkHealth,
    getAgentStatus,
  ],
  marketer: [
    getMetrics,
    getGrowthMetrics,
    analyzeFeedback,
    generateReport,
  ],
};

// --- All Tools ---

export const ALL_CAS_TOOLS: Tool[] = [
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
];

/**
 * Get tools available for a specific CAS agent
 */
export function getToolsForAgent(agentType: CASAgentType): Tool[] {
  return TOOLS_BY_AGENT[agentType] || [];
}

/**
 * Get a tool by name
 */
export function getToolByName(name: string): Tool | undefined {
  return ALL_CAS_TOOLS.find(t => t.function.name === name);
}
