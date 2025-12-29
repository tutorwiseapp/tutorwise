/**
 * Filename: src/app/api/admin/security-config/route.ts
 * Purpose: API endpoint to fetch and update Security configuration
 * Created: 2025-12-29
 * Pattern: Server-only API route with database-backed settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface SecurityConfigResponse {
  adminAccess: {
    require2FA: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    ipWhitelist: string;
  };
  rateLimiting: {
    apiRateLimitPerMinute: number;
    loginRateLimitPerHour: number;
    searchRateLimitPerMinute: number;
  };
  apiKeys: Array<{
    id: string;
    name: string;
    key: string;
    created_at: string;
    last_used: string | null;
  }>;
}

/**
 * GET /api/admin/security-config
 * Fetch Security configuration from database
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

    // Fetch security settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('security_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching security settings:', settingsError);
      return NextResponse.json(
        { error: 'Failed to fetch security settings' },
        { status: 500 }
      );
    }

    const config: SecurityConfigResponse = {
      adminAccess: {
        require2FA: settings.require_2fa,
        sessionTimeoutMinutes: settings.session_timeout_minutes,
        maxLoginAttempts: settings.max_login_attempts,
        ipWhitelist: settings.ip_whitelist,
      },
      rateLimiting: {
        apiRateLimitPerMinute: settings.api_rate_limit_per_minute,
        loginRateLimitPerHour: settings.login_rate_limit_per_hour,
        searchRateLimitPerMinute: settings.search_rate_limit_per_minute,
      },
      apiKeys: [], // TODO: Fetch from api_keys table when it exists
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching security config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/security-config
 * Update Security configuration
 */
export async function PUT(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { adminAccess, rateLimiting } = body;

    // Update security settings in database
    const { error: updateError } = await supabase
      .from('security_settings')
      .update({
        require_2fa: adminAccess.require2FA,
        session_timeout_minutes: adminAccess.sessionTimeoutMinutes,
        max_login_attempts: adminAccess.maxLoginAttempts,
        ip_whitelist: adminAccess.ipWhitelist,
        api_rate_limit_per_minute: rateLimiting.apiRateLimitPerMinute,
        login_rate_limit_per_hour: rateLimiting.loginRateLimitPerHour,
        search_rate_limit_per_minute: rateLimiting.searchRateLimitPerMinute,
      })
      .eq('id', 1);

    if (updateError) {
      console.error('Error updating security settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update security settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating security config:', error);
    return NextResponse.json(
      { error: 'Failed to update security configuration' },
      { status: 500 }
    );
  }
}
