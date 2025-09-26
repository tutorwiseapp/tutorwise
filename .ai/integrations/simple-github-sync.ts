/**
 * Simple GitHub Projects Sync for Claude Code Context Engineering
 * Fetches GitHub Projects, issues, and PRs for enhanced development context
 */

import { writeFile, mkdir } from 'fs/promises';
import { Octokit } from '@octokit/rest';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  projectNumber?: number;
}

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  milestone: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  user: string;
  pull_request?: boolean;
}

interface ProjectItem {
  id: string;
  content: GitHubIssue;
  fieldValues: Record<string, any>;
  status?: string;
  priority?: string;
}

interface GitHubProject {
  id: string;
  number: number;
  title: string;
  description: string;
  state: 'OPEN' | 'CLOSED';
  items: ProjectItem[];
  fields: any[];
}

class SimpleGitHubSync {
  private config: GitHubConfig;
  private octokit: Octokit;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token
    });
  }

  async syncProjectData(): Promise<void> {
    try {
      console.log('🔄 Syncing GitHub Projects data to Claude Code context...');

      // Create directories
      await mkdir('.ai/github', { recursive: true });
      await mkdir('.ai/github/issues', { recursive: true });
      await mkdir('.ai/github/pull-requests', { recursive: true });

      // Get repository info
      const repo = await this.getRepositoryInfo();

      // Get recent issues and PRs
      const issues = await this.getRecentIssues();
      const pullRequests = await this.getRecentPullRequests();

      // Get project data if project number specified
      let project = null;
      if (this.config.projectNumber) {
        try {
          project = await this.getProject();
        } catch (error) {
          console.log('⚠️  Could not fetch GitHub Project data, continuing with issues/PRs...');
        }
      }

      // Write repository overview
      const repoOverview = this.formatRepositoryOverview(repo, issues, pullRequests);
      await writeFile('.ai/github/repository-overview.md', repoOverview);

      // Write issues
      for (const issue of issues) {
        if (!issue.pull_request) {
          const issueMd = this.formatIssueAsMarkdown(issue);
          await writeFile(`.ai/github/issues/${issue.number}.md`, issueMd);
        }
      }

      // Write pull requests
      for (const pr of pullRequests) {
        const prMd = this.formatPullRequestAsMarkdown(pr);
        await writeFile(`.ai/github/pull-requests/${pr.number}.md`, prMd);
      }

      // Write project overview if available
      if (project) {
        const projectMd = this.formatProjectAsMarkdown(project);
        await writeFile('.ai/github/project-board.md', projectMd);
      }

      // Update main context
      await this.updateMainContext({ repo, issues, pullRequests, project });

      console.log(`✅ Synced GitHub data:`);
      console.log(`   • ${issues.filter(i => !i.pull_request).length} issues`);
      console.log(`   • ${pullRequests.length} pull requests`);
      if (project) console.log(`   • Project board: ${project.title}`);

      console.log('📁 Files created:');
      console.log('   - .ai/github/repository-overview.md');
      console.log('   - .ai/github/issues/ (individual files)');
      console.log('   - .ai/github/pull-requests/ (individual files)');
      if (project) console.log('   - .ai/github/project-board.md');

    } catch (error) {
      console.error('❌ Error syncing GitHub data:', error);
      throw error;
    }
  }

  private async getRepositoryInfo() {
    const { data } = await this.octokit.rest.repos.get({
      owner: this.config.owner,
      repo: this.config.repo
    });
    return data;
  }

  private async getRecentIssues(limit: number = 20): Promise<GitHubIssue[]> {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner: this.config.owner,
      repo: this.config.repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: limit
    });

    return data.map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state as 'open' | 'closed',
      labels: issue.labels.map(label => typeof label === 'string' ? label : label.name || ''),
      assignees: issue.assignees?.map(assignee => assignee.login) || [],
      milestone: issue.milestone?.title || null,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      html_url: issue.html_url,
      user: issue.user?.login || 'unknown',
      pull_request: !!issue.pull_request
    }));
  }

  private async getRecentPullRequests(limit: number = 15): Promise<GitHubIssue[]> {
    const { data } = await this.octokit.rest.pulls.list({
      owner: this.config.owner,
      repo: this.config.repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: limit
    });

    return data.map(pr => ({
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      state: pr.state as 'open' | 'closed',
      labels: pr.labels.map(label => typeof label === 'string' ? label : label.name || ''),
      assignees: pr.assignees?.map(assignee => assignee.login) || [],
      milestone: pr.milestone?.title || null,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      html_url: pr.html_url,
      user: pr.user?.login || 'unknown',
      pull_request: true
    }));
  }

  private async getProject(): Promise<GitHubProject | null> {
    if (!this.config.projectNumber) return null;

    try {
      // Note: GitHub Projects v2 API requires different authentication and queries
      // This is a simplified version - full implementation would use GraphQL
      const { data } = await this.octokit.rest.projects.listForRepo({
        owner: this.config.owner,
        repo: this.config.repo
      });

      const project = data.find(p => p.number === this.config.projectNumber);
      if (!project) return null;

      // Get project columns and cards (simplified)
      const { data: columns } = await this.octokit.rest.projects.listColumns({
        project_id: project.id
      });

      const items: ProjectItem[] = [];
      for (const column of columns) {
        const { data: cards } = await this.octokit.rest.projects.listCards({
          column_id: column.id
        });

        for (const card of cards) {
          if (card.content_url) {
            const issueNumber = parseInt(card.content_url.split('/').pop() || '0');
            if (issueNumber > 0) {
              const { data: issue } = await this.octokit.rest.issues.get({
                owner: this.config.owner,
                repo: this.config.repo,
                issue_number: issueNumber
              });

              items.push({
                id: card.id.toString(),
                content: {
                  number: issue.number,
                  title: issue.title,
                  body: issue.body || '',
                  state: issue.state as 'open' | 'closed',
                  labels: issue.labels.map(label => typeof label === 'string' ? label : label.name || ''),
                  assignees: issue.assignees?.map(assignee => assignee.login) || [],
                  milestone: issue.milestone?.title || null,
                  created_at: issue.created_at,
                  updated_at: issue.updated_at,
                  html_url: issue.html_url,
                  user: issue.user?.login || 'unknown',
                  pull_request: !!issue.pull_request
                },
                fieldValues: {},
                status: column.name
              });
            }
          }
        }
      }

      return {
        id: project.id.toString(),
        number: project.number,
        title: project.name,
        description: project.body || '',
        state: project.state as 'OPEN' | 'CLOSED',
        items,
        fields: columns
      };

    } catch (error) {
      console.log('Note: Could not access GitHub Projects - may need additional permissions');
      return null;
    }
  }

  private formatRepositoryOverview(repo: any, issues: GitHubIssue[], pullRequests: GitHubIssue[]): string {
    const openIssues = issues.filter(i => i.state === 'open' && !i.pull_request);
    const openPRs = pullRequests.filter(pr => pr.state === 'open');
    const recentActivity = [...issues, ...pullRequests]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);

    return `# ${repo.name} - Repository Overview

## Repository Details
- **Full Name**: ${repo.full_name}
- **Description**: ${repo.description || 'No description'}
- **Language**: ${repo.language || 'N/A'}
- **Stars**: ${repo.stargazers_count} | **Forks**: ${repo.forks_count}
- **Open Issues**: ${repo.open_issues_count} | **Watchers**: ${repo.watchers_count}

## Current Status
- **Active Issues**: ${openIssues.length}
- **Open Pull Requests**: ${openPRs.length}
- **Default Branch**: ${repo.default_branch}
- **Last Updated**: ${new Date(repo.updated_at).toLocaleDateString()}

## Recent Activity (Last 10 Items)
${recentActivity.map(item => {
  const type = item.pull_request ? 'PR' : 'Issue';
  const icon = item.pull_request ? '🔀' : (item.state === 'open' ? '🟢' : '🔴');
  return `${icon} **${type} #${item.number}**: ${item.title} (${item.state}) - ${item.user}`;
}).join('\n')}

