/**
 * Script to test priority mapping for Service Desk requests
 * Usage: npx tsx tools/database/test-priority-mapping.ts
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN!;
const JIRA_SERVICE_DESK_ID = process.env.JIRA_SERVICE_DESK_ID!;
const JIRA_REQUEST_TYPE_ID = process.env.JIRA_REQUEST_TYPE_ID!;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_SERVICE_DESK_ID || !JIRA_REQUEST_TYPE_ID) {
  console.error('Missing Jira credentials or Service Desk configuration in .env.local');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

async function testPriorityMapping() {
  console.log('Testing Priority Mapping for Service Desk Requests...\n');

  const testCases = [
    { impact: 'blocking', expectedPriority: '1', expectedName: 'Highest' },
    { impact: 'degraded', expectedPriority: '2', expectedName: 'High' },
    { impact: 'minor', expectedPriority: '3', expectedName: 'Medium' },
  ];

  for (const testCase of testCases) {
    console.log(`\n--- Testing impact: "${testCase.impact}" → Priority: "${testCase.expectedName}" ---`);

    const summary = `[Priority Test - ${testCase.impact.toUpperCase()}] Test ticket`;
    const description = `**This is a test for priority mapping**\n\n**Impact:** ${testCase.impact}\n**Expected Priority:** ${testCase.expectedName}\n\n*Can be closed immediately*`;

    const priorityMap: Record<string, string> = {
      blocking: '1',
      degraded: '2',
      minor: '3',
    };

    const requestData = {
      serviceDeskId: JIRA_SERVICE_DESK_ID,
      requestTypeId: JIRA_REQUEST_TYPE_ID,
      requestFieldValues: {
        summary: summary,
        description: description,
        priority: { id: priorityMap[testCase.impact] || '3' },
      },
    };

    try {
      const response = await fetch(
        `${JIRA_BASE_URL}/rest/servicedeskapi/request`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to create ticket for impact "${testCase.impact}"`);
        console.error(`Status: ${response.status}`);
        console.error('Response:', errorText);
        continue;
      }

      const result = await response.json();
      console.log(`✅ Ticket created: ${result.issueKey}`);
      console.log(`   URL: ${result._links.web}`);
      console.log(`   Summary: ${result.summary}`);

      // Note: Priority isn't returned in the creation response
      // We'd need to fetch the issue details to verify
      console.log(`   Expected Priority ID: ${testCase.expectedPriority} (${testCase.expectedName})`);

    } catch (error) {
      console.error(`Error testing ${testCase.impact}:`, error);
    }

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n✓ Priority mapping test complete!');
  console.log('\nPlease verify in Jira Service Desk that the priorities are set correctly:');
  console.log('- "blocking" should have priority "Highest"');
  console.log('- "degraded" should have priority "High"');
  console.log('- "minor" should have priority "Medium"');
  console.log('\n⚠️  Remember to close these test tickets!');
}

testPriorityMapping();
