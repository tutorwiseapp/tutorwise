/**
 * Lexi Tool Executor
 *
 * Executes tool calls and returns results.
 * Integrates with TutorWise services to perform actions.
 *
 * @module lexi/tools/executor
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  ToolCall,
  ToolCallResult,
  ToolExecutionContext,
  ExplainEdupayArgs,
  CheckReferralStatusArgs,
  GetTutorEarningsArgs,
  GetBookingStatusArgs,
  SearchTutorsArgs,
  GetStudentProgressArgs,
  GetUpcomingLessonsArgs,
  CreateSupportTicketArgs,
} from './types';

// --- Tool Executor Class ---

export class ToolExecutor {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false },
      });
    }
  }

  /**
   * Execute a tool call and return the result
   */
  async execute(
    toolCall: ToolCall,
    context: ToolExecutionContext
  ): Promise<ToolCallResult> {
    const { name, arguments: argsJson } = toolCall.function;
    const args = JSON.parse(argsJson || '{}');

    let result: unknown;

    try {
      switch (name) {
        case 'explain_edupay':
          result = await this.explainEdupay(args);
          break;
        case 'get_tutor_earnings':
          result = await this.getTutorEarnings(args, context);
          break;
        case 'check_referral_status':
          result = await this.checkReferralStatus(args, context);
          break;
        case 'get_booking_status':
          result = await this.getBookingStatus(args, context);
          break;
        case 'get_upcoming_lessons':
          result = await this.getUpcomingLessons(args, context);
          break;
        case 'search_tutors':
          result = await this.searchTutors(args);
          break;
        case 'get_student_progress':
          result = await this.getStudentProgress(args, context);
          break;
        case 'create_support_ticket':
          result = await this.createSupportTicket(args, context);
          break;
        case 'get_user_profile':
          result = await this.getUserProfile(context);
          break;
        case 'get_notifications':
          result = await this.getNotifications(context);
          break;
        case 'get_organisation_stats':
          result = await this.getOrganisationStats(args, context);
          break;
        default:
          result = { error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      result = {
        error: `Tool execution failed: ${(error as Error).message}`,
      };
    }

    return {
      tool_call_id: toolCall.id,
      role: 'tool',
      content: JSON.stringify(result),
    };
  }

  // --- Tool Implementations ---

  private async explainEdupay(args: ExplainEdupayArgs): Promise<object> {
    const topic = args.topic || 'overview';

    const explanations: Record<string, object> = {
      overview: {
        title: 'EduPay Overview',
        description: 'EduPay is TutorWise\'s secure payment system that handles all transactions between clients and tutors.',
        keyPoints: [
          'Secure payment processing through Stripe',
          'Automatic invoicing and receipts',
          'Weekly payouts to tutors',
          'Transparent fee structure',
        ],
      },
      fees: {
        title: 'EduPay Fees',
        description: 'TutorWise charges a platform fee on each transaction.',
        details: {
          platformFee: '15%',
          paymentProcessing: '2.9% + 30p (Stripe)',
          tutorReceives: 'Approximately 82% of lesson price',
          noHiddenFees: true,
        },
      },
      payouts: {
        title: 'Tutor Payouts',
        description: 'Tutors receive weekly payouts for completed lessons.',
        schedule: {
          frequency: 'Weekly (every Monday)',
          minimumPayout: '£10',
          processingTime: '2-3 business days',
          method: 'Direct bank transfer',
        },
      },
      invoices: {
        title: 'Invoices & Receipts',
        description: 'Automatic invoicing for all transactions.',
        features: [
          'PDF invoices generated automatically',
          'Email receipts after each payment',
          'Monthly statements available',
          'Tax-ready documentation',
        ],
      },
      refunds: {
        title: 'Refund Policy',
        description: 'Our refund policy protects both clients and tutors.',
        policy: {
          cancellationWindow: '24 hours before lesson',
          fullRefund: 'Cancellation >24h before',
          partialRefund: 'Cancellation <24h (50%)',
          noShow: 'No refund (lesson charged)',
          disputes: 'Contact support within 7 days',
        },
      },
    };

    return explanations[topic] || explanations.overview;
  }

  private async getTutorEarnings(
    args: GetTutorEarningsArgs,
    context: ToolExecutionContext
  ): Promise<object> {
    if (!this.supabase) {
      return { error: 'Database not available' };
    }

    const period = args.period || 'month';
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(0);
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .select('price, status, completed_at')
      .eq('tutor_id', context.userId)
      .eq('status', 'completed')
      .gte('completed_at', startDate.toISOString());

    if (error) {
      return { error: 'Failed to fetch earnings' };
    }

    const totalEarnings = data?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;
    const platformFee = totalEarnings * 0.15;
    const netEarnings = totalEarnings - platformFee;

    return {
      period,
      totalLessons: data?.length || 0,
      grossEarnings: totalEarnings,
      platformFee,
      netEarnings,
      currency: 'GBP',
    };
  }

  private async checkReferralStatus(
    args: CheckReferralStatusArgs,
    context: ToolExecutionContext
  ): Promise<object> {
    if (!this.supabase) {
      return { error: 'Database not available' };
    }

    const { data: referrals, error } = await this.supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', context.userId);

    if (error) {
      return { error: 'Failed to fetch referrals' };
    }

    const totalReferrals = referrals?.length || 0;
    const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0;
    const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
    const totalEarnings = referrals?.reduce((sum, r) => sum + (r.commission || 0), 0) || 0;

    return {
      referralCode: args.referralCode || 'Your referral code is in your profile',
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      totalEarnings,
      currency: 'GBP',
    };
  }

  private async getBookingStatus(
    args: GetBookingStatusArgs,
    context: ToolExecutionContext
  ): Promise<object> {
    if (!this.supabase || !args.bookingId) {
      return { error: 'Booking ID required' };
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .select('*, tutor:profiles!tutor_id(first_name, last_name), student:profiles!student_id(first_name, last_name)')
      .eq('id', args.bookingId)
      .single();

    if (error || !data) {
      return { error: 'Booking not found' };
    }

    // Verify access (user is tutor, client, or agent)
    if (context.userRole !== 'agent' && data.tutor_id !== context.userId && data.client_id !== context.userId) {
      return { error: 'Access denied' };
    }

    return {
      bookingId: data.id,
      status: data.status,
      subject: data.subject,
      scheduledAt: data.scheduled_at,
      duration: data.duration,
      price: data.price,
      tutor: data.tutor ? `${data.tutor.first_name} ${data.tutor.last_name}` : 'Unknown',
      student: data.student ? `${data.student.first_name} ${data.student.last_name}` : 'Unknown',
      paymentStatus: data.payment_status,
    };
  }

  private async getUpcomingLessons(
    args: GetUpcomingLessonsArgs,
    context: ToolExecutionContext
  ): Promise<object> {
    if (!this.supabase) {
      return { error: 'Database not available' };
    }

    const days = args.days || 7;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    let query = this.supabase
      .from('bookings')
      .select('*, tutor:profiles!tutor_id(first_name, last_name), student:profiles!student_id(first_name, last_name)')
      .in('status', ['confirmed', 'scheduled'])
      .gte('scheduled_at', new Date().toISOString())
      .lte('scheduled_at', endDate.toISOString())
      .order('scheduled_at', { ascending: true });

    // Filter by user role
    if (context.userRole === 'tutor') {
      query = query.eq('tutor_id', context.userId);
    } else if (context.userRole === 'client' || context.userRole === 'student') {
      query = query.eq('client_id', context.userId);
    }

    const { data, error } = await query.limit(10);

    if (error) {
      return { error: 'Failed to fetch lessons' };
    }

    return {
      days,
      lessonCount: data?.length || 0,
      lessons: data?.map(b => ({
        id: b.id,
        subject: b.subject,
        scheduledAt: b.scheduled_at,
        duration: b.duration,
        tutor: b.tutor ? `${b.tutor.first_name} ${b.tutor.last_name}` : 'Unknown',
        student: b.student ? `${b.student.first_name}` : 'Unknown',
        status: b.status,
      })) || [],
    };
  }

  private async searchTutors(args: SearchTutorsArgs): Promise<object> {
    if (!this.supabase) {
      return { error: 'Database not available' };
    }

    let query = this.supabase
      .from('profiles')
      .select('id, first_name, last_name, subjects, hourly_rate, rating, total_reviews')
      .eq('role', 'tutor')
      .eq('is_verified', true)
      .eq('is_available', true);

    if (args.subject) {
      query = query.contains('subjects', [args.subject.toLowerCase()]);
    }
    if (args.maxPrice) {
      query = query.lte('hourly_rate', args.maxPrice);
    }

    const { data, error } = await query.order('rating', { ascending: false }).limit(5);

    if (error) {
      return { error: 'Failed to search tutors' };
    }

    return {
      resultCount: data?.length || 0,
      filters: args,
      tutors: data?.map(t => ({
        id: t.id,
        name: `${t.first_name} ${t.last_name}`,
        subjects: t.subjects,
        hourlyRate: t.hourly_rate,
        rating: t.rating,
        totalReviews: t.total_reviews,
      })) || [],
    };
  }

  private async getStudentProgress(
    args: GetStudentProgressArgs,
    context: ToolExecutionContext
  ): Promise<object> {
    if (!this.supabase) {
      return { error: 'Database not available' };
    }

    // For clients, get their children's progress
    // For tutors, get their students' progress
    // For students, get their own progress
    let studentId = args.studentId;

    if (!studentId) {
      if (context.userRole === 'student') {
        studentId = context.userId;
      } else {
        return { error: 'Student ID required' };
      }
    }

    const { data, error } = await this.supabase
      .from('sage_progress')
      .select('*')
      .eq('student_id', studentId)
      .order('mastery_score', { ascending: false });

    if (error) {
      return { error: 'Failed to fetch progress' };
    }

    const subjects = [...new Set(data?.map(p => p.subject) || [])];
    const totalTopics = data?.length || 0;
    const masteredTopics = data?.filter(p => p.mastery_score >= 80).length || 0;

    return {
      studentId,
      subjects,
      totalTopics,
      masteredTopics,
      overallMastery: totalTopics > 0 ? Math.round(data!.reduce((sum, p) => sum + p.mastery_score, 0) / totalTopics) : 0,
      recentTopics: data?.slice(0, 5).map(p => ({
        topic: p.topic_name,
        subject: p.subject,
        mastery: p.mastery_score,
        lastPracticed: p.last_practiced_at,
      })) || [],
    };
  }

  private async createSupportTicket(
    args: CreateSupportTicketArgs,
    context: ToolExecutionContext
  ): Promise<object> {
    // Guest users can't create tickets (no name/email available)
    if (!context.userFirstName && !context.userLastName) {
      return {
        error: 'unauthenticated',
        message: 'Please sign in to create a support ticket, or visit the Help Centre.',
      };
    }

    try {
      const { createJiraTicketFromLexi } = await import(
        '../../apps/web/src/lib/integrations/jira-lexi-sync'
      );

      const isUrgent = args.priority === 'high';

      const result = await createJiraTicketFromLexi({
        firstName: context.userFirstName || 'User',
        lastName: context.userLastName || '',
        email: context.userEmail,
        userRole: context.userRole,
        category: args.category,
        summary: args.summary,
        details: args.details,
        isUrgent,
      });

      return {
        success: true,
        ticketKey: result.ticketKey,
        ticketUrl: result.ticketUrl,
        message: `Ticket ${result.ticketKey} created successfully. Our team will look into this within 24 hours.`,
      };
    } catch (error) {
      console.error('[ToolExecutor] Jira ticket creation failed:', error);
      return {
        error: 'jira_unavailable',
        message: 'Failed to create the ticket. Please try submitting via the Help Centre instead.',
      };
    }
  }

  private async getUserProfile(context: ToolExecutionContext): Promise<object> {
    if (!this.supabase) {
      return { error: 'Database not available' };
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('first_name, last_name, role, email, is_verified, created_at')
      .eq('id', context.userId)
      .single();

    if (error || !data) {
      return { error: 'Profile not found' };
    }

    return {
      name: `${data.first_name} ${data.last_name}`,
      role: data.role,
      email: data.email,
      isVerified: data.is_verified,
      memberSince: data.created_at,
    };
  }

  private async getNotifications(context: ToolExecutionContext): Promise<object> {
    if (!this.supabase) {
      return { error: 'Database not available' };
    }

    const { data, error } = await this.supabase
      .from('notifications')
      .select('id, title, message, type, created_at, is_read')
      .eq('user_id', context.userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return { error: 'Failed to fetch notifications' };
    }

    return {
      unreadCount: data?.length || 0,
      notifications: data?.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        createdAt: n.created_at,
      })) || [],
    };
  }

  private async getOrganisationStats(
    args: { period?: string },
    context: ToolExecutionContext
  ): Promise<object> {
    if (!this.supabase || !context.organisationId) {
      return { error: 'Organisation context required' };
    }

    const period = args.period || 'month';
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get member counts
    const { count: tutorCount } = await this.supabase
      .from('organisation_members')
      .select('*', { count: 'exact', head: true })
      .eq('organisation_id', context.organisationId)
      .eq('role', 'tutor');

    const { count: studentCount } = await this.supabase
      .from('organisation_members')
      .select('*', { count: 'exact', head: true })
      .eq('organisation_id', context.organisationId)
      .eq('role', 'student');

    // Get booking stats
    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('price, status')
      .eq('organisation_id', context.organisationId)
      .gte('created_at', startDate.toISOString());

    const totalRevenue = bookings?.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.price || 0), 0) || 0;
    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;

    return {
      period,
      tutorCount: tutorCount || 0,
      studentCount: studentCount || 0,
      totalBookings,
      completedBookings,
      completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
      totalRevenue,
      currency: 'GBP',
    };
  }
}

// --- Singleton Export ---

export const toolExecutor = new ToolExecutor();

export default ToolExecutor;
