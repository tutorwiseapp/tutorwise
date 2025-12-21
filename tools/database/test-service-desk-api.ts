/**
 * Script to test Jira Service Desk API
 * Usage: npx tsx tools/database/test-service-desk-api.ts
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN!;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Missing Jira credentials in .env.local');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

async function testServiceDeskAPI() {
  console.log('Testing Jira Service Desk API...\n');

  try {
    // 1. Get all Service Desks
    console.log('1. Fetching Service Desks...');
    const serviceDeskResponse = await fetch(
      `${JIRA_BASE_URL}/rest/servicedeskapi/servicedesk`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      }
    );

    if (!serviceDeskResponse.ok) {
      const error = await serviceDeskResponse.text();
      throw new Error(`Service Desk API error: ${serviceDeskResponse.status} - ${error}`);
    }

    const serviceDeskData = await serviceDeskResponse.json();
    console.log('Service Desks:', JSON.stringify(serviceDeskData, null, 2));

    // Find SUPPORT service desk
    const supportDesk = serviceDeskData.values?.find(
      (desk: any) => desk.projectKey === 'SUPPORT'
    );

    if (!supportDesk) {
      console.log('\n⚠ SUPPORT Service Desk not found in response');
      console.log('Available Service Desks:', serviceDeskData.values?.map((d: any) => d.projectKey));
      return;
    }

    console.log('\n✓ Found SUPPORT Service Desk:');
    console.log(`  ID: ${supportDesk.id}`);
    console.log(`  Project Key: ${supportDesk.projectKey}`);
    console.log(`  Project Name: ${supportDesk.projectName}`);

    const serviceDeskId = supportDesk.id;

    // 2. Get Request Types for SUPPORT
    console.log('\n2. Fetching Request Types...');
    const requestTypesResponse = await fetch(
      `${JIRA_BASE_URL}/rest/servicedeskapi/servicedesk/${serviceDeskId}/requesttype`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      }
    );

    if (!requestTypesResponse.ok) {
      const error = await requestTypesResponse.text();
      throw new Error(`Request Types API error: ${requestTypesResponse.status} - ${error}`);
    }

    const requestTypesData = await requestTypesResponse.json();
    console.log('Request Types:', JSON.stringify(requestTypesData, null, 2));

    // Find "Ask a question" or similar request type
    const bugRequestType = requestTypesData.values?.find(
      (rt: any) =>
        rt.name.toLowerCase().includes('question') ||
        rt.name.toLowerCase().includes('bug') ||
        rt.name.toLowerCase().includes('issue')
    );

    if (bugRequestType) {
      console.log('\n✓ Found matching Request Type:');
      console.log(`  ID: ${bugRequestType.id}`);
      console.log(`  Name: ${bugRequestType.name}`);
      console.log(`  Description: ${bugRequestType.description}`);

      // 3. Get Request Type Fields
      console.log('\n3. Fetching Request Type Fields...');
      const fieldsResponse = await fetch(
        `${JIRA_BASE_URL}/rest/servicedeskapi/servicedesk/${serviceDeskId}/requesttype/${bugRequestType.id}/field`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
          },
        }
      );

      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json();
        console.log('Required Fields:');
        fieldsData.requestTypeFields
          ?.filter((f: any) => f.required)
          .forEach((field: any) => {
            console.log(`  - ${field.name} (${field.fieldId}): ${field.description || 'No description'}`);
          });

        console.log('\nOptional Fields:');
        fieldsData.requestTypeFields
          ?.filter((f: any) => !f.required)
          .forEach((field: any) => {
            console.log(`  - ${field.name} (${field.fieldId}): ${field.description || 'No description'}`);
          });
      }
    }

    // Summary
    console.log('\n---\nSummary:\n');
    console.log('Service Desk Configuration:');
    console.log(`  Base URL: ${JIRA_BASE_URL}`);
    console.log(`  Service Desk ID: ${serviceDeskId}`);
    console.log(`  Project Key: SUPPORT`);
    if (bugRequestType) {
      console.log(`  Request Type ID: ${bugRequestType.id}`);
      console.log(`  Request Type Name: ${bugRequestType.name}`);
    }

    console.log('\nAdd to .env.local:');
    console.log(`JIRA_SERVICE_DESK_ID=${serviceDeskId}`);
    if (bugRequestType) {
      console.log(`JIRA_REQUEST_TYPE_ID=${bugRequestType.id}`);
    }

  } catch (error) {
    console.error('Error testing Service Desk API:', error);
    process.exit(1);
  }
}

testServiceDeskAPI();
