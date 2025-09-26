#!/usr/bin/env node

/**
 * Simple GitHub Public Repository Sync Runner
 * Works without authentication for public repositories
 */

import { writeFile, mkdir, readFile } from 'fs/promises';

async function loadEnvFile() {
  try {
    const envContent = await readFile('.env.local', 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          envVars[key.trim()] = value;
          process.env[key.trim()] = value;
        }
      }
    });

    console.log('✅ Loaded environment variables from .env.local');
    return envVars;
  } catch (error) {
    console.log('⚠️  No .env.local file found, using system environment variables');
    return {};
  }
}

async function fetchGitHubAPI(endpoint) {
  const response = await fetch(`https://api.github.com${endpoint}`);

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function syncRepositoryData(owner, repo) {
  try {
    console.log('🔄 Syncing GitHub repository data...');

    // Create directories
    await mkdir('.ai/github', { recursive: true });
    await mkdir('.ai/github/issues', { recursive: true });

    // Get repository info
    const repoData = await fetchGitHubAPI(`/repos/${owner}/${repo}`);
    console.log(`📊 Repository: ${repoData.full_name}`);
    console.log(`📝 Description: ${repoData.description || 'No description'}`);
    console.log(`⭐ Stars: ${repoData.stargazers_count} | 🍴 Forks: ${repoData.forks_count}`);
    console.log(`🐛 Open Issues: ${repoData.open_issues_count}`);

    // Get recent issues (public repositories)
    let issues = [];
    try {
      issues = await fetchGitHubAPI(`/repos/${owner}/${repo}/issues?state=all&per_page=20&sort=updated&direction=desc`);
      console.log(`📋 Found ${issues.length} recent issues`);
    } catch (error) {
      console.log('⚠️  Could not fetch issues (may require authentication)');
    }

    // Get recent commits
    let commits = [];
    try {
      commits = await fetchGitHubAPI(`/repos/${owner}/${repo}/commits?per_page=10`);
      console.log(`💻 Found ${commits.length} recent commits`);
    } catch (error) {
      console.log('⚠️  Could not fetch commits');
    }

    // Create repository overview
    const overview = createRepositoryOverview(repoData, issues, commits);
    await writeFile('.ai/github/repository-overview.md', overview);

    // Create individual issue files
    for (const issue of issues) {
      if (!issue.pull_request) {
        const issueMd = createIssueMarkdown(issue);
        await writeFile(`.ai/github/issues/${issue.number}.md`, issueMd);
      }
    }

    // Update main context
    await updateMainContext(repoData, issues);

    console.log('\n✅ GitHub sync completed successfully!');
    console.log(`📁 Files created:`);
    console.log('   - .ai/github/repository-overview.md');
    if (issues.length > 0) {
      console.log(`   - .ai/github/issues/ (${issues.filter(i => !i.pull_request).length} files)`);
    }
    console.log('   - Updated .ai/PROMPT.md');

  } catch (error) {
    console.error('❌ Error syncing GitHub data:', error.message);
    throw error;
  }
}

function createRepositoryOverview(repo, issues, commits) {
  const openIssues = issues.filter(i => i.state === 'open' && !i.pull_request);
  const recentActivity = [...issues, ...commits.map(c => ({
    title: c.commit.message.split('\n')[0],
    updated_at: c.commit.committer.date,
    user: { login: c.commit.author.name },
    html_url: c.html_url,
    type: 'commit'
  }))].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 10);

  return `# ${repo.name} - Repository Overview

## Repository Details
- **Full Name**: ${repo.full_name}
- **Description**: ${repo.description || 'No description'}
- **Language**: ${repo.language || 'N/A'}
- **Stars**: ${repo.stargazers_count} | **Forks**: ${repo.forks_count}
- **Open Issues**: ${repo.open_issues_count} | **Watchers**: ${repo.watchers_count}

## Current Status
- **Default Branch**: ${repo.default_branch}
- **Last Updated**: ${new Date(repo.updated_at).toLocaleDateString()}
- **Last Push**: ${new Date(repo.pushed_at).toLocaleDateString()}
- **Homepage**: ${repo.homepage || 'None'}

## Recent Activity (Last 10 Items)
${recentActivity.map(item => {
  const type = item.pull_request ? 'PR' : (item.type === 'commit' ? 'Commit' : 'Issue');
  const icon = item.type === 'commit' ? '💻' : (item.pull_request ? '🔀' : (item.state === 'open' ? '🟢' : '🔴'));
  const user = item.user?.login || item.user || 'Unknown';
  return `${icon} **${type}**: ${item.title} - ${user}`;
}).join('\n')}

## Open Issues
${openIssues.slice(0, 5).map(issue =>
  `- **#${issue.number}**: ${issue.title} ${issue.labels?.map(l => l.name).join(', ') ? `[${issue.labels.map(l => l.name).join(', ')}]` : ''}`
).join('\n') || '- No open issues'}

