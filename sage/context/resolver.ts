/**
 * Sage Context Resolver
 *
 * Intelligently resolves and switches context based on user role,
 * session state, and interaction type.
 *
 * This is the brain that makes Sage role-aware - it determines how
 * to behave based on who's asking and what they're doing.
 *
 * @module sage/context
 */

import type { UserRole } from '../../cas/packages/core/src/context';
import type {
  SagePersona,
  SageSubject,
  SageLevel,
  SessionGoal,
  LearningContext,
} from '../types';

// --- Context Types ---

export interface ResolvedContext {
  persona: SagePersona;
  mode: ContextMode;
  subject?: SageSubject;
  level?: SageLevel;
  sessionGoal?: SessionGoal;
  knowledgeSources: KnowledgeSource[];
  teachingStyle: TeachingStyle;
  permissions: ContextPermissions;
}

export type ContextMode =
  | 'teaching'           // Tutor/Agent actively teaching content
  | 'learning'           // Student receiving instruction
  | 'supporting'         // Client/Parent monitoring progress
  | 'preparing'          // Tutor preparing materials
  | 'reviewing'          // Any role reviewing materials
  | 'practicing'         // Student doing exercises
  | 'assessing';         // Evaluating understanding

export interface KnowledgeSource {
  type: 'user_upload' | 'shared' | 'global';
  namespace: string;
  priority: number;  // Lower = higher priority
  ownerId?: string;
}

export interface TeachingStyle {
  tone: 'encouraging' | 'professional' | 'supportive' | 'friendly';
  detailLevel: 'concise' | 'detailed' | 'comprehensive';
  useExamples: boolean;
  askQuestions: boolean;
  provideHints: boolean;  // vs giving answers directly
  celebrateProgress: boolean;
}

export interface ContextPermissions {
  canAccessGlobalKnowledge: boolean;
  canAccessUserKnowledge: boolean;
  canAccessSharedKnowledge: boolean;
  canUploadMaterials: boolean;
  canShareMaterials: boolean;
  canViewProgress: boolean;
  canModifyProgress: boolean;
  canCreateAssessments: boolean;
}

// --- Session Context ---

export interface SessionContext {
  userId: string;
  userRole: UserRole;
  organisationId?: string;
  subject?: SageSubject;
  level?: SageLevel;
  sessionGoal?: SessionGoal;
  currentTopic?: string;
  interactionType?: string;
  linkedUserIds?: string[];  // Students linked to this tutor/client
}

// --- Context Resolver ---

export class ContextResolver {
  /**
   * Resolve the full context for a session.
   */
  resolve(session: SessionContext): ResolvedContext {
    const persona = this.resolvePersona(session.userRole);
    const mode = this.resolveMode(persona, session);
    const teachingStyle = this.resolveTeachingStyle(persona, mode);
    const permissions = this.resolvePermissions(persona);
    const knowledgeSources = this.resolveKnowledgeSources(session, permissions);

    return {
      persona,
      mode,
      subject: session.subject,
      level: session.level,
      sessionGoal: session.sessionGoal,
      knowledgeSources,
      teachingStyle,
      permissions,
    };
  }

  /**
   * Map user role to Sage persona.
   */
  private resolvePersona(role: UserRole): SagePersona {
    switch (role) {
      case 'tutor':
        return 'tutor';
      case 'agent':
        return 'agent';
      case 'client':
        return 'client';
      case 'student':
        return 'student';
      default:
        return 'student';  // Default to student for unknown roles
    }
  }

  /**
   * Determine the interaction mode based on persona and context.
   */
  private resolveMode(persona: SagePersona, session: SessionContext): ContextMode {
    const goal = session.sessionGoal;
    const interactionType = session.interactionType;

    // Tutors and Agents
    if (persona === 'tutor' || persona === 'agent') {
      if (interactionType === 'upload' || interactionType === 'create') {
        return 'preparing';
      }
      if (interactionType === 'review') {
        return 'reviewing';
      }
      // Default: teaching mode
      return 'teaching';
    }

    // Clients (Parents)
    if (persona === 'client') {
      if (interactionType === 'progress') {
        return 'supporting';
      }
      return 'supporting';
    }

    // Students
    if (persona === 'student') {
      if (goal === 'practice') {
        return 'practicing';
      }
      if (goal === 'exam_prep') {
        return 'assessing';
      }
      if (interactionType === 'review') {
        return 'reviewing';
      }
      // Default: learning mode
      return 'learning';
    }

    return 'learning';
  }

