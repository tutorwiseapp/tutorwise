/**
 * POST /api/sage/lesson-plans/generate
 *
 * Generate a lesson plan from a natural language request.
 * Returns the structured plan for review before saving.
 *
 * @module api/sage/lesson-plans/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService } from '@/lib/ai';
import { randomUUID } from 'crypto';

interface LessonPhase {
  id: string;
  name: string;
  type: 'intro' | 'worked-example' | 'guided-practice' | 'independent-practice'
      | 'check' | 'consolidation' | 'extension' | 'recap';
  duration: number;
  instruction: string;
  canvasAssets?: Array<{ type: string; data: Record<string, unknown>; label?: string }>;
  successCriteria: string;
  adaptations?: {
    ifCorrect: string;
    ifStruggling: string;
    scaffold?: Array<{ type: string; data: Record<string, unknown>; label?: string }>;
  };
}

interface LessonPlanJSON {
  title: string;
  subject: string;
  level: string;
  topic: string;
  examBoard?: string;
  targetDuration: number;
  targetMasteryDelta: number;
  difficulty: string;
  phases: LessonPhase[];
  tags: string[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { prompt, studentId, subject, level } = body as {
      prompt?: string;
      studentId?: string;
      subject?: string;
      level?: string;
    };

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Load student model context if studentId provided
    let studentContext = '';
    if (studentId) {
      const { data: studentProfile } = await supabase
        .from('sage_student_profiles')
        .select('mastery_scores, misconceptions, learning_preferences')
        .eq('user_id', studentId)
        .single();

      if (studentProfile) {
        const mastery = studentProfile.mastery_scores as Record<string, number> | null;
        const top = mastery
          ? Object.entries(mastery).sort(([,a],[,b]) => b - a).slice(0, 3).map(([k, v]) => `${k}: ${v.toFixed(2)}`).join(', ')
          : '';
        studentContext = top ? `\nStudent mastery context: ${top}` : '';
        const misconceptions = (studentProfile.misconceptions as string[])?.slice(0, 3).join(', ');
        if (misconceptions) studentContext += `\nKnown misconceptions: ${misconceptions}`;
      }
    }

    const ai = getAIService();
    const { data: planRaw } = await ai.generateJSON<LessonPlanJSON>({
      systemPrompt: `You are Sage, an expert AI tutor. Generate a structured lesson plan as valid JSON. Include 4-7 phases with realistic timing. Each phase must have clear instructions and success criteria. Canvas assets are optional — only include when a visual aid genuinely helps.`,
      userPrompt: `Request: "${prompt}"
${subject ? `Subject hint: ${subject}` : ''}
${level ? `Level hint: ${level}` : ''}${studentContext}

Generate a complete lesson plan JSON:
{
  "title": "Lesson title",
  "subject": "maths|english|science|...",
  "level": "GCSE|A-Level|KS3|KS1|KS2|IB|AP",
  "topic": "specific topic slug",
  "examBoard": "AQA|Edexcel|OCR|null",
  "targetDuration": 45,
  "targetMasteryDelta": 0.15,
  "difficulty": "grade-3-4|grade-5-6|grade-7-8|...",
  "phases": [
    {
      "id": "uuid",
      "name": "Phase name",
      "type": "intro|worked-example|guided-practice|independent-practice|check|consolidation|extension|recap",
      "duration": 10,
      "instruction": "What Sage does/says in this phase",
      "canvasAssets": [],
      "successCriteria": "What done looks like",
      "adaptations": {
        "ifCorrect": "Advance instruction",
        "ifStruggling": "Fallback instruction"
      }
    }
  ],
  "tags": ["topic-tag", "level-tag"]
}`,
      temperature: 0.5,
    });

    if (!planRaw?.title || !Array.isArray(planRaw.phases) || !planRaw.phases.length) {
      return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 });
    }

    // Normalise phase IDs
    const phases = planRaw.phases.map(p => ({
      ...p,
      id: p.id || randomUUID(),
    }));

    const plan = { ...planRaw, phases };

    // Plain-language summary
    const phaseNames = phases.map(p => p.name).join(' → ');
    const summary = `${plan.title} — ${plan.targetDuration} min, ${phases.length} phases: ${phaseNames}.`;

    return NextResponse.json({
      plan,
      summary,
      estimatedMasteryDelta: plan.targetMasteryDelta ?? 0.15,
    });

  } catch (error) {
    console.error('[Sage Lesson Plans Generate] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
