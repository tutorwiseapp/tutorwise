/**
 * Simple Google Calendar Sync for Claude Code Context Engineering
 * Fetches calendar events and converts them to development context
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';

interface CalendarConfig {
  credentials: string; // Path to service account JSON
  calendarIds: string[]; // Calendar IDs to sync
  timeRange?: {
    start: string; // ISO date string
    end: string; // ISO date string
  };
  maxResults?: number;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus: string;
  }[];
  creator: {
    email: string;
    displayName?: string;
  };
  organizer: {
    email: string;
    displayName?: string;
  };
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  recurringEventId?: string;
  calendarId: string;
  calendarName: string;
}

interface CalendarSummary {
  id: string;
  name: string;
  description?: string;
  timeZone: string;
  events: CalendarEvent[];
}

class SimpleCalendarSync {
  private config: CalendarConfig;
  private accessToken: string = '';

  constructor(config: CalendarConfig) {
    this.config = config;
  }

  async syncCalendars(): Promise<void> {
    try {
      console.log('🔄 Syncing Google Calendars to Claude Code context...');

      // Authenticate with Google APIs
      await this.authenticate();

      // Create directories
      await mkdir('.ai/calendar', { recursive: true });
      await mkdir('.ai/calendar/calendars', { recursive: true });
      await mkdir('.ai/calendar/events', { recursive: true });

      let allCalendars: CalendarSummary[] = [];

      // Sync events from specified calendars
      for (const calendarId of this.config.calendarIds) {
        console.log(`📅 Syncing calendar: ${calendarId}`);
        const calendar = await this.getCalendarEvents(calendarId);
        if (calendar) {
          allCalendars.push(calendar);
        }
      }

      console.log(`📋 Processing ${allCalendars.length} calendars with ${allCalendars.reduce((sum, cal) => sum + cal.events.length, 0)} events...`);

      // Create calendar files
      for (const calendar of allCalendars) {
        const calendarMd = this.formatCalendarAsMarkdown(calendar);
        const filename = this.sanitizeFilename(`${calendar.name}.md`);
        await writeFile(`.ai/calendar/calendars/${filename}`, calendarMd);

        // Create individual event files for important events
        const importantEvents = calendar.events.filter(event =>
          this.isImportantEvent(event)
        ).slice(0, 10); // Limit to 10 most important

        for (const event of importantEvents) {
          const eventMd = this.formatEventAsMarkdown(event, calendar);
          const eventFilename = this.sanitizeFilename(`${calendar.name}-${event.summary}-${event.id}.md`);
          await writeFile(`.ai/calendar/events/${eventFilename}`, eventMd);
        }
      }

      // Create overview file
      const overview = this.createOverview(allCalendars);
      await writeFile('.ai/calendar/overview.md', overview);

      // Create development schedule context
      const schedule = this.createDevelopmentSchedule(allCalendars);
      await writeFile('.ai/calendar/development-schedule.md', schedule);

      // Update main context
      await this.updateMainContext(allCalendars);

      console.log('✅ Google Calendar sync completed successfully!');
      console.log(`📁 Files created:`);
      console.log('   - .ai/calendar/overview.md');
      console.log('   - .ai/calendar/development-schedule.md');
      console.log(`   - .ai/calendar/calendars/ (${allCalendars.length} files)`);
      console.log(`   - .ai/calendar/events/ (important events)`);
      console.log('   - Updated .ai/PROMPT.md');

    } catch (error) {
      console.error('❌ Error syncing Google Calendar:', error);
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    try {
      // Load service account credentials
      const credentials = JSON.parse(await readFile(this.config.credentials, 'utf8'));

      // Create JWT for Google APIs
      const jwt = await this.createJWT(credentials);

      // Exchange JWT for access token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      console.log('✅ Authenticated with Google Calendar API');

    } catch (error) {
      console.error('❌ Google Calendar authentication failed:', error);
      throw new Error('Failed to authenticate with Google APIs. Check your service account credentials.');
    }
  }

  private async createJWT(credentials: any): Promise<string> {
    const jwt = require('jsonwebtoken');

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Sign the JWT with the private key from service account
    return jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' });
  }

  private async getCalendarEvents(calendarId: string): Promise<CalendarSummary | null> {
    try {
      // Get calendar metadata
      const calendarResponse = await this.makeGoogleAPIRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`
      );

      // Set up time range for events
      const now = new Date();
      const timeMin = this.config.timeRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      const timeMax = this.config.timeRange?.end || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days from now
      const maxResults = this.config.maxResults || 50;

      // Get calendar events
      const eventsResponse = await this.makeGoogleAPIRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`
      );

      const events: CalendarEvent[] = (eventsResponse.items || []).map((event: any) => ({
        id: event.id,
        summary: event.summary || 'No title',
        description: event.description || '',
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees || [],
        creator: event.creator,
        organizer: event.organizer,
        status: event.status,
        htmlLink: event.htmlLink,
        created: event.created,
        updated: event.updated,
        recurringEventId: event.recurringEventId,
        calendarId: calendarId,
        calendarName: calendarResponse.summary
      }));

      return {
        id: calendarId,
        name: calendarResponse.summary,
        description: calendarResponse.description,
        timeZone: calendarResponse.timeZone,
        events
      };

    } catch (error) {
      console.warn(`⚠️  Could not fetch calendar ${calendarId}: ${error}`);
      return null;
    }
  }

  private isImportantEvent(event: CalendarEvent): boolean {
    const summary = (event.summary || '').toLowerCase();
    const description = (event.description || '').toLowerCase();

    // Consider events important if they relate to development, meetings, deadlines
    const importantKeywords = [
      'meeting', 'standup', 'review', 'deadline', 'demo', 'presentation',
      'development', 'coding', 'planning', 'sprint', 'release',
      'client', 'stakeholder', 'interview', 'deployment'
    ];

    return importantKeywords.some(keyword =>
      summary.includes(keyword) || description.includes(keyword)
    ) || event.attendees && event.attendees.length > 1; // Multi-person events
  }

  private formatEventAsMarkdown(event: CalendarEvent, calendar: CalendarSummary): string {
    const startDate = this.formatEventDate(event.start);
    const endDate = this.formatEventDate(event.end);
    const duration = this.calculateDuration(event.start, event.end);

    return `# ${event.summary}

**Calendar**: ${calendar.name}
**Event ID**: ${event.id}
**Status**: ${event.status}
**Date**: ${startDate}
**Time**: ${startDate} - ${endDate} (${duration})
${event.location ? `**Location**: ${event.location}` : ''}

## Description
${event.description || 'No description provided'}

## Attendees
${event.attendees && event.attendees.length > 0 ?
  event.attendees.map(attendee =>
    `- ${attendee.displayName || attendee.email} (${attendee.responseStatus})`
  ).join('\n') :
  'No attendees listed'
}

## Organizer
${event.organizer.displayName || event.organizer.email}

## Development Context
${this.generateDevelopmentContext(event)}

## Links
- [View in Google Calendar](${event.htmlLink})

---
*Auto-generated from Google Calendar on ${new Date().toISOString()}*
`;
  }

  private formatCalendarAsMarkdown(calendar: CalendarSummary): string {
    const upcomingEvents = calendar.events
      .filter(event => new Date(event.start.dateTime || event.start.date || '') > new Date())
      .slice(0, 10);

    const recentEvents = calendar.events
      .filter(event => new Date(event.start.dateTime || event.start.date || '') <= new Date())
      .slice(0, 5);

    return `# ${calendar.name}

**Calendar ID**: ${calendar.id}
**Time Zone**: ${calendar.timeZone}
**Total Events**: ${calendar.events.length}
${calendar.description ? `**Description**: ${calendar.description}` : ''}

## Upcoming Events (Next 10)
${upcomingEvents.length > 0 ? upcomingEvents.map(event => {
  const date = this.formatEventDate(event.start);
  return `- **${event.summary}** - ${date}${event.location ? ` (${event.location})` : ''}`;
}).join('\n') : 'No upcoming events'}

## Recent Events (Last 5)
${recentEvents.length > 0 ? recentEvents.map(event => {
  const date = this.formatEventDate(event.start);
  return `- **${event.summary}** - ${date}${event.location ? ` (${event.location})` : ''}`;
}).join('\n') : 'No recent events'}

## Development Impact
${this.generateCalendarDevelopmentImpact(calendar)}

---
*Auto-generated from Google Calendar on ${new Date().toISOString()}*
`;
  }

  private generateDevelopmentContext(event: CalendarEvent): string {
    const summary = (event.summary || '').toLowerCase();
    const description = (event.description || '').toLowerCase();

    if (summary.includes('standup') || summary.includes('daily')) {
      return 'Daily standup meeting - may affect development schedule and task priorities.';
    }
    if (summary.includes('sprint') || summary.includes('planning')) {
      return 'Sprint planning session - likely to impact current development priorities and task assignments.';
    }
    if (summary.includes('review') || summary.includes('demo')) {
      return 'Review or demo session - code should be in presentable state. Consider preparing demo-ready features.';
    }
    if (summary.includes('deadline') || description.includes('due')) {
      return 'Important deadline - prioritize related development tasks and ensure completion timeline.';
    }
    if (summary.includes('client') || summary.includes('stakeholder')) {
      return 'Client/stakeholder meeting - may result in requirement changes or new feature requests.';
    }
    if (event.attendees && event.attendees.length > 3) {
      return 'Large meeting - may indicate important decisions or announcements affecting development.';
    }

    return 'Regular calendar event - monitor for any development-related discussions or decisions.';
  }

  private generateCalendarDevelopmentImpact(calendar: CalendarSummary): string {
    const importantEvents = calendar.events.filter(event => this.isImportantEvent(event));
    const upcomingDeadlines = calendar.events.filter(event => {
      const summary = (event.summary || '').toLowerCase();
      return (summary.includes('deadline') || summary.includes('due')) &&
             new Date(event.start.dateTime || event.start.date || '') > new Date();
    });

    let impact = [];

    if (upcomingDeadlines.length > 0) {
      impact.push(`${upcomingDeadlines.length} upcoming deadlines requiring development attention`);
    }

    if (importantEvents.length > calendar.events.length * 0.3) {
      impact.push('High meeting density - plan development work around scheduled commitments');
    }

    if (impact.length === 0) {
      impact.push('Regular schedule with minimal development interruptions expected');
    }

    return impact.join('. ') + '.';
  }

  private formatEventDate(dateTime: any): string {
    if (dateTime.dateTime) {
      return new Date(dateTime.dateTime).toLocaleString();
    } else if (dateTime.date) {
      return new Date(dateTime.date).toLocaleDateString();
    }
    return 'No date';
  }

  private calculateDuration(start: any, end: any): string {
    const startTime = new Date(start.dateTime || start.date);
    const endTime = new Date(end.dateTime || end.date);
    const durationMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private createOverview(calendars: CalendarSummary[]): string {
    const totalEvents = calendars.reduce((sum, cal) => sum + cal.events.length, 0);
    const upcomingEvents = calendars.flatMap(cal => cal.events)
      .filter(event => new Date(event.start.dateTime || event.start.date || '') > new Date())
      .sort((a, b) => new Date(a.start.dateTime || a.start.date || '').getTime() -
                      new Date(b.start.dateTime || b.start.date || '').getTime())
      .slice(0, 10);

    return `# Google Calendar Overview

**Total Calendars**: ${calendars.length}
**Total Events**: ${totalEvents}
**Last Synced**: ${new Date().toISOString()}

## Calendars
${calendars.map(cal =>
  `- **[${cal.name}](./calendars/${this.sanitizeFilename(cal.name)}.md)**: ${cal.events.length} events (${cal.timeZone})`
).join('\n')}

## Upcoming Events (Next 10)
${upcomingEvents.map(event => {
  const date = this.formatEventDate(event.start);
  return `- **${event.summary}** (${event.calendarName}) - ${date}`;
}).join('\n')}

## Development Impact Summary
${calendars.map(cal =>
  `- **${cal.name}**: ${this.generateCalendarDevelopmentImpact(cal)}`
).join('\n')}

---
*This overview is automatically updated when you run Calendar sync.*
`;
  }

  private createDevelopmentSchedule(calendars: CalendarSummary[]): string {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const thisWeekEvents = calendars.flatMap(cal => cal.events)
      .filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date || '');
        return eventDate >= now && eventDate <= nextWeek && this.isImportantEvent(event);
      })
      .sort((a, b) => new Date(a.start.dateTime || a.start.date || '').getTime() -
                      new Date(b.start.dateTime || b.start.date || '').getTime());

    return `# Development Schedule Context

**Generated**: ${new Date().toISOString()}
**Scope**: Next 7 days of development-relevant events

## This Week's Development Schedule

${thisWeekEvents.length > 0 ? thisWeekEvents.map(event => {
  const date = this.formatEventDate(event.start);
  const duration = this.calculateDuration(event.start, event.end);
  return `### ${event.summary}
- **Date/Time**: ${date} (${duration})
- **Calendar**: ${event.calendarName}
- **Impact**: ${this.generateDevelopmentContext(event)}
${event.description ? `- **Notes**: ${event.description.substring(0, 200)}...` : ''}`;
}).join('\n\n') : 'No development-relevant events scheduled for this week.'}

## Development Planning Recommendations

${thisWeekEvents.length > 0 ? `
- **Meeting-Heavy Days**: ${this.identifyBusyDays(thisWeekEvents)}
- **Best Development Windows**: Plan focused coding during gaps between meetings
- **Deadline Awareness**: Monitor upcoming deadlines for priority adjustments
- **Context Switching**: Minimize task switching on meeting-heavy days
` : `
- **Clear Schedule**: Good opportunity for focused development work
- **Plan Ahead**: Use this time for complex features requiring deep focus
- **Preparation**: Prepare for upcoming busy periods
`}

---
*Development schedule updated automatically with calendar sync.*
`;
  }

  private identifyBusyDays(events: CalendarEvent[]): string {
    const dayGroups = events.reduce((groups: { [key: string]: number }, event) => {
      const date = new Date(event.start.dateTime || event.start.date || '').toLocaleDateString();
      groups[date] = (groups[date] || 0) + 1;
      return groups;
    }, {});

    const busyDays = Object.entries(dayGroups)
      .filter(([_, count]) => count >= 3)
      .map(([date, count]) => `${date} (${count} events)`)
      .join(', ');

    return busyDays || 'No particularly busy days identified';
  }

  private async updateMainContext(calendars: CalendarSummary[]): Promise<void> {
    const totalEvents = calendars.reduce((sum, cal) => sum + cal.events.length, 0);
    const upcomingImportant = calendars.flatMap(cal => cal.events)
      .filter(event => new Date(event.start.dateTime || event.start.date || '') > new Date() && this.isImportantEvent(event))
      .slice(0, 3);

    const contextSection = `

## Google Calendar Context (Auto-generated)

**Total Calendars**: ${calendars.length}
**Total Events**: ${totalEvents}
**Last Synced**: ${new Date().toLocaleDateString()}

**Calendars**:
${calendars.map(cal =>
  `- **${cal.name}**: ${cal.events.length} events`
).join('\n')}

**Upcoming Important Events**:
${upcomingImportant.map(event => {
  const date = this.formatEventDate(event.start);
  return `- **${event.summary}** (${event.calendarName}) - ${date}`;
}).join('\n') || 'No important events scheduled'}

> This context is automatically updated when you run Calendar sync.
> Development schedule and impact analysis available in \`.ai/calendar/\`

---
`;

    try {
      let promptContent = await readFile('.ai/PROMPT.md', 'utf8');

      // Remove existing Calendar context section
      const contextRegex = /## Google Calendar Context \(Auto-generated\)[\s\S]*?---\n/;
      promptContent = promptContent.replace(contextRegex, '');

      // Add new context section
      promptContent += contextSection;

      await writeFile('.ai/PROMPT.md', promptContent);
    } catch (error) {
      console.log('Note: Could not update .ai/PROMPT.md - file may not exist');
    }
  }

  private async makeGoogleAPIRequest(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .replace(/\.md$/, '');
  }
}

export { SimpleCalendarSync };