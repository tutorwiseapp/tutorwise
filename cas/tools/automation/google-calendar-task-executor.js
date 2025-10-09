#!/usr/bin/env node

/**
 * Calendar Task Executor
 * Polls Google Calendar events and executes Claude Code tasks directly
 */

const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

// Import task execution logic from Jira executor
const JiraTaskExecutor = require('./jira-task-executor');

// Configuration
const config = {
  serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json',
  calendarIds: process.env.GOOGLE_CALENDAR_IDS?.split(',') || ['primary'],

  // Polling settings
  pollInterval: 10 * 60 * 1000, // 10 minutes
  timeWindowMinutes: 15, // Check events within 15 minutes of start time

  // Execution settings
  rootDir: process.cwd()
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

class CalendarTaskExecutor {
  constructor() {
    this.auth = null;
    this.calendar = null;
    this.pollingActive = false;
    this.executedTasks = new Set(); // Track completed tasks
    this.taskExecutor = new JiraTaskExecutor(); // Reuse task execution logic
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async initialize() {
    try {
      // Check if service account file exists
      await fs.access(config.serviceAccountPath);

      // Load service account credentials
      const credentials = JSON.parse(await fs.readFile(config.serviceAccountPath, 'utf8'));

      // Create JWT auth client
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/calendar.readonly']
      );

      await this.auth.authorize();

      // Initialize Google Calendar API
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });

      this.log('✅ Google Calendar authentication successful', 'green');
      return true;

    } catch (error) {
      this.log(`❌ Calendar initialization failed: ${error.message}`, 'red');
      return false;
    }
  }

  async getScheduledEvents() {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - (config.timeWindowMinutes * 60 * 1000));
      const windowEnd = new Date(now.getTime() + (config.timeWindowMinutes * 60 * 1000));

      const events = [];

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

          if (response.data.items.length > 0) {
            events.push(...response.data.items.map(event => ({
              calendar: calendarId,
              id: event.id,
              summary: event.summary,
              description: event.description,
              start: event.start.dateTime || event.start.date,
              end: event.end.dateTime || event.end.date,
              location: event.location,
              uniqueId: `${calendarId}-${event.id}` // Unique identifier for tracking
            })));
          }
        } catch (error) {
          this.log(`⚠️ Failed to fetch events from calendar ${calendarId}: ${error.message}`, 'yellow');
        }
      }

      return events;
    } catch (error) {
      this.log(`❌ Failed to get scheduled events: ${error.message}`, 'red');
      return [];
    }
  }

  parseTaskDescription(description) {
    if (!description) return null;

    // Professional format: "Claude Code:" or "Gemini CLI:"
    const professionalPattern = /(Claude Code|Gemini CLI):\s*(.+?)(?:Results?:|$)/is;
    const match = description.match(professionalPattern);

    if (!match) return null;

    const aiTool = match[1];
    const taskText = match[2].trim();

    return this.parseTask(taskText, aiTool);
  }

  parseTask(taskText, aiTool) {
    this.log(`🔍 Parsing professional format task: "${taskText}"`, 'blue');

    // Determine task type based on keywords
    const taskType = this.determineTaskType(taskText);

    switch (taskType) {
      case 'create_file':
        return this.parseFileCreationTask(taskText, aiTool);
      case 'install_package':
        return this.parsePackageInstallTask(taskText, aiTool);
      case 'run_command':
        return this.parseCommandTask(taskText, aiTool);
      default:
        this.log(`⚠️ Unknown task type for: ${taskText}`, 'yellow');
        return {
          type: 'unknown',
          rawTask: taskText,
          aiTool: aiTool
        };
    }
  }

  determineTaskType(text) {
    const lowerText = text.toLowerCase();

    if ((lowerText.includes('create') || lowerText.includes('write')) &&
        (lowerText.includes('file') || lowerText.includes('.md') || lowerText.includes('.txt'))) {
      return 'create_file';
    }

    if (lowerText.includes('install') &&
        (lowerText.includes('package') || lowerText.includes('npm') || lowerText.includes('pip'))) {
      return 'install_package';
    }

    if (lowerText.includes('run') || lowerText.includes('execute')) {
      return 'run_command';
    }

    return 'unknown';
  }

  parseFileCreationTask(taskText, aiTool) {
    // Look for filename in quotes or explicit mentions
    const filenamePatterns = [
      /["']([^"']+\.(?:md|txt|js|py|html|css)["'])/i,
      /file\s+(?:named\s+)?["']?([^"'\s]+\.(?:md|txt|js|py|html|css))["']?/i,
      /create\s+["']?([^"'\s]+\.(?:md|txt|js|py|html|css))["']?/i
    ];

    // Look for directory/path
    const pathPatterns = [
      /(?:in|to|at)\s+(?:the\s+)?["']?([^"']+?)["']?\s+(?:folder|directory|dir)/i,
      /(?:in|to|at)\s+(?:the\s+)?(docs\/[^"'\s]+)/i,
      /(?:in|to|at)\s+(?:the\s+)?([^"'\s]+\/[^"'\s]*)/i
    ];

    // Look for content description
    const contentPatterns = [
      /write\s+(?:the\s+)?(?:content\s+)?["']?([^"']+?)["']?$/i,
      /content:\s*["']?([^"']+?)["']?$/i,
      /with\s+(?:the\s+)?(?:content\s+)?["']?([^"']+?)["']?$/i
    ];

    let filename = null;
    let directory = null;
    let content = null;

    // Extract filename
    for (const pattern of filenamePatterns) {
      const match = taskText.match(pattern);
      if (match) {
        filename = match[1].replace(/[""'']/g, '');
        break;
      }
    }

    // Extract directory
    for (const pattern of pathPatterns) {
      const match = taskText.match(pattern);
      if (match) {
        directory = match[1].trim();
        break;
      }
    }

    // Extract content
    for (const pattern of contentPatterns) {
      const match = taskText.match(pattern);
      if (match) {
        content = match[1].trim();
        break;
      }
    }

    if (!filename || !directory) {
      this.log(`⚠️ Could not parse file creation task: missing filename or directory`, 'yellow');
      return {
        type: 'unknown',
        rawTask: taskText,
        aiTool: aiTool
      };
    }

    this.log(`📋 Parsed file creation task: ${filename} in ${directory}`, 'green');
    return {
      type: 'create_file',
      filename: filename,
      directory: directory,
      content: content || 'File content placeholder',
      aiTool: aiTool
    };
  }

  parsePackageInstallTask(taskText, aiTool) {
    // Extract package name
    const packagePatterns = [
      /install\s+(?:the\s+)?(?:package\s+)?["']?([^"'\s]+)["']?/i,
      /package\s+["']?([^"'\s]+)["']?/i
    ];

    // Extract package manager
    const managerPatterns = [
      /using\s+(npm|yarn|pip|composer)/i,
      /with\s+(npm|yarn|pip|composer)/i,
      /(npm|yarn|pip|composer)\s+install/i
    ];

    let packageName = null;
    let packageManager = 'npm'; // default

    for (const pattern of packagePatterns) {
      const match = taskText.match(pattern);
      if (match) {
        packageName = match[1];
        break;
      }
    }

    for (const pattern of managerPatterns) {
      const match = taskText.match(pattern);
      if (match) {
        packageManager = match[1];
        break;
      }
    }

    if (!packageName) {
      this.log(`⚠️ Could not parse package install task: missing package name`, 'yellow');
      return {
        type: 'unknown',
        rawTask: taskText,
        aiTool: aiTool
      };
    }

    this.log(`📦 Parsed package install task: ${packageName} via ${packageManager}`, 'green');
    return {
      type: 'install_package',
      packageName: packageName,
      packageManager: packageManager,
      options: [],
      aiTool: aiTool
    };
  }

  parseCommandTask(taskText, aiTool) {
    // Extract command
    const commandPatterns = [
      /run\s+(?:the\s+)?["']?([^"']+?)["']?$/i,
      /execute\s+(?:the\s+)?["']?([^"']+?)["']?$/i,
      /command:\s*["']?([^"']+?)["']?$/i
    ];

    let command = null;

    for (const pattern of commandPatterns) {
      const match = taskText.match(pattern);
      if (match) {
        command = match[1].trim();
        break;
      }
    }

    if (!command) {
      this.log(`⚠️ Could not parse command task: missing command`, 'yellow');
      return {
        type: 'unknown',
        rawTask: taskText,
        aiTool: aiTool
      };
    }

    this.log(`⚡ Parsed command task: ${command}`, 'green');
    return {
      type: 'run_command',
      command: command,
      workingDirectory: null,
      aiTool: aiTool
    };
  }


  extractExpectedResults(description) {
    if (!description) return null;

    // Look for results/expectations section in description
    const resultsPatterns = [
      /Results?:\s*([^\n\r]+)/i,
      /Expected?\s+results?:\s*([^\n\r]+)/i,
      /Expectations?:\s*([^\n\r]+)/i,
      /Success\s+criteria:\s*([^\n\r]+)/i
    ];

    for (const pattern of resultsPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  async executeTask(event, task) {
    try {
      this.log(`🤖 Executing calendar task for "${event.summary}": ${task.type}`, 'cyan');

      switch (task.type) {
        case 'create_file':
          await this.executeFileCreation(event, task);
          break;
        case 'install_package':
          await this.executePackageInstall(event, task);
          break;
        case 'run_command':
          await this.executeCommand(event, task);
          break;
        default:
          this.log(`⚠️ Unknown task type: ${task.type}`, 'yellow');
          return false;
      }

      // Mark task as executed
      this.executedTasks.add(event.uniqueId);

      // Log execution (no calendar comment capability)
      await this.logExecution(event, task);

      this.log(`✅ Calendar task completed for "${event.summary}"`, 'green');
      return true;

    } catch (error) {
      this.log(`❌ Calendar task execution failed for "${event.summary}": ${error.message}`, 'red');
      await this.logError(event, error);
      return false;
    }
  }

  async executeFileCreation(event, task) {
    // Clean up directory path
    let dirPath = task.directory.replace(/[\/\\]+/g, '/');
    if (dirPath.startsWith('/')) dirPath = dirPath.substring(1);

    // Create full file path
    const fullDir = path.join(config.rootDir, dirPath);
    const fullFilePath = path.join(fullDir, task.filename);

    this.log(`📁 Creating directory: ${fullDir}`, 'blue');

    // Create directory if it doesn't exist
    await fs.mkdir(fullDir, { recursive: true });

    this.log(`📝 Creating file: ${fullFilePath}`, 'blue');

    // Create file with content
    const content = `# ${task.filename.replace(/\.(md|txt)$/, '')}

${task.content}

---
*Created by ${task.aiTool} from Calendar event: "${event.summary}"*
*Calendar: ${event.calendar}*
*Generated on: ${new Date().toLocaleString()}*
`;

    await fs.writeFile(fullFilePath, content, 'utf8');

    this.log(`✅ File created: ${task.filename}`, 'green');
  }

  async executePackageInstall(event, task) {
    const { spawn } = require('child_process');

    this.log(`📦 Installing package: ${task.packageName}`, 'blue');

    const installCommand = `${task.packageManager} install ${task.packageName}`;
    const commandArgs = ['install', task.packageName];

    if (task.options && task.options.length > 0) {
      commandArgs.push(...task.options);
    }

    return new Promise((resolve, reject) => {
      const childProcess = spawn(task.packageManager, commandArgs, {
        cwd: config.rootDir,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          this.log(`✅ Package installed successfully: ${task.packageName}`, 'green');
          task.output = output;
          resolve();
        } else {
          this.log(`❌ Package installation failed: ${task.packageName}`, 'red');
          reject(new Error(`Package installation failed with code ${code}: ${errorOutput}`));
        }
      });

      childProcess.on('error', (error) => {
        this.log(`❌ Package installation error: ${error.message}`, 'red');
        reject(error);
      });
    });
  }

  async executeCommand(event, task) {
    const { spawn } = require('child_process');

    this.log(`⚡ Executing command: ${task.command}`, 'blue');

    const workingDir = task.workingDirectory || config.rootDir;

    return new Promise((resolve, reject) => {
      const childProcess = spawn('sh', ['-c', task.command], {
        cwd: workingDir,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          this.log(`✅ Command executed successfully: ${task.command}`, 'green');
          task.output = output;
          resolve();
        } else {
          this.log(`❌ Command execution failed: ${task.command}`, 'red');
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });

      childProcess.on('error', (error) => {
        this.log(`❌ Command execution error: ${error.message}`, 'red');
        reject(error);
      });
    });
  }

  async logExecution(event, task) {
    try {
      const aiToolEmoji = task.aiTool === 'Claude Code' ? '🤖' : task.aiTool === 'Gemini CLI' ? '🔷' : '🤖';

      const logEntry = `${aiToolEmoji} **Calendar Task Executed by ${task.aiTool || 'Claude Code'}**

**Event:** ${event.summary}
**Calendar:** ${event.calendar}
**Start Time:** ${new Date(event.start).toLocaleString()}
**Task Type:** ${task.type}
**Executed:** ${new Date().toLocaleString()}

**Details:**
${this.formatTaskDetails(task)}

${task.expectedResults ? `**Expected Results:** ${task.expectedResults}` : ''}

**Status:** ✅ Completed successfully
`;

      // Write to execution log file
      const logPath = path.join(config.rootDir, 'logs', 'calendar-task-execution.log');
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, `${new Date().toISOString()} - ${logEntry}\n\n`, 'utf8');

      this.log(`📝 Logged execution to logs/calendar-task-execution.log`, 'blue');
    } catch (error) {
      this.log(`⚠️ Failed to log execution: ${error.message}`, 'yellow');
    }
  }

  formatTaskDetails(task) {
    switch (task.type) {
      case 'create_file':
        return `- Created file: ${task.filename}\n- Directory: ${task.directory}\n- Content: "${task.content}"`;
      case 'install_package':
        return `- Package: ${task.packageName}\n- Package Manager: ${task.packageManager}\n- Options: ${task.options?.join(' ') || 'none'}`;
      case 'run_command':
        return `- Command: ${task.command}\n- Working Directory: ${task.workingDirectory || 'project root'}`;
      default:
        return `- Raw task: ${task.rawTask}`;
    }
  }

  async logError(event, error) {
    try {
      const logEntry = `🤖 **Calendar Task Execution Failed - Claude Code**

**Event:** ${event.summary}
**Calendar:** ${event.calendar}
**Error:** ${error.message}
**Time:** ${new Date().toLocaleString()}

**Status:** ❌ Execution failed
`;

      const logPath = path.join(config.rootDir, 'logs', 'calendar-task-execution.log');
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, `${new Date().toISOString()} - ${logEntry}\n\n`, 'utf8');
    } catch (logError) {
      this.log(`⚠️ Failed to log error: ${logError.message}`, 'yellow');
    }
  }

  async pollAndExecute() {
    try {
      this.log('🔍 Polling calendar for scheduled tasks...', 'blue');

      const events = await this.getScheduledEvents();

      if (events.length === 0) {
        this.log('📅 No scheduled calendar events found in time window', 'blue');
        return;
      }

      this.log(`📋 Found ${events.length} potential calendar event(s)`, 'magenta');

      for (const event of events) {
        // Skip if already executed
        if (this.executedTasks.has(event.uniqueId)) {
          this.log(`⏭️ Skipping already executed calendar task: ${event.summary}`, 'yellow');
          continue;
        }

        this.log(`🎫 Processing calendar event: "${event.summary}"`, 'cyan');
        this.log(`⏰ Start time: ${new Date(event.start).toLocaleString()}`, 'blue');

        // Parse task from description (AI tool is extracted during parsing)
        const task = this.parseTaskDescription(event.description);

        if (!task) {
          this.log(`⚠️ No task found in calendar event: "${event.summary}"`, 'yellow');
          continue;
        }

        this.log(`🤖 AI Tool: ${task.aiTool}`, 'magenta');

        // Add expected results to task
        task.expectedResults = this.extractExpectedResults(event.description);

        this.log(`📝 Calendar task detected: ${JSON.stringify(task, null, 2)}`, 'magenta');

        // Execute the task
        await this.executeTask(event, task);
      }

    } catch (error) {
      this.log(`❌ Calendar polling failed: ${error.message}`, 'red');
    }
  }

  async startContinuousPolling() {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize Google Calendar connection');
    }

    this.pollingActive = true;
    this.log(`⏰ Starting calendar task polling every ${config.pollInterval / 60000} minutes...`, 'green');

    // Initial poll
    await this.pollAndExecute();

    // Set up interval
    const intervalId = setInterval(async () => {
      if (!this.pollingActive) {
        clearInterval(intervalId);
        return;
      }
      await this.pollAndExecute();
    }, config.pollInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('🛑 Stopping calendar task polling...', 'yellow');
      this.pollingActive = false;
      clearInterval(intervalId);
      process.exit(0);
    });

    // Keep process alive
    return new Promise(() => {}); // Never resolves, keeps running
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'poll';

  const executor = new CalendarTaskExecutor();

  switch (action) {
    case 'poll':
      if (await executor.initialize()) {
        await executor.pollAndExecute();
      }
      break;

    case 'continuous':
      await executor.startContinuousPolling();
      break;

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
Calendar Task Executor

Usage: node calendar-task-executor.js [action]

Actions:
  poll        One-time poll for scheduled tasks (default)
  continuous  Start continuous polling every 10 minutes
  test        Test connection and show scheduled events
  help        Show this help message

Environment Variables:
  GOOGLE_SERVICE_ACCOUNT_PATH  Path to service account JSON file
  GOOGLE_CALENDAR_IDS          Comma-separated calendar IDs (default: primary)

Professional Task Format in Calendar Event Description:
  Summary: [Claude Code] Brief description
  Description:
    Claude Code: Install the express package using npm.

    Results: The express package is installed and available for use.

Supported Task Types:
  • File Creation: Create "file.md" in docs/folder. Write content.
  • Package Install: Install the express package using npm.
  • Command Execution: Run the test command.

Execution Log:
  logs/calendar-task-execution.log
      `);
      break;

    default:
      console.log(`Unknown action: ${action}. Use 'help' for usage information.`);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CalendarTaskExecutor;