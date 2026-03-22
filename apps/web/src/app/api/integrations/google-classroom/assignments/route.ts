/**
 * Google Classroom — List Assignments (v1.0)
 *
 * GET /api/integrations/google-classroom/assignments?courseId=X
 * Returns active assignments for the tutor's Google Classroom courses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

async function refreshTokenIfNeeded(integration: any, clientId: string, clientSecret: string, supabase: any) {
  if (!integration.expires_at) return integration.access_token;
  const expiresAt = new Date(integration.expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) return integration.access_token;

  if (!integration.refresh_token) return integration.access_token;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const tokens = await res.json();
  if (!tokens.access_token) return integration.access_token;

  await supabase
    .from('tutor_integrations')
    .update({
      access_token: tokens.access_token,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    })
    .eq('id', integration.id);

  return tokens.access_token;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: integration } = await supabase
    .from('tutor_integrations')
    .select('*')
    .eq('tutor_id', user.id)
    .eq('provider', 'google_classroom')
    .single();

  if (!integration) {
    return NextResponse.json({ connected: false, courses: [], assignments: [] });
  }

  const accessToken = clientId && clientSecret
    ? await refreshTokenIfNeeded(integration, clientId, clientSecret, supabase)
    : integration.access_token;

  const courseId = request.nextUrl.searchParams.get('courseId');

  try {
    // Get courses
    const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const coursesData = await coursesRes.json();
    const courses = (coursesData.courses || []).map((c: any) => ({ id: c.id, name: c.name, section: c.section }));

    // If courseId specified, fetch its assignments
    let assignments: any[] = [];
    if (courseId) {
      const cwRes = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?orderBy=dueDate desc&pageSize=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const cwData = await cwRes.json();
      assignments = (cwData.courseWork || []).map((cw: any) => ({
        id: cw.id,
        title: cw.title,
        description: cw.description,
        dueDate: cw.dueDate ? `${cw.dueDate.year}-${String(cw.dueDate.month).padStart(2,'0')}-${String(cw.dueDate.day).padStart(2,'0')}` : null,
        state: cw.state,
      }));
    }

    return NextResponse.json({ connected: true, courses, assignments });
  } catch (err: any) {
    console.error('[google-classroom/assignments] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
