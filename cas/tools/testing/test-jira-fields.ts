#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const config = {
  baseUrl: process.env.JIRA_BASE_URL,
  email: process.env.JIRA_EMAIL,
  token: process.env.JIRA_API_TOKEN,
  projectKey: process.env.JIRA_PROJECT_KEY || 'TUTOR'
};

interface JiraField {
  id: string;
  name: string;
  custom: boolean;
  schema?: {
    type: string;
  };
}

async function checkJiraFields(): Promise<{ success: boolean; customFields?: JiraField[]; ticketKey?: string; error?: string }> {
  try {
    console.log('🔍 Checking Jira custom fields...');
    const api: AxiosInstance = axios.create({
      baseURL: `${config.baseUrl}/rest/api/2`,
      auth: { username: config.email, password: config.token },
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await api.get('/field');
    const fields: JiraField[] = response.data;

    const customFields = fields.filter(f => f.custom && (f.name.toLowerCase().includes('start time') || f.name.toLowerCase().includes('end time')));
    console.log('\n📋 Found custom fields:');
    customFields.forEach(f => console.log(`✅ ${f.name} (${f.id}) - ${f.schema?.type || 'unknown'}`));

    if (customFields.length === 0) {
      console.log('❌ No matching custom fields found. Looking for all custom fields...');
      fields.filter(f => f.custom).forEach(f => console.log(`• ${f.name} (${f.id}) - ${f.schema?.type || 'unknown'}`));
    }

    console.log('\n🎫 Testing ticket creation with custom fields...');
    const ticketData: any = {
      fields: {
        project: { key: config.projectKey },
        summary: 'Test ticket for custom fields validation',
        description: 'Testing access to custom fields: Start time and End time\n\n🤖 **Created by:** Claude Code\n**Purpose:** Validate custom field integration',
        issuetype: { name: 'Task' },
        labels: ['ai-generated', 'claude-code', 'test', 'custom-fields']
      }
    };

    customFields.forEach(field => {
      if (field.name.toLowerCase().includes('start time')) ticketData.fields[field.id] = new Date().toISOString();
      else if (field.name.toLowerCase().includes('end time')) {
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + 2);
        ticketData.fields[field.id] = endTime.toISOString();
      }
    });

    const createResponse = await api.post('/issue', ticketData);
    console.log(`✅ Test ticket created: ${config.baseUrl}/browse/${createResponse.data.key}`);

    const ticketResponse = await api.get(`/issue/${createResponse.data.key}`);
    console.log('\n📝 Custom field values in created ticket:');
    customFields.forEach(field => console.log(`• ${field.name}: ${ticketResponse.data.fields[field.id] || 'not set'}`));

    console.log('\n🏷️ Labels applied:');
    (ticketResponse.data.fields.labels || []).forEach((label: string) => console.log(`• ${label}`));

    return { success: true, customFields, ticketKey: createResponse.data.key };
  } catch (error: any) {
    console.error('❌ Error checking Jira fields:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    return { success: false, error: error.message };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkJiraFields().then(result => {
    if (result.success) {
      console.log('\n✅ Jira custom fields test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Jira custom fields test failed');
      process.exit(1);
    }
  });
}

export { checkJiraFields };