## Priority Issues
${openIssues.slice(0, 5).map(issue =>
  `- **#${issue.number}**: ${issue.title} ${issue.labels.length ? `[${issue.labels.join(', ')}]` : ''}`
).join('\n') || '- No open issues'}

## Active Pull Requests
${openPRs.slice(0, 5).map(pr =>
  `- **#${pr.number}**: ${pr.title} by ${pr.user} ${pr.labels.length ? `[${pr.labels.join(', ')}]` : ''}`
).join('\n') || '- No open pull requests'}

---
*Repository URL*: ${repo.html_url}
*Last synced*: ${new Date().toISOString()}
`;
  }

  private formatIssueAsMarkdown(issue: GitHubIssue): string {
    return `# Issue #${issue.number}: ${issue.title}

**Status**: ${issue.state.toUpperCase()} ${issue.state === 'open' ? '🟢' : '🔴'}
**Author**: ${issue.user}
**Created**: ${new Date(issue.created_at).toLocaleDateString()}
**Updated**: ${new Date(issue.updated_at).toLocaleDateString()}

${issue.labels.length ? `**Labels**: ${issue.labels.join(', ')}\n` : ''}
${issue.assignees.length ? `**Assignees**: ${issue.assignees.join(', ')}\n` : ''}
${issue.milestone ? `**Milestone**: ${issue.milestone}\n` : ''}

## Description
${issue.body || 'No description provided'}

## Links
- [View on GitHub](${issue.html_url})

---
*Auto-generated from GitHub on ${new Date().toISOString()}*
`;
  }

  private formatPullRequestAsMarkdown(pr: GitHubIssue): string {
    return `# Pull Request #${pr.number}: ${pr.title}

