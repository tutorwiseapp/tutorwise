/**
 * Sage Tool Definitions
 *
 * OpenAI-compatible function definitions for Sage tutoring actions.
 * Each tool has a schema and allowed roles.
 *
 * @module sage/tools/definitions
 */

import type { Tool } from './types';
import type { SagePersona } from '../types';

// --- Problem Solving Tools ---

export const solveWithHints: Tool = {
  type: 'function',
  function: {
    name: 'solve_with_hints',
    description: 'Guide a student through solving a problem with progressive hints',
    parameters: {
      type: 'object',
      properties: {
        problem: {
          type: 'string',
          description: 'The problem to solve',
        },
        subject: {
          type: 'string',
          description: 'Subject area',
          enum: ['maths', 'english', 'science', 'general'],
        },
        hintLevel: {
          type: 'string',
          description: 'How much help to provide',
          enum: ['minimal', 'moderate', 'detailed'],
        },
      },
      required: ['problem'],
    },
  },
};

export const checkAnswer: Tool = {
  type: 'function',
  function: {
    name: 'check_answer',
    description: 'Check if a student answer is correct and provide feedback',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The original question',
        },
        studentAnswer: {
          type: 'string',
          description: 'The student provided answer',
        },
        showSolution: {
          type: 'string',
          description: 'Whether to show the full solution if wrong',
          enum: ['yes', 'no', 'hints_only'],
        },
      },
      required: ['question', 'studentAnswer'],
    },
  },
};

// --- Practice Generation Tools ---

export const generatePracticeProblems: Tool = {
  type: 'function',
  function: {
    name: 'generate_practice_problems',
    description: 'Generate practice problems for a specific topic and difficulty',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate problems for',
        },
        subject: {
          type: 'string',
          description: 'Subject area',
          enum: ['maths', 'english', 'science', 'general'],
        },
        level: {
          type: 'string',
          description: 'Difficulty level',
          enum: ['GCSE', 'A-Level', 'University'],
        },
        count: {
          type: 'number',
          description: 'Number of problems to generate (1-10)',
        },
        difficulty: {
          type: 'string',
          description: 'Problem difficulty',
          enum: ['easy', 'medium', 'hard', 'exam_style'],
        },
      },
      required: ['topic', 'subject'],
    },
  },
};

export const createQuiz: Tool = {
  type: 'function',
  function: {
    name: 'create_quiz',
    description: 'Create a quiz or test with a marking scheme',
    parameters: {
      type: 'object',
      properties: {
        topics: {
          type: 'string',
          description: 'Comma-separated list of topics to cover',
        },
        subject: {
          type: 'string',
          description: 'Subject area',
          enum: ['maths', 'english', 'science', 'general'],
        },
        level: {
          type: 'string',
          description: 'Education level',
          enum: ['GCSE', 'A-Level', 'University'],
        },
        questionCount: {
          type: 'number',
          description: 'Number of questions (5-20)',
        },
        includeMarkScheme: {
          type: 'string',
          description: 'Include marking scheme',
          enum: ['yes', 'no'],
        },
      },
      required: ['topics', 'subject'],
    },
  },
};

// --- Explanation Tools ---

export const explainConcept: Tool = {
  type: 'function',
  function: {
    name: 'explain_concept',
    description: 'Explain a concept in detail with examples',
    parameters: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: 'The concept to explain',
        },
        subject: {
          type: 'string',
          description: 'Subject area',
          enum: ['maths', 'english', 'science', 'general'],
        },
        level: {
          type: 'string',
          description: 'Education level',
          enum: ['GCSE', 'A-Level', 'University'],
        },
        style: {
          type: 'string',
          description: 'Explanation style',
          enum: ['visual', 'step_by_step', 'analogy', 'formal'],
        },
      },
      required: ['concept'],
    },
  },
};

export const explainDifferently: Tool = {
  type: 'function',
  function: {
    name: 'explain_differently',
    description: 'Re-explain something in a different way when a student is confused',
    parameters: {
      type: 'object',
      properties: {
        originalExplanation: {
          type: 'string',
          description: 'Summary of what was originally explained',
        },
        confusionPoint: {
          type: 'string',
          description: 'What specific part the student found confusing',
        },
        preferredStyle: {
          type: 'string',
          description: 'Preferred explanation style',
          enum: ['simpler', 'more_examples', 'different_analogy', 'step_by_step'],
        },
      },
      required: ['originalExplanation'],
    },
  },
};

// --- Progress Tools ---

export const getStudentProgress: Tool = {
  type: 'function',
  function: {
    name: 'get_student_progress',
    description: 'Get learning progress for a student including mastery levels',
    parameters: {
      type: 'object',
      properties: {
        studentId: {
          type: 'string',
          description: 'Student ID (optional - defaults to current user or linked students)',
        },
        subject: {
          type: 'string',
          description: 'Filter by subject',
          enum: ['maths', 'english', 'science', 'general'],
        },
        detail: {
          type: 'string',
          description: 'Level of detail',
          enum: ['summary', 'detailed', 'by_topic'],
        },
      },
    },
  },
};

