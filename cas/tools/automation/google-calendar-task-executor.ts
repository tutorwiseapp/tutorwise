#!/usr/bin/env node

/**
 * Calendar Task Executor
 * Polls Google Calendar events and executes Claude Code tasks directly
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

// Assuming JiraTaskExecutor might be converted later, for now we can do this:
// import JiraTaskExecutor from './jira-task-executor';
const JiraTaskExecutor = require('./jira-task-executor');


// --- Interfaces ---

interface Config {
  serviceAccountPath: string;
  calendarIds: string[];
  pollInterval: number;
  timeWindowMinutes: number;
  rootDir: string;
}

interface CalendarEvent {
  calendar: string;
  id: string;
  summary: string;
  description?: string | null;
  start: string;
  end: string;
  location?: string | null;
  uniqueId: string;
}

type TaskType = 'create_file' | 'install_package' | 'run_command' | 'unknown';

interface BaseTask {
  type: TaskType;
  rawTask?: string;
  aiTool: string;
  expectedResults?: string | null;
  output?: string;
}

interface FileCreationTask extends BaseTask {
  type: 'create_file';
  filename: string;
  directory: string;
  content: string;
}

interface PackageInstallTask extends BaseTask {
  type: 'install_package';
  packageName: string;
  packageManager: string;
  options: string[];
}

interface CommandTask extends BaseTask {
  type: 'run_command';
  command: string;
  workingDirectory: string | null;
}

type Task = FileCreationTask | PackageInstallTask | CommandTask | (BaseTask & { type: 'unknown' });


// --- Configuration ---

const config: Config = {
  serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json',
  calendarIds: process.env.GOOGLE_CALENDAR_IDS?.split(',') || ['primary'],
  pollInterval: 10 * 60 * 1000, // 10 minutes
  timeWindowMinutes: 15,
  rootDir: process.cwd()
};

const colors = {
  red: '\x1b[31m', green: '\x1b[32m', blue: '\x1b[34m',
  yellow: '\x1b[33m', magenta: '\x1b[35m', cyan: '\x1b[36m', reset: '\x1b[0m'
};

class CalendarTaskExecutor {
  private auth: JWT | null = null;
  private calendar: calendar_v3.Calendar | null = null;
  private pollingActive = false;
  private executedTasks = new Set<string>();
  private taskExecutor: any; // Type for JiraTaskExecutor if converted

  constructor() {
    this.taskExecutor = new JiraTaskExecutor();
  }

  log(message: string, color: keyof typeof colors = 'reset'): void {
    const timestamp = new Date().toLocaleString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async initialize(): Promise<boolean> {
    try {
      await fs.access(config.serviceAccountPath);
      const credentials = JSON.parse(await fs.readFile(config.serviceAccountPath, 'utf8'));
      this.auth = new google.auth.JWT(
        credentials.client_email,
        undefined,
        credentials.private_key,
        ['https://www.googleapis.com/auth/calendar.readonly']
      );
      await this.auth.authorize();
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      this.log('✅ Google Calendar authentication successful', 'green');
      return true;
    } catch (error: any) {
      this.log(`❌ Calendar initialization failed: ${error.message}`, 'red');
      return false;
    }
  }

  async getScheduledEvents(): Promise<CalendarEvent[]> {
    if (!this.calendar) return [];
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - (config.timeWindowMinutes * 60 * 1000));
      const windowEnd = new Date(now.getTime() + (config.timeWindowMinutes * 60 * 1000));
      const events: CalendarEvent[] = [];

      for (const calendarId of config.calendarIds) {
        try {
          const response = await this.calendar.events.list({
            calendarId: calendarId.trim(),
            timeMin: windowStart.toISOString(),
            timeMax: windowEnd.toISOString(),
            maxResults: 20,
            singleEvents: true,
            orderBy: 'startTime'
          });
          if (response.data.items) {
            events.push(...response.data.items.map(event => ({
              calendar: calendarId,
              id: event.id!,
              summary: event.summary!,
              description: event.description,
              start: (event.start?.dateTime || event.start?.date)!,
              end: (event.end?.dateTime || event.end?.date)!,
              location: event.location,
              uniqueId: `${calendarId}-${event.id}`
            })));
          }
        } catch (error: any) {
          this.log(`⚠️ Failed to fetch events from calendar ${calendarId}: ${error.message}`, 'yellow');
        }
      }
      return events;
    } catch (error: any) {
      this.log(`❌ Failed to get scheduled events: ${error.message}`, 'red');
      return [];
    }
  }

  parseTaskDescription(description: string | null | undefined): Task | null {
    if (!description) return null;
    const professionalPattern = /(Claude Code|Gemini CLI):\s*(.+?)(?:Results?:|$)/is;
    const match = description.match(professionalPattern);
    if (!match) return null;
    const aiTool = match[1];
    const taskText = match[2].trim();
    return this.parseTask(taskText, aiTool);
  }

  parseTask(taskText: string, aiTool: string): Task {
    this.log(`🔍 Parsing professional format task: "${taskText}"`, 'blue');
    const taskType = this.determineTaskType(taskText);
    switch (taskType) {
      case 'create_file': return this.parseFileCreationTask(taskText, aiTool);
      case 'install_package': return this.parsePackageInstallTask(taskText, aiTool);
      case 'run_command': return this.parseCommandTask(taskText, aiTool);
      default:
        this.log(`⚠️ Unknown task type for: ${taskText}`, 'yellow');
        return { type: 'unknown', rawTask: taskText, aiTool };
    }
  }

  determineTaskType(text: string): TaskType {
    const lowerText = text.toLowerCase();
    if ((lowerText.includes('create') || lowerText.includes('write')) && (lowerText.includes('file') || lowerText.includes('.md') || lowerText.includes('.txt'))) return 'create_file';
    if (lowerText.includes('install') && (lowerText.includes('package') || lowerText.includes('npm') || lowerText.includes('pip'))) return 'install_package';
    if (lowerText.includes('run') || lowerText.includes('execute')) return 'run_command';
    return 'unknown';
  }

  parseFileCreationTask(taskText: string, aiTool: string): Task {
    const filenamePatterns = [/["']([^"']+\.(?:md|txt|js|py|html|css)["'])/i, /file\s+(?:named\s+)?["']?([^"'\s]+\.(?:md|txt|js|py|html|css))["']?/i, /create\s+["']?([^"'\s]+\.(?:md|txt|js|py|html|css))["']?/i];
    const pathPatterns = [/(?:in|to|at)\s+(?:the\s+)?["']?([^"']+?)["']?\s+(?:folder|directory|dir)/i, /(?:in|to|at)\s+(?:the\s+)?(docs\/[^"'\s]+)/i, /(?:in|to|at)\s+(?:the\s+)?([^"'\s]+\/[^"'\s]*)/i];
    const contentPatterns = [/write\s+(?:the\s+)?(?:content\s+)?["']?([^"']+?)["']?$/i, /content:\s*["']?([^"']+?)["']?$/i, /with\s+(?:the\s+)?(?:content\s+)?["']?([^"']+?)["']?$/i];
    let filename: string | null = null, directory: string | null = null, content: string | null = null;
    for (const p of filenamePatterns) { const m = taskText.match(p); if (m) { filename = m[1].replace(/[""']/g, ''); break; } }
    for (const p of pathPatterns) { const m = taskText.match(p); if (m) { directory = m[1].trim(); break; } }
    for (const p of contentPatterns) { const m = taskText.match(p); if (m) { content = m[1].trim(); break; } }
    if (!filename || !directory) {
      this.log(`⚠️ Could not parse file creation task: missing filename or directory`, 'yellow');
      return { type: 'unknown', rawTask: taskText, aiTool };
    }
    this.log(`📋 Parsed file creation task: ${filename} in ${directory}`, 'green');
    return { type: 'create_file', filename, directory, content: content || 'File content placeholder', aiTool };
  }

  parsePackageInstallTask(taskText: string, aiTool: string): Task {
    const packagePatterns = [/install\s+(?:the\s+)?(?:package\s+)?["']?([^"'\s]+)["']?/i, /package\s+["']?([^"'\s]+)["']?/i];
    const managerPatterns = [/using\s+(npm|yarn|pip|composer)/i, /with\s+(npm|yarn|pip|composer)/i, /(npm|yarn|pip|composer)\s+install/i];
    let packageName: string | null = null, packageManager = 'npm';
    for (const p of packagePatterns) { const m = taskText.match(p); if (m) { packageName = m[1]; break; } }
    for (const p of managerPatterns) { const m = taskText.match(p); if (m) { packageManager = m[1]; break; } }
    if (!packageName) {
      this.log(`⚠️ Could not parse package install task: missing package name`, 'yellow');
      return { type: 'unknown', rawTask: taskText, aiTool };
    }
    this.log(`📦 Parsed package install task: ${packageName} via ${packageManager}`, 'green');
    return { type: 'install_package', packageName, packageManager, options: [], aiTool };
  }

  parseCommandTask(taskText: string, aiTool: string): Task {
    const commandPatterns = [/run\s+(?:the\s+)?["']?([^"']+?)["']?$/i, /execute\s+(?:the\s+)?["']?([^"']+?)["']?$/i, /command:\s*["']?([^"']+?)["']?$/i];
    let command: string | null = null;
    for (const p of commandPatterns) { const m = taskText.match(p); if (m) { command = m[1].trim(); break; } }
    if (!command) {
      this.log(`⚠️ Could not parse command task: missing command`, 'yellow');
      return { type: 'unknown', rawTask: taskText, aiTool };
    }
    this.log(`⚡ Parsed command task: ${command}`, 'green');
    return { type: 'run_command', command, workingDirectory: null, aiTool };
  }

  extractExpectedResults(description: string | null | undefined): string | null {
    if (!description) return null;
    const resultsPatterns = [/Results?:\s*([^\n\r]+)/i, /Expected?\s+results?:\s*([^\n\r]+)/i, /Expectations?:\s*([^\n\r]+)/i, /Success\s+criteria:\s*([^\n\r]+)/i];
    for (const p of resultsPatterns) { const m = description.match(p); if (m && m[1]) return m[1].trim(); }
    return null;
  }

  async executeTask(event: CalendarEvent, task: Task): Promise<boolean> {
    try {
      this.log(`🤖 Executing calendar task for "${event.summary}": ${task.type}`, 'cyan');
      switch (task.type) {
        case 'create_file': await this.executeFileCreation(event, task); break;
        case 'install_package': await this.executePackageInstall(event, task); break;
        case 'run_command': await this.executeCommand(event, task); break;
        default: this.log(`⚠️ Unknown task type: ${task.type}`, 'yellow'); return false;
      }
      this.executedTasks.add(event.uniqueId);
      await this.logExecution(event, task);
      this.log(`✅ Calendar task completed for "${event.summary}"`, 'green');
      return true;
    } catch (error: any) {
      this.log(`❌ Calendar task execution failed for "${event.summary}": ${error.message}`, 'red');
      await this.logError(event, error);
      return false;
    }
  }

  async executeFileCreation(event: CalendarEvent, task: FileCreationTask): Promise<void> {
    let dirPath = task.directory.replace(/[\/\\]+/g, '/');
    if (dirPath.startsWith('/')) dirPath = dirPath.substring(1);
    const fullDir = path.join(config.rootDir, dirPath);
    const fullFilePath = path.join(fullDir, task.filename);
    this.log(`📁 Creating directory: ${fullDir}`, 'blue');
    await fs.mkdir(fullDir, { recursive: true });
    this.log(`📝 Creating file: ${fullFilePath}`, 'blue');
    const content = `# ${task.filename.replace(/\.(md|txt)$/, '')}\n\n${task.content}\n\n---\n*Created by ${task.aiTool} from Calendar event: "${event.summary}"*\n*Calendar: ${event.calendar}*\n*Generated on: ${new Date().toLocaleString()}*\n`;
    await fs.writeFile(fullFilePath, content, 'utf8');
    this.log(`✅ File created: ${task.filename}`, 'green');
  }

  async executePackageInstall(event: CalendarEvent, task: PackageInstallTask): Promise<void> {
    this.log(`📦 Installing package: ${task.packageName}`, 'blue');
    const commandArgs = ['install', task.packageName, ...task.options];
    return new Promise((resolve, reject) => {
      const child = spawn(task.packageManager, commandArgs, { cwd: config.rootDir, stdio: 'pipe' });
      let output = '', errorOutput = '';
      child.stdout.on('data', data => output += data.toString());
      child.stderr.on('data', data => errorOutput += data.toString());
      child.on('close', code => {
        if (code === 0) {
          this.log(`✅ Package installed successfully: ${task.packageName}`, 'green');
          task.output = output;
          resolve();
        } else {
          this.log(`❌ Package installation failed: ${task.packageName}`, 'red');
          reject(new Error(`Package installation failed with code ${code}: ${errorOutput}`));
        }
      });
      child.on('error', err => { this.log(`❌ Package installation error: ${err.message}`, 'red'); reject(err); });
    });
  }

  async executeCommand(event: CalendarEvent, task: CommandTask): Promise<void> {
    this.log(`⚡ Executing command: ${task.command}`, 'blue');
    const workingDir = task.workingDirectory || config.rootDir;
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', task.command], { cwd: workingDir, stdio: 'pipe' });
      let output = '', errorOutput = '';
      child.stdout.on('data', data => output += data.toString());
      child.stderr.on('data', data => errorOutput += data.toString());
      child.on('close', code => {
        if (code === 0) {
          this.log(`✅ Command executed successfully: ${task.command}`, 'green');
          task.output = output;
          resolve();
        } else {
          this.log(`❌ Command execution failed: ${task.command}`, 'red');
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });
      child.on('error', err => { this.log(`❌ Command execution error: ${err.message}`, 'red'); reject(err); });
    });
  }

  async logExecution(event: CalendarEvent, task: Task): Promise<void> {
    try {
      const aiToolEmoji = task.aiTool === 'Claude Code' ? '🤖' : task.aiTool === 'Gemini CLI' ? '🔷' : '🤖';
      const logEntry = `${aiToolEmoji} **Calendar Task Executed by ${task.aiTool || 'Claude Code'}**\n\n**Event:** ${event.summary}\n**Calendar:** ${event.calendar}\n**Start Time:** ${new Date(event.start).toLocaleString()}\n**Task Type:** ${task.type}\n**Executed:** ${new Date().toLocaleString()}\n\n**Details:**\n${this.formatTaskDetails(task)}\n\n${task.expectedResults ? `**Expected Results:** ${task.expectedResults}` : ''}\n\n**Status:** ✅ Completed successfully\n`;
      const logPath = path.join(config.rootDir, 'logs', 'calendar-task-execution.log');
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, `${new Date().toISOString()} - ${logEntry}\n\n`, 'utf8');
      this.log(`📝 Logged execution to logs/calendar-task-execution.log`, 'blue');
    } catch (error: any) {
      this.log(`⚠️ Failed to log execution: ${error.message}`, 'yellow');
    }
  }

  formatTaskDetails(task: Task): string {
    switch (task.type) {
      case 'create_file': return `- Created file: ${task.filename}\n- Directory: ${task.directory}\n- Content: "${task.content}"`;
      case 'install_package': return `- Package: ${task.packageName}\n- Package Manager: ${task.packageManager}\n- Options: ${task.options?.join(' ') || 'none'}`;
      case 'run_command': return `- Command: ${task.command}\n- Working Directory: ${task.workingDirectory || 'project root'}`;
      default: return `- Raw task: ${task.rawTask}`;
    }
  }

  async logError(event: CalendarEvent, error: Error): Promise<void> {
    try {
      const logEntry = `🤖 **Calendar Task Execution Failed - Claude Code**\n\n**Event:** ${event.summary}\n**Calendar:** ${event.calendar}\n**Error:** ${error.message}\n**Time:** ${new Date().toLocaleString()}\n\n**Status:** ❌ Execution failed\n`;
      const logPath = path.join(config.rootDir, 'logs', 'calendar-task-execution.log');
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, `${new Date().toISOString()} - ${logEntry}\n\n`, 'utf8');
    } catch (logError: any) {
      this.log(`⚠️ Failed to log error: ${logError.message}`, 'yellow');
    }
  }

  async pollAndExecute(): Promise<void> {
    try {
      this.log('🔍 Polling calendar for scheduled tasks...', 'blue');
      const events = await this.getScheduledEvents();
      if (events.length === 0) {
        this.log('📅 No scheduled calendar events found in time window', 'blue');
        return;
      }
      this.log(`📋 Found ${events.length} potential calendar event(s)`, 'magenta');
      for (const event of events) {
        if (this.executedTasks.has(event.uniqueId)) {
          this.log(`⏭️ Skipping already executed calendar task: ${event.summary}`, 'yellow');
          continue;
        }
        this.log(`🎫 Processing calendar event: "${event.summary}"`, 'cyan');
        this.log(`⏰ Start time: ${new Date(event.start).toLocaleString()}`, 'blue');
        const task = this.parseTaskDescription(event.description);
        if (!task) {
          this.log(`⚠️ No task found in calendar event: "${event.summary}"`, 'yellow');
          continue;
        }
        this.log(`🤖 AI Tool: ${task.aiTool}`, 'magenta');
        task.expectedResults = this.extractExpectedResults(event.description);
        this.log(`📝 Calendar task detected: ${JSON.stringify(task, null, 2)}`, 'magenta');
        await this.executeTask(event, task);
      }
    } catch (error: any) {
      this.log(`❌ Calendar polling failed: ${error.message}`, 'red');
    }
  }

  async startContinuousPolling(): Promise<void> {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize Google Calendar connection');
    }
    this.pollingActive = true;
    this.log(`⏰ Starting calendar task polling every ${config.pollInterval / 60000} minutes...`, 'green');
    await this.pollAndExecute();
    const intervalId = setInterval(async () => {
      if (!this.pollingActive) {
        clearInterval(intervalId);
        return;
      }
      await this.pollAndExecute();
    }, config.pollInterval);
    process.on('SIGINT', () => {
      this.log('🛑 Stopping calendar task polling...', 'yellow');
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
  const executor = new CalendarTaskExecutor();

  switch (action) {
    case 'poll': if (await executor.initialize()) { await executor.pollAndExecute(); } break;
    case 'continuous': await executor.startContinuousPolling(); break;
    case 'test':
      if (await executor.initialize()) {
        const events = await executor.getScheduledEvents();
        console.log(`Found ${events.length} scheduled calendar events`);
        events.forEach(event => {
          const startTime = new Date(event.start).toLocaleString();
          console.log(`• ${event.summary} - ${startTime}`);
          if (event.description && (event.description.includes('Claude Code:') || event.description.includes('Gemini CLI:'))) {
            console.log(`  📝 Task detected in description`);
          }
        });
      }
      break;
    case 'help':
      console.log(`
Calendar Task Executor...
      `);
      break;
    default:
      console.log(`Unknown action: ${action}. Use 'help' for usage information.`);
      process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default CalendarTaskExecutor;