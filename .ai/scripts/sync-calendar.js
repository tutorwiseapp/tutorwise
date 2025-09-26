#!/usr/bin/env node

/**
 * Google Calendar Sync Runner
 * Syncs Google Calendar events to .ai/calendar/ for context engineering
 */

const { SimpleCalendarSync } = require('../integrations/simple-calendar-sync.ts');

async function main() {
  try {
    console.log('🚀 Starting Google Calendar sync...');

    // Configuration from environment
    const config = {
      credentials: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json',
      calendarIds: (process.env.GOOGLE_CALENDAR_IDS || 'primary').split(',').filter(id => id.trim()),
      timeRange: {
        start: process.env.CALENDAR_START_DATE || undefined,
        end: process.env.CALENDAR_END_DATE || undefined
      },
      maxResults: parseInt(process.env.CALENDAR_MAX_RESULTS || '50', 10)
    };

    // Clean up undefined time range values
    if (!config.timeRange.start && !config.timeRange.end) {
      delete config.timeRange;
    }

    console.log(`📅 Syncing ${config.calendarIds.length} calendars...`);
    if (config.timeRange) {
      console.log(`📊 Time range: ${config.timeRange.start || 'default'} to ${config.timeRange.end || 'default'}`);
    }
    console.log(`📋 Max results per calendar: ${config.maxResults}`);

    // Initialize and run sync
    const sync = new SimpleCalendarSync(config);
    await sync.syncCalendars();

    console.log('✅ Google Calendar sync completed successfully!');
  } catch (error) {
    console.error('❌ Google Calendar sync failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };