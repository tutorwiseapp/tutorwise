/**
 * Simple Jira Sync for Claude Code Context Engineering
 * Fetches Jira data and syncs to .ai/ directory for context access
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
  created: string;
  updated: string;
}

class SimpleJiraSync {
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
  }

  async syncCurrentSprint(): Promise<void> {
    try {
      console.log('🔄 Syncing Jira data to Claude Code context...');

      // Get current sprint
      const sprint = await this.getCurrentSprint();

      // Create directories
      await mkdir('.ai/jira', { recursive: true });
      await mkdir('.ai/jira/tickets', { recursive: true });

      // Write sprint overview
      const sprintMd = this.formatSprintAsMarkdown(sprint);
      await writeFile('.ai/jira/current-sprint.md', sprintMd);

      // Write individual tickets
      for (const issue of sprint.issues) {
        const ticketMd = this.formatIssueAsMarkdown(issue);
        await writeFile(`.ai/jira/tickets/${issue.key}.md`, ticketMd);
      }

      // Write project context to main PROMPT.md
      await this.updateMainContext(sprint);

      console.log(`✅ Synced ${sprint.issues.length} issues from sprint: ${sprint.name}`);
      console.log('📁 Files created:');
      console.log('   - .ai/jira/current-sprint.md');
      console.log(`   - .ai/jira/tickets/ (${sprint.issues.length} files)`);
      console.log('   - Updated .ai/PROMPT.md with Jira context');

    } catch (error) {
      console.error('❌ Error syncing Jira data:', error);
      throw error;
    }
  }

  private async getCurrentSprint(): Promise<any> {
    try {
      // First try to get board with sprints (Scrum)
      const boardResponse = await this.makeJiraRequest('/rest/agile/1.0/board');
      const board = boardResponse.values.find((b: any) =>
        b.name.toLowerCase().includes(this.config.projectKey.toLowerCase()) ||
        b.location?.projectKey === this.config.projectKey
      );

      if (!board) {
        console.log('⚠️  No board found, falling back to project issues...');
        return await this.getProjectIssues();
      }

      console.log(`📋 Found board: ${board.name} (Type: ${board.type})`);

      // Try to get sprints if it's a Scrum board
      if (board.type === 'scrum') {
        const sprintResponse = await this.makeJiraRequest(`/rest/agile/1.0/board/${board.id}/sprint?state=active`);
        const activeSprints = sprintResponse.values;

        if (activeSprints.length === 0) {
          // If no active sprint, get the most recent closed one
          const closedSprintResponse = await this.makeJiraRequest(`/rest/agile/1.0/board/${board.id}/sprint?state=closed&maxResults=1`);
          if (closedSprintResponse.values.length > 0) {
            activeSprints.push(closedSprintResponse.values[0]);
          }
        }

        if (activeSprints.length > 0) {
          const sprint = activeSprints[0];
          console.log(`🎯 Using sprint: ${sprint.name}`);

          // Get sprint issues
          const issuesResponse = await this.makeJiraRequest(`/rest/agile/1.0/sprint/${sprint.id}/issue`);

          return {
            ...sprint,
            issues: issuesResponse.issues.map((issue: any) => this.formatIssue(issue))
          };
        }
      }

      // For Kanban boards or if no sprints, get board issues
      console.log('📌 Using Kanban board or board issues...');
      const issuesResponse = await this.makeJiraRequest(`/rest/agile/1.0/board/${board.id}/issue?maxResults=50`);

      return {
        id: board.id,
        name: board.name + ' - Current Issues',
        state: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        goal: 'Current board items',
        issues: issuesResponse.issues.map((issue: any) => this.formatIssue(issue))
      };

    } catch (error) {
      console.log('⚠️  Board API failed, falling back to project search...');
      return await this.getProjectIssues();
    }
  }

  private async getProjectIssues(): Promise<any> {
    console.log('🔍 Fetching recent project issues...');

    // Get recent issues from the project
    const jql = `project = ${this.config.projectKey} ORDER BY updated DESC`;
    const issuesResponse = await this.makeJiraRequest(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=30`);

    return {
      id: 'project-issues',
      name: `${this.config.projectKey} - Recent Issues`,
      state: 'active',
      startDate: new Date().toISOString(),
      endDate: null,
      goal: 'Recent project activity',
      issues: issuesResponse.issues.map((issue: any) => this.formatIssue(issue))
    };
  }

  private formatIssue(jiraIssue: any): JiraIssue {
    const fields = jiraIssue.fields;
    return {
      key: jiraIssue.key,
      summary: fields.summary,
      description: this.extractDescription(fields.description),
      status: fields.status.name,
      assignee: fields.assignee?.displayName || null,
      priority: fields.priority.name,
      issueType: fields.issuetype.name,
      labels: fields.labels || [],
      created: fields.created,
      updated: fields.updated
    };
  }

  private extractDescription(description: any): string {
    if (!description) return '';

    if (typeof description === 'string') {
      return description;
    }

    // Handle Atlassian Document Format (ADF)
    if (description.content && Array.isArray(description.content)) {
      return description.content
        .map((block: any) => {
          if (block.content && Array.isArray(block.content)) {
            return block.content
              .map((item: any) => item.text || '')
              .join('');
          }
          return '';
        })
        .join('\n');
    }

    return '';
  }

  private formatSprintAsMarkdown(sprint: any): string {
    const issues = sprint.issues || [];
    const statusCounts = issues.reduce((acc: any, issue: JiraIssue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1;
      return acc;
    }, {});

    return `# ${sprint.name}

**Status**: ${sprint.state?.toUpperCase() || 'ACTIVE'}
**Duration**: ${sprint.startDate || 'TBD'} → ${sprint.endDate || 'TBD'}
**Goal**: ${sprint.goal || 'No goal defined'}

## Sprint Summary
- **Total Issues**: ${issues.length}
${Object.entries(statusCounts).map(([status, count]) => `- **${status}**: ${count}`).join('\n')}

## Sprint Backlog

${issues.map((issue: JiraIssue) => `
### ${issue.key}: ${issue.summary}
- **Status**: ${issue.status}
- **Assignee**: ${issue.assignee || 'Unassigned'}
- **Priority**: ${issue.priority}
- **Type**: ${issue.issueType}
${issue.labels.length ? `- **Labels**: ${issue.labels.join(', ')}` : ''}

${issue.description ? `**Description:**\n${issue.description.substring(0, 200)}${issue.description.length > 200 ? '...' : ''}\n` : ''}

[View in Jira](${this.config.baseUrl}/browse/${issue.key})

---`).join('\n')}

*Last synced: ${new Date().toISOString()}*
`;
  }

  private formatIssueAsMarkdown(issue: JiraIssue): string {
    return `# ${issue.key}: ${issue.summary}

**Status**: ${issue.status}
**Assignee**: ${issue.assignee || 'Unassigned'}
**Priority**: ${issue.priority}
**Type**: ${issue.issueType}

**Created**: ${new Date(issue.created).toLocaleDateString()}
**Updated**: ${new Date(issue.updated).toLocaleDateString()}

${issue.labels.length ? `**Labels**: ${issue.labels.join(', ')}\n` : ''}

## Description
${issue.description || 'No description provided'}

## Links
- [View in Jira](${this.config.baseUrl}/browse/${issue.key})

---
*Auto-generated from Jira on ${new Date().toISOString()}*
`;
  }

  private async updateMainContext(sprint: any): Promise<void> {
    const contextSection = `

## Current Sprint Context (Auto-generated from Jira)

**Sprint**: ${sprint.name}
**Status**: ${sprint.state?.toUpperCase() || 'ACTIVE'}
**Issues**: ${sprint.issues?.length || 0}

**Key Tickets in Progress**:
${sprint.issues?.filter((i: JiraIssue) =>
    i.status.toLowerCase().includes('progress') ||
    i.status.toLowerCase().includes('development')
  ).slice(0, 5).map((issue: JiraIssue) =>
    `- **${issue.key}**: ${issue.summary} (${issue.status})`
  ).join('\n') || '- No active development tickets'}

**Priority Items**:
${sprint.issues?.filter((i: JiraIssue) =>
    i.priority.toLowerCase().includes('high') ||
    i.priority.toLowerCase().includes('critical')
  ).slice(0, 3).map((issue: JiraIssue) =>
    `- **${issue.key}**: ${issue.summary} (${issue.priority})`
  ).join('\n') || '- No high priority items'}

> This context is automatically updated when you run Jira sync.
> Detailed ticket information is available in \`.ai/jira/tickets/\`

---
`;

    try {
      const { readFile } = await import('fs/promises');
      let promptContent = await readFile('.ai/PROMPT.md', 'utf8');

      // Remove existing Jira context section
      const contextRegex = /## Current Sprint Context \(Auto-generated from Jira\)[\s\S]*?---\n/;
      promptContent = promptContent.replace(contextRegex, '');

      // Add new context section before the end
      promptContent += contextSection;

      await writeFile('.ai/PROMPT.md', promptContent);
    } catch (error) {
      console.log('Note: Could not update .ai/PROMPT.md - file may not exist');
    }
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
      const errorText = await response.text();
      throw new Error(`Jira API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return response.json();
  }
}

// CLI interface
async function main() {
  const config: JiraConfig = {
    baseUrl: process.env.JIRA_BASE_URL || '',
    email: process.env.JIRA_EMAIL || '',
    apiToken: process.env.JIRA_API_TOKEN || '',
    projectKey: process.env.JIRA_PROJECT_KEY || 'TUTORWISE'
  };

  // Validate config
  if (!config.baseUrl || !config.email || !config.apiToken) {
    console.error('❌ Missing Jira configuration. Please set environment variables:');
    console.error('   JIRA_BASE_URL (e.g., https://your-domain.atlassian.net)');
    console.error('   JIRA_EMAIL (your Atlassian email)');
    console.error('   JIRA_API_TOKEN (generate at https://id.atlassian.com/manage-profile/security/api-tokens)');
    process.exit(1);
  }

  const jiraSync = new SimpleJiraSync(config);

  try {
    await jiraSync.syncCurrentSprint();
    console.log('\n🎉 Jira sync completed successfully!');
    console.log('\n📖 You can now use the synced Jira context in Claude Code:');
    console.log('   • Current sprint overview: .ai/jira/current-sprint.md');
    console.log('   • Individual tickets: .ai/jira/tickets/');
    console.log('   • Updated main context: .ai/PROMPT.md');
  } catch (error) {
    console.error('\n💥 Jira sync failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { SimpleJiraSync };