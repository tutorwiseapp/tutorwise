/**
 * Sage OCR API
 *
 * POST /api/sage/ocr - Extract text and math from images
 *
 * Supports:
 * - Handwritten math problems
 * - Printed textbook pages
 * - Whiteboard photos
 *
 * Uses: Google Cloud Vision API or Tesseract.js
 *
 * @module api/sage/ocr
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/sage/ocr
 * Extract text and math from an image
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

    // Get image from request
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const detectMath = formData.get('detectMath') === 'true';

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required', code: 'MISSING_IMAGE' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image too large (max 5MB)', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    // Check storage quota (only for Pro users - free tier has no storage)
    const { checkStorageQuota } = await import('@/lib/stripe/sage-pro-subscription');
    const storageCheck = await checkStorageQuota(user.id, imageFile.size);

    if (!storageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Storage quota exceeded',
          code: 'STORAGE_QUOTA_EXCEEDED',
          quota: {
            used: storageCheck.used,
            quota: storageCheck.quota,
            remaining: storageCheck.remaining,
          },
          upsell: storageCheck.quota === 0 ? {
            plan: 'sage_pro',
            price: '£10/month',
            storage: '1GB',
          } : undefined,
        },
        { status: 429 }
      );
    }

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    // --- OCR Processing with Gemini Vision ---
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // Use Gemini Pro Vision for OCR
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Create prompt based on detectMath flag
    const prompt = detectMath
      ? `Extract all text and mathematical expressions from this image.

         For mathematical expressions:
         - Convert them to LaTeX format
         - Preserve equation structure and notation
         - List each math expression separately

         Format your response as JSON:
         {
           "text": "all extracted text",
           "mathExpressions": ["\\\\frac{x^2}{2}", "y = mx + b", ...]
         }`
      : `Extract all text from this image. Return the text as plain text, preserving line breaks and structure where possible.`;

    const imageParts = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: imageFile.type,
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let extractedText = response.text();

    // Parse JSON response if detectMath is true
    let mathExpressions: string[] | undefined;
    if (detectMath) {
      try {
        // Try to parse as JSON
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          extractedText = parsed.text || extractedText;
          mathExpressions = parsed.mathExpressions || [];
        }
      } catch {
        // If JSON parsing fails, just use raw text
        console.warn('[Sage OCR] Failed to parse math expressions as JSON');
      }
    }

    // Track file usage for storage quota (async, don't block response)
    // NOTE: For now we're not actually storing the file, just tracking its size for quota
    // Future enhancement: Store file in Supabase Storage for caching
    const sessionId = formData.get('sessionId') as string | null;
    if (sessionId && storageCheck.quota > 0) {
      // Only track if user is Pro (has storage quota)
      const { trackStorageFile } = await import('@/lib/stripe/sage-pro-subscription');
      trackStorageFile(
        user.id,
        imageFile.name,
        'image',
        imageFile.size,
        `ocr/${user.id}/${Date.now()}-${imageFile.name}`, // Virtual path (not actually stored yet)
        sessionId,
        extractedText.trim()
      ).catch(err => console.error('[Sage OCR] Failed to track file:', err));
    }

    return NextResponse.json({
      success: true,
      text: extractedText.trim(),
      math: mathExpressions,
      confidence: 0.9, // Gemini doesn't provide confidence scores
      method: 'gemini-vision',
      detectedLanguage: 'en',
    });
  } catch (error) {
    console.error('[Sage OCR] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
