/**
 * Script to test creating a Service Desk request
 * Usage: npx tsx tools/database/test-service-desk-create.ts
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

async function testCreateServiceDeskRequest() {
  console.log('Testing Service Desk Request Creation...\n');

  // Mock snapshot data
  const mockSnapshot = {
    id: 'test-snapshot-' + Date.now(),
    action: 'Submit a booking',
    issue: 'Payment button does not respond when clicked',
    impact: 'blocking' as const,
    page_url: 'https://tutorwise.io/bookings/confirm',
    page_title: 'Confirm Booking',
    user_role: 'student',
    screenshot_url: 'https://example.com/screenshot.png',
    capture_level: 'standard',
  };

  const summary = `[Help Centre - TEST] ${mockSnapshot.action}`;

  let description = `**User Report**\n\n`;
  description += `**Action:** ${mockSnapshot.action}\n`;
  description += `**Issue:** ${mockSnapshot.issue}\n`;
  description += `**Impact:** ${mockSnapshot.impact}\n\n`;
  description += `---\n\n`;
  description += `**Context**\n\n`;
  description += `**Page:** [${mockSnapshot.page_title}](${mockSnapshot.page_url})\n`;
  description += `**User Role:** ${mockSnapshot.user_role}\n`;
  description += `**Capture Level:** ${mockSnapshot.capture_level}\n`;
  description += `**Screenshot:** [View Screenshot](${mockSnapshot.screenshot_url})\n`;
  description += `\n---\n\n`;
  description += `*Snapshot ID: \`${mockSnapshot.id}\`*\n`;
  description += `*This is a test request - can be closed immediately*`;

  const requestData = {
    serviceDeskId: JIRA_SERVICE_DESK_ID,
    requestTypeId: JIRA_REQUEST_TYPE_ID,
    requestFieldValues: {
      summary: summary,
      description: description,
    },
  };

  console.log('Request payload:');
  console.log(JSON.stringify(requestData, null, 2));
  console.log('\n---\n');

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

    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ Service Desk request creation failed');
      console.error(`Status: ${response.status}`);
      console.error('Response:', responseText);
      process.exit(1);
    }

    const result = JSON.parse(responseText);

    console.log('✅ Service Desk request created successfully!\n');
    console.log('Response:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n---\n');
    console.log('Request Details:');
    console.log(`  Issue Key: ${result.issueKey}`);
    console.log(`  Issue ID: ${result.issueId}`);
    console.log(`  Created: ${result.createdDate}`);
    console.log(`  Web URL: ${result._links.web}`);
    console.log(`  API URL: ${result._links.jiraRest}`);
    console.log('\n✓ You can view the request at:', result._links.web);
    console.log('\n⚠️  Remember to close this test request in Jira Service Desk!');

  } catch (error) {
    console.error('Error creating Service Desk request:', error);
    process.exit(1);
  }
}

testCreateServiceDeskRequest();