export const suggestNextTopic: Tool = {
  type: 'function',
  function: {
    name: 'suggest_next_topic',
    description: 'Suggest the next topic to study based on progress and goals',
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Subject area',
          enum: ['maths', 'english', 'science', 'general'],
        },
        goal: {
          type: 'string',
          description: 'Learning goal',
          enum: ['fill_gaps', 'advance', 'exam_prep', 'revision'],
        },
      },
      required: ['subject'],
    },
  },
};

// --- Document Tools ---

export const uploadDocument: Tool = {
  type: 'function',
  function: {
    name: 'upload_document',
    description: 'Process and store an uploaded document for RAG retrieval',
    parameters: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'ID of the uploaded document',
        },
        subject: {
          type: 'string',
          description: 'Subject tag for the document',
          enum: ['maths', 'english', 'science', 'general'],
        },
        level: {
          type: 'string',
          description: 'Level tag',
          enum: ['GCSE', 'A-Level', 'University'],
        },
        shareWith: {
          type: 'string',
          description: 'Who to share with',
          enum: ['private', 'students', 'tutors', 'organisation'],
        },
      },
      required: ['documentId'],
    },
  },
};

export const searchKnowledge: Tool = {
  type: 'function',
  function: {
    name: 'search_knowledge',
    description: 'Search uploaded materials and curriculum content',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        subject: {
          type: 'string',
          description: 'Filter by subject',
          enum: ['maths', 'english', 'science', 'general'],
        },
        source: {
          type: 'string',
          description: 'Knowledge source to search',
          enum: ['user', 'shared', 'global', 'all'],
        },
      },
      required: ['query'],
    },
  },
};

// --- Report Tools ---

export const generateProgressReport: Tool = {
  type: 'function',
  function: {
    name: 'generate_progress_report',
    description: 'Generate a progress report for a student',
    parameters: {
      type: 'object',
      properties: {
        studentId: {
          type: 'string',
          description: 'Student ID',
        },
        period: {
          type: 'string',
          description: 'Report period',
          enum: ['week', 'month', 'term', 'year'],
        },
        format: {
          type: 'string',
          description: 'Report format',
          enum: ['summary', 'detailed', 'parent_friendly'],
        },
      },
      required: ['studentId'],
    },
  },
};

// --- Analysis Tools ---

export const analyzeWork: Tool = {
  type: 'function',
  function: {
    name: 'analyze_work',
    description: 'Analyze student work and identify error patterns',
    parameters: {
      type: 'object',
      properties: {
        workType: {
          type: 'string',
          description: 'Type of work to analyze',
          enum: ['homework', 'test', 'practice', 'essay'],
        },
        subject: {
          type: 'string',
          description: 'Subject area',
          enum: ['maths', 'english', 'science', 'general'],
        },
        content: {
          type: 'string',
          description: 'The work content to analyze',
        },
      },
      required: ['workType', 'content'],
    },
  },
};

// --- Tool Collections by Persona ---

export const TOOLS_BY_PERSONA: Record<SagePersona, Tool[]> = {
  student: [
    solveWithHints,
    checkAnswer,
    generatePracticeProblems,
    explainConcept,
    explainDifferently,
    getStudentProgress,
    suggestNextTopic,
  ],
  tutor: [
    generatePracticeProblems,
    createQuiz,
    explainConcept,
    getStudentProgress,
    suggestNextTopic,
    uploadDocument,
    searchKnowledge,
    analyzeWork,
    generateProgressReport,
  ],
  client: [
    getStudentProgress,
    explainConcept,
    generateProgressReport,
  ],
  agent: [
    generatePracticeProblems,
    createQuiz,
    getStudentProgress,
    uploadDocument,
    searchKnowledge,
    analyzeWork,
    generateProgressReport,
  ],
};

// --- All Tools ---

export const ALL_SAGE_TOOLS: Tool[] = [
  solveWithHints,
  checkAnswer,
  generatePracticeProblems,
  createQuiz,
  explainConcept,
  explainDifferently,
  getStudentProgress,
  suggestNextTopic,
  uploadDocument,
  searchKnowledge,
  generateProgressReport,
  analyzeWork,
];

/**
 * Get tools available for a specific persona
 */
export function getToolsForPersona(persona: SagePersona): Tool[] {
  return TOOLS_BY_PERSONA[persona] || [];
}

/**
 * Get a tool by name
 */
export function getToolByName(name: string): Tool | undefined {
  return ALL_SAGE_TOOLS.find(t => t.function.name === name);
}
