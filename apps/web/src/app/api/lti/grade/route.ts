/**
 * LTI 1.3 Grade Passback — Assignment and Grade Services (AGS)
 *
 * POST /api/lti/grade - Send a grade back to the LMS for a student
 *
 * Uses LTI AGS (Assignment and Grade Services) to pass grades from
 * TutorWise assessments back to the school's LMS gradebook.
 *
 * @module api/lti/grade
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

interface GradePassbackRequest {
  platform_id: string;
  lineitem_url: string;
  lti_user_id: string;
  score: number;
  max_score: number;
  comment?: string;
  activity_progress?: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  grading_progress?: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GradePassbackRequest = await request.json();

    if (!body.platform_id || !body.lineitem_url || !body.lti_user_id) {
      return NextResponse.json(
        { error: 'platform_id, lineitem_url, and lti_user_id are required' },
        { status: 400 }
      );
    }

    if (body.score < 0 || body.score > body.max_score) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }

    // Look up platform
    const serviceSupabase = await createServiceRoleClient();
    const { data: platform } = await serviceSupabase
      .from('lti_platforms')
      .select('*')
      .eq('id', body.platform_id)
      .eq('is_active', true)
      .single();

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    // Get OAuth2 access token from platform's token endpoint
    const accessToken = await getAccessToken(platform);

    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to authenticate with LMS' }, { status: 502 });
    }

    // Build AGS score payload
    const scoreUrl = body.lineitem_url.endsWith('/scores')
      ? body.lineitem_url
      : `${body.lineitem_url}/scores`;

    const scorePayload = {
      userId: body.lti_user_id,
      scoreGiven: body.score,
      scoreMaximum: body.max_score,
      activityProgress: body.activity_progress || 'Completed',
      gradingProgress: body.grading_progress || 'FullyGraded',
      timestamp: new Date().toISOString(),
      comment: body.comment || undefined,
    };

    // Send score to LMS
    const scoreResponse = await fetch(scoreUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(scorePayload),
    });

    if (!scoreResponse.ok) {
      const errorText = await scoreResponse.text();
      console.error('[LTI Grade] Passback failed:', scoreResponse.status, errorText);
      return NextResponse.json(
        { error: 'Grade passback failed', details: errorText },
        { status: scoreResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Grade sent to LMS successfully',
      score: body.score,
      max_score: body.max_score,
    });
  } catch (error) {
    console.error('[LTI Grade] Error:', error);
    return NextResponse.json({ error: 'Grade passback failed' }, { status: 500 });
  }
}

// --- OAuth2 Client Credentials ---

interface LTIPlatform {
  client_id: string;
  token_endpoint: string;
}

async function getAccessToken(platform: LTIPlatform): Promise<string | null> {
  try {
    // LTI 1.3 uses client_credentials grant with JWT assertion
    // For simplicity, we use client_credentials with client_id/client_secret
    // In production, this should use a signed JWT assertion
    const tokenResponse = await fetch(platform.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: platform.client_id,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('[LTI] Token request failed:', tokenResponse.status);
      return null;
    }

    const tokenData = await tokenResponse.json() as { access_token: string };
    return tokenData.access_token;
  } catch (error) {
    console.error('[LTI] Token request error:', error);
    return null;
  }
}
