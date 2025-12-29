/**
 * Filename: src/app/api/admin/integrations-config/route.ts
 * Purpose: API endpoint to fetch Integrations configuration
 * Created: 2025-12-29
 * Pattern: Server-only API route with real environment data
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface IntegrationsConfigResponse {
  thirdPartyApis: {
    googleAnalyticsId: string;
    sentryDsn: string;
    intercomWorkspaceId: string;
    slackWebhookUrl: string;
  };
  externalServices: {
    redis: {
      enabled: boolean;
      url: string;
    };
    ably: {
      enabled: boolean;
      apiKey: string;
    };
    supabaseStorage: {
      enabled: boolean;
      bucket: string;
    };
  };
  webhooks: Array<{
    id: string;
    url: string;
    events: string[];
    status: 'active' | 'inactive';
  }>;
}

/**
 * GET /api/admin/integrations-config
 * Fetch Integrations configuration from environment and database
 */
export async function GET() {
  try {
    // Verify user is authenticated and is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get integrations from environment variables
    const redisUrl = process.env.REDIS_URL || '';
    const ablyApiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY || '';
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

    // TODO: Store these in database instead of environment
    const googleAnalyticsId = ''; // Not in env yet
    const intercomWorkspaceId = ''; // Not in env yet
    const slackWebhookUrl = ''; // Not in env yet

    // Fetch webhooks from database
    const { data: webhooksData, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
    }

    const webhooks: IntegrationsConfigResponse['webhooks'] = (webhooksData || []).map(webhook => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      status: webhook.status as 'active' | 'inactive',
    }));

    const config: IntegrationsConfigResponse = {
      thirdPartyApis: {
        googleAnalyticsId,
        sentryDsn,
        intercomWorkspaceId,
        slackWebhookUrl,
      },
      externalServices: {
        redis: {
          enabled: !!redisUrl,
          url: redisUrl,
        },
        ably: {
          enabled: !!ablyApiKey,
          apiKey: ablyApiKey, // Show full API key for admin
        },
        supabaseStorage: {
          enabled: true, // Always enabled in this setup
          bucket: 'tutorwise-uploads', // Default bucket
        },
      },
      webhooks,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching integrations config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations configuration' },
      { status: 500 }
    );
  }
}
