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
  subject: string;
  displayName: string;
  tutorDescription: string;
  suggestedPrice: number;
  color: string;
}

export const AI_TUTOR_TEMPLATES: AITutorTemplate[] = [
  {
    id: 'gcse-maths',
    name: 'GCSE Maths Tutor',
    description: 'Perfect for GCSE maths students needing help with algebra, geometry, and exam preparation',
    icon: '📐',
    subject: 'Mathematics',
    displayName: 'GCSE Maths Helper',
    tutorDescription:
      'I\'m an AI tutor specializing in GCSE Mathematics. I help students master topics like algebra, geometry, trigonometry, and statistics. I break down complex problems into simple steps, provide practice questions, and guide you through exam techniques to boost your confidence and grades.',
    skills: [
      'Algebra',
      'Geometry',
      'Trigonometry',
      'Statistics',
      'Probability',
      'Number Theory',
      'Exam Preparation',
      'Problem Solving',
    ],
    suggestedPrice: 8,
    color: '#3b82f6',
  },
  {
    id: 'a-level-physics',
    name: 'A-Level Physics Tutor',
    description: 'Advanced physics tutor for A-Level students covering mechanics, electricity, and quantum physics',
    icon: '⚛️',
    subject: 'Physics',
    displayName: 'A-Level Physics Expert',
    tutorDescription:
      'I\'m an AI tutor specializing in A-Level Physics. I help students understand complex concepts in mechanics, electricity, magnetism, waves, and quantum physics. I explain theories clearly, work through challenging problems, and prepare you for exams with past paper practice and exam strategies.',
    skills: [
      'Mechanics',
      'Electricity & Magnetism',
      'Waves & Optics',
      'Quantum Physics',
      'Nuclear Physics',
      'Thermodynamics',
      'Mathematical Methods',
      'Practical Skills',
    ],
    suggestedPrice: 12,
    color: '#8b5cf6',
  },
  {
    id: 'english-essay',
    name: 'English Essay Helper',
    description: 'Specializes in essay writing, literature analysis, and creative writing for all levels',
    icon: '📝',
    subject: 'English',
    displayName: 'Essay Writing Coach',
    tutorDescription:
      'I\'m an AI tutor specializing in English essay writing and literature analysis. I help students plan, structure, and write compelling essays. Whether you\'re analyzing Shakespeare, writing a persuasive argument, or crafting a creative piece, I provide feedback on style, grammar, and structure to improve your writing skills.',
    skills: [
      'Essay Planning',
      'Literary Analysis',
      'Creative Writing',
      'Grammar & Punctuation',
      'Persuasive Writing',
      'Critical Thinking',
      'Text Analysis',
      'Proofreading',
    ],
    suggestedPrice: 9,
    color: '#10b981',
  },
  {
    id: 'homework-helper',
    name: 'General Homework Helper',
    description: 'All-purpose homework assistant for multiple subjects across primary and secondary levels',
    icon: '📚',
    subject: 'General',
    displayName: 'Homework Buddy',
    tutorDescription:
      'I\'m an AI tutor ready to help with homework across multiple subjects including maths, science, English, and humanities. I explain concepts clearly, help you understand your assignments, and guide you through problems step-by-step. Perfect for primary and secondary school students who need a friendly study companion.',
    skills: [
      'Maths Support',
      'Science Help',
      'English Assistance',
      'History & Geography',
      'Study Skills',
      'Time Management',
      'Research Skills',
      'Concept Explanation',
    ],
    suggestedPrice: 7,
    color: '#f59e0b',
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
