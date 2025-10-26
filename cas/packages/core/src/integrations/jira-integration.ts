#!/usr/bin/env node
/**
 * Jira Integration for Context Engineering System
 * Enables autonomous AI development workflows through Jira task management
 */

import axios, { AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// --- Interfaces for Type Safety ---

interface JiraConfig {
  baseURL: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

interface TaskData {
  summary: string;
  description: string;
  priority?: string;
  issueType?: string;
  parentEpic?: string | null;
  estimatedHours?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  labels?: string[];
}

interface ProgressData {
  status?: string | null;
  comment?: string | null;
  timeSpent?: string | null;
  percentComplete?: number | null;
}

interface EpicData {
  summary: string;
  description: string;
  priority?: string;
}

interface WorkflowData {
  featureName: string;
  requirements: string;
  complexity?: 'High' | 'Medium' | 'Low';
  parentEpic?: string | null;
}

class JiraContextEngine {
  private baseURL: string;
  private email: string;
  private apiToken: string;
  private projectKey: string;
  private auth: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseURL = process.env.JIRA_BASE_URL!;
    this.email = process.env.JIRA_EMAIL!;
    this.apiToken = process.env.JIRA_API_TOKEN!;
    this.projectKey = process.env.JIRA_PROJECT_KEY!;

    if (!this.baseURL || !this.email || !this.apiToken || !this.projectKey) {
      throw new Error('Missing required Jira configuration in .env.local');
    }

    this.auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    this.headers = {
      'Authorization': `Basic ${this.auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create AI-generated development task in Jira
   */
  async createDevelopmentTask(taskData: TaskData): Promise<any> {
    const {
      summary,
      description,
      priority = 'Medium',
      issueType = 'Task',
      parentEpic = null,
      estimatedHours = null,
      startDate = null,
      dueDate = null
    } = taskData;

    let storyPoints: number | null = null;
    if (estimatedHours) {
      storyPoints = Math.max(0.5, Math.round(estimatedHours / 8 * 2) / 2);
    }

    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];

    let calculatedDueDate: string | null = dueDate;
    if (!dueDate && estimatedHours) {
      const daysToAdd = Math.ceil(estimatedHours / 8);
      const due = new Date(today);
      due.setDate(due.getDate() + daysToAdd);
      calculatedDueDate = due.toISOString().split('T')[0];
    }

    const issue: any = {
      fields: {
        project: { key: this.projectKey },
        summary: `[Claude Code] ${summary}`,
        description: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: description }]
          }]
        },
        issuetype: { name: issueType },
        priority: { name: priority }
      }
    };

    const customFields = await this.getCustomFields();

    if (storyPoints) {
      try {
        issue.fields[customFields.storyPoints] = storyPoints;
      } catch (error: any) {
        console.log(`⚠️ Could not set story points: ${error.message}`);
      }
    }

    if (calculatedDueDate) {
      issue.fields.duedate = calculatedDueDate;
    }

    if (parentEpic) {
      issue.fields.parent = { key: parentEpic };
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/rest/api/3/issue`,
        issue,
        { headers: this.headers } as AxiosRequestConfig
      );

      const taskKey = response.data.key;
      console.log(`✅ Created Jira task: ${taskKey}`);

      if (defaultStartDate) {
        try {
          await axios.put(
            `${this.baseURL}/rest/api/3/issue/${taskKey}`,
            {
              fields: {
                [customFields.startDate]: defaultStartDate
              }
            },
            { headers: this.headers } as AxiosRequestConfig
          );
          console.log(`📅 Set start date: ${defaultStartDate}`);
        } catch (updateError: any) {
          const errorDetails = updateError.response?.data?.errors || updateError.response?.data || updateError.message;
          console.log(`⚠️ Could not set start date: ${JSON.stringify(errorDetails)}`);
        }
      }

      if (storyPoints) {
        console.log(`📊 Story points: ${storyPoints} (${estimatedHours}h)`);
      }
      if (calculatedDueDate) {
        console.log(`📅 Due date: ${calculatedDueDate}`);
      }

      return {
        success: true,
        key: response.data.key,
        id: response.data.id,
        url: `${this.baseURL}/browse/${response.data.key}`,
        storyPoints,
        startDate: defaultStartDate,
        dueDate: calculatedDueDate
      };
    } catch (error: any) {
      console.error('❌ Failed to create Jira task:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Update task progress autonomously
   */
  async updateTaskProgress(taskKey: string, progressData: ProgressData): Promise<any> {
    const {
      status = null,
      comment = null,
      timeSpent = null,
    } = progressData;

    try {
      const updates: string[] = [];

      if (comment) {
        await axios.post(
          `${this.baseURL}/rest/api/3/issue/${taskKey}/comment`,
          {
            body: {
              type: 'doc',
              version: 1,
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: `[Claude Code Update] ${comment}` }]
              }]
            }
          },
          { headers: this.headers } as AxiosRequestConfig
        );
        updates.push('comment');
      }

      if (timeSpent) {
        await axios.post(
          `${this.baseURL}/rest/api/3/issue/${taskKey}/worklog`,
          {
            timeSpent: timeSpent,
            comment: {
              type: 'doc',
              version: 1,
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: 'Autonomous AI development time' }]
              }]
            }
          },
          { headers: this.headers } as AxiosRequestConfig
        );
        updates.push('worklog');
      }

      if (status) {
        const transitions = await this.getAvailableTransitions(taskKey);
        const transition = transitions.find(t =>
          t.to.name.toLowerCase().includes(status.toLowerCase())
        );

        if (transition) {
          await axios.post(
            `${this.baseURL}/rest/api/3/issue/${taskKey}/transitions`,
            { transition: { id: transition.id } },
            { headers: this.headers } as AxiosRequestConfig
          );
          updates.push('status');
        }
      }

      console.log(`✅ Updated task ${taskKey}: ${updates.join(', ')}`);
      return { success: true, updates };
    } catch (error: any) {
      console.error(`❌ Failed to update task ${taskKey}:`, error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Get available transitions for a task
   */
  async getAvailableTransitions(taskKey: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/rest/api/3/issue/${taskKey}/transitions`,
        { headers: this.headers } as AxiosRequestConfig
      );
      return response.data.transitions;
    } catch (error: any) {
      console.error('Failed to get transitions:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Create epic for major features
   */
  async createFeatureEpic(epicData: EpicData): Promise<any> {
    const {
      summary,
      description,
      priority = 'High'
    } = epicData;

    const epic = {
      fields: {
        project: { key: this.projectKey },
        summary: `[Claude Code Epic] ${summary}`,
        description: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: description }]
          }]
        },
        issuetype: { name: 'Epic' },
        priority: { name: priority }
      }
    };

    try {
      const response = await axios.post(
        `${this.baseURL}/rest/api/3/issue`,
        epic,
        { headers: this.headers } as AxiosRequestConfig
      );

      console.log(`✅ Created Epic: ${response.data.key}`);
      return {
        success: true,
        key: response.data.key,
        id: response.data.id,
        url: `${this.baseURL}/browse/${response.data.key}`
      };
    } catch (error: any) {
      console.error('❌ Failed to create epic:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Generate tasks for autonomous development workflow
   */
  async generateAutonomousWorkflow(workflowData: WorkflowData): Promise<any[]> {
    const {
      featureName,
      requirements,
      complexity = 'Medium',
      parentEpic = null
    } = workflowData;

    console.log(`🤖 Generating autonomous workflow for: ${featureName}`);

    const tasks: TaskData[] = [
      {
        summary: `Technical Design: ${featureName}`,
        description: `Design technical architecture and implementation approach for ${featureName}.\n\nRequirements:\n${requirements}`,
        priority: 'High',
        issueType: 'Task',
        labels: ['ai-generated', 'technical-design', 'autonomous'],
        estimatedHours: complexity === 'High' ? 4 : complexity === 'Medium' ? 2 : 1
      },
      {
        summary: `Implementation: ${featureName}`,
        description: `Implement ${featureName} according to technical design.\n\nIncludes:\n- Code implementation\n- Unit tests\n- Integration tests\n- Documentation`,
        priority: 'High',
        issueType: 'Task',
        labels: ['ai-generated', 'implementation', 'autonomous'],
        estimatedHours: complexity === 'High' ? 8 : complexity === 'Medium' ? 4 : 2
      },
      {
        summary: `Quality Assurance: ${featureName}`,
        description: `Comprehensive quality assurance for ${featureName}.\n\nIncludes:\n- Code review\n- Testing validation\n- Performance testing\n- Security review`,
        priority: 'Medium',
        issueType: 'Task',
        labels: ['ai-generated', 'qa', 'autonomous'],
        estimatedHours: complexity === 'High' ? 3 : complexity === 'Medium' ? 2 : 1
      },
      {
        summary: `Deployment: ${featureName}`,
        description: `Deploy ${featureName} to production.\n\nIncludes:\n- Staging deployment\n- Production deployment\n- Monitoring setup\n- Documentation updates`,
        priority: 'Medium',
        issueType: 'Task',
        labels: ['ai-generated', 'deployment', 'autonomous'],
        estimatedHours: 1
      }
    ];

    const results = [];
    for (const task of tasks) {
      task.parentEpic = parentEpic;
      const result = await this.createDevelopmentTask(task);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Get custom fields for story points and dates
   */
  async getCustomFields(): Promise<{ storyPoints: string; startDate: string }> {
    try {
      const response = await axios.get(
        `${this.baseURL}/rest/api/3/field`,
        { headers: this.headers } as AxiosRequestConfig
      );

      const fields: any[] = response.data;
      const storyPointsField = fields.find(f =>
        f.name.toLowerCase().includes('story points') ||
        f.name.toLowerCase().includes('story point')
      );

      const dateFields = fields.filter(f =>
        f.name.toLowerCase().includes('date') ||
        f.name.toLowerCase().includes('time')
      );

      const startDateField = dateFields.find(f =>
        f.name === 'Start date'
      ) || dateFields.find(f =>
        f.name.toLowerCase().includes('start date')
      );

      console.log('📋 Available date fields:');
      dateFields.forEach(field => {
        console.log(`  ${field.id}: ${field.name}`);
      });

      console.log('📋 Custom fields detected:');
      if (storyPointsField) {
        console.log(`  Story Points: ${storyPointsField.id} (${storyPointsField.name})`);
      }
      if (startDateField) {
        console.log(`  Start Date: ${startDateField.id} (${startDateField.name})`);
      }

      return {
        storyPoints: storyPointsField?.id || 'customfield_10016',
        startDate: startDateField?.id || 'customfield_10015'
      };
    } catch (error) {
      console.log('⚠️ Using default custom field IDs');
      return {
        storyPoints: 'customfield_10016',
        startDate: 'customfield_10015'
      };
    }
  }

  /**
   * Test Jira connection and permissions
   */
  async testConnection(): Promise<any> {
    try {
      console.log('🔍 Testing Jira connection...');

      const projectResponse = await axios.get(
        `${this.baseURL}/rest/api/3/project/${this.projectKey}`,
        { headers: this.headers } as AxiosRequestConfig
      );

      console.log(`✅ Connected to project: ${projectResponse.data.name}`);

      const issueTypesResponse = await axios.get(
        `${this.baseURL}/rest/api/3/project/${this.projectKey}/statuses`,
        { headers: this.headers } as AxiosRequestConfig
      );

      console.log(`✅ Can access issue types: ${issueTypesResponse.data.length} types available`);

      await this.getCustomFields();

      return { success: true, project: projectResponse.data.name };
    } catch (error: any) {
      console.error('❌ Jira connection failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const jira = new JiraContextEngine();

  switch (command) {
    case 'test':
      await jira.testConnection();
      break;

    case 'fields':
      await jira.getCustomFields();
      break;

    case 'create-task':
      const taskData: TaskData = {
        summary: args[1] || 'AI Generated Task',
        description: args[2] || 'Autonomous development task',
        priority: args[3] || 'Medium'
      };
      await jira.createDevelopmentTask(taskData);
      break;

    case 'create-epic':
      const epicData: EpicData = {
        summary: args[1] || 'AI Generated Epic',
        description: args[2] || 'Feature epic for autonomous development'
      };
      await jira.createFeatureEpic(epicData);
      break;

    case 'generate-workflow':
      if (!args[1]) {
        console.error('Usage: node jira-integration.ts generate-workflow "Feature Name" "Requirements"');
        process.exit(1);
      }
      const workflowData: WorkflowData = {
        featureName: args[1],
        requirements: args[2] || 'Requirements to be defined',
        complexity: (args[3] as any) || 'Medium'
      };
      await jira.generateAutonomousWorkflow(workflowData);
      break;

    default:
      console.log(`
Jira Context Engineering System

Usage:
  node jira-integration.ts test                           - Test connection and detect fields
  node jira-integration.ts fields                        - Detect custom field IDs
  node jira-integration.ts create-task "Summary" "Desc"  - Create task
  node jira-integration.ts create-epic "Summary" "Desc"  - Create epic
  node jira-integration.ts generate-workflow "Feature" "Requirements" [complexity] - Generate autonomous workflow

Examples:
  node jira-integration.ts test
  node jira-integration.ts fields
  node jira-integration.ts create-task "Visual Regression Testing" "Implement Percy integration"
  node jira-integration.ts generate-workflow "User Profile Enhancement" "Add avatar upload functionality" "High"
      `);
  }
}

// This check ensures that main() is only called when the script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

export default JiraContextEngine;