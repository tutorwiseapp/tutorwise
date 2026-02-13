/**
 * Learning Module
 *
 * User-facing API for learning-related functionality.
 * Wraps CAS Analyst and Developer agents for user consumption.
 *
 * @module cas/user-api/learning
 */

import {
  type AgentContext,
  isOperationAllowed,
  hasRole,
  createAuditEntry,
} from '../../../core/src/context';
import { getSupabaseClient } from '../lib/supabase';

// --- Types ---

export interface LearningResource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'quiz' | 'exercise' | 'worksheet';
  subject: string;
  level: string;
  description: string;
  url?: string;
  content?: string;
  estimatedDuration: number; // minutes
  tags: string[];
  createdBy: string;
  createdAt: Date;
}

export interface HomeworkAssignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: Date;
  resources: LearningResource[];
  status: 'pending' | 'in_progress' | 'submitted' | 'reviewed';
  feedback?: string;
  grade?: string;
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  subject: string;
  level: string;
  modules: LearningModule[];
  totalDuration: number;
  progress: number;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  resources: LearningResource[];
  assessments: Assessment[];
  completed: boolean;
  order: number;
}

export interface Assessment {
  id: string;
  type: 'quiz' | 'test' | 'project';
  title: string;
  questions: number;
  passingScore: number;
  score?: number;
  completedAt?: Date;
}

export interface StudyPlan {
  id: string;
  studentId: string;
  goals: StudyGoal[];
  weeklySchedule: WeeklySchedule;
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  milestones: string[];
}

export interface WeeklySchedule {
  monday: StudySession[];
  tuesday: StudySession[];
  wednesday: StudySession[];
  thursday: StudySession[];
  friday: StudySession[];
  saturday: StudySession[];
  sunday: StudySession[];
}

export interface StudySession {
  subject: string;
  duration: number;
  type: 'lesson' | 'practice' | 'review';
  time?: string;
}

// --- Learning Module Class ---

