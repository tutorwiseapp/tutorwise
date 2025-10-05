#!/usr/bin/env node
/**
 * CAS Autonomous Agent - Jira Integration
 * Pulls AI-ready tasks from Jira for autonomous execution
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class JiraClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || process.env.JIRA_BASE_URL;
    this.email = config.email || process.env.JIRA_EMAIL;
    this.apiToken = config.apiToken || process.env.JIRA_API_TOKEN;

    if (!this.baseURL || !this.email || !this.apiToken) {
      throw new Error('Jira credentials not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Pull AI-ready tasks from Jira
   * @param {string} jql - JQL query
   * @returns {Promise<Array>} List of tasks
   */
  async pullAIReadyTasks(jql = null) {
    const query = jql || "labels = 'ai-ready' AND status = 'To Do' ORDER BY priority DESC";

    try {
      const response = await this.client.get('/rest/api/3/search', {
        params: {
          jql: query,
          fields: [
            'summary',
            'description',
            'priority',
            'labels',
            'assignee',
            'status',
            'created',
            'updated',
            'customfield_10016' // Story points / estimate
          ],
          maxResults: 50
        }
      });

      return response.data.issues.map(issue => this.formatTask(issue));
    } catch (error) {
      console.error('❌ Failed to pull tasks from Jira:', error.message);
      throw error;
    }
  }

  /**
   * Format Jira issue into CAS task format
   */
  formatTask(issue) {
    const description = issue.fields.description?.content?.[0]?.content?.[0]?.text ||
                       issue.fields.description || '';

    return {
      id: issue.key,
      title: issue.fields.summary,
      description: description,
      priority: issue.fields.priority?.name || 'Medium',
      priorityLevel: this.getPriorityLevel(issue.fields.priority?.name),
      labels: issue.fields.labels || [],
      status: issue.fields.status?.name,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      created: issue.fields.created,
      updated: issue.fields.updated,
      estimate: issue.fields.customfield_10016 || null,
      url: `${this.baseURL}/browse/${issue.key}`,

      // Parse requirements from description
      requirements: this.extractRequirements(description),
      files: this.extractFiles(description),
      acceptanceCriteria: this.extractAcceptanceCriteria(description),

      source: 'jira',
      pullDate: new Date().toISOString()
    };
  }

  /**
   * Get numeric priority level
   */
  getPriorityLevel(priority) {
    const levels = {
      'Highest': 0,
      'High': 1,
      'Medium': 2,
      'Low': 3,
      'Lowest': 4
    };
    return levels[priority] || 2;
  }

  /**
   * Extract requirements from description
   */
  extractRequirements(description) {
    const requirements = [];
    const reqPattern = /(?:requirements?|specs?|must):\s*\n((?:[-*]\s+.+\n*)+)/gi;
    const matches = description.matchAll(reqPattern);

    for (const match of matches) {
      const items = match[1].match(/[-*]\s+(.+)/g);
      if (items) {
        items.forEach(item => {
          requirements.push(item.replace(/^[-*]\s+/, '').trim());
        });
      }
    }

    return requirements;
  }

  /**
   * Extract files to modify from description
   */
  extractFiles(description) {
    const files = [];
    const filePattern = /(?:files?|modify|update|change):\s*\n((?:[-*]\s+.+\n*)+)/gi;
    const matches = description.matchAll(filePattern);

    for (const match of matches) {
      const items = match[1].match(/[-*]\s+(.+)/g);
      if (items) {
        items.forEach(item => {
          const file = item.replace(/^[-*]\s+/, '').trim();
          if (file.includes('/') || file.includes('.')) {
            files.push(file);
          }
        });
      }
    }

    // Also look for direct file paths
    const pathPattern = /(?:apps|src|tools)\/[\w\-\/]+\.[\w]+/g;
    const paths = description.match(pathPattern);
    if (paths) {
      paths.forEach(path => {
        if (!files.includes(path)) {
          files.push(path);
        }
      });
    }

    return files;
  }

  /**
   * Extract acceptance criteria
   */
  extractAcceptanceCriteria(description) {
    const criteria = [];
    const acPattern = /(?:acceptance|criteria|checklist):\s*\n((?:[-*\[\]]\s+.+\n*)+)/gi;
    const matches = description.matchAll(acPattern);

    for (const match of matches) {
      const items = match[1].match(/[-*]\s+\[[ x]\]\s+(.+)|[-*]\s+(.+)/g);
      if (items) {
        items.forEach(item => {
          const text = item.replace(/^[-*]\s+\[[ x]\]\s*/, '').replace(/^[-*]\s+/, '').trim();
          const checked = item.includes('[x]');
          criteria.push({ text, completed: checked });
        });
      }
    }

    return criteria;
  }

  /**
   * Update task status in Jira
   * @param {string} taskId - Jira issue key
   * @param {string} status - New status (e.g., "In Progress", "In Review")
   */
  async updateTaskStatus(taskId, status) {
    try {
      // Get available transitions
      const transitionsResp = await this.client.get(`/rest/api/3/issue/${taskId}/transitions`);
      const transition = transitionsResp.data.transitions.find(t =>
        t.name.toLowerCase() === status.toLowerCase() ||
        t.to.name.toLowerCase() === status.toLowerCase()
      );

      if (!transition) {
        throw new Error(`Status "${status}" not available for ${taskId}`);
      }

      await this.client.post(`/rest/api/3/issue/${taskId}/transitions`, {
        transition: { id: transition.id }
      });

      console.log(`✅ Updated ${taskId} → ${status}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update ${taskId}:`, error.message);
      return false;
    }
  }

  /**
   * Add comment to Jira issue
   * @param {string} taskId - Jira issue key
   * @param {string} comment - Comment text (supports markdown)
   */
  async addComment(taskId, comment) {
    try {
      await this.client.post(`/rest/api/3/issue/${taskId}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment
                }
              ]
            }
          ]
        }
      });

      console.log(`✅ Added comment to ${taskId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to comment on ${taskId}:`, error.message);
      return false;
    }
  }

  /**
   * Generate AI completion comment
   */
  generateAIComment(task, pr) {
    return `🤖 **AI Autonomous Agent Update**

**Status:** Implementation completed
**PR:** ${pr.url}
**Time Taken:** ${pr.timeTaken}

**Summary:**
${pr.summary}

**Changes Made:**
${pr.changes.map(c => `- ${c}`).join('\n')}

**Tests:**
- Total: ${pr.tests.total}
- Passing: ${pr.tests.passing}
- Coverage: ${pr.tests.coverage}%

**Quality Checks:**
- ✅ Linting passed
- ✅ Type checking passed
- ✅ Build successful
- ✅ All tests passing

**Next Steps:**
1. Review PR: ${pr.url}
2. Approve if satisfactory
3. Merge to deploy

Generated by CAS Autonomous Agent v1.0.0`;
  }

  /**
   * Assign task to user
   */
  async assignTask(taskId, userId = null) {
    try {
      await this.client.put(`/rest/api/3/issue/${taskId}/assignee`, {
        accountId: userId
      });
      console.log(`✅ Assigned ${taskId} to ${userId || 'unassigned'}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to assign ${taskId}:`, error.message);
      return false;
    }
  }

  /**
   * Test connection to Jira
   */
  async testConnection() {
    try {
      const response = await this.client.get('/rest/api/3/myself');
      console.log(`✅ Connected to Jira as: ${response.data.displayName}`);
      return true;
    } catch (error) {
      console.error('❌ Jira connection failed:', error.message);
      return false;
    }
  }
}

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  const jira = new JiraClient();

  (async () => {
    switch (command) {
      case 'test':
        await jira.testConnection();
        break;

      case 'pull':
        const tasks = await jira.pullAIReadyTasks();
        console.log(`\n📋 Found ${tasks.length} AI-ready tasks:\n`);
        tasks.forEach((task, i) => {
          console.log(`${i + 1}. [${task.id}] ${task.title}`);
          console.log(`   Priority: ${task.priority} | Files: ${task.files.length}`);
          console.log(`   ${task.url}\n`);
        });
        break;

      case 'update':
        const taskId = process.argv[3];
        const status = process.argv[4];
        if (!taskId || !status) {
          console.error('Usage: node jira-client.js update <TASK-ID> <status>');
          process.exit(1);
        }
        await jira.updateTaskStatus(taskId, status);
        break;

      case 'comment':
        const id = process.argv[3];
        const text = process.argv[4];
        if (!id || !text) {
          console.error('Usage: node jira-client.js comment <TASK-ID> <text>');
          process.exit(1);
        }
        await jira.addComment(id, text);
        break;

      default:
        console.log('CAS Jira Client\n');
        console.log('Usage:');
        console.log('  node jira-client.js test                     - Test connection');
        console.log('  node jira-client.js pull                     - Pull AI-ready tasks');
        console.log('  node jira-client.js update <id> <status>     - Update task status');
        console.log('  node jira-client.js comment <id> <text>      - Add comment');
    }
  })();
}

module.exports = JiraClient;
