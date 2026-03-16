/**
 * Image-Solve API
 *
 * POST /api/sage/image-solve - Upload homework photo, OCR it, and get tutoring help
 *
 * Pipeline: Image → Gemini Vision OCR → extract text/math → Sage AI stream response
 *
 * @module api/sage/image-solve
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const subject = (formData.get('subject') as string) || 'maths';
    const instruction = (formData.get('instruction') as string) || 'Help me solve this problem step by step.';

    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
    }

    // Step 1: OCR with Gemini Vision
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '');

    const visionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const ocrResult = await visionModel.generateContent([
      `Extract all text and mathematical expressions from this image.
       For mathematical expressions, convert them to LaTeX format.
       Preserve the structure and layout of the problem.

       Format your response as JSON:
       {
         "text": "full extracted text with math in LaTeX",
         "mathExpressions": ["\\\\frac{x^2}{2}", ...],
         "problemType": "algebra|geometry|calculus|statistics|word_problem|other"
       }`,
      {
        inlineData: {
          data: imageBase64,
          mimeType: imageFile.type,
        },
      },
    ]);

    const ocrText = ocrResult.response.text();

    let extractedText = ocrText;
    let mathExpressions: string[] = [];
    let problemType = 'other';

    try {
      const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        extractedText = parsed.text || ocrText;
        mathExpressions = parsed.mathExpressions || [];
        problemType = parsed.problemType || 'other';
      }
    } catch {
      // Use raw text if JSON parsing fails
    }

    // Step 2: Generate tutoring response using AI service
    const { getAIService } = await import('@/lib/ai');

    const systemPrompt = `You are Sage, a patient and encouraging AI tutor specialising in ${subject}.
A student has uploaded a photo of their homework/problem. The OCR has extracted the following:

EXTRACTED TEXT:
${extractedText}

${mathExpressions.length > 0 ? `MATH EXPRESSIONS (LaTeX):\n${mathExpressions.join('\n')}` : ''}

PROBLEM TYPE: ${problemType}

STUDENT REQUEST: ${instruction}

Guidelines:
- Work through the problem step by step
- Use clear mathematical notation (LaTeX where needed)
- Explain each step in plain language
- If the image text is unclear, mention what you can and cannot read
- Encourage the student and check their understanding
- If this appears to be an assessment, guide them to understand the method rather than giving direct answers`;

    const ai = getAIService();
    const result = await ai.generate({
      systemPrompt,
      userPrompt: instruction,
      maxTokens: 2000,
    });

    return NextResponse.json({
      ocr: {
        text: extractedText.trim(),
        math: mathExpressions,
        problemType,
      },
      response: result.content,
      provider: result.provider,
    });
  } catch (error) {
    console.error('[Image Solve] Error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
