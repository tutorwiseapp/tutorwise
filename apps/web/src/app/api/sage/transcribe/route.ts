/**
 * Sage Voice Transcription API
 *
 * POST /api/sage/transcribe - Transcribe audio to text for Sage input
 *
 * Supports:
 * - Web Audio API recordings (WebM, Opus)
 * - Mobile audio files (M4A, MP3)
 *
 * Uses: Web Speech API (browser) or Google Speech-to-Text (server)
 *
 * @module api/sage/transcribe
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/sage/transcribe
 * Transcribe audio file to text
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get audio data from request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = formData.get('language') as string || 'en-GB';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required', code: 'MISSING_AUDIO' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large (max 10MB)', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    // Convert audio file to buffer
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // --- Transcribe using Gemini Audio API ---
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // Use Gemini 1.5 Flash for audio transcription
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Determine MIME type based on file extension/type
    let mimeType = audioFile.type;
    if (!mimeType || mimeType === 'audio/mpeg') {
      // Common audio formats supported by Gemini
      const ext = audioFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'webm') mimeType = 'audio/webm';
      else if (ext === 'mp3') mimeType = 'audio/mp3';
      else if (ext === 'm4a') mimeType = 'audio/mp4';
      else if (ext === 'wav') mimeType = 'audio/wav';
    }

    const audioParts = [
      {
        inlineData: {
          data: audioBase64,
          mimeType,
        },
      },
    ];

    const prompt = `Transcribe this audio recording accurately. Return only the transcribed text without any additional commentary or formatting.`;

    const result = await model.generateContent([prompt, ...audioParts]);
    const response = await result.response;
    const transcription = response.text().trim();

    return NextResponse.json({
      success: true,
      text: transcription,
      confidence: 0.9, // Gemini doesn't provide confidence scores
      method: 'gemini-audio',
      language,
      duration: audioFile.size / (16000 * 2), // Rough estimate (16kHz, 16-bit)
    });
  } catch (error) {
    console.error('[Sage Transcribe] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
