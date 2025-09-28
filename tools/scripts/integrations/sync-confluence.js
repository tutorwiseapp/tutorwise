#!/usr/bin/env node

/**
 * Confluence Documentation Sync
 * Syncs markdown files from docs/ folder to Confluence spaces
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

// Configuration from environment variables
const config = {
  baseUrl: process.env.JIRA_BASE_URL, // Using same base URL for Confluence
  email: process.env.JIRA_EMAIL,
  token: process.env.JIRA_API_TOKEN,
  spaceKey: process.env.CONFLUENCE_SPACE_KEY || 'TUTORWISE',
  docsPath: path.join(__dirname, '../../docs'),

  // Jira integration for linking docs to tickets
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || 'TUTOR',
  customFields: {
    startTime: 'customfield_10092',
    endTime: 'customfield_10093'
  }
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

class ConfluenceSync {
  constructor() {
    this.api = axios.create({
      baseURL: `${config.baseUrl}/wiki/rest/api`,
      auth: {
        username: config.email,
        password: config.token
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Jira API for creating tickets
    this.jiraApi = axios.create({
      baseURL: `${config.baseUrl}/rest/api/2`,
      auth: {
        username: config.email,
        password: config.token
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async validateConfig() {
    if (!config.baseUrl || !config.email || !config.token) {
      throw new Error('Missing required environment variables: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    }
  }

  async testConnection() {
    try {
      const response = await this.api.get('/space');
      this.log('✅ Confluence connection successful', 'green');
      return true;
    } catch (error) {
      this.log(`❌ Confluence connection failed: ${error.message}`, 'red');
      return false;
    }
  }

  async ensureSpace() {
    try {
      const response = await this.api.get(`/space/${config.spaceKey}`);
      this.log(`✅ Space '${config.spaceKey}' exists`, 'green');
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        this.log(`📁 Creating space '${config.spaceKey}'...`, 'yellow');
        return await this.createSpace();
      }
      throw error;
    }
  }

  async createSpace() {
    const spaceData = {
      key: config.spaceKey,
      name: 'Tutorwise Documentation',
      description: {
        plain: {
          value: 'Comprehensive documentation for the Tutorwise educational platform',
          representation: 'plain'
        }
      },
      type: 'global'
    };

    try {
      const response = await this.api.post('/space', spaceData);
      this.log(`✅ Created space '${config.spaceKey}'`, 'green');
      return response.data;
    } catch (error) {
      this.log(`❌ Failed to create space: ${error.message}`, 'red');
      throw error;
    }
  }

  async getPageByTitle(title, spaceKey = config.spaceKey) {
    try {
      const response = await this.api.get('/content', {
        params: {
          title: title,
          spaceKey: spaceKey,
          type: 'page',
          expand: 'version'
        }
      });
      return response.data.results[0] || null;
    } catch (error) {
      return null;
    }
  }

  markdownToConfluenceStorage(markdown) {
    // Basic markdown to Confluence storage format conversion
    let storage = markdown;

    // Headers
    storage = storage.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    storage = storage.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    storage = storage.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    storage = storage.replace(/^#### (.*$)/gm, '<h4>$1</h4>');

    // Bold and italic
    storage = storage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    storage = storage.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks
    storage = storage.replace(/```(\w+)?\n([\s\S]*?)```/g, '<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">$1</ac:parameter><ac:plain-text-body><![CDATA[$2]]></ac:plain-text-body></ac:structured-macro>');

    // Inline code
    storage = storage.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Lists
    storage = storage.replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>');
    storage = storage.replace(/^\d+\. (.*$)/gm, '<ol><li>$1</li></ol>');

    // Fix nested lists
    storage = storage.replace(/<\/ul>\n<ul>/g, '');
    storage = storage.replace(/<\/ol>\n<ol>/g, '');

    // Links
    storage = storage.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Line breaks
    storage = storage.replace(/\n/g, '<br/>');

    return storage;
  }

  async createOrUpdatePage(title, content, parentId = null) {
    const existingPage = await this.getPageByTitle(title);
    const storage = this.markdownToConfluenceStorage(content);

    const pageData = {
      type: 'page',
      title: title,
      space: { key: config.spaceKey },
      body: {
        storage: {
          value: storage,
          representation: 'storage'
        }
      }
    };

    if (parentId) {
      pageData.ancestors = [{ id: parentId }];
    }

    try {
      let page;
      if (existingPage) {
        // Update existing page
        pageData.id = existingPage.id;
        pageData.version = {
          number: existingPage.version.number + 1
        };

        const response = await this.api.put(`/content/${existingPage.id}`, pageData);
        this.log(`📝 Updated page: ${title}`, 'blue');
        page = response.data;
      } else {
        // Create new page
        const response = await this.api.post('/content', pageData);
        this.log(`📄 Created page: ${title}`, 'green');
        page = response.data;

        // Create Jira ticket for new documentation
        await this.createDocumentationTicket(title, content, page);
      }

      return page;
    } catch (error) {
      this.log(`❌ Failed to create/update page '${title}': ${error.message}`, 'red');
      throw error;
    }
  }

  async createDocumentationTicket(title, content, page) {
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours later

      const ticketData = {
        fields: {
          project: { key: config.jiraProjectKey },
          summary: `[DOC] Review and validate: ${title}`,
          description: `🤖 **Created by:** Claude Code

New documentation page created in Confluence:

**Page:** ${title}
**Space:** ${config.spaceKey}
**URL:** ${config.baseUrl}/wiki/display/${config.spaceKey}/${encodeURIComponent(title)}

**Content Preview:**
${content.substring(0, 500)}${content.length > 500 ? '...' : ''}

**Tasks:**
- [ ] Review content for accuracy
- [ ] Validate formatting and links
- [ ] Ensure compliance with documentation standards
- [ ] Mark as complete when validated`,
          issuetype: { name: 'Task' },
          priority: { name: 'Medium' },
          labels: ['ai-generated', 'claude-code', 'documentation', 'auto-sync'],

          // Custom fields
          [config.customFields.startTime]: now.toISOString(),
          [config.customFields.endTime]: endTime.toISOString()
        }
      };

      const response = await this.jiraApi.post('/issue', ticketData);

      this.log(`🎫 Created Jira ticket ${response.data.key} for documentation review`, 'cyan');

      return response.data.key;
    } catch (error) {
      this.log(`⚠️ Failed to create Jira ticket for ${title}: ${error.message}`, 'yellow');
      // Don't throw - documentation sync should continue even if ticket creation fails
    }
  }

  async syncFile(filePath, parentId = null) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath, '.md');
      const title = fileName === 'README' ? path.basename(path.dirname(filePath)) : fileName;

      return await this.createOrUpdatePage(title, content, parentId);
    } catch (error) {
      this.log(`❌ Failed to sync file ${filePath}: ${error.message}`, 'red');
      throw error;
    }
  }

  async syncDirectory(dirPath, parentId = null) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const readmeFile = items.find(item => item.name === 'README.md');

      let currentParentId = parentId;

      // Sync README first (becomes the parent page)
      if (readmeFile) {
        const readmePath = path.join(dirPath, readmeFile.name);
        const page = await this.syncFile(readmePath, parentId);
        currentParentId = page.id;
      }

      // Sync other markdown files
      for (const item of items) {
        if (item.isFile() && item.name.endsWith('.md') && item.name !== 'README.md') {
          const filePath = path.join(dirPath, item.name);
          await this.syncFile(filePath, currentParentId);
        }
      }

      // Sync subdirectories
      for (const item of items) {
        if (item.isDirectory()) {
          const subDirPath = path.join(dirPath, item.name);
          await this.syncDirectory(subDirPath, currentParentId);
        }
      }

    } catch (error) {
      this.log(`❌ Failed to sync directory ${dirPath}: ${error.message}`, 'red');
      throw error;
    }
  }

  async sync() {
    try {
      this.log('🚀 Starting Confluence documentation sync...', 'blue');

      await this.validateConfig();

      if (!await this.testConnection()) {
        throw new Error('Cannot connect to Confluence');
      }

      await this.ensureSpace();

      this.log(`📁 Syncing docs from: ${config.docsPath}`, 'yellow');
      await this.syncDirectory(config.docsPath);

      this.log('✅ Confluence sync completed successfully!', 'green');

    } catch (error) {
      this.log(`❌ Sync failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'sync';

  const confluence = new ConfluenceSync();

  switch (action) {
    case 'test':
      await confluence.validateConfig();
      await confluence.testConnection();
      break;
    case 'sync':
      await confluence.sync();
      break;
    case 'help':
      console.log(`
Confluence Documentation Sync

Usage: node sync-confluence.js [action]

Actions:
  sync    Sync all documentation to Confluence (default)
  test    Test Confluence connection
  help    Show this help message

Environment Variables:
  JIRA_BASE_URL        Confluence base URL (e.g., https://tutorwise.atlassian.net)
  JIRA_EMAIL           Confluence user email
  JIRA_API_TOKEN       Confluence API token
  CONFLUENCE_SPACE_KEY Space key (default: TUTORWISE)
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

module.exports = ConfluenceSync;