/**
 * Lexi Type Definitions
 *
 * Core types for the Lexi user-facing tutoring agent system.
 */

import type { AgentContext, UserRole } from '../../cas/packages/core/src/context';

// --- Persona Types ---

export type PersonaType = 'student' | 'tutor' | 'client' | 'organisation' | 'agent';

export interface PersonaConfig {
  type: PersonaType;
  displayName: string;
  capabilities: string[];
  defaultGreeting: string;
  tone: 'friendly' | 'professional' | 'supportive' | 'formal';
}

// --- Message Types ---

export interface LexiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    persona?: PersonaType;
    intent?: string;
    confidence?: number;
    actionTaken?: string;
    provider?: string;
  };
}

export interface Conversation {
  id: string;
  userId: string;
  userRole: UserRole;
  persona: PersonaType;
  messages: LexiMessage[];
  context: AgentContext;
  startedAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'paused' | 'ended';
}

// --- Intent Types ---

export type IntentCategory =
  | 'learning'      // Learning-related queries
  | 'scheduling'    // Booking and calendar
  | 'resources'     // Access learning materials
  | 'progress'      // Track progress and analytics
  | 'support'       // Help and troubleshooting
  | 'billing'       // Payment, financials, and subscriptions
  | 'feedback'      // Reviews and feedback
  | 'referrals'     // Referral programme, commissions, delegation
  | 'edupay'        // EduPay wallet, EP points, student loan, cashback, savings
  | 'marketplace'   // Finding tutors, search, Wiselists
  | 'network'       // Connections, messaging
  | 'virtualspace'  // Virtual classroom, whiteboard
  | 'credibility'   // CaaS Credibility Score
  | 'account'       // Profile, settings, integrations, verification
  | 'organisation'  // Organisation management, teams, tasks
  | 'platform'      // Platform info for guests (how it works, pricing, signup)
  | 'general';      // General conversation

export interface DetectedIntent {
  category: IntentCategory;
  action: string;
  confidence: number;
  entities: Record<string, unknown>;
  requiresConfirmation: boolean;
}

// --- Action Types ---

export interface LexiAction {
  type: string;
  payload: Record<string, unknown>;
  requiredPermissions: string[];
  requiresConfirmation: boolean;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  message: string;
  nextSteps?: string[];
  error?: string;
}

// --- Session Types ---

export interface LexiSession {
  sessionId: string;
  userId: string;
  userRole: UserRole;
  organisationId?: string;
  persona: PersonaType;
  context: AgentContext;
  activeConversation?: Conversation;
  preferences: UserPreferences;
  startedAt: Date;
  expiresAt: Date;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  communicationStyle: 'concise' | 'detailed';
  notificationsEnabled: boolean;
}

// --- Learning Types ---

export interface LearningGoal {
  id: string;
  studentId: string;
  subject: string;
  description: string;
  targetDate?: Date;
  progress: number;
  milestones: Milestone[];
  status: 'active' | 'paused' | 'completed' | 'abandoned';
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
}

export interface LessonSummary {
  id: string;
  tutorId: string;
  studentId: string;
  subject: string;
  scheduledAt: Date;
  duration: number; // minutes
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  homework?: string[];
}

// --- Booking Types ---

export interface BookingRequest {
  studentId: string;
  tutorId: string;
  subject: string;
  preferredTimes: Date[];
  duration: number;
  notes?: string;
  recurring?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    endDate: Date;
  };
}

export interface TutorAvailability {
  tutorId: string;
  availableSlots: TimeSlot[];
  timezone: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

// --- Analytics Types ---

export interface StudentProgress {
  studentId: string;
  subjects: SubjectProgress[];
  totalLessons: number;
  completedLessons: number;
  averageRating: number;
  streak: number;
  lastActivityAt: Date;
}

export interface SubjectProgress {
  subject: string;
  currentLevel: string;
  progress: number;
  lessonsCompleted: number;
  nextMilestone?: string;
}

export interface TutorAnalytics {
  tutorId: string;
  totalStudents: number;
  activeStudents: number;
  totalLessons: number;
  averageRating: number;
  responseRate: number;
  topSubjects: string[];
  earningsThisMonth: number;
}

// --- Organisation Types ---

export interface OrgDashboard {
  organisationId: string;
  totalTutors: number;
  totalStudents: number;
  activeLessons: number;
  monthlyRevenue: number;
  topPerformers: string[];
  alerts: OrgAlert[];
}

export interface OrgAlert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  message: string;
  createdAt: Date;
  acknowledged: boolean;
}

// --- Export helper type for CAS integration ---

export interface CASModuleConfig {
  moduleName: string;
  allowedRoles: UserRole[];
  operations: string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}
