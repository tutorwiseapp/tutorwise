/**
 * AI Post-Session Report API (v1.0)
 *
 * POST /api/virtualspace/[sessionId]/report
 *
 * Triggered when a session is marked as complete (or manually by the tutor).
 * Assembles session context (Sage messages, chat, homework, stuck signals) and
 * calls Sage AI to generate a structured report. Stores result in
 * virtualspace_sessions.session_report and emails the parent if available.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';
import { sendEmail } from '@/lib/email';

interface SessionReport {
  summary: string;
  topicsCovered: string[];
  studentStrugglePoints: string[];
  homeworkSet: string | null;
  recommendedNextSteps: string[];
  sessionDurationMins: number | null;
  generatedAt: string;
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load session + booking context
  const { data: session } = await supabase
    .from('virtualspace_sessions')
    .select(`
      id, title, session_type, owner_id, status,
      created_at, ended_at, booking_id,
      artifacts
    `)
    .eq('id', sessionId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Only owner or booking tutor can generate report
  let tutorName = '';
  let studentName = '';
  let parentEmail: string | null = null;
  let homeworkText: string | null = null;
  let subjectName = '';

  if (session.booking_id) {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        tutor_id, client_id, subject, title,
        tutor:profiles!bookings_tutor_id_fkey(full_name),
        client:profiles!bookings_client_id_fkey(full_name, email)
      `)
      .eq('id', session.booking_id)
      .single();

    if (booking) {
      if (booking.tutor_id !== user.id && booking.client_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      tutorName = (booking.tutor as any)?.full_name || '';
      studentName = (booking.client as any)?.full_name || '';
      parentEmail = (booking.client as any)?.email || null;
      subjectName = booking.subject || booking.title || '';
    }
  } else if (session.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load most recent homework sent in this session
  const { data: homeworkRows } = await supabase
    .from('virtualspace_homework')
    .select('text, due_date')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (homeworkRows?.length) {
    const hw = homeworkRows[0];
    homeworkText = hw.text + (hw.due_date ? ` (due ${hw.due_date})` : '');
  }

  // Load Sage messages from the session
  const { data: sageMessages } = await supabase
    .from('sage_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(50);

  const sageSummary = sageMessages?.length
    ? sageMessages
        .filter((m) => m.role !== 'system')
        .map((m) => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 300)}`)
        .join('\n')
    : 'No Sage AI interaction this session.';

  // Duration
  let durationMins: number | null = null;
  if (session.created_at && session.ended_at) {
    durationMins = Math.round(
      (new Date(session.ended_at).getTime() - new Date(session.created_at).getTime()) / 60000
    );
  }

  // Generate report via Sage AI
  const ai = getAIService();
  const prompt = `You are generating a structured post-session report for a tutoring session.

Session details:
- Title: ${session.title || 'Tutoring session'}
- Subject: ${subjectName || 'General'}
- Tutor: ${tutorName || 'Tutor'}
- Student: ${studentName || 'Student'}
- Duration: ${durationMins ? `${durationMins} minutes` : 'Unknown'}
- Homework set: ${homeworkText || 'None'}

Sage AI conversation log (what was discussed/taught):
${sageSummary}

Generate a structured report in JSON format with these exact fields:
{
  "summary": "2-3 sentence plain English summary of what was covered",
  "topicsCovered": ["topic1", "topic2"],
  "studentStrugglePoints": ["area1", "area2"],
  "homeworkSet": "homework description or null",
  "recommendedNextSteps": ["step1", "step2"]
}

Keep each item concise (under 20 words). Focus on what will be useful to a parent reading this.`;

  let report: SessionReport;
  try {
    const { data } = await ai.generateJSON<Omit<SessionReport, 'sessionDurationMins' | 'generatedAt'>>({
      systemPrompt: 'You are a professional tutoring assistant generating structured post-session reports. Always return valid JSON.',
      userPrompt: prompt,
    });

    report = {
      ...data,
      homeworkSet: homeworkText,
      sessionDurationMins: durationMins,
      generatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[report] AI generation failed:', err);
    // Fallback: minimal report
    report = {
      summary: `${subjectName || 'Tutoring'} session completed${durationMins ? ` in ${durationMins} minutes` : ''}.`,
      topicsCovered: [],
      studentStrugglePoints: [],
      homeworkSet: homeworkText,
      recommendedNextSteps: [],
      sessionDurationMins: durationMins,
      generatedAt: new Date().toISOString(),
    };
  }

  // Store report
  await supabase
    .from('virtualspace_sessions')
    .update({ session_report: report })
    .eq('id', sessionId);

  // Email parent if available (fire-and-forget)
  if (parentEmail && report.topicsCovered.length > 0) {
    const topicsHtml = report.topicsCovered.map((t) => `<li>${t}</li>`).join('');
    const nextStepsHtml = report.recommendedNextSteps.map((s) => `<li>${s}</li>`).join('');
    const homeworkHtml = report.homeworkSet
      ? `<p><strong>Homework set:</strong> ${report.homeworkSet}</p>`
      : '';

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
        <h2 style="color:#006c67;margin-bottom:4px">Session Report</h2>
        <p style="color:#64748b;font-size:14px;margin-top:0">${session.title || 'Tutoring session'} — ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}</p>

        <p style="line-height:1.6">${report.summary}</p>

        ${topicsHtml ? `<h3 style="color:#006c67">Topics covered</h3><ul style="margin:0;padding-left:20px;line-height:2">${topicsHtml}</ul>` : ''}
        ${homeworkHtml}
        ${nextStepsHtml ? `<h3 style="color:#006c67">Recommended next steps</h3><ul style="margin:0;padding-left:20px;line-height:2">${nextStepsHtml}</ul>` : ''}

        <div style="margin-top:24px;padding:12px 16px;background:#f0faf9;border-radius:8px;font-size:13px;color:#475569">
          <strong style="color:#006c67">Tutorwise</strong> — Powered by Sage AI
        </div>
      </div>
    `;

    sendEmail({
      to: parentEmail,
      subject: `Session Report: ${session.title || 'Tutoring session'}`,
      html,
    }).catch((err) => console.error('[report] Email failed:', err));
  }

  return NextResponse.json({ success: true, report });
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session } = await supabase
    .from('virtualspace_sessions')
    .select('session_report, owner_id')
    .eq('id', sessionId)
    .single();

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ report: session.session_report });
}
