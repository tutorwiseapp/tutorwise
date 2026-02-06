/**
 * Filename: apps/web/src/lib/calendar/google.ts
 * Purpose: Google Calendar API integration service (Phase 1 & 2)
 * Created: 2026-02-06
 *
 * Handles:
 * - OAuth authentication with Google
 * - Creating calendar events from bookings
 * - Updating and deleting calendar events
 * - Token refresh management
 */

import { google } from 'googleapis';
import type { GoogleCalendarEvent, Booking } from '@/types';

// OAuth 2.0 configuration
const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/calendar/callback/google`,
};

// Calendar API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events', // Read/write calendar events
  'https://www.googleapis.com/auth/userinfo.email', // Get user email
];

/**
 * Generate OAuth authorization URL for user consent
 */
export function getGoogleAuthUrl(): string {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_OAUTH_CONFIG.clientId,
    GOOGLE_OAUTH_CONFIG.clientSecret,
    GOOGLE_OAUTH_CONFIG.redirectUri
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for access/refresh tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_OAUTH_CONFIG.clientId,
    GOOGLE_OAUTH_CONFIG.clientSecret,
    GOOGLE_OAUTH_CONFIG.redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token || null,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
  };
}

/**
 * Refresh expired access token using refresh token
 */
export async function refreshGoogleAccessToken(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_OAUTH_CONFIG.clientId,
    GOOGLE_OAUTH_CONFIG.clientSecret,
    GOOGLE_OAUTH_CONFIG.redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    access_token: credentials.access_token!,
    token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
  };
}

/**
 * Get authenticated Google Calendar API client
 */
function getCalendarClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_OAUTH_CONFIG.clientId,
    GOOGLE_OAUTH_CONFIG.clientSecret,
    GOOGLE_OAUTH_CONFIG.redirectUri
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Get user's email from Google
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return data.email!;
}

/**
 * Convert booking to Google Calendar event format
 */
function bookingToGoogleEvent(booking: Booking, viewMode: 'client' | 'tutor'): GoogleCalendarEvent {
  const startTime = new Date(booking.session_start_time);
  const endTime = new Date(startTime.getTime() + booking.session_duration * 60000);

  const otherParty = viewMode === 'client' ? booking.tutor : booking.client;
  const otherPartyName = otherParty?.full_name || 'TutorWise User';

  return {
    summary: booking.service_name,
    description: `TutorWise Session\n\n` +
                 `Service: ${booking.service_name}\n` +
                 `${viewMode === 'client' ? 'Tutor' : 'Client'}: ${otherPartyName}\n` +
                 `Duration: ${booking.session_duration} minutes\n` +
                 `Subjects: ${booking.subjects?.join(', ') || 'N/A'}\n` +
                 `Delivery Mode: ${booking.delivery_mode}\n` +
                 `\nBooking ID: ${booking.id}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Europe/London', // UK timezone for TutorWise
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Europe/London',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
        { method: 'popup', minutes: 15 }, // 15 minutes before
      ],
    },
    // Add attendees if we have email addresses
    ...(otherParty?.email && {
      attendees: [
        {
          email: otherParty.email,
          displayName: otherPartyName,
        },
      ],
    }),
  };
}

/**
 * Create calendar event from booking
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  booking: Booking,
  viewMode: 'client' | 'tutor',
  calendarId: string = 'primary'
): Promise<string> {
  const calendar = getCalendarClient(accessToken);
  const event = bookingToGoogleEvent(booking, viewMode);

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  return response.data.id!;
}

/**
 * Update existing calendar event
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  booking: Booking,
  viewMode: 'client' | 'tutor',
  calendarId: string = 'primary'
): Promise<void> {
  const calendar = getCalendarClient(accessToken);
  const event = bookingToGoogleEvent(booking, viewMode);

  await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
  });
}

/**
 * Delete calendar event
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  const calendar = getCalendarClient(accessToken);

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}
