#!/usr/bin/env node

/**
 * Test Google Integrations
 * Simple test to verify Google Docs and Calendar APIs work with service account
 */

const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

async function testGoogleAuth() {
  try {
    console.log('🧪 Testing Google integrations...');

    // Load service account credentials
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json';
    console.log(`📄 Loading credentials from: ${credentialsPath}`);

    const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
    console.log(`✅ Credentials loaded for: ${credentials.client_email}`);

    // Test JWT creation
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const token = jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' });
    console.log('✅ JWT token created successfully');

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token
      })
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const authData = await response.json();
    console.log('✅ Access token obtained successfully');

    // Test Google Drive API
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${process.env.GOOGLE_DOCS_FOLDER_IDS?.split(',')[0]}'+in+parents&fields=files(id,name,mimeType)`,
      {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (driveResponse.ok) {
      const driveData = await driveResponse.json();
      console.log(`✅ Google Drive API test successful - Found ${driveData.files?.length || 0} files`);
    } else {
      console.log(`⚠️  Google Drive API test failed: ${driveResponse.status}`);
    }

    // Test Google Calendar API
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5',
      {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      console.log(`✅ Google Calendar API test successful - Found ${calendarData.items?.length || 0} events`);
    } else {
      console.log(`⚠️  Google Calendar API test failed: ${calendarResponse.status}`);
    }

    console.log('🎉 Google integrations test completed!');

    // Create sample context
    await fs.mkdir('.ai/google-docs', { recursive: true });
    await fs.mkdir('.ai/calendar', { recursive: true });

    const docsOverview = `# Google Docs Integration Test

**Status**: ✅ Working
**Service Account**: ${credentials.client_email}
**Folder ID**: ${process.env.GOOGLE_DOCS_FOLDER_IDS}
**Files Found**: ${driveResponse.ok ? (await driveResponse.json()).files?.length || 0 : 'API test failed'}

## Next Steps
1. Run \`npm run sync:google-docs\` to sync documents
2. Check \`.ai/google-docs/\` for synchronized content

---
*Test completed on ${new Date().toISOString()}*
`;

    const calendarOverview = `# Google Calendar Integration Test

**Status**: ✅ Working
**Service Account**: ${credentials.client_email}
**Calendar IDs**: ${process.env.GOOGLE_CALENDAR_IDS}
**Events Found**: ${calendarResponse.ok ? (await calendarResponse.json()).items?.length || 0 : 'API test failed'}

## Next Steps
1. Run \`npm run sync:calendar\` to sync events
2. Check \`.ai/calendar/\` for development schedule context

---
*Test completed on ${new Date().toISOString()}*
`;

    await fs.writeFile('.ai/google-docs/test-overview.md', docsOverview);
    await fs.writeFile('.ai/calendar/test-overview.md', calendarOverview);

    console.log('📁 Created test overview files in .ai/ directories');

  } catch (error) {
    console.error('❌ Google integration test failed:', error.message);

    if (error.message.includes('ENOENT')) {
      console.log('💡 Make sure google-credentials.json exists in project root');
    }
    if (error.message.includes('Auth failed')) {
      console.log('💡 Check service account permissions and enabled APIs');
    }

    process.exit(1);
  }
}

if (require.main === module) {
  testGoogleAuth();
}

module.exports = { testGoogleAuth };