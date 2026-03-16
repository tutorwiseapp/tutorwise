/**
 * Enhanced Grading API
 *
 * POST /api/sage/grade - Grade a student answer using deterministic + LLM rubric evaluation
 *
 * Uses deterministic checking first (exact match, numeric tolerance), then
 * falls back to LLM rubric evaluation for open-ended/extended responses.
 *
 * @module api/sage/grade
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface GradeRequest {
  assessment_id?: string;
  question_id?: string;
  question: string;
  student_answer: string;
  correct_answer: string;
  subject: string;
  marks: number;
  criteria?: Array<{ description: string; marks: number }>;
  force_llm?: boolean;
}

interface GradingResult {
  correct: boolean;
  score: number;
  max_score: number;
  feedback: string;
  method: 'deterministic' | 'rubric_llm' | 'hybrid';
  model?: string;
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

    const body: GradeRequest = await request.json();

    if (!body.question || !body.student_answer || !body.correct_answer) {
      return NextResponse.json(
        { error: 'question, student_answer, and correct_answer are required' },
        { status: 400 }
      );
    }

    const maxScore = body.marks || 1;
    let result: GradingResult;

    // Step 1: Try deterministic evaluation first (unless forced LLM)
    if (!body.force_llm) {
      const deterministicResult = evaluateDeterministic(
        body.student_answer,
        body.correct_answer,
        maxScore
      );

      if (deterministicResult) {
        result = deterministicResult;
      } else {
        // Step 2: Fall back to LLM rubric evaluation
        result = await evaluateWithLLM(body, maxScore);
      }
    } else {
      result = await evaluateWithLLM(body, maxScore);
    }

    // Store grading result
    if (body.assessment_id || body.question_id) {
      supabase.from('sage_grading_results').insert({
        assessment_id: body.assessment_id || null,
        question_id: body.question_id || null,
        student_id: user.id,
        student_answer: body.student_answer,
        evaluation: result,
        grading_method: result.method,
        llm_model: result.model || null,
      }).then(({ error: e }) => {
        if (e) console.warn('[Grade] Failed to store result:', e.message);
      });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[Grade] Error:', error);
    return NextResponse.json({ error: 'Failed to grade answer' }, { status: 500 });
  }
}

// --- Deterministic Evaluation ---

function evaluateDeterministic(
  studentAnswer: string,
  correctAnswer: string,
  maxScore: number
): GradingResult | null {
  const normalised = normalise(studentAnswer);
  const expected = normalise(correctAnswer);

  // Exact match
  if (normalised === expected) {
    return {
      correct: true,
      score: maxScore,
      max_score: maxScore,
      feedback: 'Correct! Well done.',
      method: 'deterministic',
    };
  }

  // Numeric comparison
  const studentNum = parseFloat(normalised);
  const expectedNum = parseFloat(expected);

  if (!isNaN(studentNum) && !isNaN(expectedNum)) {
    if (Math.abs(studentNum - expectedNum) < 0.0001) {
      return {
        correct: true,
        score: maxScore,
        max_score: maxScore,
        feedback: 'Correct! Well done.',
        method: 'deterministic',
      };
    }

    // Close answer — partial credit
    const relativeError = Math.abs(studentNum - expectedNum) / Math.max(1, Math.abs(expectedNum));
    if (relativeError < 0.1 && maxScore > 1) {
      return {
        correct: false,
        score: Math.max(0, maxScore - 1),
        max_score: maxScore,
        feedback: `Close! Your answer is ${studentAnswer}, but the correct answer is ${correctAnswer}. You may have made a small calculation error.`,
        method: 'deterministic',
      };
    }

    // Definitive wrong numeric answer
    return {
      correct: false,
      score: 0,
      max_score: maxScore,
      feedback: `Not quite. The correct answer is ${correctAnswer}.`,
      method: 'deterministic',
    };
  }

  // Short answers (< 20 chars) that don't match — deterministic enough
  if (normalised.length < 20 && expected.length < 20) {
    return {
      correct: false,
      score: 0,
      max_score: maxScore,
      feedback: `Not quite. The correct answer is ${correctAnswer}.`,
      method: 'deterministic',
    };
  }

  // Long/open-ended — needs LLM
  return null;
}

function normalise(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[£€$]/g, '')
    .replace(/,/g, '')
    .replace(/^0+(?=\d)/, '');
}

// --- LLM Rubric Evaluation ---

async function evaluateWithLLM(body: GradeRequest, maxScore: number): Promise<GradingResult> {
  const { getAIService } = await import('@/lib/ai');
  const ai = getAIService();

  const rubricPrompt = `EVALUATE this student's answer against the mark scheme.

SUBJECT: ${body.subject}
QUESTION: ${body.question}
STUDENT ANSWER: ${body.student_answer}

MARK SCHEME:
- Total marks available: ${maxScore}
- Expected answer: ${body.correct_answer}
${body.criteria
    ? body.criteria.map(c => `- ${c.description} (${c.marks} mark${c.marks !== 1 ? 's' : ''})`).join('\n')
    : ''
}

Evaluate carefully:
1. Check if the core answer is correct
2. Award partial marks for correct method even if the final answer is wrong
3. Consider alternative valid approaches
4. Provide specific, constructive feedback

Respond in EXACTLY this JSON format:
{
  "correct": true/false,
  "score": <number between 0 and ${maxScore}>,
  "max_score": ${maxScore},
  "feedback": "<specific feedback>"
}`;

  try {
    const { data, provider } = await ai.generateJSON<{
      correct: boolean;
      score: number;
      max_score: number;
      feedback: string;
    }>({
      systemPrompt: 'You are an expert examiner. Evaluate student answers fairly and precisely against the mark scheme. Always respond with valid JSON.',
      userPrompt: rubricPrompt,
      maxTokens: 500,
    });

    return {
      correct: data.correct,
      score: Math.min(data.score, maxScore),
      max_score: maxScore,
      feedback: data.feedback,
      method: 'rubric_llm',
      model: provider,
    };
  } catch (error) {
    console.error('[Grade] LLM evaluation failed:', error);
    // Fallback: can't evaluate
    return {
      correct: false,
      score: 0,
      max_score: maxScore,
      feedback: 'Unable to evaluate this answer automatically. A tutor will review it.',
      method: 'hybrid',
    };
  }
}
