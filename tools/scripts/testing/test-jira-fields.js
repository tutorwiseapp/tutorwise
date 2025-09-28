#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const config = {
  baseUrl: process.env.JIRA_BASE_URL,
  email: process.env.JIRA_EMAIL,
  token: process.env.JIRA_API_TOKEN,
  projectKey: process.env.JIRA_PROJECT_KEY || 'TUTOR'
};

async function checkJiraFields() {
  try {
    console.log('🔍 Checking Jira custom fields...');

    const api = axios.create({
      baseURL: `${config.baseUrl}/rest/api/2`,
      auth: {
        username: config.email,
        password: config.token
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Get all fields
    const response = await api.get('/field');
    const fields = response.data;

    // Look for custom fields
    const customFields = fields.filter(field =>
      field.custom &&
      (field.name.toLowerCase().includes('start time') ||
       field.name.toLowerCase().includes('end time'))
    );

    console.log('\n📋 Found custom fields:');
    customFields.forEach(field => {
      console.log(`✅ ${field.name} (${field.id}) - ${field.schema?.type || 'unknown type'}`);
      console.log(`   Schema: ${JSON.stringify(field.schema, null, 2)}`);
    });

    if (customFields.length === 0) {
      console.log('❌ No matching custom fields found. Looking for all custom fields...');

      const allCustomFields = fields.filter(field => field.custom);
      console.log('\n📋 All custom fields:');
      allCustomFields.forEach(field => {
        console.log(`• ${field.name} (${field.id}) - ${field.schema?.type || 'unknown type'}`);
      });
    }

    // Test creating a ticket with custom fields
    console.log('\n🎫 Testing ticket creation with custom fields...');

    const ticketData = {
      fields: {
        project: { key: config.projectKey },
        summary: 'Test ticket for custom fields validation',
        description: 'Testing access to custom fields: Start time and End time\n\n🤖 **Created by:** Claude Code\n**Purpose:** Validate custom field integration',
        issuetype: { name: 'Task' },
        labels: ['ai-generated', 'claude-code', 'test', 'custom-fields']
      }
    };

    // Add custom fields if found
    customFields.forEach(field => {
      if (field.name.toLowerCase().includes('start time')) {
        ticketData.fields[field.id] = new Date().toISOString();
      } else if (field.name.toLowerCase().includes('end time')) {
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + 2);
        ticketData.fields[field.id] = endTime.toISOString();
      }
    });

    const createResponse = await api.post('/issue', ticketData);
    console.log(`✅ Test ticket created: ${config.baseUrl}/browse/${createResponse.data.key}`);

    // Retrieve the ticket to verify custom fields
    const ticketResponse = await api.get(`/issue/${createResponse.data.key}`);
    const ticket = ticketResponse.data;

    console.log('\n📝 Custom field values in created ticket:');
    customFields.forEach(field => {
      const value = ticket.fields[field.id];
      console.log(`• ${field.name}: ${value || 'not set'}`);
    });

    console.log('\n🏷️ Labels applied:');
    const labels = ticket.fields.labels || [];
    labels.forEach(label => {
      console.log(`• ${label}`);
    });

    return {
      success: true,
      customFields,
      ticketKey: createResponse.data.key
    };

  } catch (error) {
    console.error('❌ Error checking Jira fields:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
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

module.exports = { checkJiraFields };