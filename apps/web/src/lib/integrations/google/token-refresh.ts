/**
 * Token refresh service for Google OAuth integrations
 *
 * Google access tokens expire after 1 hour (3600s).
 * This service auto-refreshes tokens when they're expired or within 5 minutes of expiry.
 * If refresh fails (token revoked), marks integration as inactive.
 */

import { createClient as createServerClient } from '@/utils/supabase/server';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

interface TokenRecord {
  auth_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
}

/**
 * Get a valid (non-expired) access token for a user's platform integration.
 * Auto-refreshes if expired or within 5 minutes of expiry.
 *
 * @throws Error if no integration found, integration inactive, or refresh fails
 */
export async function getValidToken(profileId: string, platformName: string): Promise<string> {
  const supabase = await createServerClient();

  // Fetch current token record
  const { data: record, error } = await supabase
    .from('student_integration_links')
    .select('auth_token, refresh_token, token_expires_at, is_active')
    .eq('profile_id', profileId)
    .eq('platform_name', platformName)
    .single();

  if (error || !record) {
    throw new Error(`No ${platformName} integration found for user`);
  }

  const tokenRecord = record as TokenRecord;

  if (!tokenRecord.is_active) {
    throw new Error(`${platformName} integration is inactive — please reconnect`);
  }

  if (!tokenRecord.auth_token) {
    throw new Error(`No access token stored for ${platformName}`);
  }

  // Check if token is still valid (with buffer)
  if (tokenRecord.token_expires_at) {
    const expiresAt = new Date(tokenRecord.token_expires_at).getTime();
    const now = Date.now();

    if (now < expiresAt - REFRESH_BUFFER_MS) {
      // Token is still valid
      return tokenRecord.auth_token;
    }
  }

  // Token expired or no expiry tracked — attempt refresh
  if (!tokenRecord.refresh_token) {
    // No refresh token — mark inactive and throw
    await supabase
      .from('student_integration_links')
      .update({ is_active: false })
      .eq('profile_id', profileId)
      .eq('platform_name', platformName);

    throw new Error(`${platformName} token expired and no refresh token available — please reconnect`);
  }

  return refreshToken(supabase, profileId, platformName, tokenRecord.refresh_token);
}

async function refreshToken(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  profileId: string,
  platformName: string,
  refreshTokenValue: string,
): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshTokenValue,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google token refresh failed for ${profileId}:`, errorText);

    // If refresh token is invalid/revoked, mark integration inactive
    if (response.status === 400 || response.status === 401) {
      await supabase
        .from('student_integration_links')
        .update({ is_active: false })
        .eq('profile_id', profileId)
        .eq('platform_name', platformName);

      throw new Error(`${platformName} authorization revoked — please reconnect`);
    }

    throw new Error(`Failed to refresh ${platformName} token`);
  }

  const tokens = await response.json();
  const { access_token, expires_in } = tokens;

  // Calculate new expiry time
  const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

  // Update stored token
  const { error: updateError } = await supabase
    .from('student_integration_links')
    .update({
      auth_token: access_token,
      token_expires_at: tokenExpiresAt,
      is_active: true,
    })
    .eq('profile_id', profileId)
    .eq('platform_name', platformName);

  if (updateError) {
    console.error('Failed to update refreshed token:', updateError);
    // Still return the token — it's valid even if we failed to persist it
  }

  return access_token;
}
