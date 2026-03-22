/**
 * PDF Worksheet Generation API (v1.0)
 *
 * POST /api/virtualspace/[sessionId]/worksheet
 *
 * Sage generates 5–10 GCSE/A-Level practice questions from session content.
 * Renders them to a PDF via @react-pdf/renderer and returns the PDF as a
 * downloadable file (or stores it in Supabase Storage).
 */

/* eslint-disable react/jsx-key */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';

interface WorksheetQuestion {
  number: number;
  question: string;
  marks: number;
  hint?: string;
  type: 'short' | 'long' | 'calculation' | 'diagram';
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load session context
  const { data: session } = await supabase
    .from('virtualspace_sessions')
    .select('id, title, owner_id, session_report, booking_id')
    .eq('id', sessionId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Tutor only
  let subject = '';
  if (session.booking_id) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('tutor_id, subject, title')
      .eq('id', session.booking_id)
      .single();
    if (booking?.tutor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    subject = booking.subject || booking.title || '';
  } else if (session.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get topics from session report (if available) or use title
  const topics: string[] = session.session_report?.topicsCovered?.length
    ? session.session_report.topicsCovered
    : [subject || session.title || 'General'];

  // Generate questions via Sage AI
  const ai = getAIService();
  let questions: WorksheetQuestion[] = [];

  try {
    const { data } = await ai.generateJSON<{ questions: WorksheetQuestion[] }>({
      systemPrompt: 'You are a GCSE/A-Level UK maths and science teacher generating practice worksheets. Always return valid JSON.',
      userPrompt: `Generate a GCSE/A-Level style practice worksheet for these topics: ${topics.join(', ')}.

Create 6–8 questions of varying difficulty and type. Each question should:
- Be clear and unambiguous
- Include a marks allocation (1–5 marks each)
- Be appropriate for a UK secondary school student

Return JSON:
{
  "questions": [
    {
      "number": 1,
      "question": "question text",
      "marks": 2,
      "hint": "optional brief hint",
      "type": "short|long|calculation|diagram"
    }
  ]
}

Mix types: short answer, calculation, explanation, and at least one multi-step problem.`,
    });
    questions = data.questions || [];
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to generate questions: ' + err.message }, { status: 500 });
  }

  if (!questions.length) {
    return NextResponse.json({ error: 'No questions generated' }, { status: 500 });
  }

  // Generate PDF using @react-pdf/renderer (server-side)
  try {
    const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');

    const styles = StyleSheet.create({
      page: {
        fontFamily: 'Helvetica',
        padding: '40 50',
        fontSize: 11,
        color: '#1e293b',
      },
      title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#006c67' },
      subtitle: { fontSize: 11, color: '#64748b', marginBottom: 20 },
      divider: { borderBottom: 1, borderColor: '#e2e8f0', marginBottom: 16 },
      qBlock: { marginBottom: 18 },
      qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
      qNumber: { fontWeight: 'bold', fontSize: 11 },
      qMarks: { fontSize: 10, color: '#64748b' },
      qText: { fontSize: 11, lineHeight: 1.5, marginBottom: 4 },
      qHint: { fontSize: 9, color: '#7c3aed', fontStyle: 'italic' },
      answerBox: {
        border: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
        height: 50,
        marginTop: 6,
      },
      footer: {
        position: 'absolute',
        bottom: 30,
        left: 50,
        right: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 9,
        color: '#94a3b8',
      },
    });

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const date = new Date().toLocaleDateString('en-GB', { dateStyle: 'long' });

    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>{session.title || 'Practice Worksheet'}</Text>
          <Text style={styles.subtitle}>
            Topics: {topics.join(', ')} · Total: {totalMarks} marks · {date}
          </Text>
          <View style={styles.divider} />

          {questions.map((q) => (
            <View key={q.number} style={styles.qBlock}>
              <View style={styles.qHeader}>
                <Text style={styles.qNumber}>Q{q.number}.</Text>
                <Text style={styles.qMarks}>[{q.marks} mark{q.marks !== 1 ? 's' : ''}]</Text>
              </View>
              <Text style={styles.qText}>{q.question}</Text>
              {q.hint && <Text style={styles.qHint}>Hint: {q.hint}</Text>}
              <View style={[styles.answerBox, q.type === 'long' ? { height: 80 } : {}]} />
            </View>
          ))}

          <View style={styles.footer}>
            <Text>Generated by Tutorwise · Sage AI</Text>
            <Text>Total: {totalMarks} marks</Text>
          </View>
        </Page>
      </Document>
    );

    const pdfBuffer = await renderToBuffer(doc);

    // Store in Supabase Storage
    const bucketName = 'virtualspace-artifacts';
    const path = `worksheets/${sessionId}/${Date.now()}.pdf`;

    await supabase.storage
      .from(bucketName)
      .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true });

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      questions: questions.length,
      totalMarks,
    });
  } catch (err: any) {
    console.error('[worksheet] PDF render error:', err);
    // Return the questions as JSON fallback if PDF rendering fails
    return NextResponse.json({
      success: true,
      url: null,
      questions: questions.length,
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
      rawQuestions: questions,
      warning: 'PDF rendering unavailable — questions returned as JSON',
    });
  }
}
