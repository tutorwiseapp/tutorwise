/**
 * Lexi Tool Definitions
 *
 * OpenAI-compatible function definitions for Lexi actions.
 * Each tool has a schema and allowed roles.
 *
 * @module lexi/tools/definitions
 */

import type { Tool } from './types';

// --- EduPay Tools ---

export const explainEdupay: Tool = {
  type: 'function',
  function: {
    name: 'explain_edupay',
    description: 'Explain how EduPay (payment system) works, including fees, payouts, invoices, and refunds',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Specific EduPay topic to explain',
          enum: ['overview', 'fees', 'payouts', 'invoices', 'refunds'],
        },
      },
    },
  },
};

export const getTutorEarnings: Tool = {
  type: 'function',
  function: {
    name: 'get_tutor_earnings',
    description: 'Get earnings summary for a tutor including pending payments and completed earnings',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period for earnings summary',
          enum: ['today', 'week', 'month', 'year', 'all'],
        },
      },
    },
  },
};

// --- Referral Tools ---

export const checkReferralStatus: Tool = {
  type: 'function',
  function: {
    name: 'check_referral_status',
    description: 'Check the status of referrals and referral commission earnings',
    parameters: {
      type: 'object',
      properties: {
        referralCode: {
          type: 'string',
          description: 'Optional specific referral code to check',
        },
      },
    },
  },
};

// --- Booking Tools ---

export const getBookingStatus: Tool = {
  type: 'function',
  function: {
    name: 'get_booking_status',
    description: 'Get the status of a specific booking including lesson details and payment status',
    parameters: {
      type: 'object',
      properties: {
        bookingId: {
          type: 'string',
          description: 'The booking ID to look up',
        },
      },
      required: ['bookingId'],
    },
  },
};

export const getUpcomingLessons: Tool = {
  type: 'function',
  function: {
    name: 'get_upcoming_lessons',
    description: 'Get upcoming scheduled lessons for the user',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look ahead (default: 7)',
        },
      },
    },
  },
};

// --- Tutor Search Tools ---

export const searchTutors: Tool = {
  type: 'function',
  function: {
    name: 'search_tutors',
    description: 'Search for available tutors based on subject, level, and other criteria',
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Subject to search for (e.g., maths, english, science)',
        },
        level: {
          type: 'string',
          description: 'Education level (e.g., GCSE, A-Level, Primary)',
        },
        availability: {
          type: 'string',
          description: 'Preferred availability (e.g., weekends, evenings)',
        },
        maxPrice: {
          type: 'number',
          description: 'Maximum hourly rate in GBP',
        },
      },
    },
  },
};

// --- Progress Tools ---

export const getStudentProgress: Tool = {
  type: 'function',
  function: {
    name: 'get_student_progress',
    description: 'Get learning progress for a student including mastery levels and recent activity',
    parameters: {
      type: 'object',
      properties: {
        studentId: {
          type: 'string',
          description: 'Student ID (optional - defaults to current user or their children)',
        },
        subject: {
          type: 'string',
          description: 'Filter progress by subject',
        },
      },
    },
  },
};

// --- Support Tools ---

export const createSupportTicket: Tool = {
  type: 'function',
  function: {
    name: 'create_support_ticket',
    description: 'Create a Jira support ticket for issues that need human team assistance. Only call this after gathering what the issue is, which category it fits, and how urgently it affects the user.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Category of the issue',
          enum: ['account', 'billing', 'bookings', 'technical', 'features', 'other'],
        },
        summary: {
          type: 'string',
          description: 'A clear, one-line summary of the issue (becomes the ticket title)',
        },
        details: {
          type: 'string',
          description: 'Full description of the issue as the user described it',
        },
        priority: {
          type: 'string',
          description: 'Priority based on user impact',
          enum: ['low', 'medium', 'high'],
        },
      },
      required: ['category', 'summary'],
    },
  },
};

// --- User Info Tools ---

export const getUserProfile: Tool = {
  type: 'function',
  function: {
    name: 'get_user_profile',
    description: 'Get current user profile information including role, verification status, and settings',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

export const getNotifications: Tool = {
  type: 'function',
  function: {
    name: 'get_notifications',
    description: 'Get unread notifications for the current user',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of notifications to return (default: 10)',
        },
      },
    },
  },
};

// --- Organisation Tools ---

export const getOrganisationStats: Tool = {
  type: 'function',
  function: {
    name: 'get_organisation_stats',
    description: 'Get organisation-wide statistics including tutor count, student count, and revenue',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period for stats',
          enum: ['week', 'month', 'quarter', 'year'],
        },
      },
    },
  },
};

// --- Tool Collections by Persona ---

export const TOOLS_BY_PERSONA: Record<string, Tool[]> = {
  student: [
    getUpcomingLessons,
    getStudentProgress,
    searchTutors,
    createSupportTicket,
    getNotifications,
  ],
  tutor: [
    getUpcomingLessons,
    getTutorEarnings,
    getStudentProgress,
    checkReferralStatus,
    explainEdupay,
    createSupportTicket,
    getNotifications,
  ],
  client: [
    getUpcomingLessons,
    getStudentProgress,
    searchTutors,
    getBookingStatus,
    explainEdupay,
    createSupportTicket,
    getNotifications,
  ],
  agent: [
    getBookingStatus,
    getStudentProgress,
    getTutorEarnings,
    checkReferralStatus,
    explainEdupay,
    createSupportTicket,
    getUserProfile,
    getNotifications,
  ],
  organisation: [
    getOrganisationStats,
    getUpcomingLessons,
    getStudentProgress,
    getTutorEarnings,
    explainEdupay,
    createSupportTicket,
    getNotifications,
  ],
};

// --- All Tools ---

export const ALL_TOOLS: Tool[] = [
  explainEdupay,
  getTutorEarnings,
  checkReferralStatus,
  getBookingStatus,
  getUpcomingLessons,
  searchTutors,
  getStudentProgress,
  createSupportTicket,
  getUserProfile,
  getNotifications,
  getOrganisationStats,
];

/**
 * Get tools available for a specific persona
 */
export function getToolsForPersona(persona: string): Tool[] {
  return TOOLS_BY_PERSONA[persona] || [];
}

/**
 * Get a tool by name
 */
export function getToolByName(name: string): Tool | undefined {
  return ALL_TOOLS.find(t => t.function.name === name);
}
