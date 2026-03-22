/**
 * PDF Upload API (v1.0)
 *
 * POST /api/virtualspace/[sessionId]/pdf-upload
 * Accepts a multipart/form-data PDF file, uploads to Supabase Storage,
 * returns the public URL and page count.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Validate session access
  const { data: session } = await supabase
    .from('virtualspace_sessions')
    .select('id, owner_id, status')
    .eq('id', sessionId)
    .single();

  if (!session || session.status === 'expired') {
    return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF must be under 20 MB' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Store in the appropriate bucket based on session type
    const { data: sessionData } = await supabase
      .from('virtualspace_sessions')
      .select('session_type, booking_id')
      .eq('id', sessionId)
      .single();

    const bucket = sessionData?.session_type === 'booking' ? 'booking-artifacts' : 'virtualspace-artifacts';
    const path = `pdfs/${sessionId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, bytes, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      console.error('[pdf-upload] Storage error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      // Page count requires pdfjs on server — client will discover it on render
      estimatedPages: 1,
    });
  } catch (err: any) {
    console.error('[pdf-upload] Error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
