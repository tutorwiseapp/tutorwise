#!/usr/bin/env node

/**
 * Simple Google Sync - Working version
 * Tests and syncs both Google Docs and Calendar
 */

const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

class SimpleGoogleSync {
  constructor() {
    this.accessToken = '';
  }

  async authenticate() {
    try {
      const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json';
      const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };

      const token = jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' });

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
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      console.log(`✅ Authenticated as: ${credentials.client_email}`);
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  async syncGoogleDocs() {
    try {
      console.log('📄 Syncing Google Docs...');

      const folderIds = (process.env.GOOGLE_DOCS_FOLDER_IDS || '').split(',').filter(id => id.trim());

      await fs.mkdir('.ai/google-docs', { recursive: true });
      await fs.mkdir('.ai/google-docs/documents', { recursive: true });

      let allDocs = [];

      for (const folderId of folderIds) {
        console.log(`📁 Processing folder: ${folderId}`);

        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+(mimeType='application/vnd.google-apps.document'+or+mimeType='text/plain')&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`📄 Found ${data.files?.length || 0} documents`);

          for (const file of data.files || []) {
            try {
              const content = await this.getDocumentContent(file.id, file.mimeType);
              allDocs.push({
                id: file.id,
                name: file.name,
                content: content,
                modifiedTime: file.modifiedTime,
                webViewLink: file.webViewLink
              });
            } catch (error) {
              console.warn(`⚠️  Could not get content for ${file.name}`);
            }
          }
        } else {
          console.warn(`⚠️  Could not access folder ${folderId}: ${response.status}`);
        }
      }

      // Create markdown files
      for (const doc of allDocs) {
        const markdown = this.formatDocAsMarkdown(doc);
        const filename = this.sanitizeFilename(doc.name);
        await fs.writeFile(`.ai/google-docs/documents/${filename}.md`, markdown);
      }

      // Create overview
      const overview = this.createDocsOverview(allDocs);
      await fs.writeFile('.ai/google-docs/overview.md', overview);

      console.log(`✅ Google Docs sync completed - ${allDocs.length} documents processed`);
      return allDocs;
    } catch (error) {
      console.error('❌ Google Docs sync failed:', error.message);
      return [];
    }
  }

  async syncGoogleCalendar() {
    try {
      console.log('📅 Syncing Google Calendar...');

      const calendarIds = (process.env.GOOGLE_CALENDAR_IDS || 'primary').split(',').filter(id => id.trim());

      await fs.mkdir('.ai/calendar', { recursive: true });
      await fs.mkdir('.ai/calendar/events', { recursive: true });

      let allEvents = [];

      for (const calendarId of calendarIds) {
        console.log(`📅 Processing calendar: ${calendarId}`);

        // Get upcoming events
        const now = new Date().toISOString();
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${now}&timeMax=${futureDate}&maxResults=25&singleEvents=true&orderBy=startTime`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`📅 Found ${data.items?.length || 0} events in ${calendarId}`);

          for (const event of data.items || []) {
            allEvents.push({
              id: event.id,
              summary: event.summary || 'No title',
              description: event.description || '',
              start: event.start,
              end: event.end,
              location: event.location,
              htmlLink: event.htmlLink,
              calendarId: calendarId
            });
          }
        } else {
          console.warn(`⚠️  Could not access calendar ${calendarId}: ${response.status}`);
        }
      }

      // Create event markdown files
      for (const event of allEvents.slice(0, 10)) { // Limit to 10 most important
        const markdown = this.formatEventAsMarkdown(event);
        const filename = this.sanitizeFilename(`${event.summary}-${event.id}`);
        await fs.writeFile(`.ai/calendar/events/${filename}.md`, markdown);
      }

      // Create overview
      const overview = this.createCalendarOverview(allEvents);
      await fs.writeFile('.ai/calendar/overview.md', overview);

      // Create development schedule
      const schedule = this.createDevelopmentSchedule(allEvents);
      await fs.writeFile('.ai/calendar/development-schedule.md', schedule);

      console.log(`✅ Google Calendar sync completed - ${allEvents.length} events processed`);
      return allEvents;
    } catch (error) {
      console.error('❌ Google Calendar sync failed:', error.message);
      return [];
    }
  }

  async getDocumentContent(docId, mimeType) {
    if (mimeType === 'application/vnd.google-apps.document') {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      return response.ok ? await response.text() : 'Could not export content';
    }
    return 'Content not available';
  }

  formatDocAsMarkdown(doc) {
    return `# ${doc.name}

**Document ID**: ${doc.id}
**Last Modified**: ${new Date(doc.modifiedTime).toLocaleDateString()}

## Content

${doc.content}

## Links
- [View in Google Docs](${doc.webViewLink})

---
*Synced from Google Docs on ${new Date().toISOString()}*
`;
  }

  formatEventAsMarkdown(event) {
    const startDate = event.start.dateTime ? new Date(event.start.dateTime).toLocaleString() : event.start.date;
    const endDate = event.end.dateTime ? new Date(event.end.dateTime).toLocaleString() : event.end.date;

    return `# ${event.summary}

**Event ID**: ${event.id}
**Calendar**: ${event.calendarId}
**Date**: ${startDate} - ${endDate}
${event.location ? `**Location**: ${event.location}` : ''}

## Description
${event.description || 'No description'}

## Development Impact
${this.getDevelopmentImpact(event)}

## Links
- [View in Google Calendar](${event.htmlLink})

---
*Synced from Google Calendar on ${new Date().toISOString()}*
`;
  }

  getDevelopmentImpact(event) {
    const summary = (event.summary || '').toLowerCase();
    if (summary.includes('meeting') || summary.includes('standup')) {
      return 'Team meeting - may affect development schedule';
    }
    if (summary.includes('deadline') || summary.includes('due')) {
      return 'Deadline - prioritize related development tasks';
    }
    if (summary.includes('demo') || summary.includes('review')) {
      return 'Demo/Review - ensure code is presentation-ready';
    }
    return 'Regular event - monitor for development-related discussions';
  }

  createDocsOverview(docs) {
    return `# Google Docs Overview

**Total Documents**: ${docs.length}
**Last Synced**: ${new Date().toISOString()}

## Documents
${docs.map(doc =>
  `- **[${doc.name}](./documents/${this.sanitizeFilename(doc.name)}.md)** - Modified: ${new Date(doc.modifiedTime).toLocaleDateString()}`
).join('\n')}

---
*Updated automatically with Google Docs sync*
`;
  }

  createCalendarOverview(events) {
    const upcoming = events.slice(0, 10);
    return `# Google Calendar Overview

**Total Events**: ${events.length}
**Last Synced**: ${new Date().toISOString()}

## Upcoming Events
${upcoming.map(event => {
  const date = event.start.dateTime ? new Date(event.start.dateTime).toLocaleDateString() : event.start.date;
  return `- **${event.summary}** - ${date}${event.location ? ` (${event.location})` : ''}`;
}).join('\n')}

---
*Updated automatically with Google Calendar sync*
`;
  }

  createDevelopmentSchedule(events) {
    const importantEvents = events.filter(event => {
      const summary = (event.summary || '').toLowerCase();
      return summary.includes('meeting') || summary.includes('deadline') ||
             summary.includes('demo') || summary.includes('standup') ||
             summary.includes('review') || summary.includes('client');
    }).slice(0, 5);

    return `# Development Schedule

**Generated**: ${new Date().toISOString()}

## Important Upcoming Events
${importantEvents.map(event => {
  const date = event.start.dateTime ? new Date(event.start.dateTime).toLocaleString() : event.start.date;
  return `### ${event.summary}
- **Date**: ${date}
- **Impact**: ${this.getDevelopmentImpact(event)}`;
}).join('\n\n')}

${importantEvents.length === 0 ? 'No development-relevant events found in the next 30 days.' : ''}

---
*Development schedule updated with calendar sync*
`;
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  async updateMainContext(docs, events) {
    try {
      const contextSection = `

## Google Integrations Context (Auto-generated)

**Google Docs**: ${docs.length} documents synced
**Google Calendar**: ${events.length} events synced
**Last Synced**: ${new Date().toLocaleDateString()}

> Context available in \`.ai/google-docs/\` and \`.ai/calendar/\`

---
`;

      let promptContent = await fs.readFile('.ai/PROMPT.md', 'utf8');

      // Remove existing section
      promptContent = promptContent.replace(/## Google Integrations Context \(Auto-generated\)[\s\S]*?---\n/, '');

      // Add new section
      promptContent += contextSection;

      await fs.writeFile('.ai/PROMPT.md', promptContent);
    } catch (error) {
      console.log('Note: Could not update .ai/PROMPT.md');
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting Google integrations sync...');

    const sync = new SimpleGoogleSync();

    if (!(await sync.authenticate())) {
      process.exit(1);
    }

    const docs = await sync.syncGoogleDocs();
    const events = await sync.syncGoogleCalendar();

    await sync.updateMainContext(docs, events);

    console.log('🎉 Google integrations sync completed successfully!');
    console.log(`📄 Synced ${docs.length} documents`);
    console.log(`📅 Synced ${events.length} calendar events`);
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SimpleGoogleSync, main };