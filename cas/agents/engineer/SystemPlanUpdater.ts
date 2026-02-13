/**
 * System Plan Updater - Auto-maintains cas-system-imp-plan.md
 *
 * This class automatically updates the Engineer Agent's system implementation plan
 * based on:
 * - System implementation todos
 * - Deployment reports
 * - Performance monitoring data
 * - Security scan results
 * - Infrastructure changes
 *
 * @agent Engineer Agent
 * @auto-maintains cas/agents/engineer/planning/cas-system-imp-plan.md
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SystemTodo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

export interface SystemComponent {
  name: string;
  status: '✅' | '🟡' | '🔴';
  statusText: 'Operational' | 'Partial Complete' | 'Not Implemented' | 'Degraded';
  platform: string;
  todos: Array<{
    task: string;
    completed: boolean;
    weekPlanned?: string;
  }>;
  endpoints?: string[];
  performanceMetrics?: {
    [key: string]: string;
  };
  knownIssues?: string[];
}

export interface InfrastructurePriority {
  title: string;
  assigned: string;
  status: 'Planned' | 'In Progress' | 'Complete';
  estimatedHours: number;
  todos: Array<{
    task: string;
    completed: boolean;
  }>;
}

export interface SystemHealthMetrics {
  backend: {
    status: string;
    uptime: string;
    avgResponseTime: string;
    errorRate: string;
  };
  database: {
    status: string;
    queryPerformance: string;
    connectionPool: string;
    storageUsed: string;
  };
  frontend: {
    status: string;
    performanceScore: string;
    accessibilityScore: string;
    bestPractices: string;
  };
  testing: {
    status: string;
    unitTestCoverage: string;
    e2ePassRate: string;
    visualSnapshots: string;
  };
}

export class SystemPlanUpdater {
  private planFilePath: string;
  private currentWeek: number;

  constructor(weekNumber: number = 2) {
    this.planFilePath = path.join(
      __dirname,
      'planning',
      'cas-system-imp-plan.md'
    );
    this.currentWeek = weekNumber;
  }

  /**
   * Update system component todos
   */
  async updateComponentTodos(
    componentName: string,
    todos: SystemTodo[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await this.readPlan();
      const updatedPlan = this.injectComponentTodos(plan, componentName, todos);
      await this.writePlan(updatedPlan);
      return { success: true };
    } catch (error: any) {
      console.error(`[SystemPlanUpdater] Failed to update todos for ${componentName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update performance metrics for a component
   */
  async updatePerformanceMetrics(
    componentName: string,
    metrics: { [key: string]: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await this.readPlan();
      const updatedPlan = this.injectPerformanceMetrics(plan, componentName, metrics);
      await this.writePlan(updatedPlan);
      return { success: true };
    } catch (error: any) {
      console.error(`[SystemPlanUpdater] Failed to update metrics for ${componentName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add infrastructure priority
   */
  async addInfrastructurePriority(priority: InfrastructurePriority): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await this.readPlan();
      const updatedPlan = this.injectPriority(plan, priority);
      await this.writePlan(updatedPlan);
      return { success: true };
    } catch (error: any) {
      console.error(`[SystemPlanUpdater] Failed to add priority ${priority.title}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update system health dashboard
   */
  async updateSystemHealth(health: SystemHealthMetrics): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await this.readPlan();
      const updatedPlan = this.injectSystemHealth(plan, health);
      await this.writePlan(updatedPlan);
      return { success: true };
    } catch (error: any) {
      console.error(`[SystemPlanUpdater] Failed to update system health:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update component status
   */
  async updateComponentStatus(
    componentName: string,
    status: '✅' | '🟡' | '🔴',
    statusText: SystemComponent['statusText']
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await this.readPlan();
      const updatedPlan = this.updateStatus(plan, componentName, status, statusText);
      await this.writePlan(updatedPlan);
      return { success: true };
    } catch (error: any) {
      console.error(`[SystemPlanUpdater] Failed to update status for ${componentName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add known issue to a component
   */
  async addKnownIssue(componentName: string, issue: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await this.readPlan();
      const updatedPlan = this.injectKnownIssue(plan, componentName, issue);
      await this.writePlan(updatedPlan);
      return { success: true };
    } catch (error: any) {
      console.error(`[SystemPlanUpdater] Failed to add issue to ${componentName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve known issue
   */
  async resolveKnownIssue(componentName: string, issuePattern: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await this.readPlan();
      const updatedPlan = this.removeKnownIssue(plan, componentName, issuePattern);
      await this.writePlan(updatedPlan);
      return { success: true };
    } catch (error: any) {
      console.error(`[SystemPlanUpdater] Failed to resolve issue for ${componentName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update the "Last Updated" timestamp
   */
  async updateTimestamp(): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await this.readPlan();
      const now = new Date().toISOString().split('.')[0].replace('T', ' ');
      const updatedPlan = plan.replace(
        /\*\*Last Updated:\*\* \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/,
        `**Last Updated:** ${now}`
      );
      await this.writePlan(updatedPlan);
      return { success: true };
    } catch (error: any) {
      console.error(`[SystemPlanUpdater] Failed to update timestamp:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Private helper methods

  private async readPlan(): Promise<string> {
    return fs.promises.readFile(this.planFilePath, 'utf-8');
  }

  private async writePlan(content: string): Promise<void> {
    await fs.promises.writeFile(this.planFilePath, content, 'utf-8');
  }

  private injectComponentTodos(
    plan: string,
    componentName: string,
    todos: SystemTodo[]
  ): string {
    // Find the component section
    const componentPattern = new RegExp(
      `### ${componentName}[\\s\\S]*?#### System Todos \\(Auto-tracked\\)([\\s\\S]*?)(?=####|###|---)`
    );

    const match = plan.match(componentPattern);
    if (!match) {
      console.warn(`Component "${componentName}" not found in plan`);
      return plan;
    }

    // Generate todo markdown
    const todoMarkdown = todos
      .map(todo => {
        const checkbox = todo.status === 'completed' ? '[x]' : '[ ]';
        return `- ${checkbox} ${todo.content}`;
      })
      .join('\n');

    // Replace the todos section
    return plan.replace(
      componentPattern,
      (match, todosSection) => {
        return match.replace(todosSection, '\n' + todoMarkdown + '\n');
      }
    );
  }

  private injectPerformanceMetrics(
    plan: string,
    componentName: string,
    metrics: { [key: string]: string }
  ): string {
    const metricsMarkdown = Object.entries(metrics)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // Find and replace performance metrics section
    const pattern = new RegExp(
      `(### ${componentName}[\\s\\S]*?#### Performance Metrics[^\\`]*\`\`\`)([\\s\\S]*?)(\`\`\`)`
    );

    if (plan.match(pattern)) {
      return plan.replace(pattern, `$1\n${metricsMarkdown}\n$3`);
    }

    // If no metrics section exists, add it after System Todos
    const insertPattern = new RegExp(
      `(### ${componentName}[\\s\\S]*?#### System Todos[\\s\\S]*?)(?=####|###|---)`
    );

    return plan.replace(
      insertPattern,
      `$1\n#### Performance Metrics\n\`\`\`\n${metricsMarkdown}\n\`\`\`\n\n`
    );
  }

  private injectPriority(plan: string, priority: InfrastructurePriority): string {
    const priorityMarkdown = this.generatePriorityMarkdown(priority);

    const weekHeader = `## Week ${this.currentWeek} System Priorities`;

    // Find section and append priority
    const pattern = new RegExp(`(${weekHeader}[\\s\\S]*?)(?=\\n## |$)`);

    return plan.replace(pattern, `$1\n${priorityMarkdown}\n---\n\n`);
  }

  private injectSystemHealth(plan: string, health: SystemHealthMetrics): string {
    const healthMarkdown = `\`\`\`
Backend API
  Status: ${health.backend.status}
  Uptime: ${health.backend.uptime}
  Avg Response Time: ${health.backend.avgResponseTime}
  Error Rate: ${health.backend.errorRate}

Database
  Status: ${health.database.status}
  Query Performance: ${health.database.queryPerformance}
  Connection Pool: ${health.database.connectionPool}
  Storage Used: ${health.database.storageUsed}

Frontend
  Status: ${health.frontend.status}
  Performance Score: ${health.frontend.performanceScore}
  Accessibility Score: ${health.frontend.accessibilityScore}
  Best Practices: ${health.frontend.bestPractices}

Testing
  Status: ${health.testing.status}
  Unit Test Coverage: ${health.testing.unitTestCoverage}
  E2E Pass Rate: ${health.testing.e2ePassRate}
  Visual Snapshots: ${health.testing.visualSnapshots}
\`\`\``;

    // Find and replace system health section
    const pattern = /### Week \d+ Metrics Summary\s*```[\s\S]*?```/;

    if (plan.match(pattern)) {
      return plan.replace(
        pattern,
        `### Week ${this.currentWeek} Metrics Summary\n${healthMarkdown}`
      );
    }

    return plan;
  }

  private updateStatus(
    plan: string,
    componentName: string,
    status: '✅' | '🟡' | '🔴',
    statusText: SystemComponent['statusText']
  ): string {
    // Update emoji status
    let updatedPlan = plan.replace(
      new RegExp(`(### ${componentName} )[✅🟡🔴]`),
      `$1${status}`
    );

    // Update status text
    updatedPlan = updatedPlan.replace(
      new RegExp(`(### ${componentName}[\\s\\S]*?\\*\\*Status:\\*\\* )[^\\n]+`),
      `$1${statusText}`
    );

    return updatedPlan;
  }

  private injectKnownIssue(plan: string, componentName: string, issue: string): string {
    const issuePattern = new RegExp(
      `(### ${componentName}[\\s\\S]*?#### Known Issues[^\\`]*\`\`\`)([\\s\\S]*?)(\`\`\`)`
    );

    if (plan.match(issuePattern)) {
      return plan.replace(issuePattern, (match, before, issues, after) => {
        const updatedIssues = issues.trim() + `\n🔴 ${issue}`;
        return `${before}\n${updatedIssues}\n${after}`;
      });
    }

    // If no Known Issues section, create one
    const insertPattern = new RegExp(
      `(### ${componentName}[\\s\\S]*?)(?=###|---)`
    );

    return plan.replace(
      insertPattern,
      `$1\n#### Known Issues (from Tester Agent)\n\`\`\`\n🔴 ${issue}\n\`\`\`\n\n`
    );
  }

  private removeKnownIssue(plan: string, componentName: string, issuePattern: string): string {
    const pattern = new RegExp(
      `(### ${componentName}[\\s\\S]*?#### Known Issues[^\\`]*\`\`\`)([\\s\\S]*?)(\`\`\`)`
    );

    return plan.replace(pattern, (match, before, issues, after) => {
      const lines = issues.split('\n');
      const filteredLines = lines.filter(line => !line.includes(issuePattern));
      const updatedIssues = filteredLines.join('\n');
      return `${before}${updatedIssues}${after}`;
    });
  }

  private generatePriorityMarkdown(priority: InfrastructurePriority): string {
    let markdown = `### Priority: ${priority.title} (${priority.estimatedHours} hours)\n`;
    markdown += `**Assigned:** ${priority.assigned}\n`;
    markdown += `**Status:** ${priority.status}\n\n`;
    markdown += `#### System Todos\n`;

    priority.todos.forEach(todo => {
      const checkbox = todo.completed ? '[x]' : '[ ]';
      markdown += `- ${checkbox} ${todo.task}\n`;
    });

    return markdown;
  }
}

/**
 * Usage Example:
 *
 * ```typescript
 * const updater = new SystemPlanUpdater(2); // Week 2
 *
 * // Update component todos
 * await updater.updateComponentTodos('Backend API Services', [
 *   { content: 'Set up FastAPI', status: 'completed', activeForm: 'Setting up FastAPI' },
 *   { content: 'Add rate limiting', status: 'in_progress', activeForm: 'Adding rate limiting' },
 * ]);
 *
 * // Update performance metrics
 * await updater.updatePerformanceMetrics('Backend API Services', {
 *   'Average Response Time': '~100ms',
 *   'P95 Response Time': '~220ms',
 *   'Error Rate': '0.01%',
 * });
 *
 * // Add infrastructure priority
 * await updater.addInfrastructurePriority({
 *   title: 'CI/CD Pipeline',
 *   assigned: 'Engineer Agent',
 *   status: 'Planned',
 *   estimatedHours: 8,
 *   todos: [
 *     { task: 'Create GitHub Actions workflow', completed: false },
 *     { task: 'Add automated testing', completed: false },
 *   ],
 * });
 *
 * // Update system health
 * await updater.updateSystemHealth({
 *   backend: {
 *     status: '🟢 Operational',
 *     uptime: '99.9%',
 *     avgResponseTime: '100ms',
 *     errorRate: '0.01%',
 *   },
 *   // ... other metrics
 * });
 *
 * // Update timestamp
 * await updater.updateTimestamp();
 * ```
 */
