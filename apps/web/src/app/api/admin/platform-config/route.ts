/**
 * Filename: src/app/api/admin/platform-config/route.ts
 * Purpose: API endpoint to fetch and update Platform configuration
 * Created: 2025-12-29
 * Pattern: Server-only API route with database-backed settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface PlatformConfigResponse {
  general: {
    platformName: string;
    platformUrl: string;
    timezone: string;
    defaultCurrency: string;
    dateFormat: string;
  };
  features: {
    enableBookings: boolean;
    enableReferrals: boolean;
    enableOrganisations: boolean;
    enableNetwork: boolean;
    enableReviews: boolean;
    maintenanceMode: boolean;
  };
  limits: {
    maxListingsPerUser: number;
    maxBookingsPerDay: number;
    maxFileUploadSizeMB: number;
    sessionTimeoutMinutes: number;
  };
}

/**
 * GET /api/admin/platform-config
 * Fetch Platform configuration from environment and database
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

    // Fetch platform settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching platform settings:', settingsError);
      return NextResponse.json(
        { error: 'Failed to fetch platform settings' },
        { status: 500 }
      );
    }

    const config: PlatformConfigResponse = {
      general: {
        platformName: settings.platform_name,
        platformUrl: settings.platform_url,
        timezone: settings.timezone,
        defaultCurrency: settings.default_currency,
        dateFormat: settings.date_format,
      },
      features: {
        enableBookings: settings.enable_bookings,
        enableReferrals: settings.enable_referrals,
        enableOrganisations: settings.enable_organisations,
        enableNetwork: settings.enable_network,
        enableReviews: settings.enable_reviews,
        maintenanceMode: settings.maintenance_mode,
      },
      limits: {
        maxListingsPerUser: settings.max_listings_per_user,
        maxBookingsPerDay: settings.max_bookings_per_day,
        maxFileUploadSizeMB: settings.max_file_upload_size_mb,
        sessionTimeoutMinutes: settings.session_timeout_minutes,
      },
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching platform config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/platform-config
 * Update Platform configuration
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
    const { general, features, limits } = body;

    // Update platform settings in database
    const { error: updateError } = await supabase
      .from('platform_settings')
      .update({
        platform_name: general.platformName,
        platform_url: general.platformUrl,
        timezone: general.timezone,
        default_currency: general.defaultCurrency,
        date_format: general.dateFormat,
        enable_bookings: features.enableBookings,
        enable_referrals: features.enableReferrals,
        enable_organisations: features.enableOrganisations,
        enable_network: features.enableNetwork,
        enable_reviews: features.enableReviews,
        maintenance_mode: features.maintenanceMode,
        max_listings_per_user: limits.maxListingsPerUser,
        max_bookings_per_day: limits.maxBookingsPerDay,
        max_file_upload_size_mb: limits.maxFileUploadSizeMB,
        session_timeout_minutes: limits.sessionTimeoutMinutes,
      })
      .eq('id', 1);

    if (updateError) {
      console.error('Error updating platform settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update platform settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating platform config:', error);
    return NextResponse.json(
      { error: 'Failed to update platform configuration' },
      { status: 500 }
    );
  }
}
