/**
 * Progress Module
 *
 * User-facing API for progress tracking and analytics.
 * Wraps CAS Analyst and Marketer agents for user consumption.
 *
 * @module cas/user-api/progress
 */

import {
  type AgentContext,
  isOperationAllowed,
  hasRole,
  createAuditEntry,
  getOrganisationId,
} from '../../../core/src/context';
import { getSupabaseClient } from '../lib/supabase';

// --- Types ---

export interface StudentProgress {
  studentId: string;
  studentName: string;
  overallProgress: number;
  subjects: SubjectProgress[];
  recentActivity: Activity[];
  achievements: Achievement[];
  learningStreak: number;
  totalLessonsCompleted: number;
  totalHoursLearned: number;
  averageQuizScore: number;
}

export interface SubjectProgress {
  subject: string;
  level: string;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
  averageScore: number;
  lastActivityAt: Date;
  nextMilestone: string;
  strengths: string[];
  areasToImprove: string[];
}

export interface Activity {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment' | 'resource' | 'achievement';
  title: string;
  description: string;
  timestamp: Date;
  score?: number;
  duration?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: 'streak' | 'progress' | 'excellence' | 'participation';
}

export interface TutorAnalytics {
  tutorId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  totalStudents: number;
  activeStudents: number;
  newStudents: number;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  averageResponseTime: number; // minutes
  earnings: {
    total: number;
    pending: number;
    paid: number;
  };
  topSubjects: Array<{ subject: string; students: number; lessons: number }>;
  studentRetention: number;
  satisfactionScore: number;
}

export interface OrgAnalytics {
  organisationId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  totalTutors: number;
  activeTutors: number;
  totalStudents: number;
  activeStudents: number;
  totalLessons: number;
  completedLessons: number;
  revenue: {
    total: number;
    growth: number;
  };
  averageRating: number;
  topPerformers: Array<{ tutorId: string; name: string; rating: number; lessons: number }>;
  subjectBreakdown: Array<{ subject: string; students: number; revenue: number }>;
  alerts: OrgAlert[];
}

export interface OrgAlert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
  actionUrl?: string;
}

export interface ProgressReport {
  id: string;
  type: 'student' | 'tutor' | 'organisation';
  format: 'pdf' | 'csv' | 'json';
  dateRange: { start: Date; end: Date };
  generatedAt: Date;
  downloadUrl: string;
  expiresAt: Date;
}

export interface Feedback {
  id: string;
  lessonId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  tags: string[];
  createdAt: Date;
  response?: {
    comment: string;
    respondedAt: Date;
  };
}

// --- Helper Functions ---

function getPeriodStartDate(period: 'week' | 'month' | 'quarter' | 'year'): Date {
  const now = new Date();
  switch (period) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'quarter':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}

// --- Progress Module Class ---

