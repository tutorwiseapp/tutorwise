/**
 * Filename: apps/web/src/app/api/resources/analytics/track/route.ts
 * Purpose: API endpoint to track blog analytics events
 * Created: 2026-01-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { article_id, event_type, metadata } = body;

    if (!article_id || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields: article_id, event_type' },
        { status: 400 }
      );
    }

    // For now, just log the event
    // In the future, this can store data in resource_article_metrics table
    console.log('Analytics event:', {
      article_id,
      event_type,
      metadata,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
