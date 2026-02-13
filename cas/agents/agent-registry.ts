// cas/agents/agent-registry.ts

import { registerService } from '../packages/core/src/service/service-registry';
import developerAgent from './developer/src/developer-agent';
import engineerAgent from './engineer/src/engineer-agent';
import testerAgent from './tester/src/tester-agent';
import qaAgent from './qa/src/qa-agent';
import { runPlanner } from './planner/src/index';
import { runAnalyst } from './analyst/src/index';
import { runSecurity, security } from './security/src/index';
import { runMarketer, marketer } from './marketer/src/index';
import taskManager from './src/task-manager';
import executor from './src/executor';

export interface AgentConfig {
  name: string;
  status: 'active' | 'planned' | 'deprecated';
  description: string;
}

export const agentConfigs: AgentConfig[] = [
  { name: 'developer-agent', status: 'active', description: 'Code implementation and feature development' },
  { name: 'engineer-agent', status: 'active', description: 'System infrastructure and deployment' },
  { name: 'tester-agent', status: 'active', description: 'Unit and integration testing' },
  { name: 'qa-agent', status: 'active', description: 'Quality assurance and visual regression' },
  { name: 'planner-agent', status: 'active', description: 'Strategic planning and sprint coordination' },
  { name: 'analyst-agent', status: 'active', description: 'Requirements analysis and contextual patterns' },
  { name: 'security-agent', status: 'active', description: 'Security validation and vulnerability scanning' },
  { name: 'marketer-agent', status: 'active', description: 'Usage analytics and production metrics review' },
];

// Security Agent Service
const securityAgentService = {
  start: async () => console.log('[SecurityAgent] Starting...'),
  stop: async () => console.log('[SecurityAgent] Stopping...'),
  run: runSecurity,
  reviewFeatureBrief: security.reviewFeatureBrief.bind(security),
  runSecurityScan: security.runSecurityScan.bind(security),
  preDeploymentSecurityCheck: security.preDeploymentSecurityCheck.bind(security),
};

// Marketer Agent Service
const marketerAgentService = {
  start: async () => console.log('[MarketerAgent] Starting...'),
  stop: async () => console.log('[MarketerAgent] Stopping...'),
  run: runMarketer,
  runProductionMetricsReview: marketer.runProductionMetricsReview.bind(marketer),
  trackFeatureDeployment: marketer.trackFeatureDeployment.bind(marketer),
  analyzeFeedbackTrends: marketer.analyzeFeedbackTrends.bind(marketer),
};

// Wrapper services for planner and analyst
const plannerAgentService = {
  start: async () => console.log('[PlannerAgent] Starting...'),
  stop: async () => console.log('[PlannerAgent] Stopping...'),
  run: runPlanner,
};

const analystAgentService = {
  start: async () => console.log('[AnalystAgent] Starting...'),
  stop: async () => console.log('[AnalystAgent] Stopping...'),
  run: runAnalyst,
};

export function registerAllAgents() {
  // Core services
  registerService('task-manager', taskManager);
  registerService('executor', executor);

  // Active agents
  registerService('developer-agent', developerAgent);
  registerService('engineer-agent', engineerAgent);
  registerService('tester-agent', testerAgent);
  registerService('qa-agent', qaAgent);
  registerService('planner-agent', plannerAgentService);
  registerService('analyst-agent', analystAgentService);

  // Security & Marketer agents (now active)
  registerService('security-agent', securityAgentService);
  registerService('marketer-agent', marketerAgentService);
}

export function getAgentStatus(agentName: string): AgentConfig | undefined {
  return agentConfigs.find(config => config.name === agentName);
}

export function getActiveAgents(): AgentConfig[] {
  return agentConfigs.filter(config => config.status === 'active');
}

export function getPlannedAgents(): AgentConfig[] {
  return agentConfigs.filter(config => config.status === 'planned');
}
