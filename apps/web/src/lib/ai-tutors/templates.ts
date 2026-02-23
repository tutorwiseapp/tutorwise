/**
 * Filename: templates.ts
 * Purpose: AI Tutor Templates - Pre-defined templates for quick setup
 * Created: 2026-02-23
 * Version: v1.0
 */

export interface AITutorTemplate {
  id: string;
  name: string;
  description: string;
  skills: string[];
  icon: string;
}

export const AI_TUTOR_TEMPLATES: AITutorTemplate[] = [
  {
    id: 'homework-help',
    name: 'Homework Help',
    description: 'Help students solve homework problems step-by-step',
    skills: ['Problem Solving', 'Homework Support', 'Study Skills', 'Step-by-Step Guidance'],
    icon: '📚',
  },
  {
    id: 'exam-prep',
    name: 'Exam Prep',
    description: 'Prepare students for exams with practice questions and revision',
    skills: ['Exam Technique', 'Past Papers', 'Revision Planning', 'Time Management'],
    icon: '📝',
  },
  {
    id: 'concept-tutor',
    name: 'Concept Tutor',
    description: 'Explain complex concepts in simple, understandable terms',
    skills: ['Concept Explanation', 'Conceptual Understanding', 'Theory', 'Fundamentals'],
    icon: '💡',
  },
  {
    id: 'practice-coach',
    name: 'Practice Coach',
    description: 'Provide unlimited practice questions with instant feedback',
    skills: ['Practice Questions', 'Mock Exams', 'Self-Assessment', 'Feedback'],
    icon: '🎯',
  },
];

/**
 * Get all available templates
 */
export async function getTemplates(): Promise<AITutorTemplate[]> {
  return AI_TUTOR_TEMPLATES;
}

/**
 * Get template by ID
 */
export async function getTemplate(templateId: string): Promise<AITutorTemplate | null> {
  const template = AI_TUTOR_TEMPLATES.find((t) => t.id === templateId);
  return template || null;
}
