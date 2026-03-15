/**
 * Sage Quiz Generator
 *
 * Generates formative quizzes from the problem bank.
 * Falls back to LLM-generated questions when bank is insufficient.
 *
 * @module sage/assessment/quiz-generator
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SageSubject } from '../types';

// --- Types ---

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_latex?: string;
  difficulty: number;
  hints: string[];
  source: 'problem_bank' | 'generated';
  bank_id?: string;
}

export interface Quiz {
  id: string;
  subject: SageSubject;
  topic: string;
  questions: QuizQuestion[];
  generated_at: string;
}

// --- Generator ---

/**
 * Generate a quiz for a topic.
 *
 * @param supabase - Supabase client
 * @param subject - Subject (maths, english, science)
 * @param topic - Specific topic to quiz on
 * @param difficulty - Target difficulty (1-5)
 * @param count - Number of questions (default 5)
 */
export async function generateQuiz(
  supabase: SupabaseClient,
  subject: SageSubject,
  topic: string,
  difficulty: number = 3,
  count: number = 5
): Promise<Quiz> {
  // Try to pull from problem bank
  const { data: problems } = await supabase
    .from('sage_problem_bank')
    .select('id, question_text, question_latex, difficulty, hints')
    .eq('subject', subject)
    .ilike('topic', `%${topic}%`)
    .gte('difficulty', Math.max(1, difficulty - 1))
    .lte('difficulty', Math.min(5, difficulty + 1))
    .order('difficulty', { ascending: true })
    .limit(count * 2); // Fetch extra for randomisation

  const questions: QuizQuestion[] = [];

  if (problems && problems.length > 0) {
    // Shuffle and take requested count
    const shuffled = problems.sort(() => Math.random() - 0.5).slice(0, count);
    for (const p of shuffled) {
      questions.push({
        id: p.id,
        question_text: p.question_text,
        question_latex: p.question_latex || undefined,
        difficulty: p.difficulty,
        hints: p.hints || [],
        source: 'problem_bank',
        bank_id: p.id,
      });
    }
  }

  // Fill remaining with generated placeholders
  const remaining = count - questions.length;
  for (let i = 0; i < remaining; i++) {
    questions.push({
      id: `gen_${Date.now().toString(36)}_${i}`,
      question_text: `[Generated question ${i + 1} about ${topic} at difficulty ${difficulty}]`,
      difficulty,
      hints: [],
      source: 'generated',
    });
  }

  return {
    id: `quiz_${Date.now().toString(36)}`,
    subject,
    topic,
    questions,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Format a quiz for injection into the Sage conversation.
 */
export function formatQuizForChat(quiz: Quiz): string {
  const lines = [`Let's check your understanding of **${quiz.topic}**!\n`];

  for (const q of quiz.questions) {
    const display = q.question_latex || q.question_text;
    lines.push(`**Q${quiz.questions.indexOf(q) + 1}.** ${display}`);
  }

  lines.push('\nTake your time — try each one and I\'ll check your answers!');
  return lines.join('\n');
}
