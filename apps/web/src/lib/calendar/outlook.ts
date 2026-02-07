/**
 * Filename: apps/web/src/lib/calendar/outlook.ts
 * Purpose: Microsoft Outlook Calendar API integration service
 * Created: 2026-02-07
 *
 * Handles OAuth authentication and calendar event management for Outlook/Microsoft 365
 */

import type { Booking } from '@/types';

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MICROSOFT_CALENDAR_API = 'https://graph.microsoft.com/v1.0/me';

// Scopes required for calendar access
const SCOPES = [
  'Calendars.ReadWrite',
  'offline_access', // For refresh token
  'User.Read', // For user email
].join(' ');

interface OutlookTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface OutlookCalendarEvent {
  subject: string;
  body: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  isReminderOn: boolean;
  reminderMinutesBeforeStart?: number;
}

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getOutlookAuthUrl(redirectUri: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  if (!clientId) {
    throw new Error('MICROSOFT_CLIENT_ID environment variable is not set');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_mode: 'query',
    prompt: 'consent', // Force consent to ensure refresh token
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens
 */
export async function exchangeOutlookCode(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  email: string;
}> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('[Outlook OAuth] Token exchange failed:', error);
    throw new Error('Failed to exchange authorization code');
  }

  const tokens: OutlookTokenResponse = await tokenResponse.json();

  // Get user email
  const userResponse = await fetch(`${MICROSOFT_CALENDAR_API}`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch user information');
  }

  const userData = await userResponse.json();
  const email = userData.mail || userData.userPrincipalName;

  // Calculate token expiry (expires_in is in seconds)
  const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expiry: expiryDate.toISOString(),
    email,
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshOutlookAccessToken(refreshToken: string): Promise<{
  access_token: string;
  token_expiry: string;
}> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Outlook Token Refresh] Failed:', error);
    throw new Error('Failed to refresh Outlook access token');
  }

  const tokens: OutlookTokenResponse = await response.json();

  const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

  return {
    access_token: tokens.access_token,
    token_expiry: expiryDate.toISOString(),
  };
}

/**
 * Check if token is expired or expiring soon (within 5 minutes)
 */
export function isTokenExpired(tokenExpiry: string | null): boolean {
  if (!tokenExpiry) return false;

  const expiryTime = new Date(tokenExpiry).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  return expiryTime <= (now + fiveMinutes);
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  accessToken: string,
  refreshToken: string | null,
  tokenExpiry: string | null
): Promise<{
  accessToken: string;
  needsRefresh: boolean;
  newExpiry?: string;
}> {
  if (!isTokenExpired(tokenExpiry)) {
    return { accessToken, needsRefresh: false };
  }

  if (!refreshToken) {
    throw new Error('Token expired and no refresh token available. User must reconnect calendar.');
  }

  console.log('[Outlook Calendar] Access token expired, refreshing...');
  const { access_token, token_expiry } = await refreshOutlookAccessToken(refreshToken);

  return {
    accessToken: access_token,
    needsRefresh: true,
    newExpiry: token_expiry,
  };
}

/**
 * Convert TutorWise booking to Outlook Calendar event format
 */
function bookingToOutlookEvent(booking: Booking, userRole: 'client' | 'tutor'): OutlookCalendarEvent {
  if (!booking.session_start_time) {
    throw new Error('Booking must have a session_start_time to create calendar event');
  }

  const startTime = new Date(booking.session_start_time);
  const endTime = new Date(startTime.getTime() + booking.session_duration * 60 * 1000);

  // Build event title
  const title = userRole === 'client'
    ? `TutorWise Session with ${booking.tutor?.full_name || 'Tutor'}`
    : `TutorWise Session with ${booking.client?.full_name || 'Client'}`;

  // Build event description
  const description = `
<b>TutorWise Booking</b><br/>
<br/>
<b>Service:</b> ${booking.service_name}<br/>
<b>Subjects:</b> ${booking.subjects?.join(', ') || 'N/A'}<br/>
<b>Duration:</b> ${booking.session_duration} minutes<br/>
<b>Delivery Mode:</b> ${booking.delivery_mode || 'N/A'}<br/>
${booking.location_city ? `<b>Location:</b> ${booking.location_city}<br/>` : ''}
${booking.amount ? `<b>Amount:</b> £${(booking.amount / 100).toFixed(2)}<br/>` : ''}
<br/>
<b>Booking ID:</b> ${booking.id}
  `.trim();

  return {
    subject: title,
    body: {
      contentType: 'HTML',
      content: description,
    },
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'UTC',
    },
    location: booking.location_city
      ? { displayName: booking.location_city }
      : undefined,
    isReminderOn: true,
    reminderMinutesBeforeStart: 60, // 1 hour before (Outlook uses single reminder)
  };
}

/**
 * Create a calendar event in Outlook
 */
export async function createOutlookEvent(
  accessToken: string,
  booking: Booking,
  userRole: 'client' | 'tutor'
): Promise<{ event_id: string }> {
  const event = bookingToOutlookEvent(booking, userRole);

  const response = await fetch(`${MICROSOFT_CALENDAR_API}/calendar/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Outlook Calendar] Create event failed:', error);
    throw new Error('Failed to create Outlook calendar event');
  }

  const createdEvent = await response.json();

  return { event_id: createdEvent.id };
}

/**
 * Update an existing calendar event in Outlook
 */
export async function updateOutlookEvent(
  accessToken: string,
  eventId: string,
  booking: Booking,
  userRole: 'client' | 'tutor'
): Promise<void> {
  const event = bookingToOutlookEvent(booking, userRole);

  const response = await fetch(`${MICROSOFT_CALENDAR_API}/calendar/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Outlook Calendar] Update event failed:', error);
    throw new Error('Failed to update Outlook calendar event');
  }
}

/**
 * Delete a calendar event from Outlook
 */
export async function deleteOutlookEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(`${MICROSOFT_CALENDAR_API}/calendar/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    // 404 is acceptable - event already deleted
    const error = await response.text();
    console.error('[Outlook Calendar] Delete event failed:', error);
    throw new Error('Failed to delete Outlook calendar event');
  }
}