## Repository Links
- **GitHub**: ${repo.html_url}
- **Clone**: ${repo.clone_url}
${repo.homepage ? `- **Homepage**: ${repo.homepage}` : ''}

---
*Last synced*: ${new Date().toISOString()}
`;
}

function createIssueMarkdown(issue) {
  return `# Issue #${issue.number}: ${issue.title}

**Status**: ${issue.state.toUpperCase()} ${issue.state === 'open' ? '🟢' : '🔴'}
**Author**: ${issue.user.login}
**Created**: ${new Date(issue.created_at).toLocaleDateString()}
**Updated**: ${new Date(issue.updated_at).toLocaleDateString()}

${issue.labels?.length ? `**Labels**: ${issue.labels.map(l => l.name).join(', ')}\n` : ''}
${issue.assignees?.length ? `**Assignees**: ${issue.assignees.map(a => a.login).join(', ')}\n` : ''}
${issue.milestone ? `**Milestone**: ${issue.milestone.title}\n` : ''}

## Description
${issue.body || 'No description provided'}

## Links
- [View on GitHub](${issue.html_url})

---
*Auto-generated from GitHub on ${new Date().toISOString()}*
`;
}

async function updateMainContext(repo, issues) {
  const openIssues = issues.filter(i => i.state === 'open' && !i.pull_request);

  const contextSection = `

## GitHub Repository Context (Auto-generated)

**Repository**: ${repo.full_name}
**Language**: ${repo.language} | **Stars**: ${repo.stargazers_count}
**Open Issues**: ${repo.open_issues_count} | **Last Updated**: ${new Date(repo.updated_at).toLocaleDateString()}

**Recent Open Issues**:
${openIssues.slice(0, 3).map(issue =>
  `- **#${issue.number}**: ${issue.title} ${issue.labels?.map(l => l.name).join(', ') ? `[${issue.labels.map(l => l.name).join(', ')}]` : ''}`
).join('\n') || '- No open issues'}

**Repository Info**:
- **Homepage**: ${repo.homepage || 'None'}
- **Default Branch**: ${repo.default_branch}
- **Clone URL**: ${repo.clone_url}

> This context is automatically updated when you run GitHub sync.
> Repository overview available in \`.ai/github/repository-overview.md\`

---
`;

  try {
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

async function main() {
  console.log('🚀 Starting GitHub Public Repository sync for Claude Code context engineering...\n');

  // Load environment variables
  await loadEnvFile();

  const owner = process.env.GITHUB_OWNER || 'tutorwiseapp';
  const repo = process.env.GITHUB_REPO || 'tutorwise';

  console.log(`📂 Syncing repository: ${owner}/${repo}`);
  console.log('🔓 Using public API (no authentication required)\n');

  try {
    await syncRepositoryData(owner, repo);
    console.log('\n🎉 GitHub sync completed successfully!');
    console.log('\n💡 Note: This sync used public API access.');
    console.log('   For private repositories or enhanced features, set up GITHUB_TOKEN');

  } catch (error) {
    console.error('\n💥 GitHub sync failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);