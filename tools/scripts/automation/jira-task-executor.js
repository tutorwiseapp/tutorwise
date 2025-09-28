#!/usr/bin/env node

/**
 * Jira Task Executor
 * Polls Jira tickets and executes Claude Code tasks based on start time and description
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

// Configuration
const config = {
  jiraBaseUrl: process.env.JIRA_BASE_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraToken: process.env.JIRA_API_TOKEN,
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || 'TUTOR',

  // Custom field IDs
  customFields: {
    startTime: 'customfield_10092',
    endTime: 'customfield_10093'
  },

  // Polling settings
  pollInterval: 10 * 60 * 1000, // 10 minutes
  timeWindowMinutes: 24 * 60, // Check tasks within 24 hours (for testing)

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

class JiraTaskExecutor {
  constructor() {
    this.jiraApi = null;
    this.pollingActive = false;
    this.executedTasks = new Set(); // Track completed tasks
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async initialize() {
    try {
      if (!config.jiraBaseUrl || !config.jiraEmail || !config.jiraToken) {
        throw new Error('Missing Jira configuration');
      }

      this.jiraApi = axios.create({
        baseURL: `${config.jiraBaseUrl}/rest/api/2`,
        auth: {
          username: config.jiraEmail,
          password: config.jiraToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Test connection
      await this.jiraApi.get('/myself');
      this.log('✅ Jira authentication successful', 'green');
      return true;
    } catch (error) {
      this.log(`❌ Jira initialization failed: ${error.message}`, 'red');
      return false;
    }
  }

  async getScheduledTasks() {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - (config.timeWindowMinutes * 60 * 1000));
      const windowEnd = new Date(now.getTime() + (config.timeWindowMinutes * 60 * 1000));

      // JQL to find tickets with start time field set and Claude Code in summary
      const jql = `project = ${config.jiraProjectKey} AND "Start time" is not EMPTY AND status != Done AND (summary ~ "[Claude Code]" OR summary ~ "[Gemini CLI]")`;

      const response = await this.jiraApi.get('/search', {
        params: {
          jql: jql,
          fields: `summary,description,status,${config.customFields.startTime},${config.customFields.endTime}`,
          maxResults: 50
        }
      });

      return response.data.issues || [];
    } catch (error) {
      this.log(`❌ Failed to get scheduled tasks: ${error.message}`, 'red');
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

  extractAITool(summary) {
    if (summary.includes('[Claude Code]')) return 'Claude Code';
    if (summary.includes('[Gemini CLI]')) return 'Gemini CLI';
    return 'Unknown AI Tool';
  }

  extractExpectedResults(description) {
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


  async executeTask(ticket, task) {
    try {
      this.log(`🤖 Executing task for ${ticket.key}: ${task.type}`, 'cyan');

      switch (task.type) {
        case 'create_file':
          await this.executeFileCreation(ticket, task);
          break;
        case 'install_package':
          await this.executePackageInstallation(ticket, task);
          break;
        case 'run_command':
          await this.executeCommand(ticket, task);
          break;
        default:
          this.log(`⚠️ Unknown task type: ${task.type}`, 'yellow');
          return false;
      }

      // Mark task as executed
      this.executedTasks.add(ticket.key);

      // Add comment to ticket
      await this.addExecutionComment(ticket, task);

      this.log(`✅ Task completed for ${ticket.key}`, 'green');
      return true;

    } catch (error) {
      this.log(`❌ Task execution failed for ${ticket.key}: ${error.message}`, 'red');
      await this.addErrorComment(ticket, error);
      return false;
    }
  }

  async executeFileCreation(ticket, task) {
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
*Created by ${task.aiTool} from Jira ticket ${ticket.key}*
*Generated on: ${new Date().toLocaleString()}*
`;

    await fs.writeFile(fullFilePath, content, 'utf8');

    this.log(`✅ File created: ${task.filename}`, 'green');
  }

  async executePackageInstallation(ticket, task) {
    try {
      this.log(`📦 Installing package: ${task.packageName}`, 'blue');

      // Build the install command
      let command = `${task.packageManager} install ${task.packageName}`;
      if (task.options && task.options.length > 0) {
        command += ` ${task.options.join(' ')}`;
      }

      this.log(`💻 Running command: ${command}`, 'blue');

      // Execute the command (using require to avoid circular dependency issues)
      const { spawn } = require('child_process');

      return new Promise((resolve, reject) => {
        const process = spawn(task.packageManager, ['install', task.packageName, ...task.options], {
          stdio: 'pipe',
          cwd: config.rootDir
        });

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0) {
            this.log(`✅ Package installed successfully: ${task.packageName}`, 'green');
            resolve({ success: true, output });
          } else {
            this.log(`❌ Package installation failed: ${task.packageName}`, 'red');
            reject(new Error(`Installation failed with code ${code}: ${errorOutput}`));
          }
        });
      });

    } catch (error) {
      this.log(`❌ Failed to install package ${task.packageName}: ${error.message}`, 'red');
      throw error;
    }
  }

  async executeCommand(ticket, task) {
    try {
      this.log(`💻 Executing command: ${task.command}`, 'blue');

      const { spawn } = require('child_process');
      const workingDir = task.workingDirectory || config.rootDir;

      return new Promise((resolve, reject) => {
        // Parse command and arguments
        const parts = task.command.split(' ');
        const command = parts[0];
        const args = parts.slice(1);

        const process = spawn(command, args, {
          stdio: 'pipe',
          cwd: workingDir,
          shell: true
        });

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0) {
            this.log(`✅ Command executed successfully`, 'green');
            this.log(`📄 Output: ${output.substring(0, 200)}${output.length > 200 ? '...' : ''}`, 'blue');
            resolve({ success: true, output, exitCode: code });
          } else {
            this.log(`⚠️ Command completed with code ${code}`, 'yellow');
            this.log(`📄 Error: ${errorOutput.substring(0, 200)}${errorOutput.length > 200 ? '...' : ''}`, 'yellow');
            resolve({ success: false, output, errorOutput, exitCode: code });
          }
        });

        process.on('error', (error) => {
          this.log(`❌ Failed to execute command: ${error.message}`, 'red');
          reject(error);
        });
      });

    } catch (error) {
      this.log(`❌ Failed to execute command: ${error.message}`, 'red');
      throw error;
    }
  }

  formatTaskDetails(task) {
    switch (task.type) {
      case 'create_file':
        return `- Created file: ${task.filename}
- Directory: ${task.directory}
- Content: "${task.content}"`;

      case 'install_package':
        return `- Package: ${task.packageName}
- Package Manager: ${task.packageManager}
- Options: ${task.options.join(' ') || 'none'}`;

      case 'run_command':
        return `- Command: ${task.command}
- Working Directory: ${task.workingDirectory || 'project root'}`;

      default:
        return `- Raw task: ${task.rawTask}`;
    }
  }

  async addExecutionComment(ticket, task) {
    try {
      const aiToolEmoji = task.aiTool === 'Claude Code' ? '🤖' : task.aiTool === 'Gemini CLI' ? '🔷' : '🤖';

      const comment = {
        body: `${aiToolEmoji} **Task Executed by ${task.aiTool || 'Claude Code'}**

**Task Type:** ${task.type}
**Executed:** ${new Date().toLocaleString()}

**Details:**
${this.formatTaskDetails(task)}

${task.expectedResults ? `**Expected Results:** ${task.expectedResults}` : ''}

**Status:** ✅ Completed successfully`
      };

      await this.jiraApi.post(`/issue/${ticket.key}/comment`, comment);
      this.log(`💬 Added execution comment to ${ticket.key}`, 'blue');
    } catch (error) {
      this.log(`⚠️ Failed to add comment to ${ticket.key}: ${error.message}`, 'yellow');
    }
  }

  async addErrorComment(ticket, error) {
    try {
      const comment = {
        body: `🤖 **Task Execution Failed - Claude Code**

**Error:** ${error.message}
**Time:** ${new Date().toLocaleString()}

**Status:** ❌ Execution failed - manual intervention required`
      };

      await this.jiraApi.post(`/issue/${ticket.key}/comment`, comment);
    } catch (commentError) {
      this.log(`⚠️ Failed to add error comment: ${commentError.message}`, 'yellow');
    }
  }

  async pollAndExecute() {
    try {
      this.log('🔍 Polling for scheduled tasks...', 'blue');

      const tasks = await this.getScheduledTasks();

      if (tasks.length === 0) {
        this.log('📅 No scheduled tasks found in time window', 'blue');
        return;
      }

      this.log(`📋 Found ${tasks.length} potential task(s)`, 'magenta');

      for (const ticket of tasks) {
        // Skip if already executed
        if (this.executedTasks.has(ticket.key)) {
          this.log(`⏭️ Skipping already executed task: ${ticket.key}`, 'yellow');
          continue;
        }

        const startTime = ticket.fields[config.customFields.startTime];
        this.log(`🎫 Processing ${ticket.key}: ${ticket.fields.summary}`, 'cyan');
        this.log(`⏰ Start time: ${startTime}`, 'blue');

        // Parse task from description (AI tool is extracted during parsing)
        const task = this.parseTaskDescription(ticket.fields.description);

        if (!task) {
          this.log(`⚠️ No task found in ${ticket.key}`, 'yellow');
          continue;
        }

        this.log(`🤖 AI Tool: ${task.aiTool}`, 'magenta');

        // Add expected results to task
        task.expectedResults = this.extractExpectedResults(ticket.fields.description);

        this.log(`📝 Task detected: ${JSON.stringify(task, null, 2)}`, 'magenta');

        // Execute the task
        await this.executeTask(ticket, task);
      }

    } catch (error) {
      this.log(`❌ Polling failed: ${error.message}`, 'red');
    }
  }

  async startContinuousPolling() {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize Jira connection');
    }

    this.pollingActive = true;
    this.log(`⏰ Starting Jira task polling every ${config.pollInterval / 60000} minutes...`, 'green');

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
      this.log('🛑 Stopping Jira task polling...', 'yellow');
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

  const executor = new JiraTaskExecutor();

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
        const tasks = await executor.getScheduledTasks();
        console.log(`Found ${tasks.length} scheduled tasks`);
        tasks.forEach(task => {
          const startTime = task.fields[config.customFields.startTime];
          console.log(`• ${task.key}: ${task.fields.summary} - ${startTime}`);
        });
      }
      break;

    case 'help':
      console.log(`
Jira Task Executor

Usage: node jira-task-executor.js [action]

Actions:
  poll        One-time poll for scheduled tasks (default)
  continuous  Start continuous polling every 10 minutes
  test        Test connection and show scheduled tasks
  help        Show this help message

Environment Variables:
  JIRA_BASE_URL    Jira base URL
  JIRA_EMAIL       Jira user email
  JIRA_API_TOKEN   Jira API token
  JIRA_PROJECT_KEY Jira project key (default: TUTOR)

Professional Task Format in Ticket Description:
  Summary: [Claude Code] Brief description
  Description:
    Claude Code: Install the express package using npm.

    Results: The express package is installed and available for use.

Supported Task Types:
  • File Creation: Create "file.md" in docs/folder. Write content.
  • Package Install: Install the express package using npm.
  • Command Execution: Run the test command.

Custom Fields Used:
  Start time: ${config.customFields.startTime}
  End time: ${config.customFields.endTime}
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

module.exports = JiraTaskExecutor;