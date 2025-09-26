/**
 * Jira MCP Server for Claude Code Integration
 * Provides real-time access to Jira tickets, sprints, and project data
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee: string | null;
  priority: string;
  issueType: string;
  labels: string[];
  components: string[];
  fixVersions: string[];
  created: string;
  updated: string;
  reporter: string;
  storyPoints?: number;
  sprint?: string;
}

interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate: string;
  endDate: string;
  goal?: string;
  issues: JiraIssue[];
}

class JiraMCPServer {
  private config: JiraConfig;
  private server: Server;

  constructor(config: JiraConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: 'jira-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.setupTools();
    this.setupResources();
  }

  private setupTools() {
    // Get current sprint
    this.server.setRequestHandler('tools/call', async (request) => {
      if (request.params.name === 'get_current_sprint') {
        return await this.getCurrentSprint();
      }

      if (request.params.name === 'get_issue') {
        const issueKey = request.params.arguments?.issueKey as string;
        return await this.getIssue(issueKey);
      }

      if (request.params.name === 'search_issues') {
        const jql = request.params.arguments?.jql as string;
        return await this.searchIssues(jql);
      }

      if (request.params.name === 'sync_to_context') {
        return await this.syncToContext();
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });

    // Register available tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'get_current_sprint',
          description: 'Get current active sprint with all issues',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_issue',
          description: 'Get detailed information about a specific Jira issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueKey: {
                type: 'string',
                description: 'Jira issue key (e.g., PROJ-123)'
              }
            },
            required: ['issueKey']
          }
        },
        {
          name: 'search_issues',
          description: 'Search for issues using JQL (Jira Query Language)',
          inputSchema: {
            type: 'object',
            properties: {
              jql: {
                type: 'string',
                description: 'JQL query string'
              }
            },
            required: ['jql']
          }
        },
        {
          name: 'sync_to_context',
          description: 'Sync current sprint and recent issues to .ai/ context files',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));
  }

  private setupResources() {
    this.server.setRequestHandler('resources/list', async () => ({
      resources: [
        {
          uri: 'jira://current-sprint',
          name: 'Current Sprint',
          description: 'Active sprint with all issues and details'
        },
        {
          uri: 'jira://project-overview',
          name: 'Project Overview',
          description: 'Project summary, components, and recent activity'
        }
      ]
    }));

    this.server.setRequestHandler('resources/read', async (request) => {
      if (request.params.uri === 'jira://current-sprint') {
        const sprint = await this.getCurrentSprint();
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'text/markdown',
            text: this.formatSprintAsMarkdown(sprint)
          }]
        };
      }

      if (request.params.uri === 'jira://project-overview') {
        const overview = await this.getProjectOverview();
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'text/markdown',
            text: overview
          }]
        };
      }

      throw new Error(`Unknown resource: ${request.params.uri}`);
    });
  }

  private async getCurrentSprint(): Promise<JiraSprint> {
    const response = await this.makeJiraRequest(`/rest/agile/1.0/board/1/sprint?state=active`);
    const activeSprints = response.values;

    if (activeSprints.length === 0) {
      throw new Error('No active sprints found');
    }

    const sprint = activeSprints[0];
    const issuesResponse = await this.makeJiraRequest(
      `/rest/agile/1.0/sprint/${sprint.id}/issue`
    );

    return {
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      goal: sprint.goal,
      issues: issuesResponse.issues.map(this.formatIssue)
    };
  }

  private async getIssue(issueKey: string): Promise<JiraIssue> {
    const response = await this.makeJiraRequest(`/rest/api/3/issue/${issueKey}`);
    return this.formatIssue(response);
  }

  private async searchIssues(jql: string): Promise<JiraIssue[]> {
    const response = await this.makeJiraRequest(`/rest/api/3/search`, {
      method: 'POST',
      body: JSON.stringify({
        jql,
        maxResults: 50,
        fields: ['summary', 'status', 'assignee', 'description', 'priority', 'issuetype', 'labels', 'components']
      })
    });

    return response.issues.map(this.formatIssue);
  }

  private async getProjectOverview(): Promise<string> {
    const project = await this.makeJiraRequest(`/rest/api/3/project/${this.config.projectKey}`);
    const recentIssues = await this.searchIssues(`project = ${this.config.projectKey} ORDER BY updated DESC`);

    return `# ${project.name} - Project Overview

## Project Details
- **Key**: ${project.key}
- **Type**: ${project.projectTypeKey}
- **Lead**: ${project.lead?.displayName || 'Unassigned'}
- **Description**: ${project.description || 'No description'}

## Recent Activity (Last 10 Issues)
${recentIssues.slice(0, 10).map(issue =>
  `- **${issue.key}**: ${issue.summary} (${issue.status})`
).join('\n')}

## Components
${project.components?.map(comp => `- ${comp.name}: ${comp.description || 'No description'}`).join('\n') || 'No components defined'}

---
*Last updated: ${new Date().toISOString()}*
`;
  }

  private async syncToContext(): Promise<{ success: boolean; files: string[] }> {
    const sprint = await this.getCurrentSprint();
    const overview = await this.getProjectOverview();

    // Write to .ai/ context files
    const fs = await import('fs/promises');
    const path = await import('path');

    const aiDir = '.ai/jira';
    await fs.mkdir(aiDir, { recursive: true });

    const files = [];

    // Write current sprint
    const sprintFile = path.join(aiDir, 'current-sprint.md');
    await fs.writeFile(sprintFile, this.formatSprintAsMarkdown(sprint));
    files.push(sprintFile);

    // Write project overview
    const overviewFile = path.join(aiDir, 'project-overview.md');
    await fs.writeFile(overviewFile, overview);
    files.push(overviewFile);

    // Write individual ticket files
    const ticketsDir = path.join(aiDir, 'tickets');
    await fs.mkdir(ticketsDir, { recursive: true });

    for (const issue of sprint.issues) {
      const ticketFile = path.join(ticketsDir, `${issue.key}.md`);
      await fs.writeFile(ticketFile, this.formatIssueAsMarkdown(issue));
      files.push(ticketFile);
    }

    return { success: true, files };
  }

  private formatSprintAsMarkdown(sprint: JiraSprint): string {
    return `# ${sprint.name}

**Status**: ${sprint.state.toUpperCase()}
**Duration**: ${sprint.startDate} → ${sprint.endDate}
**Goal**: ${sprint.goal || 'No goal defined'}

## Sprint Issues (${sprint.issues.length})

${sprint.issues.map(issue => `
### ${issue.key}: ${issue.summary}
- **Status**: ${issue.status}
- **Assignee**: ${issue.assignee || 'Unassigned'}
- **Priority**: ${issue.priority}
- **Type**: ${issue.issueType}
${issue.storyPoints ? `- **Story Points**: ${issue.storyPoints}` : ''}
${issue.labels.length ? `- **Labels**: ${issue.labels.join(', ')}` : ''}

${issue.description ? `**Description:**\n${issue.description}\n` : ''}
---
`).join('\n')}

*Synced: ${new Date().toISOString()}*
`;
  }

  private formatIssueAsMarkdown(issue: JiraIssue): string {
    return `# ${issue.key}: ${issue.summary}

## Details
- **Status**: ${issue.status}
- **Assignee**: ${issue.assignee || 'Unassigned'}
- **Reporter**: ${issue.reporter}
- **Priority**: ${issue.priority}
- **Type**: ${issue.issueType}
- **Created**: ${issue.created}
- **Updated**: ${issue.updated}

${issue.storyPoints ? `## Story Points\n${issue.storyPoints}\n` : ''}

${issue.labels.length ? `## Labels\n${issue.labels.map(l => `- ${l}`).join('\n')}\n` : ''}

${issue.components.length ? `## Components\n${issue.components.map(c => `- ${c}`).join('\n')}\n` : ''}

## Description
${issue.description || 'No description provided'}

---
*Last updated: ${issue.updated}*
`;
  }

  private formatIssue(jiraIssue: any): JiraIssue {
    return {
      key: jiraIssue.key,
      summary: jiraIssue.fields.summary,
      description: jiraIssue.fields.description?.content?.[0]?.content?.[0]?.text || jiraIssue.fields.description || '',
      status: jiraIssue.fields.status.name,
      assignee: jiraIssue.fields.assignee?.displayName || null,
      priority: jiraIssue.fields.priority.name,
      issueType: jiraIssue.fields.issuetype.name,
      labels: jiraIssue.fields.labels || [],
      components: jiraIssue.fields.components?.map((c: any) => c.name) || [],
      fixVersions: jiraIssue.fields.fixVersions?.map((v: any) => v.name) || [],
      created: jiraIssue.fields.created,
      updated: jiraIssue.fields.updated,
      reporter: jiraIssue.fields.reporter.displayName,
      storyPoints: jiraIssue.fields.customfield_10016, // Common story points field
      sprint: jiraIssue.fields.customfield_10020?.[0]?.name // Common sprint field
    };
  }

  private async makeJiraRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Configuration - replace with your Jira details
const config: JiraConfig = {
  baseUrl: process.env.JIRA_BASE_URL || 'https://your-domain.atlassian.net',
  email: process.env.JIRA_EMAIL || 'your-email@domain.com',
  apiToken: process.env.JIRA_API_TOKEN || 'your-api-token',
  projectKey: process.env.JIRA_PROJECT_KEY || 'TUTORWISE'
};

// Start the MCP server
const jiraServer = new JiraMCPServer(config);
jiraServer.start().catch(console.error);

export { JiraMCPServer };