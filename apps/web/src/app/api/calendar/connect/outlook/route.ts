/**
 * Filename: apps/web/src/app/api/calendar/connect/outlook/route.ts
 * Purpose: Initiate Microsoft Outlook Calendar OAuth connection
 * Created: 2026-02-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOutlookAuthUrl } from '@/lib/calendar/outlook';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar/connect/outlook
 * Generate Outlook OAuth authorization URL
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Generate OAuth URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/calendar/callback/outlook`;

    const authUrl = getOutlookAuthUrl(redirectUri);

    return NextResponse.json({
      success: true,
      auth_url: authUrl,
    });
  } catch (error) {
    console.error('[Outlook Connect] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate auth URL',
      },
      { status: 500 }
    );
  }
}