**Status**: ${pr.state.toUpperCase()} ${pr.state === 'open' ? '🟢' : (pr.state === 'closed' ? '🟣' : '🔴')}
**Author**: ${pr.user}
**Created**: ${new Date(pr.created_at).toLocaleDateString()}
**Updated**: ${new Date(pr.updated_at).toLocaleDateString()}

${pr.labels.length ? `**Labels**: ${pr.labels.join(', ')}\n` : ''}
${pr.assignees.length ? `**Assignees**: ${pr.assignees.join(', ')}\n` : ''}
${pr.milestone ? `**Milestone**: ${pr.milestone}\n` : ''}

## Description
${pr.body || 'No description provided'}

## Links
- [View on GitHub](${pr.html_url})

---
*Auto-generated from GitHub on ${new Date().toISOString()}*
`;
  }

  private formatProjectAsMarkdown(project: GitHubProject): string {
    const statusGroups = project.items.reduce((groups, item) => {
      const status = item.status || 'No Status';
      if (!groups[status]) groups[status] = [];
      groups[status].push(item);
      return groups;
    }, {} as Record<string, ProjectItem[]>);

    return `# Project: ${project.title}

**Description**: ${project.description || 'No description'}
**Status**: ${project.state}
**Total Items**: ${project.items.length}

## Board Overview
${Object.entries(statusGroups).map(([status, items]) =>
  `### ${status} (${items.length})
${items.map(item =>
    `- **#${item.content.number}**: ${item.content.title} ${item.content.assignees.length ? `(${item.content.assignees.join(', ')})` : ''}`
  ).join('\n')}`
).join('\n\n')}

---
*Last synced*: ${new Date().toISOString()}
`;
  }

  private async updateMainContext({ repo, issues, pullRequests, project }: any): Promise<void> {
    const openIssues = issues.filter((i: GitHubIssue) => i.state === 'open' && !i.pull_request);
    const openPRs = pullRequests.filter((pr: GitHubIssue) => pr.state === 'open');

    const contextSection = `

## GitHub Repository Context (Auto-generated)

**Repository**: ${repo.full_name}
**Open Issues**: ${openIssues.length} | **Open PRs**: ${openPRs.length}

**Priority Issues**:
${openIssues.slice(0, 3).map((issue: GitHubIssue) =>
  `- **#${issue.number}**: ${issue.title} ${issue.labels.length ? `[${issue.labels.join(', ')}]` : ''}`
).join('\n') || '- No open issues'}

**Active Pull Requests**:
${openPRs.slice(0, 3).map((pr: GitHubIssue) =>
  `- **#${pr.number}**: ${pr.title} by ${pr.user}`
).join('\n') || '- No open pull requests'}

${project ? `**Current Project**: ${project.title} (${project.items.length} items)` : ''}

> This context is automatically updated when you run GitHub sync.
> Detailed issue/PR information is available in \`.ai/github/\`

---
`;

    try {
      const { readFile } = await import('fs/promises');
      let promptContent = await readFile('.ai/PROMPT.md', 'utf8');

      // Remove existing GitHub context section
      const contextRegex = /## GitHub Repository Context \(Auto-generated\)[\s\S]*?---\n/;
      promptContent = promptContent.replace(contextRegex, '');

      // Add new context section before the end
      promptContent += contextSection;

      await writeFile('.ai/PROMPT.md', promptContent);
    } catch (error) {
      console.log('Note: Could not update .ai/PROMPT.md - file may not exist');
    }
  }
}

// CLI interface
async function main() {
  const config: GitHubConfig = {
    token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
    owner: process.env.GITHUB_OWNER || 'tutorwiseapp',
    repo: process.env.GITHUB_REPO || 'tutorwise',
    projectNumber: process.env.GITHUB_PROJECT_NUMBER ? parseInt(process.env.GITHUB_PROJECT_NUMBER) : undefined
  };

  // Auto-detect from git remote if not specified
  if (!config.owner || !config.repo) {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('git remote get-url origin');
      const match = stdout.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        config.owner = match[1];
        config.repo = match[2];
        console.log(`🔍 Auto-detected repository: ${config.owner}/${config.repo}`);
      }
    } catch (error) {
      // Ignore git detection errors
    }
  }

  // Validate config
  if (!config.token) {
    console.error('❌ Missing GitHub token. Please set environment variable:');
    console.error('   GITHUB_TOKEN=your-github-token');
    console.error('');
    console.error('💡 Generate token at: https://github.com/settings/tokens');
    console.error('   Required scopes: repo, read:project');
    process.exit(1);
  }

  if (!config.owner || !config.repo) {
    console.error('❌ Could not determine repository. Please set:');
    console.error('   GITHUB_OWNER=your-username');
    console.error('   GITHUB_REPO=repository-name');
    process.exit(1);
  }

  const githubSync = new SimpleGitHubSync(config);

  try {
    await githubSync.syncProjectData();
    console.log('\n🎉 GitHub sync completed successfully!');
    console.log('\n📖 You can now use the synced GitHub context in Claude Code!');
  } catch (error) {
    console.error('\n💥 GitHub sync failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { SimpleGitHubSync };