  /**
   * Determine teaching style based on persona and mode.
   */
  private resolveTeachingStyle(persona: SagePersona, mode: ContextMode): TeachingStyle {
    // Student learning - supportive, encouraging, guide don't tell
    if (persona === 'student') {
      return {
        tone: 'encouraging',
        detailLevel: mode === 'practicing' ? 'concise' : 'detailed',
        useExamples: true,
        askQuestions: true,
        provideHints: true,  // Guide, don't give answers
        celebrateProgress: true,
      };
    }

    // Tutor preparing/teaching - professional, comprehensive
    if (persona === 'tutor') {
      return {
        tone: 'professional',
        detailLevel: 'comprehensive',
        useExamples: true,
        askQuestions: false,  // Give full information
        provideHints: false,  // Give full answers
        celebrateProgress: false,
      };
    }

    // Agent - efficient, helpful
    if (persona === 'agent') {
      return {
        tone: 'friendly',
        detailLevel: 'concise',
        useExamples: true,
        askQuestions: false,
        provideHints: false,
        celebrateProgress: false,
      };
    }

    // Client - supportive, reassuring
    if (persona === 'client') {
      return {
        tone: 'supportive',
        detailLevel: 'concise',
        useExamples: true,
        askQuestions: false,
        provideHints: false,
        celebrateProgress: true,
      };
    }

    // Default
    return {
      tone: 'friendly',
      detailLevel: 'detailed',
      useExamples: true,
      askQuestions: true,
      provideHints: true,
      celebrateProgress: true,
    };
  }

  /**
   * Determine permissions based on persona.
   */
  private resolvePermissions(persona: SagePersona): ContextPermissions {
    switch (persona) {
      case 'tutor':
        return {
          canAccessGlobalKnowledge: true,
          canAccessUserKnowledge: true,
          canAccessSharedKnowledge: true,
          canUploadMaterials: true,
          canShareMaterials: true,
          canViewProgress: true,
          canModifyProgress: true,
          canCreateAssessments: true,
        };

      case 'agent':
        return {
          canAccessGlobalKnowledge: true,
          canAccessUserKnowledge: true,
          canAccessSharedKnowledge: true,
          canUploadMaterials: true,
          canShareMaterials: true,
          canViewProgress: true,
          canModifyProgress: true,
          canCreateAssessments: true,
        };

      case 'client':
        return {
          canAccessGlobalKnowledge: true,
          canAccessUserKnowledge: false,  // Can only see child's
          canAccessSharedKnowledge: true, // Shared by tutor
          canUploadMaterials: false,
          canShareMaterials: false,
          canViewProgress: true,          // Their child's progress
          canModifyProgress: false,
          canCreateAssessments: false,
        };

      case 'student':
        return {
          canAccessGlobalKnowledge: true,
          canAccessUserKnowledge: true,   // Their own uploads
          canAccessSharedKnowledge: true, // Shared by tutor
          canUploadMaterials: true,       // Can upload homework/notes
          canShareMaterials: false,       // Can't share to others
          canViewProgress: true,          // Their own progress
          canModifyProgress: false,       // System modifies based on practice
          canCreateAssessments: false,
        };

      default:
        return {
          canAccessGlobalKnowledge: true,
          canAccessUserKnowledge: false,
          canAccessSharedKnowledge: false,
          canUploadMaterials: false,
          canShareMaterials: false,
          canViewProgress: false,
          canModifyProgress: false,
          canCreateAssessments: false,
        };
    }
  }

  /**
   * Determine knowledge sources and their priority.
   * Lower priority number = higher precedence.
   *
   * 3-Tier RAG Hierarchy:
   * 1. User uploads (personalized materials)
   * 2. Shared from tutors (collaborative materials)
   * 3. Links (curated external resources)
   * 4. Global (platform-wide knowledge base)
   */
  private resolveKnowledgeSources(
    session: SessionContext,
    permissions: ContextPermissions
  ): KnowledgeSource[] {
    const sources: KnowledgeSource[] = [];

    // Priority 1: User's own uploads (highest - most personalized)
    if (permissions.canAccessUserKnowledge) {
      sources.push({
        type: 'user_upload',
        namespace: `users/${session.userId}`,
        priority: 1,
        ownerId: session.userId,
      });
    }

    // Priority 2: Shared from tutors/agents
    if (permissions.canAccessSharedKnowledge && session.linkedUserIds) {
      for (const linkedId of session.linkedUserIds) {
        sources.push({
          type: 'shared',
          namespace: `shared/${linkedId}`,
          priority: 2,
          ownerId: linkedId,
        });
      }
    }

    // Priority 3: Curated Links (external resources like BBC Bitesize, Khan Academy)
    if (permissions.canAccessGlobalKnowledge) {
      sources.push({
        type: 'global',
        namespace: 'links',
        priority: 3,
      });
    }

    // Priority 4: Global platform resources (lowest - general knowledge base)
    if (permissions.canAccessGlobalKnowledge) {
      sources.push({
        type: 'global',
        namespace: 'global',
        priority: 4,
      });
    }

    return sources.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Create learning context for a student session.
   */
  createLearningContext(
    session: SessionContext,
    existing?: Partial<LearningContext>
  ): LearningContext {
    return {
      studentId: session.userId,
      subject: session.subject || 'general',
      level: session.level || 'GCSE',
      learningStyle: existing?.learningStyle || 'mixed',
      currentTopic: session.currentTopic || existing?.currentTopic,
      sessionGoal: session.sessionGoal || existing?.sessionGoal,
      priorKnowledge: existing?.priorKnowledge || [],
      errorPatterns: existing?.errorPatterns || [],
      strengths: existing?.strengths || [],
    };
  }
}

// --- Singleton Export ---

export const contextResolver = new ContextResolver();

export default ContextResolver;
