/**
 * Sage Capabilities API
 *
 * GET /api/sage/capabilities - Get available Sage capabilities and subjects
 *
 * @module api/sage/capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type SageSubject =
  | 'maths' | 'english' | 'science' | 'computing'
  | 'humanities' | 'languages' | 'social-sciences'
  | 'business' | 'arts' | 'general';
type SageLevel = 'KS1' | 'KS2' | 'KS3' | 'GCSE' | 'A-Level' | 'IB' | 'AP' | 'University' | 'Other';
type SessionGoal = 'homework_help' | 'concept_review' | 'exam_prep' | 'practice' | 'general';

// Available subjects
const SUBJECTS: { id: SageSubject; label: string; description: string }[] = [
  { id: 'maths', label: 'Mathematics', description: 'Algebra, geometry, calculus, statistics' },
  { id: 'english', label: 'English', description: 'Writing, reading, grammar, literature' },
  { id: 'science', label: 'Science', description: 'Physics, chemistry, biology' },
  { id: 'computing', label: 'Computing', description: 'Computer Science, programming, algorithms' },
  { id: 'humanities', label: 'Humanities', description: 'History, Geography, and related subjects' },
  { id: 'languages', label: 'Languages', description: 'French, Spanish, German, and other languages' },
  { id: 'social-sciences', label: 'Social Sciences', description: 'Psychology, Sociology, Religious Education' },
  { id: 'business', label: 'Business & Economics', description: 'Business Studies, Economics, Accounting' },
  { id: 'arts', label: 'Arts & Creative', description: 'Music, Art & Design, Drama, PE theory' },
  { id: 'general', label: 'General', description: 'Study skills, exam prep, any subject' },
];

// Available levels
const LEVELS: { id: SageLevel; label: string }[] = [
  { id: 'KS1', label: 'Key Stage 1 (Years 1-2)' },
  { id: 'KS2', label: 'Key Stage 2 (Years 3-6)' },
  { id: 'KS3', label: 'Key Stage 3 (Years 7-9)' },
  { id: 'GCSE', label: 'GCSE (Years 10-11)' },
  { id: 'A-Level', label: 'A-Level (Years 12-13)' },
  { id: 'IB', label: 'International Baccalaureate' },
  { id: 'AP', label: 'Advanced Placement (AP)' },
  { id: 'University', label: 'University' },
  { id: 'Other', label: 'Other' },
];

// Session goals
const SESSION_GOALS: { id: SessionGoal; label: string; description: string }[] = [
  { id: 'homework_help', label: 'Homework Help', description: 'Get help with assignments' },
  { id: 'concept_review', label: 'Concept Review', description: 'Understand a topic better' },
  { id: 'exam_prep', label: 'Exam Preparation', description: 'Practice for tests and exams' },
  { id: 'practice', label: 'Practice Problems', description: 'Work through practice exercises' },
  { id: 'general', label: 'General Learning', description: 'Explore and learn freely' },
];

// Role-based capabilities
const CAPABILITIES: Record<string, string[]> = {
  student: [
    'explain_concept',
    'solve_problem',
    'practice_exercises',
    'homework_help',
    'exam_prep',
    'progress_tracking',
  ],
  tutor: [
    'lesson_planning',
    'resource_creation',
    'student_progress_review',
    'teaching_strategies',
    'worksheet_generation',
    'assessment_ideas',
  ],
  client: [
    'progress_explanation',
    'learning_support_tips',
    'resource_recommendations',
    'curriculum_overview',
  ],
  agent: [
    'tutoring_info',
    'curriculum_queries',
    'student_support',
    'tutor_support',
  ],
};

/**
 * GET /api/sage/capabilities
 * Get available subjects, levels, and capabilities for the current user
 */
export async function GET(_request: NextRequest) {
  try {
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

    const { data: { user } } = await supabase.auth.getUser();

    let userRole = 'student';
    let studentLevel: SageLevel | null = null;

    if (user) {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_role, role_details')
        .eq('id', user.id)
        .single();

      if (profile) {
        userRole = profile.active_role || 'student';

        // Get student level from role_details if available
        if (profile.role_details?.level) {
          studentLevel = profile.role_details.level as SageLevel;
        }
      }
    }

    const capabilities = CAPABILITIES[userRole] || CAPABILITIES.student;

    return NextResponse.json({
      subjects: SUBJECTS,
      levels: LEVELS,
      sessionGoals: SESSION_GOALS,
      capabilities,
      userRole,
      suggestedLevel: studentLevel,
    });
  } catch (error) {
    console.error('[Sage Capabilities] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
