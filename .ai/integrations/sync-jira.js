#!/usr/bin/env node

/**
 * Simple Jira Sync Runner
 * Usage: node sync-jira.js
 */

import { readFile } from 'fs/promises';
import { SimpleJiraSync } from './simple-jira-sync.js';

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

async function main() {
  console.log('🚀 Starting Jira sync for Claude Code context engineering...\n');

  // Load environment variables
  await loadEnvFile();

  const config = {
    baseUrl: process.env.JIRA_BASE_URL || '',
    email: process.env.JIRA_EMAIL || '',
    apiToken: process.env.JIRA_API_TOKEN || '',
    projectKey: process.env.JIRA_PROJECT_KEY || 'TUTORWISE'
  };

  // Validate config
  if (!config.baseUrl || !config.email || !config.apiToken) {
    console.error('❌ Missing Jira configuration. Please set in .env.local:');
    console.error('');
    console.error('JIRA_BASE_URL=https://your-domain.atlassian.net');
    console.error('JIRA_EMAIL=your-email@domain.com');
    console.error('JIRA_API_TOKEN=your-api-token');
    console.error('JIRA_PROJECT_KEY=TUTORWISE');
    console.error('');
    console.error('💡 Generate API token at: https://id.atlassian.com/manage-profile/security/api-tokens');
    process.exit(1);
  }

  console.log(`🔗 Connecting to: ${config.baseUrl}`);
  console.log(`📧 Using email: ${config.email}`);
  console.log(`📁 Project key: ${config.projectKey}\n`);

  const jiraSync = new SimpleJiraSync(config);

  try {
    await jiraSync.syncCurrentSprint();

    console.log('\n🎉 Jira sync completed successfully!');
    console.log('\n📚 Context files created for Claude Code:');
    console.log('   • .ai/jira/current-sprint.md - Sprint overview');
    console.log('   • .ai/jira/tickets/*.md - Individual ticket details');
    console.log('   • .ai/PROMPT.md - Updated with current context');
    console.log('\n💡 You can now reference Jira tickets and requirements in Claude Code!');

  } catch (error) {
    console.error('\n💥 Jira sync failed:');
    console.error(error.message);

    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n🔐 Authentication failed. Please check:');
      console.error('   • JIRA_EMAIL is correct');
      console.error('   • JIRA_API_TOKEN is valid');
      console.error('   • Account has access to the project');
    }

    if (error.message.includes('404')) {
      console.error('\n🔍 Resource not found. Please check:');
      console.error('   • JIRA_BASE_URL is correct');
      console.error('   • JIRA_PROJECT_KEY exists');
      console.error('   • Project has a board configured');
    }

    process.exit(1);
  }
}

main().catch(console.error);