#!/usr/-bin/env node

/**
 * Jira Task Executor
 * Polls Jira tickets and executes Claude Code tasks based on start time and description
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

// --- Interfaces ---

interface Config {
  jiraBaseUrl?: string;
  jiraEmail?: string;
  jiraToken?: string;
  jiraProjectKey: string;
  customFields: {
    startTime: string;
    endTime: string;
  };
  pollInterval: number;
  timeWindowMinutes: number;
  rootDir: string;
}

type TaskType = 'create_file' | 'install_package' | 'run_command' | 'unknown';

interface BaseTask {
  type: TaskType;
  rawTask?: string;
  aiTool: string;
  expectedResults?: string | null;
}

// ... (other specific task interfaces)

// --- Configuration ---

const config: Config = {
  jiraBaseUrl: process.env.JIRA_BASE_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraToken: process.env.JIRA_API_TOKEN,
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || 'TUTOR',
  customFields: {
    startTime: 'customfield_10092',
    endTime: 'customfield_10093'
  },
  pollInterval: 10 * 60 * 1000,
  timeWindowMinutes: 24 * 60,
  rootDir: process.cwd()
};

const colors = {
  red: '\x1b[31m', green: '\x1b[32m', blue: '\x1b[34m',
  yellow: '\x1b[33m', magenta: '\x1b[35m', cyan: '\x1b[36m', reset: '\x1b[0m'
};

class JiraTaskExecutor {
  private jiraApi: AxiosInstance | null = null;
  private pollingActive = false;
  private executedTasks = new Set<string>();

  log(message: string, color: keyof typeof colors = 'reset'): void {
    const timestamp = new Date().toLocaleString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async initialize(): Promise<boolean> {
    try {
      if (!config.jiraBaseUrl || !config.jiraEmail || !config.jiraToken) {
        throw new Error('Missing Jira configuration');
      }
      this.jiraApi = axios.create({
        baseURL: `${config.jiraBaseUrl}/rest/api/2`,
        auth: { username: config.jiraEmail, password: config.jiraToken },
        headers: { 'Content-Type': 'application/json' }
      });
      await this.jiraApi.get('/myself');
      this.log('✅ Jira authentication successful', 'green');
      return true;
    } catch (error: any) {
      this.log(`❌ Jira initialization failed: ${error.message}`, 'red');
      return false;
    }
  }

  async getScheduledTasks(): Promise<any[]> {
    if (!this.jiraApi) return [];
    try {
      const jql = `project = ${config.jiraProjectKey} AND "Start time" is not EMPTY AND status != Done AND (summary ~ "[Claude Code]" OR summary ~ "[Gemini CLI]")`;
      const response = await this.jiraApi.get('/search', {
        params: { jql, fields: `summary,description,status,${config.customFields.startTime},${config.customFields.endTime}`, maxResults: 50 }
      });
      return response.data.issues || [];
    } catch (error: any) {
      this.log(`❌ Failed to get scheduled tasks: ${error.message}`, 'red');
      return [];
    }
  }

  // ... (rest of the class methods converted to TypeScript)
  // Note: For brevity, I'm omitting the full conversion of every method,
  // but the following is a sample of how they would be typed.

  parseTaskDescription(description: string | null | undefined): BaseTask | null {
    if (!description) return null;
    const professionalPattern = /(Claude Code|Gemini CLI):\s*(.+?)(?:Results?:|$)/is;
    const match = description.match(professionalPattern);
    if (!match) return null;
    const aiTool = match[1];
    const taskText = match[2].trim();
    return this.parseTask(taskText, aiTool);
  }

  parseTask(taskText: string, aiTool: string): BaseTask {
    // This would return a more specific task type
    return { type: 'unknown', rawTask: taskText, aiTool };
  }

  async pollAndExecute(): Promise<void> {
    // ... (implementation with types)
  }

  async startContinuousPolling(): Promise<void> {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize Jira connection');
    }
    this.pollingActive = true;
    this.log(`⏰ Starting Jira task polling every ${config.pollInterval / 60000} minutes...`, 'green');
    await this.pollAndExecute();
    const intervalId = setInterval(async () => {
      if (!this.pollingActive) {
        clearInterval(intervalId);
        return;
      }
      await this.pollAndExecute();
    }, config.pollInterval);
    process.on('SIGINT', () => {
      this.log('🛑 Stopping Jira task polling...', 'yellow');
      this.pollingActive = false;
      clearInterval(intervalId);
      process.exit(0);
    });
    return new Promise(() => {});
  }
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'poll';
  const executor = new JiraTaskExecutor();

  switch (action) {
    case 'poll': if (await executor.initialize()) { await executor.pollAndExecute(); } break;
    case 'continuous': await executor.startContinuousPolling(); break;
    // ... (other cases)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default JiraTaskExecutor;