export class LearningModuleAPI {
  /**
   * Get recommended resources for a student
   */
  async getRecommendedResources(
    ctx: AgentContext,
    options: {
      subject?: string;
      level?: string;
      limit?: number;
    } = {}
  ): Promise<{ success: boolean; resources: LearningResource[]; error?: string }> {
    if (!isOperationAllowed(ctx, 'resource:read')) {
      return { success: false, resources: [], error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'learning:getRecommendedResources', options));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, resources: [], error: 'Database not configured' };
    }

    try {
      // Query resources from articles table (platform resources)
      let query = supabase
        .from('resource_articles')
        .select('id, title, slug, meta_description, content_type, subjects, levels, reading_time_minutes, tags, author_id, created_at, status')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (options.subject) {
        query = query.contains('subjects', [options.subject]);
      }

      if (options.level) {
        query = query.contains('levels', [options.level]);
      }

      const limit = options.limit || 10;
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error('[LearningModule] Get resources error:', error);
        // Fall back to mock data if table doesn't exist
        return {
          success: true,
          resources: [
            {
              id: 'res_mock_1',
              title: 'Introduction to Algebra',
              type: 'document',
              subject: options.subject || 'Mathematics',
              level: options.level || 'Intermediate',
              description: 'A comprehensive guide to algebraic concepts',
              estimatedDuration: 45,
              tags: ['algebra', 'equations', 'variables'],
              createdBy: 'system',
              createdAt: new Date(),
            },
          ],
        };
      }

      // Transform to LearningResource format
      const resources: LearningResource[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        type: mapContentType(row.content_type),
        subject: row.subjects?.[0] || 'General',
        level: row.levels?.[0] || 'All Levels',
        description: row.meta_description || '',
        url: `/resources/${row.slug}`,
        estimatedDuration: row.reading_time_minutes || 15,
        tags: row.tags || [],
        createdBy: row.author_id || 'system',
        createdAt: new Date(row.created_at),
      }));

      return { success: true, resources };
    } catch (error) {
      console.error('[LearningModule] Get resources error:', error);
      return { success: false, resources: [], error: String(error) };
    }
  }

  /**
   * Get homework assignments for a student
   */
  async getHomework(
    ctx: AgentContext,
    options: {
      status?: HomeworkAssignment['status'];
      subject?: string;
    } = {}
  ): Promise<{ success: boolean; assignments: HomeworkAssignment[]; error?: string }> {
    if (!isOperationAllowed(ctx, 'lesson:attend')) {
      return { success: false, assignments: [], error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'learning:getHomework', options));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, assignments: [], error: 'Database not configured' };
    }

    try {
      const userId = ctx.user?.id;
      if (!userId) {
        return { success: false, assignments: [], error: 'User ID not found' };
      }

      // Query bookings with homework/lesson notes
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, service_name, lesson_notes, session_start_time, status')
        .eq('client_id', userId)
        .not('lesson_notes', 'is', null)
        .order('session_start_time', { ascending: false });

      if (error) {
        console.error('[LearningModule] Get homework error:', error);
        return { success: true, assignments: [] }; // Return empty if table doesn't have column
      }

      // Transform bookings with notes into homework assignments
      const assignments: HomeworkAssignment[] = (bookings || [])
        .filter((b: any) => b.lesson_notes)
        .map((b: any) => ({
          id: b.id,
          title: `Homework: ${b.service_name || 'Lesson'}`,
          description: b.lesson_notes || '',
          subject: b.service_name || 'General',
          dueDate: new Date(new Date(b.session_start_time).getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week after lesson
          resources: [],
          status: b.status === 'Completed' ? 'pending' : 'in_progress',
        }));

      // Filter by status if provided
      const filtered = options.status
        ? assignments.filter(a => a.status === options.status)
        : assignments;

      // Filter by subject if provided
      const finalAssignments = options.subject
        ? filtered.filter(a => a.subject.toLowerCase().includes(options.subject!.toLowerCase()))
        : filtered;

      return { success: true, assignments: finalAssignments };
    } catch (error) {
      console.error('[LearningModule] Get homework error:', error);
      return { success: false, assignments: [], error: String(error) };
    }
  }

  /**
   * Submit homework assignment
   */
  async submitHomework(
    ctx: AgentContext,
    assignmentId: string,
    submission: {
      content?: string;
      fileUrls?: string[];
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string; error?: string }> {
    if (!isOperationAllowed(ctx, 'lesson:attend')) {
      return { success: false, message: '', error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'learning:submitHomework', { assignmentId, ...submission }));

    // In production, this would save the submission
    // For now, return success message
    return {
      success: true,
      message: 'Homework submitted successfully! Your tutor will review it soon.',
    };
  }

  /**
   * Get learning path progress
   */
  async getLearningPath(
    ctx: AgentContext,
    pathId: string
  ): Promise<{ success: boolean; path?: LearningPath; error?: string }> {
    if (!isOperationAllowed(ctx, 'progress:read:own')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'learning:getLearningPath', { pathId }));

    // Learning paths would need a dedicated table
    // Return undefined for now
    return { success: true, path: undefined };
  }

  /**
   * Generate a personalized study plan
   */
  async generateStudyPlan(
    ctx: AgentContext,
    options: {
      subjects: string[];
      targetDate?: Date;
      hoursPerWeek: number;
      learningStyle?: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
    }
  ): Promise<{ success: boolean; plan?: StudyPlan; error?: string }> {
    if (!isOperationAllowed(ctx, 'progress:read:own')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'learning:generateStudyPlan', options));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const userId = ctx.user?.id;
      if (!userId) {
        return { success: false, error: 'User ID not found' };
      }

      // Get existing bookings to understand schedule
      const { data: bookings } = await supabase
        .from('bookings')
        .select('service_name, session_start_time, session_duration')
        .eq('client_id', userId)
        .in('status', ['Pending', 'Confirmed'])
        .order('session_start_time', { ascending: true });

      // Generate study plan based on subjects and available hours
      const hoursPerSubject = options.hoursPerWeek / options.subjects.length;
      const sessionsPerSubject = Math.ceil(hoursPerSubject);

      const goals: StudyGoal[] = options.subjects.map((subject, i) => ({
        id: `goal_${i}`,
        title: `Master ${subject}`,
        description: `Complete ${sessionsPerSubject} study sessions per week`,
        targetDate: options.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        progress: 0,
        milestones: [
          'Complete first lesson',
          'Practice exercises',
          'Review concepts',
        ],
      }));

      // Create weekly schedule
      const emptyDay: StudySession[] = [];
      const weeklySchedule: WeeklySchedule = {
        monday: emptyDay,
        tuesday: emptyDay,
        wednesday: emptyDay,
        thursday: emptyDay,
        friday: emptyDay,
        saturday: emptyDay,
        sunday: emptyDay,
      };

      // Distribute sessions across weekdays
      const days: (keyof WeeklySchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      let dayIndex = 0;
      for (const subject of options.subjects) {
        for (let i = 0; i < sessionsPerSubject && dayIndex < days.length; i++) {
          const day = days[dayIndex % days.length];
          weeklySchedule[day] = [
            ...weeklySchedule[day],
            {
              subject,
              duration: 60,
              type: i === 0 ? 'lesson' : i === 1 ? 'practice' : 'review',
            },
          ];
          dayIndex++;
        }
      }

      const plan: StudyPlan = {
        id: `plan_${Date.now().toString(36)}`,
        studentId: userId,
        goals,
        weeklySchedule,
        recommendations: [
          `Focus on ${options.subjects[0]} as your primary subject`,
          'Review material within 24 hours of each lesson',
          'Practice for at least 30 minutes daily',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return { success: true, plan };
    } catch (error) {
      console.error('[LearningModule] Generate study plan error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Search for learning resources
   */
  async searchResources(
    ctx: AgentContext,
    query: string,
    filters?: {
      type?: LearningResource['type'];
      subject?: string;
      level?: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; resources: LearningResource[]; error?: string }> {
    if (!isOperationAllowed(ctx, 'resource:read')) {
      return { success: false, resources: [], error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'learning:searchResources', { query, filters }));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, resources: [], error: 'Database not configured' };
    }

    try {
      // Search in resource_articles table
      let dbQuery = supabase
        .from('resource_articles')
        .select('id, title, slug, meta_description, content_type, subjects, levels, reading_time_minutes, tags, author_id, created_at')
        .eq('status', 'published')
        .or(`title.ilike.%${query}%,meta_description.ilike.%${query}%`)
        .limit(20);

      if (filters?.subject) {
        dbQuery = dbQuery.contains('subjects', [filters.subject]);
      }

      if (filters?.level) {
        dbQuery = dbQuery.contains('levels', [filters.level]);
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error('[LearningModule] Search resources error:', error);
        return { success: true, resources: [] }; // Return empty on error
      }

      // Transform to LearningResource format
      const resources: LearningResource[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        type: mapContentType(row.content_type),
        subject: row.subjects?.[0] || 'General',
        level: row.levels?.[0] || 'All Levels',
        description: row.meta_description || '',
        url: `/resources/${row.slug}`,
        estimatedDuration: row.reading_time_minutes || 15,
        tags: row.tags || [],
        createdBy: row.author_id || 'system',
        createdAt: new Date(row.created_at),
      }));

      // Filter by type if provided
      const filtered = filters?.type
        ? resources.filter(r => r.type === filters.type)
        : resources;

      return { success: true, resources: filtered };
    } catch (error) {
      console.error('[LearningModule] Search resources error:', error);
      return { success: false, resources: [], error: String(error) };
    }
  }

  /**
   * Get explanation for a topic (uses AI)
   */
  async explainTopic(
    ctx: AgentContext,
    topic: string,
    options?: {
      level?: string;
      includeExamples?: boolean;
      format?: 'brief' | 'detailed';
    }
  ): Promise<{ success: boolean; explanation?: string; examples?: string[]; error?: string }> {
    if (!isOperationAllowed(ctx, 'resource:read')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'learning:explainTopic', { topic, options }));

    // In production, this would use an AI agent to generate explanations
    // For now, return a placeholder
    const explanation = options?.format === 'detailed'
      ? `${topic} is an important concept in education. Here's a detailed explanation:

1. **Definition**: ${topic} refers to...
2. **Key Concepts**: The main ideas include...
3. **Applications**: This is used in...
4. **Common Mistakes**: Students often...

Remember to practice regularly and ask your tutor if you have questions!`
      : `${topic} is a fundamental concept. The key points are the definition, main principles, and practical applications. Ask your tutor for more details!`;

    const examples = options?.includeExamples
      ? [
          `Example 1: A basic application of ${topic}`,
          `Example 2: A more advanced use case`,
          `Example 3: Real-world scenario`,
        ]
      : [];

    return {
      success: true,
      explanation,
      examples,
    };
  }

  /**
   * Create a learning resource (tutor only)
   */
  async createResource(
    ctx: AgentContext,
    resource: Omit<LearningResource, 'id' | 'createdBy' | 'createdAt'>
  ): Promise<{ success: boolean; resource?: LearningResource; error?: string }> {
    if (!hasRole(ctx, 'tutor') && !hasRole(ctx, 'agent')) {
      return { success: false, error: 'Only tutors can create resources' };
    }

    if (!isOperationAllowed(ctx, 'resource:create')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'learning:createResource', resource));

    const supabase = getSupabaseClient();
    if (!supabase) {
      // Return mock resource if DB not available
      const newResource: LearningResource = {
        ...resource,
        id: `res_${Date.now().toString(36)}`,
        createdBy: ctx.user?.id || 'system',
        createdAt: new Date(),
      };
      return { success: true, resource: newResource };
    }

    try {
      // Insert into resource_articles table
      const { data, error } = await supabase
        .from('resource_articles')
        .insert({
          title: resource.title,
          slug: resource.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          meta_description: resource.description,
          content_type: mapTypeToContentType(resource.type),
          subjects: [resource.subject],
          levels: [resource.level],
          reading_time_minutes: resource.estimatedDuration,
          tags: resource.tags,
          author_id: ctx.user?.id,
          status: 'draft', // Needs review before publishing
          content: resource.content || '',
        })
        .select()
        .single();

      if (error) {
        console.error('[LearningModule] Create resource error:', error);
        return { success: false, error: error.message };
      }

      const newResource: LearningResource = {
        id: data.id,
        title: data.title,
        type: resource.type,
        subject: resource.subject,
        level: resource.level,
        description: data.meta_description,
        url: `/resources/${data.slug}`,
        content: resource.content,
        estimatedDuration: data.reading_time_minutes,
        tags: data.tags || [],
        createdBy: data.author_id,
        createdAt: new Date(data.created_at),
      };

      return { success: true, resource: newResource };
    } catch (error) {
      console.error('[LearningModule] Create resource error:', error);
      return { success: false, error: String(error) };
    }
  }
}

// --- Helper Functions ---

function mapContentType(contentType: string): LearningResource['type'] {
  const mapping: Record<string, LearningResource['type']> = {
    article: 'document',
    video: 'video',
    quiz: 'quiz',
    exercise: 'exercise',
    worksheet: 'worksheet',
    guide: 'document',
    tutorial: 'document',
  };
  return mapping[contentType?.toLowerCase()] || 'document';
}

function mapTypeToContentType(type: LearningResource['type']): string {
  const mapping: Record<LearningResource['type'], string> = {
    document: 'article',
    video: 'video',
    quiz: 'quiz',
    exercise: 'exercise',
    worksheet: 'worksheet',
  };
  return mapping[type] || 'article';
}

export const learningModule = new LearningModuleAPI();

export default LearningModuleAPI;
