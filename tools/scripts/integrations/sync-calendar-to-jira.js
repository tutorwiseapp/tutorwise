#!/usr/bin/env node

/**
 * Calendar to Jira Sync
 * Syncs Google Calendar events to Jira tickets with custom fields
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { google } = require('googleapis');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Configuration from environment variables
const config = {
  // Google Calendar
  serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json',
  calendarIds: process.env.GOOGLE_CALENDAR_IDS?.split(',') || ['primary'],

  // Jira
  jiraBaseUrl: process.env.JIRA_BASE_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraToken: process.env.JIRA_API_TOKEN,
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || 'TUTOR',

  // Custom field IDs (discovered from your Jira)
  customFields: {
    startTime: 'customfield_10092',
    endTime: 'customfield_10093'
  },

  // Sync settings
  lookAheadDays: 7, // How many days ahead to sync
  syncInterval: 10 * 60 * 1000, // 10 minutes
  jiraTicketPrefix: '[CAL]' // Prefix for calendar-generated tickets
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

class CalendarToJiraSync {
  constructor() {
    this.calendar = null;
    this.jiraApi = null;
    this.syncedEvents = new Map(); // Track synced events
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async initialize() {
    try {
      // Initialize Google Calendar
      await this.initializeCalendar();

      // Initialize Jira API
      await this.initializeJira();

      this.log('✅ Calendar-to-Jira sync initialized successfully', 'green');
      return true;
    } catch (error) {
      this.log(`❌ Initialization failed: ${error.message}`, 'red');
      return false;
    }
  }

  async initializeCalendar() {
    // Check if service account file exists
    await fs.access(config.serviceAccountPath);

    // Load service account credentials
    const credentials = JSON.parse(await fs.readFile(config.serviceAccountPath, 'utf8'));

    // Create JWT auth client
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/calendar.readonly']
    );

    await auth.authorize();
    this.calendar = google.calendar({ version: 'v3', auth });

    this.log('✅ Google Calendar authentication successful', 'green');
  }

  async initializeJira() {
    if (!config.jiraBaseUrl || !config.jiraEmail || !config.jiraToken) {
      throw new Error('Missing Jira configuration');
    }

    this.jiraApi = axios.create({
      baseURL: `${config.jiraBaseUrl}/rest/api/2`,
      auth: {
        username: config.jiraEmail,
        password: config.jiraToken
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Test connection
    await this.jiraApi.get('/myself');
    this.log('✅ Jira authentication successful', 'green');
  }

  async getCalendarEvents() {
    try {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + (config.lookAheadDays * 24 * 60 * 60 * 1000)).toISOString();

      const events = [];

      for (const calendarId of config.calendarIds) {
        try {
          const response = await this.calendar.events.list({
            calendarId: calendarId.trim(),
            timeMin,
            timeMax,
            maxResults: 50,
            singleEvents: true,
            orderBy: 'startTime'
          });

          if (response.data.items.length > 0) {
            events.push(...response.data.items.map(event => ({
              id: event.id,
              calendarId: calendarId,
              summary: event.summary,
              description: event.description,
              start: event.start.dateTime || event.start.date,
              end: event.end.dateTime || event.end.date,
              location: event.location,
              attendees: event.attendees || [],
              created: event.created,
              updated: event.updated
            })));
          }
        } catch (error) {
          this.log(`⚠️ Failed to fetch events from calendar ${calendarId}: ${error.message}`, 'yellow');
        }
      }

      return events;
    } catch (error) {
      this.log(`❌ Failed to get calendar events: ${error.message}`, 'red');
      return [];
    }
  }

  async findExistingJiraTicket(eventId) {
    try {
      const jqlQuery = `project = ${config.jiraProjectKey} AND summary ~ "${config.jiraTicketPrefix}" AND description ~ "${eventId}"`;

      const response = await this.jiraApi.get('/search', {
        params: {
          jql: jqlQuery,
          maxResults: 1,
          fields: 'key,summary'
        }
      });

      return response.data.issues.length > 0 ? response.data.issues[0] : null;
    } catch (error) {
      this.log(`⚠️ Error searching for existing ticket: ${error.message}`, 'yellow');
      return null;
    }
  }

  formatEventDescription(event) {
    let description = `🤖 **Created by:** Claude Code\n\nSynced from Google Calendar\n\n`;
    description += `**Event ID:** ${event.id}\n`;
    description += `**Calendar:** ${event.calendarId}\n\n`;

    if (event.description) {
      description += `**Original Description:**\n${event.description}\n\n`;
    }

    if (event.location) {
      description += `**Location:** ${event.location}\n\n`;
    }

    if (event.attendees.length > 0) {
      description += `**Attendees:**\n`;
      event.attendees.forEach(attendee => {
        description += `• ${attendee.email}${attendee.displayName ? ` (${attendee.displayName})` : ''}\n`;
      });
      description += '\n';
    }

    description += `**Created:** ${new Date(event.created).toLocaleString()}\n`;
    description += `**Last Updated:** ${new Date(event.updated).toLocaleString()}\n`;

    return description;
  }

  async createJiraTicket(event) {
    try {
      const ticketData = {
        fields: {
          project: { key: config.jiraProjectKey },
          summary: `${config.jiraTicketPrefix} ${event.summary}`,
          description: this.formatEventDescription(event),
          issuetype: { name: 'Task' },
          labels: ['ai-generated', 'claude-code', 'calendar-sync', 'auto-sync'],

          // Custom fields
          [config.customFields.startTime]: event.start,
          [config.customFields.endTime]: event.end
        }
      };

      const response = await this.jiraApi.post('/issue', ticketData);

      this.log(`✅ Created Jira ticket: ${response.data.key} for event "${event.summary}"`, 'green');

      return {
        success: true,
        ticketKey: response.data.key,
        ticketUrl: `${config.jiraBaseUrl}/browse/${response.data.key}`
      };
    } catch (error) {
      this.log(`❌ Failed to create Jira ticket for event "${event.summary}": ${error.message}`, 'red');
      if (error.response?.data) {
        this.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
      }
      return { success: false, error: error.message };
    }
  }

  async updateJiraTicket(ticket, event) {
    try {
      const updateData = {
        fields: {
          summary: `${config.jiraTicketPrefix} ${event.summary}`,
          description: this.formatEventDescription(event),
          labels: ['ai-generated', 'claude-code', 'calendar-sync', 'auto-sync'],

          // Custom fields
          [config.customFields.startTime]: event.start,
          [config.customFields.endTime]: event.end
        }
      };

      await this.jiraApi.put(`/issue/${ticket.key}`, updateData);

      this.log(`📝 Updated Jira ticket: ${ticket.key} for event "${event.summary}"`, 'blue');

      return {
        success: true,
        ticketKey: ticket.key,
        ticketUrl: `${config.jiraBaseUrl}/browse/${ticket.key}`
      };
    } catch (error) {
      this.log(`❌ Failed to update Jira ticket ${ticket.key}: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }
  }

  async syncEventsToJira() {
    try {
      this.log('🔄 Starting calendar-to-Jira sync...', 'blue');

      const events = await this.getCalendarEvents();

      if (events.length === 0) {
        this.log('📅 No upcoming events found', 'blue');
        return { synced: 0, created: 0, updated: 0 };
      }

      this.log(`📅 Found ${events.length} upcoming events`, 'magenta');

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const event of events) {
        try {
          // Skip events without titles
          if (!event.summary || event.summary.trim() === '') {
            this.log(`⏭️ Skipping event without title: ${event.id}`, 'yellow');
            skipped++;
            continue;
          }

          // Check if ticket already exists
          const existingTicket = await this.findExistingJiraTicket(event.id);

          if (existingTicket) {
            // Update existing ticket
            await this.updateJiraTicket(existingTicket, event);
            updated++;
          } else {
            // Create new ticket
            await this.createJiraTicket(event);
            created++;
          }

          // Store sync info
          this.syncedEvents.set(event.id, {
            event,
            lastSync: new Date(),
            ticketKey: existingTicket?.key
          });

        } catch (error) {
          this.log(`❌ Error processing event "${event.summary}": ${error.message}`, 'red');
          skipped++;
        }
      }

      this.log(`✅ Sync completed: ${created} created, ${updated} updated, ${skipped} skipped`, 'green');

      return { synced: created + updated, created, updated, skipped };

    } catch (error) {
      this.log(`❌ Sync failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async startContinuousSync() {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize sync services');
    }

    this.log(`⏰ Starting continuous calendar-to-Jira sync every ${config.syncInterval / 60000} minutes...`, 'green');

    // Initial sync
    await this.syncEventsToJira();

    // Set up interval
    const intervalId = setInterval(async () => {
      try {
        await this.syncEventsToJira();
      } catch (error) {
        this.log(`❌ Sync interval failed: ${error.message}`, 'red');
      }
    }, config.syncInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('🛑 Stopping calendar-to-Jira sync...', 'yellow');
      clearInterval(intervalId);
      process.exit(0);
    });

    // Keep process alive
    return new Promise(() => {}); // Never resolves, keeps running
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'sync';

  const sync = new CalendarToJiraSync();

  switch (action) {
    case 'sync':
      if (await sync.initialize()) {
        await sync.syncEventsToJira();
      }
      break;

    case 'continuous':
      await sync.startContinuousSync();
      break;

    case 'test':
      if (await sync.initialize()) {
        const events = await sync.getCalendarEvents();
        console.log(`Found ${events.length} events to potentially sync`);
        events.forEach(event => {
          console.log(`• ${event.summary} - ${new Date(event.start).toLocaleString()}`);
        });
      }
      break;

    case 'help':
      console.log(`
Calendar to Jira Sync

Usage: node sync-calendar-to-jira.js [action]

Actions:
  sync        One-time sync of calendar events to Jira (default)
  continuous  Start continuous sync every 10 minutes
  test        Test connection and show upcoming events
  help        Show this help message

Environment Variables:
  GOOGLE_SERVICE_ACCOUNT_PATH  Path to Google service account JSON
  GOOGLE_CALENDAR_IDS          Comma-separated calendar IDs
  JIRA_BASE_URL               Jira base URL
  JIRA_EMAIL                  Jira user email
  JIRA_API_TOKEN              Jira API token
  JIRA_PROJECT_KEY            Jira project key (default: TUTOR)

Custom Fields Used:
  Start time: customfield_10092
  End time: customfield_10093

Labels Applied:
  ai-generated, claude-code, calendar-sync, auto-sync
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

module.exports = CalendarToJiraSync;