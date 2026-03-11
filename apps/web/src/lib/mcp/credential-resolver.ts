/**
 * MCP Credential Resolver
 * Resolves credentials for MCP server connections based on credential_type.
 * - api_key: org-wide credentials stored directly on the connection
 * - oauth_delegated: per-user tokens looked up from student_integration_links
 * - none: no credentials needed
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { MCPConnection } from './types';

export interface ResolvedCredentials {
  headers: Record<string, string>;
}

export async function resolveCredentials(
  connection: MCPConnection,
  context?: { profileId?: string }
): Promise<ResolvedCredentials> {
  switch (connection.credential_type) {
    case 'api_key': {
      // Credentials stored directly on the connection record
      const creds = connection.credentials ?? {};
      const headers: Record<string, string> = {};

      // Support different auth patterns
      if (creds.apiToken && creds.email) {
        // Atlassian Basic Auth
        const encoded = Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      } else if (creds.bearerToken) {
        headers['Authorization'] = `Bearer ${creds.bearerToken}`;
      } else if (creds.apiKey) {
        headers['x-api-key'] = creds.apiKey;
      }

      return { headers };
    }

    case 'oauth_delegated': {
      if (!context?.profileId) {
        throw new Error('OAuth-delegated MCP connection requires a profile context');
      }

      const supabase = await createServiceRoleClient();
      const oauthPlatform = (connection.metadata?.oauth_platform as string) ?? connection.slug;

      const { data: link, error } = await supabase
        .from('student_integration_links')
        .select('auth_token, refresh_token')
        .eq('student_profile_id', context.profileId)
        .eq('platform_name', oauthPlatform)
        .single();

      if (error || !link?.auth_token) {
        throw new Error(`No OAuth token found for profile ${context.profileId} on ${oauthPlatform}`);
      }

      // TODO: Check token expiry and refresh if needed (Google tokens expire after 1 hour)
      // This would use GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET + link.refresh_token

      return {
        headers: { 'Authorization': `Bearer ${link.auth_token}` },
      };
    }

    case 'none':
      return { headers: {} };

    default:
      return { headers: {} };
  }
}
