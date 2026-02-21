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

    // Transcribe using Google Speech-to-Text
    // TODO: This requires @google-cloud/speech library and service account
    // For now, return a mock response prompting to use browser Speech API

    return NextResponse.json({
      success: true,
      text: '', // Empty - client should use Web Speech API
      method: 'client-side',
      message: 'Please use Web Speech API on the client for transcription',
      language,
    });

    // --- Future Google Speech-to-Text Implementation ---
    // import { SpeechClient } from '@google-cloud/speech';
    // const client = new SpeechClient();
    // const audio = { content: audioBase64 };
    // const config = {
    //   encoding: 'WEBM_OPUS',
    //   sampleRateHertz: 48000,
    //   languageCode: language,
    //   model: 'latest_long',
    // };
    // const [response] = await client.recognize({ audio, config });
    // const transcription = response.results
    //   ?.map(result => result.alternatives?.[0]?.transcript)
    //   .join('\n') || '';
    //
    // return NextResponse.json({
    //   success: true,
    //   text: transcription,
    //   confidence: response.results?.[0]?.alternatives?.[0]?.confidence || 1.0,
    //   method: 'google-speech',
    //   language,
    // });
  } catch (error) {
    console.error('[Sage Transcribe] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