export class ProgressModuleAPI {
  /**
   * Get student progress overview
   */
  async getStudentProgress(
    ctx: AgentContext,
    studentId?: string
  ): Promise<{ success: boolean; progress?: StudentProgress; error?: string }> {
    // Students can view their own, tutors/clients can view their students
    const targetId = studentId || ctx.user?.id;

    if (!isOperationAllowed(ctx, 'progress:read:own') && !hasRole(ctx, 'tutor')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'progress:getStudentProgress', { studentId: targetId }));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Get student's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', targetId)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Student not found' };
      }

      // Get completed bookings for the student
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, service_name, session_duration, status, session_start_time, subjects')
        .eq('client_id', targetId)
        .order('session_start_time', { ascending: false });

      if (bookingsError) {
        console.error('[ProgressModule] Get bookings error:', bookingsError);
      }

      const allBookings = bookings || [];
      const completedBookings = allBookings.filter(b =>
        b.status === 'Completed' || b.status === 'completed'
      );

      // Calculate total hours learned
      const totalMinutes = completedBookings.reduce((sum, b) => sum + (b.session_duration || 0), 0);
      const totalHoursLearned = Math.round(totalMinutes / 60 * 10) / 10;

      // Group by subject for subject progress
      const subjectMap = new Map<string, { completed: number; total: number; lastActivity: Date }>();
      for (const booking of allBookings) {
        const subject = booking.service_name || booking.subjects?.[0] || 'General';
        const current = subjectMap.get(subject) || { completed: 0, total: 0, lastActivity: new Date(0) };
        current.total++;
        if (booking.status === 'Completed' || booking.status === 'completed') {
          current.completed++;
        }
        const bookingDate = new Date(booking.session_start_time);
        if (bookingDate > current.lastActivity) {
          current.lastActivity = bookingDate;
        }
        subjectMap.set(subject, current);
      }

      const subjects: SubjectProgress[] = Array.from(subjectMap.entries()).map(([subject, data]) => ({
        subject,
        level: 'Intermediate',
        progress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        lessonsCompleted: data.completed,
        totalLessons: data.total,
        averageScore: 0, // Would need quiz data
        lastActivityAt: data.lastActivity,
        nextMilestone: `Complete ${data.total - data.completed} more lessons`,
        strengths: [],
        areasToImprove: [],
      }));

      // Calculate overall progress
      const totalCompleted = completedBookings.length;
      const totalLessons = allBookings.length;
      const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

      // Get recent activity
      const recentActivity: Activity[] = allBookings.slice(0, 10).map(b => ({
        id: b.id,
        type: 'lesson' as const,
        title: b.service_name || 'Lesson',
        description: `${b.status === 'Completed' ? 'Completed' : 'Scheduled'} lesson`,
        timestamp: new Date(b.session_start_time),
        duration: b.session_duration,
      }));

      const progress: StudentProgress = {
        studentId: targetId || '',
        studentName: profile.full_name || 'Student',
        overallProgress,
        subjects,
        recentActivity,
        achievements: [], // Would need achievements table
        learningStreak: 0, // Would calculate from consecutive days
        totalLessonsCompleted: totalCompleted,
        totalHoursLearned,
        averageQuizScore: 0, // Would need quiz data
      };

      return { success: true, progress };
    } catch (error) {
      console.error('[ProgressModule] Get student progress error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get tutor analytics
   */
  async getTutorAnalytics(
    ctx: AgentContext,
    period: TutorAnalytics['period'] = 'month'
  ): Promise<{ success: boolean; analytics?: TutorAnalytics; error?: string }> {
    if (!hasRole(ctx, 'tutor') && !hasRole(ctx, 'agent')) {
      return { success: false, error: 'Only tutors can view their analytics' };
    }

    console.log(createAuditEntry(ctx, 'progress:getTutorAnalytics', { period }));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const tutorId = ctx.user?.id;
      if (!tutorId) {
        return { success: false, error: 'User ID not found' };
      }

      const periodStart = getPeriodStartDate(period);

      // Get bookings for the period
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, client_id, service_name, status, amount, session_start_time, payment_status')
        .eq('tutor_id', tutorId)
        .gte('created_at', periodStart.toISOString());

      if (bookingsError) {
        console.error('[ProgressModule] Get tutor bookings error:', bookingsError);
        return { success: false, error: bookingsError.message };
      }

      const allBookings = bookings || [];
      const completedBookings = allBookings.filter(b => b.status === 'Completed' || b.status === 'completed');
      const cancelledBookings = allBookings.filter(b => b.status === 'Cancelled' || b.status === 'cancelled');

      // Get unique students
      const studentIds = new Set(allBookings.map(b => b.client_id));
      const totalStudents = studentIds.size;

      // Calculate earnings
      const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const paidBookings = completedBookings.filter(b => b.payment_status === 'Paid');
      const paidEarnings = paidBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const pendingEarnings = totalEarnings - paidEarnings;

      // Get reviews for the tutor
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_user_id', tutorId)
        .gte('created_at', periodStart.toISOString());

      const allReviews = reviews || [];
      const averageRating = allReviews.length > 0
        ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10
        : 0;

      // Group by subject
      const subjectMap = new Map<string, { students: Set<string>; lessons: number }>();
      for (const booking of allBookings) {
        const subject = booking.service_name || 'General';
        const current = subjectMap.get(subject) || { students: new Set(), lessons: 0 };
        current.students.add(booking.client_id);
        current.lessons++;
        subjectMap.set(subject, current);
      }

      const topSubjects = Array.from(subjectMap.entries())
        .map(([subject, data]) => ({
          subject,
          students: data.students.size,
          lessons: data.lessons,
        }))
        .sort((a, b) => b.lessons - a.lessons)
        .slice(0, 5);

      const analytics: TutorAnalytics = {
        tutorId,
        period,
        totalStudents,
        activeStudents: totalStudents, // Simplified - all are active in period
        newStudents: 0, // Would need to track first booking per student
        totalLessons: allBookings.length,
        completedLessons: completedBookings.length,
        cancelledLessons: cancelledBookings.length,
        averageRating,
        totalReviews: allReviews.length,
        responseRate: 0.95, // Would calculate from response times
        averageResponseTime: 15, // Would calculate from timestamps
        earnings: {
          total: totalEarnings,
          pending: pendingEarnings,
          paid: paidEarnings,
        },
        topSubjects,
        studentRetention: totalStudents > 0 ? 0.87 : 0, // Simplified
        satisfactionScore: averageRating,
      };

      return { success: true, analytics };
    } catch (error) {
      console.error('[ProgressModule] Get tutor analytics error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get organisation analytics
   */
  async getOrgAnalytics(
    ctx: AgentContext,
    period: OrgAnalytics['period'] = 'month'
  ): Promise<{ success: boolean; analytics?: OrgAnalytics; error?: string }> {
    if (!hasRole(ctx, 'organisation')) {
      return { success: false, error: 'Only organisation admins can view org analytics' };
    }

    const orgId = getOrganisationId(ctx);
    if (!orgId) {
      return { success: false, error: 'Organisation ID not found' };
    }

    console.log(createAuditEntry(ctx, 'progress:getOrgAnalytics', { orgId, period }));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const periodStart = getPeriodStartDate(period);

      // Get organisation's tutors
      const { data: tutors, error: tutorsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('organisation_id', orgId)
        .eq('active_role', 'tutor');

      if (tutorsError) {
        console.error('[ProgressModule] Get org tutors error:', tutorsError);
      }

      const orgTutors = tutors || [];
      const tutorIds = orgTutors.map(t => t.id);

      if (tutorIds.length === 0) {
        // Return empty analytics if no tutors
        return {
          success: true,
          analytics: {
            organisationId: orgId,
            period,
            totalTutors: 0,
            activeTutors: 0,
            totalStudents: 0,
            activeStudents: 0,
            totalLessons: 0,
            completedLessons: 0,
            revenue: { total: 0, growth: 0 },
            averageRating: 0,
            topPerformers: [],
            subjectBreakdown: [],
            alerts: [],
          },
        };
      }

      // Get bookings for org tutors
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, tutor_id, client_id, service_name, status, amount, session_start_time')
        .in('tutor_id', tutorIds)
        .gte('created_at', periodStart.toISOString());

      if (bookingsError) {
        console.error('[ProgressModule] Get org bookings error:', bookingsError);
      }

      const allBookings = bookings || [];
      const completedBookings = allBookings.filter(b => b.status === 'Completed' || b.status === 'completed');

      // Get unique students and active tutors
      const studentIds = new Set(allBookings.map(b => b.client_id));
      const activeTutorIds = new Set(allBookings.map(b => b.tutor_id));

      // Calculate revenue
      const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

      // Get reviews for org tutors
      const { data: reviews } = await supabase
        .from('reviews')
        .select('reviewed_user_id, rating')
        .in('reviewed_user_id', tutorIds);

      const allReviews = reviews || [];
      const averageRating = allReviews.length > 0
        ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10
        : 0;

      // Calculate top performers
      const tutorPerformance = new Map<string, { lessons: number; ratings: number[]; name: string }>();
      for (const tutor of orgTutors) {
        tutorPerformance.set(tutor.id, { lessons: 0, ratings: [], name: tutor.full_name || 'Tutor' });
      }

      for (const booking of completedBookings) {
        const perf = tutorPerformance.get(booking.tutor_id);
        if (perf) {
          perf.lessons++;
        }
      }

      for (const review of allReviews) {
        const perf = tutorPerformance.get(review.reviewed_user_id);
        if (perf) {
          perf.ratings.push(review.rating);
        }
      }

      const topPerformers = Array.from(tutorPerformance.entries())
        .map(([tutorId, data]) => ({
          tutorId,
          name: data.name,
          rating: data.ratings.length > 0
            ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10
            : 0,
          lessons: data.lessons,
        }))
        .sort((a, b) => b.lessons - a.lessons)
        .slice(0, 5);

      // Subject breakdown
      const subjectMap = new Map<string, { students: Set<string>; revenue: number }>();
      for (const booking of completedBookings) {
        const subject = booking.service_name || 'General';
        const current = subjectMap.get(subject) || { students: new Set(), revenue: 0 };
        current.students.add(booking.client_id);
        current.revenue += booking.amount || 0;
        subjectMap.set(subject, current);
      }

      const subjectBreakdown = Array.from(subjectMap.entries())
        .map(([subject, data]) => ({
          subject,
          students: data.students.size,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      const analytics: OrgAnalytics = {
        organisationId: orgId,
        period,
        totalTutors: orgTutors.length,
        activeTutors: activeTutorIds.size,
        totalStudents: studentIds.size,
        activeStudents: studentIds.size, // Simplified
        totalLessons: allBookings.length,
        completedLessons: completedBookings.length,
        revenue: {
          total: totalRevenue,
          growth: 0, // Would compare to previous period
        },
        averageRating,
        topPerformers,
        subjectBreakdown,
        alerts: [],
      };

      return { success: true, analytics };
    } catch (error) {
      console.error('[ProgressModule] Get org analytics error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Generate a progress report
   */
  async generateReport(
    ctx: AgentContext,
    options: {
      type: 'student' | 'tutor' | 'organisation';
      format: 'pdf' | 'csv';
      dateRange: { start: Date; end: Date };
      includeDetails?: boolean;
    }
  ): Promise<{ success: boolean; report?: ProgressReport; error?: string }> {
    if (!isOperationAllowed(ctx, 'analytics:own') && !hasRole(ctx, 'organisation')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'progress:generateReport', options));

    // Report generation would typically queue a job
    // For now, return a placeholder
    const report: ProgressReport = {
      id: `report_${Date.now().toString(36)}`,
      type: options.type,
      format: options.format,
      dateRange: options.dateRange,
      generatedAt: new Date(),
      downloadUrl: `https://reports.tutorwise.com/${Date.now()}.${options.format}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    return { success: true, report };
  }

  /**
   * Submit feedback for a lesson
   */
  async submitFeedback(
    ctx: AgentContext,
    lessonId: string,
    feedback: {
      rating: number;
      comment?: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; feedback?: Feedback; error?: string }> {
    if (!isOperationAllowed(ctx, 'feedback:create')) {
      return { success: false, error: 'Permission denied' };
    }

    if (feedback.rating < 1 || feedback.rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    console.log(createAuditEntry(ctx, 'progress:submitFeedback', { lessonId, feedback }));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Get the booking to find the tutor
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, tutor_id, client_id')
        .eq('id', lessonId)
        .single();

      if (bookingError || !booking) {
        return { success: false, error: 'Booking not found' };
      }

      // Create review
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: ctx.user?.id,
          reviewed_user_id: booking.tutor_id,
          session_id: lessonId,
          rating: feedback.rating,
          comment: feedback.comment,
          tags: feedback.tags || [],
        })
        .select()
        .single();

      if (reviewError) {
        console.error('[ProgressModule] Submit feedback error:', reviewError);
        return { success: false, error: reviewError.message };
      }

      const newFeedback: Feedback = {
        id: review.id,
        lessonId,
        fromUserId: ctx.user?.id || '',
        toUserId: booking.tutor_id,
        rating: feedback.rating,
        comment: feedback.comment,
        tags: feedback.tags || [],
        createdAt: new Date(review.created_at),
      };

      return { success: true, feedback: newFeedback };
    } catch (error) {
      console.error('[ProgressModule] Submit feedback error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get feedback received (for tutors)
   */
  async getReceivedFeedback(
    ctx: AgentContext,
    options: {
      limit?: number;
      offset?: number;
      minRating?: number;
    } = {}
  ): Promise<{ success: boolean; feedback: Feedback[]; total: number; error?: string }> {
    if (!hasRole(ctx, 'tutor')) {
      return { success: false, feedback: [], total: 0, error: 'Only tutors can view feedback' };
    }

    console.log(createAuditEntry(ctx, 'progress:getReceivedFeedback', options));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, feedback: [], total: 0, error: 'Database not configured' };
    }

    try {
      const tutorId = ctx.user?.id;
      if (!tutorId) {
        return { success: false, feedback: [], total: 0, error: 'User ID not found' };
      }

      let query = supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('reviewed_user_id', tutorId)
        .order('created_at', { ascending: false });

      if (options.minRating) {
        query = query.gte('rating', options.minRating);
      }

      const limit = options.limit || 20;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        console.error('[ProgressModule] Get feedback error:', error);
        return { success: false, feedback: [], total: 0, error: error.message };
      }

      const feedback: Feedback[] = (data || []).map((row: any) => ({
        id: row.id,
        lessonId: row.session_id,
        fromUserId: row.reviewer_id,
        toUserId: row.reviewed_user_id,
        rating: row.rating,
        comment: row.comment,
        tags: row.tags || [],
        createdAt: new Date(row.created_at),
      }));

      return { success: true, feedback, total: count || feedback.length };
    } catch (error) {
      console.error('[ProgressModule] Get feedback error:', error);
      return { success: false, feedback: [], total: 0, error: String(error) };
    }
  }

  /**
   * Get recent activity feed
   */
  async getActivityFeed(
    ctx: AgentContext,
    limit: number = 10
  ): Promise<{ success: boolean; activities: Activity[]; error?: string }> {
    if (!isOperationAllowed(ctx, 'progress:read:own')) {
      return { success: false, activities: [], error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'progress:getActivityFeed', { limit }));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, activities: [], error: 'Database not configured' };
    }

    try {
      const userId = ctx.user?.id;
      if (!userId) {
        return { success: false, activities: [], error: 'User ID not found' };
      }

      // Get recent bookings as activities
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, service_name, status, session_start_time, session_duration')
        .or(`client_id.eq.${userId},tutor_id.eq.${userId}`)
        .order('session_start_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[ProgressModule] Get activity feed error:', error);
        return { success: false, activities: [], error: error.message };
      }

      const activities: Activity[] = (bookings || []).map((b: any) => ({
        id: b.id,
        type: 'lesson' as const,
        title: b.service_name || 'Lesson',
        description: `${b.status} - ${b.session_duration} minutes`,
        timestamp: new Date(b.session_start_time),
        duration: b.session_duration,
      }));

      return { success: true, activities };
    } catch (error) {
      console.error('[ProgressModule] Get activity feed error:', error);
      return { success: false, activities: [], error: String(error) };
    }
  }

  /**
   * Get achievements
   */
  async getAchievements(
    ctx: AgentContext
  ): Promise<{ success: boolean; achievements: Achievement[]; error?: string }> {
    if (!isOperationAllowed(ctx, 'progress:read:own')) {
      return { success: false, achievements: [], error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'progress:getAchievements'));

    // Achievements would need a dedicated table
    // For now, return empty array
    return { success: true, achievements: [] };
  }
}

export const progressModule = new ProgressModuleAPI();

export default ProgressModuleAPI;
