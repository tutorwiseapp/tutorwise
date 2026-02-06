/**
 * Filename: apps/web/src/app/api/calendar/connect/google/route.ts
 * Purpose: Initiate Google Calendar OAuth flow
 * Created: 2026-02-06
 *
 * Generates OAuth authorization URL and redirects user to Google consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/calendar/google';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar/connect/google
 * Generate OAuth URL and return it for frontend to redirect
 */
export async function GET(request: NextRequest) {
  try {
    const authUrl = getGoogleAuthUrl();

    return NextResponse.json({
      success: true,
      auth_url: authUrl,
    });
  } catch (error) {
    console.error('[Calendar Connect Google] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate authorization URL'
      },
      { status: 500 }
    );
  }
}
