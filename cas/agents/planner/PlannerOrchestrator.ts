/**
 * Planner Orchestrator - Coordinates all CAS agents autonomously
 *
 * This class implements the Project Manager functionality for the Enhanced CAS
 * AI Product Team. It coordinates agents, detects blockers, assigns work, and
 * maintains project visibility.
 *
 * @agent Planner Agent
 * @coordinates All 8 CAS agents
 */

import * as fs from 'fs';
import * as path from 'path';

export type AgentType =
  | 'planner'
  | 'analyst'
  | 'developer'
  | 'tester'
  | 'qa'
  | 'security'
  | 'engineer'
  | 'marketer';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface Task {
  id: string;
  name: string;
  assignedTo: AgentType;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedHours: number;
  actualHours?: number;
  dependencies: string[]; // Task IDs this task depends on
  blockedBy?: string; // Task ID or agent name blocking this task
  blockedReason?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AgentStatus {
  agent: AgentType;
  busy: boolean;
  currentTasks: Task[];
  completedTasks: Task[];
  blockers: string[];
  capacity: number; // Hours available
}

export interface Blocker {
  blocked: AgentType;
  blockedBy: AgentType | string;
  reason: string;
  tasks?: Task[];
  tests?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  resolvedAt?: Date;
}

export interface SprintConfig {
  week: number;
  duration: number; // days
  goals: string[];
  successCriteria: string[];
}

export interface Progress {
  feature: string;
  developer: string;
  tester: string;
  qa: string;
  engineer: string;
  overallProgress: number; // 0-100%
}

export class PlannerOrchestrator {
  private tasks: Map<string, Task> = new Map();
  private agentStatuses: Map<AgentType, AgentStatus> = new Map();
  private blockers: Blocker[] = [];
  private currentSprint?: SprintConfig;

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize all agent statuses
   */
  private initializeAgents(): void {
    const agents: AgentType[] = [
      'planner',
      'analyst',
      'developer',
      'tester',
      'qa',
      'security',
      'engineer',
      'marketer',
    ];

    agents.forEach(agent => {
      this.agentStatuses.set(agent, {
        agent,
        busy: false,
        currentTasks: [],
        completedTasks: [],
        blockers: [],
        capacity: 8, // 8 hours per day
      });
    });
  }

  /**
   * Create a new sprint
   */
  createSprint(config: SprintConfig): void {
    this.currentSprint = config;
    console.log(`📋 Sprint ${config.week} created`);
    console.log(`Goals: ${config.goals.join(', ')}`);
  }

  /**
   * Assign task to an agent
   */
  async assignTask(agent: AgentType, task: Task): Promise<void> {
    const status = this.agentStatuses.get(agent);

    if (!status) {
      throw new Error(`Agent ${agent} not found`);
    }

    // Check dependencies
    const dependenciesComplete = this.checkDependencies(task);
    if (!dependenciesComplete) {
      task.status = 'blocked';
      task.blockedReason = 'Dependencies not complete';
      console.log(`⏸️  Task "${task.name}" blocked by dependencies`);
    }

    // Add task to agent's queue
    task.assignedTo = agent;
    this.tasks.set(task.id, task);

    if (status.busy) {
      console.log(`⏰ Agent ${agent} busy, task "${task.name}" queued`);
    } else {
      status.currentTasks.push(task);
      status.busy = true;
      console.log(`✅ Task "${task.name}" assigned to ${agent}`);
    }
  }

  /**
   * Check if task dependencies are complete
   */
  private checkDependencies(task: Task): boolean {
    for (const depId of task.dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  /**
   * Mark task as complete
   */
  completeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'completed';
    task.completedAt = new Date();

    const agent = this.agentStatuses.get(task.assignedTo);
    if (agent) {
      agent.currentTasks = agent.currentTasks.filter(t => t.id !== taskId);
      agent.completedTasks.push(task);
      agent.busy = agent.currentTasks.length > 0;
    }

    console.log(`✅ Task "${task.name}" completed by ${task.assignedTo}`);

    // Check if any blocked tasks can now proceed
    this.unblockDependentTasks(taskId);
  }

  /**
   * Unblock tasks that were waiting for this task
   */
  private unblockDependentTasks(completedTaskId: string): void {
    this.tasks.forEach(task => {
      if (
        task.status === 'blocked' &&
        task.dependencies.includes(completedTaskId) &&
        this.checkDependencies(task)
      ) {
        task.status = 'pending';
        task.blockedReason = undefined;
        console.log(`🔓 Task "${task.name}" unblocked`);
      }
    });
  }

  /**
   * Detect blockers across all agents
   */
  async detectBlockers(): Promise<Blocker[]> {
    this.blockers = [];

    const developer = this.agentStatuses.get('developer');
    const tester = this.agentStatuses.get('tester');
    const qa = this.agentStatuses.get('qa');
    const engineer = this.agentStatuses.get('engineer');

    // Check if tester blocked by incomplete developer work
    if (
      developer &&
      tester &&
      tester.blockers.includes('developer') &&
      developer.currentTasks.length > 0
    ) {
      this.blockers.push({
        blocked: 'tester',
        blockedBy: 'developer',
        reason: 'Incomplete implementation',
        tasks: developer.currentTasks,
        severity: 'high',
        detectedAt: new Date(),
      });
    }

    // Check if QA blocked by failing tests
    if (qa && qa.blockers.includes('failing_tests')) {
      this.blockers.push({
        blocked: 'qa',
        blockedBy: 'tester',
        reason: 'Failing tests',
        severity: 'high',
        detectedAt: new Date(),
      });
    }

    // Check if engineer blocked by QA not approved
    if (engineer && engineer.blockers.includes('qa_approval')) {
      this.blockers.push({
        blocked: 'engineer',
        blockedBy: 'qa',
        reason: 'Waiting for QA approval',
        severity: 'medium',
        detectedAt: new Date(),
      });
    }

    if (this.blockers.length > 0) {
      console.log(`🚨 ${this.blockers.length} blocker(s) detected`);
      this.blockers.forEach(b => {
        console.log(`   ${b.blocked} blocked by ${b.blockedBy}: ${b.reason}`);
      });
    }

    return this.blockers;
  }

  /**
   * Resolve a blocker
   */
  resolveBlocker(blockerIndex: number): void {
    if (blockerIndex < 0 || blockerIndex >= this.blockers.length) {
      throw new Error('Invalid blocker index');
    }

    const blocker = this.blockers[blockerIndex];
    blocker.resolvedAt = new Date();

    const agent = this.agentStatuses.get(blocker.blocked);
    if (agent) {
      agent.blockers = agent.blockers.filter(b => b !== String(blocker.blockedBy));
    }

    console.log(`✅ Blocker resolved: ${blocker.blocked} unblocked from ${blocker.blockedBy}`);
    this.blockers.splice(blockerIndex, 1);
  }

  /**
   * Track progress for a feature
   */
  async trackProgress(featureName: string): Promise<Progress> {
    // Read from plan files
    const featurePlan = await this.loadFeaturePlan(featureName);
    const systemPlan = await this.loadSystemPlan(featureName);

    return {
      feature: featureName,
      developer: featurePlan?.status || 'not_started',
      tester: featurePlan?.testResults || 'pending',
      qa: featurePlan?.qaReview || 'pending',
      engineer: systemPlan?.deploymentStatus || 'pending',
      overallProgress: this.calculateProgress(featurePlan, systemPlan),
    };
  }

  /**
   * Load feature plan for a specific feature
   */
  private async loadFeaturePlan(featureName: string): Promise<any> {
    const planPath = path.join(
      __dirname,
      '../developer/planning/cas-feature-dev-plan.md'
    );

    try {
      const content = await fs.promises.readFile(planPath, 'utf-8');
      // Parse markdown to find feature section
      const featurePattern = new RegExp(
        `### Feature: ${featureName} ([✅🟡🔴])[\\s\\S]*?\\*\\*Status:\\*\\* ([^\\n]+)`
      );
      const match = content.match(featurePattern);

      if (match) {
        return {
          status: match[2],
          emoji: match[1],
        };
      }
    } catch (error) {
      console.warn(`Could not load feature plan for ${featureName}`);
    }

    return null;
  }

  /**
   * Load system plan
   */
  private async loadSystemPlan(featureName: string): Promise<any> {
    // Simplified - could be expanded to parse actual system plan
    return {
      deploymentStatus: 'operational',
    };
  }

  /**
   * Calculate overall progress percentage
   */
  private calculateProgress(featurePlan: any, systemPlan: any): number {
    if (!featurePlan) return 0;

    // Simple calculation based on status
    if (featurePlan.emoji === '✅') return 100;
    if (featurePlan.emoji === '🟡') return 50;
    return 0;
  }

  /**
   * Get agent status
   */
  getAgentStatus(agent: AgentType): AgentStatus | undefined {
    return this.agentStatuses.get(agent);
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): Map<AgentType, AgentStatus> {
    return this.agentStatuses;
  }

  /**
   * Generate daily standup report
   */
  generateDailyStandup(): string {
    const date = new Date().toISOString().split('T')[0];
    let report = `# Daily Standup - ${date}\n\n## Agent Status\n\n`;

    this.agentStatuses.forEach((status, agent) => {
      report += `### ${agent}\n`;
      report += `- Current Tasks: ${status.currentTasks.map(t => t.name).join(', ') || 'None'}\n`;
      report += `- Completed: ${status.completedTasks.length} tasks\n`;
      report += `- Blockers: ${status.blockers.join(', ') || 'None'}\n\n`;
    });

    if (this.blockers.length > 0) {
      report += `## Active Blockers\n\n`;
      this.blockers.forEach((blocker, idx) => {
        report += `${idx + 1}. ${blocker.blocked} blocked by ${blocker.blockedBy}: ${blocker.reason}\n`;
      });
      report += '\n';
    }

    if (this.currentSprint) {
      report += `## Sprint Progress\n`;
      report += `- Week: ${this.currentSprint.week}\n`;
      report += `- Goals: ${this.currentSprint.goals.join(', ')}\n`;
      report += `- On track: ${this.blockers.length === 0 ? 'Yes ✅' : 'Needs attention ⚠️'}\n`;
    }

    return report;
  }

  /**
   * Generate weekly summary
   */
  generateWeeklySummary(): string {
    if (!this.currentSprint) {
      return 'No active sprint';
    }

    let summary = `# Week ${this.currentSprint.week} Summary\n\n`;
    summary += `## Accomplishments\n\n`;

    this.agentStatuses.forEach((status, agent) => {
      if (status.completedTasks.length > 0) {
        summary += `### ${agent}\n`;
        status.completedTasks.forEach(task => {
          summary += `✅ ${task.name}\n`;
        });
        summary += '\n';
      }
    });

    summary += `## Metrics\n`;
    const totalTasks = Array.from(this.tasks.values()).length;
    const completedTasks = Array.from(this.tasks.values()).filter(
      t => t.status === 'completed'
    ).length;
    summary += `- Tasks Completed: ${completedTasks}/${totalTasks}\n`;
    summary += `- Blockers Resolved: ${this.blockers.filter(b => b.resolvedAt).length}\n`;
    summary += `- Active Blockers: ${this.blockers.filter(b => !b.resolvedAt).length}\n\n`;

    return summary;
  }

  /**
   * Execute multi-agent workflow for feature implementation
   */
  async executeFeatureWorkflow(featureName: string): Promise<void> {
    console.log(`🚀 Starting feature workflow: ${featureName}\n`);

    // Step 1: Analyst - Requirements
    const analystTask: Task = {
      id: `${featureName}-requirements`,
      name: `Analyze requirements for ${featureName}`,
      assignedTo: 'analyst',
      priority: 'high',
      status: 'pending',
      estimatedHours: 0.5,
      dependencies: [],
      createdAt: new Date(),
    };
    await this.assignTask('analyst', analystTask);

    // Step 2: Developer - Implementation (depends on analyst)
    const developerTask: Task = {
      id: `${featureName}-implementation`,
      name: `Implement ${featureName}`,
      assignedTo: 'developer',
      priority: 'high',
      status: 'pending',
      estimatedHours: 6,
      dependencies: [analystTask.id],
      createdAt: new Date(),
    };
    await this.assignTask('developer', developerTask);

    // Step 3: Tester - Tests (depends on developer)
    const testerTask: Task = {
      id: `${featureName}-tests`,
      name: `Write tests for ${featureName}`,
      assignedTo: 'tester',
      priority: 'high',
      status: 'pending',
      estimatedHours: 2,
      dependencies: [developerTask.id],
      createdAt: new Date(),
    };
    await this.assignTask('tester', testerTask);

    // Step 4: QA - Review (depends on tester)
    const qaTask: Task = {
      id: `${featureName}-qa`,
      name: `QA review for ${featureName}`,
      assignedTo: 'qa',
      priority: 'high',
      status: 'pending',
      estimatedHours: 1,
      dependencies: [testerTask.id],
      createdAt: new Date(),
    };
    await this.assignTask('qa', qaTask);

    // Step 5: Security - Scan (can run in parallel with QA)
    const securityTask: Task = {
      id: `${featureName}-security`,
      name: `Security scan for ${featureName}`,
      assignedTo: 'security',
      priority: 'medium',
      status: 'pending',
      estimatedHours: 0.5,
      dependencies: [testerTask.id],
      createdAt: new Date(),
    };
    await this.assignTask('security', securityTask);

    // Step 6: Engineer - Deploy (depends on QA and Security)
    const engineerTask: Task = {
      id: `${featureName}-deploy`,
      name: `Deploy ${featureName}`,
      assignedTo: 'engineer',
      priority: 'high',
      status: 'pending',
      estimatedHours: 1,
      dependencies: [qaTask.id, securityTask.id],
      createdAt: new Date(),
    };
    await this.assignTask('engineer', engineerTask);

    // Step 7: Marketer - Track (depends on engineer)
    const marketerTask: Task = {
      id: `${featureName}-analytics`,
      name: `Set up analytics for ${featureName}`,
      assignedTo: 'marketer',
      priority: 'low',
      status: 'pending',
      estimatedHours: 0.5,
      dependencies: [engineerTask.id],
      createdAt: new Date(),
    };
    await this.assignTask('marketer', marketerTask);

    console.log(`\n✅ Feature workflow created for ${featureName}`);
    console.log(`Total tasks: 7`);
    console.log(`Estimated time: 11.5 hours\n`);
  }
}

/**
 * Usage Example:
 *
 * ```typescript
 * const planner = new PlannerOrchestrator();
 *
 * // Create sprint
 * planner.createSprint({
 *   week: 2,
 *   duration: 5,
 *   goals: ['Complete Client & Agent forms', 'Improve test coverage'],
 *   successCriteria: ['Forms production-ready', 'Coverage >80%'],
 * });
 *
 * // Execute feature workflow
 * await planner.executeFeatureWorkflow('ClientProfessionalInfoForm');
 *
 * // Simulate task completion
 * planner.completeTask('ClientProfessionalInfoForm-requirements');
 * planner.completeTask('ClientProfessionalInfoForm-implementation');
 * planner.completeTask('ClientProfessionalInfoForm-tests');
 *
 * // Detect blockers
 * await planner.detectBlockers();
 *
 * // Generate reports
 * console.log(planner.generateDailyStandup());
 * console.log(planner.generateWeeklySummary());
 * ```
 */
