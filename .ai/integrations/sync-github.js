#!/usr/bin/env node

/**
 * Simple GitHub Projects Sync Runner
 * Usage: node sync-github.js
 */

import { readFile } from 'fs/promises';
import { SimpleGitHubSync } from './simple-github-sync.js';

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

async function detectRepositoryInfo() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync('git remote get-url origin');
    const match = stdout.trim().match(/github\.com[:/]([^/]+)\/([^/.]+)/);

    if (match) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
  } catch (error) {
    // Ignore git detection errors
  }
  return { owner: null, repo: null };
}

async function main() {
  console.log('🚀 Starting GitHub Projects sync for Claude Code context engineering...\n');

  // Load environment variables
  await loadEnvFile();

  // Auto-detect repository info
  const detected = await detectRepositoryInfo();

  const config = {
    token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
    owner: process.env.GITHUB_OWNER || detected.owner || '',
    repo: process.env.GITHUB_REPO || detected.repo || '',
    projectNumber: process.env.GITHUB_PROJECT_NUMBER ? parseInt(process.env.GITHUB_PROJECT_NUMBER) : undefined
  };

  // Validate config
  if (!config.token) {
    console.error('❌ Missing GitHub token. Please set in .env.local:');
    console.error('');
    console.error('GITHUB_TOKEN=ghp_your_token_here');
    console.error('');
    console.error('💡 Generate at: https://github.com/settings/tokens');
    console.error('   Required scopes: repo, read:project');
    process.exit(1);
  }

  if (!config.owner || !config.repo) {
    console.error('❌ Could not determine repository. Please set in .env.local:');
    console.error('');
    console.error('GITHUB_OWNER=your-username-or-org');
    console.error('GITHUB_REPO=repository-name');
    console.error('GITHUB_PROJECT_NUMBER=1  # Optional: for GitHub Projects v1');
    console.error('');
    console.error('Or ensure you\'re in a git repository with GitHub origin');
    process.exit(1);
  }

  console.log(`🔗 Connecting to: ${config.owner}/${config.repo}`);
  console.log(`🔑 Using GitHub token: ${config.token.substring(0, 8)}...`);
  if (config.projectNumber) {
    console.log(`📋 Project number: ${config.projectNumber}`);
  }
  console.log('');

  const githubSync = new SimpleGitHubSync(config);

  try {
    await githubSync.syncProjectData();

    console.log('\n🎉 GitHub sync completed successfully!');
    console.log('\n📚 Context files created for Claude Code:');
    console.log('   • .ai/github/repository-overview.md - Repo status and activity');
    console.log('   • .ai/github/issues/*.md - Individual issue details');
    console.log('   • .ai/github/pull-requests/*.md - PR information');
    console.log('   • .ai/PROMPT.md - Updated with GitHub context');
    console.log('\n💡 You can now reference GitHub issues and PRs in Claude Code!');

    // Helpful next steps
    console.log('\n🔄 Next steps:');
    console.log('   • Run "npm run sync:context" to sync both Jira and GitHub');
    console.log('   • Use "npm run dev:with-context" to start development with fresh context');
    console.log('   • Set up GitHub Actions to auto-sync on push/PR events');

  } catch (error) {
    console.error('\n💥 GitHub sync failed:');
    console.error(error.message);

    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n🔐 Authentication failed. Please check:');
      console.error('   • GITHUB_TOKEN is correct and not expired');
      console.error('   • Token has required scopes: repo, read:project');
      console.error('   • Account has access to the repository');
    }

    if (error.message.includes('404')) {
      console.error('\n🔍 Repository not found. Please check:');
      console.error('   • GITHUB_OWNER and GITHUB_REPO are correct');
      console.error('   • Repository exists and is accessible');
      console.error('   • Token has access to private repos (if applicable)');
    }

    console.error('\n🛠️  Troubleshooting:');
    console.error('   • Verify repository access: https://github.com/' + config.owner + '/' + config.repo);
    console.error('   • Check token permissions: https://github.com/settings/tokens');

    process.exit(1);
  }
}

main().catch(console.error);