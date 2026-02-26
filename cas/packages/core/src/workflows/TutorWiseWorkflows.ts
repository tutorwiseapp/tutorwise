/**
 * TutorWise-Specific Workflows
 *
 * Real business workflows for TutorWise platform:
 * 1. Content Strategy Workflow - Marketing + Analytics
 * 2. Feature Development Workflow - Planning + Development + Testing
 * 3. User Onboarding Workflow - Multi-agent coordination (all user roles)
 * 4. Platform Health Check - System-wide analysis
 */

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  expectedDuration?: string;
  requiredAgents: string[];
}

export interface WorkflowStep {
  name: string;
  type: 'sequential' | 'parallel';
  tasks: WorkflowTask[];
}

export interface WorkflowTask {
  agentId: string;
  input: any;
  outputKey?: string; // Key to store result in context for next step
}

/**
 * Content Strategy Workflow
 *
 * Creates data-driven content strategy for TutorWise blog
 * Agents: Analyst → Marketer → Marketer
 */
export const CONTENT_STRATEGY_WORKFLOW: WorkflowDefinition = {
  id: 'tutorwise-content-strategy',
  name: 'Content Strategy Workflow',
  description: 'Analyze platform metrics, generate content topics, create optimized blog post',
  expectedDuration: '5-10 minutes',
  requiredAgents: ['analyst', 'marketer'],
  steps: [
    {
      name: 'analyze_platform_metrics',
      type: 'sequential',
      tasks: [
        {
          agentId: 'analyst',
          input: {
            action: 'analyze_metrics',
            period: 'monthly',
            comparison_period: 'previous_month',
            metrics_data: {
              active_tutors: { current: 450, previous: 380 },
              active_students: { current: 2100, previous: 1750 },
              session_bookings: { current: 1250, previous: 980 },
              platform_revenue: { current: 45000, previous: 38000 },
              user_satisfaction: { current: 4.6, previous: 4.3 },
              avg_session_duration_mins: { current: 52, previous: 48 }
            }
          },
          outputKey: 'metrics_analysis'
        }
      ]
    },
    {
      name: 'identify_content_opportunities',
      type: 'sequential',
      tasks: [
        {
          agentId: 'analyst',
          input: {
            action: 'identify_insights',
            time_period: '30 days',
            focus_areas: ['growth', 'engagement', 'retention'],
            // data will be injected from previous step
          },
          outputKey: 'insights'
        }
      ]
    },
    {
      name: 'create_blog_content',
      type: 'sequential',
      tasks: [
        {
          agentId: 'marketer',
          input: {
            action: 'create_content',
            content_type: 'blog',
            // topic will be derived from insights
            topic: 'How AI-Powered Tutoring Platforms Are Transforming Education',
            target_audience: 'educators and parents',
            tone: 'professional',
            length: 'long'
          },
          outputKey: 'blog_content'
        }
      ]
    },
    {
      name: 'optimize_for_seo',
      type: 'sequential',
      tasks: [
        {
          agentId: 'marketer',
          input: {
            action: 'seo_optimize',
            // content will be injected from previous step
            keywords: [
              'AI tutoring platform',
              'online education',
              'personalized learning',
              'virtual tutoring'
            ],
            target_url: 'https://tutorwise.io/blog/ai-tutoring-platforms'
          },
          outputKey: 'seo_optimization'
        }
      ]
    }
  ]
};

/**
 * Feature Development Workflow
 *
 * Data-driven feature development with comprehensive analysis
 * Agents: Analyst → Planner → Developer → Tester → QA
 */
export const FEATURE_DEVELOPMENT_WORKFLOW: WorkflowDefinition = {
  id: 'tutorwise-feature-development',
  name: 'Feature Development Workflow',
  description: 'Analyze user data, plan, develop, test, and review new platform feature',
  expectedDuration: '15-20 minutes',
  requiredAgents: ['analyst', 'planner', 'developer', 'tester', 'qa'],
  steps: [
    {
      name: 'analyze_user_data',
      type: 'sequential',
      tasks: [
        {
          agentId: 'analyst',
          input: {
            action: 'identify_insights',
            time_period: '90 days',
            focus_areas: ['feature_requests', 'user_behavior', 'conversion', 'engagement'],
            data: {
              feature_requests: {
                'session_recommendations': { votes: 145, priority: 'high', user_segment: 'students' },
                'tutor_matching_ai': { votes: 98, priority: 'high', user_segment: 'students' },
                'smart_scheduling': { votes: 76, priority: 'medium', user_segment: 'tutors+students' }
              },
              user_behavior: {
                'avg_time_to_book_session': 8.5, // minutes
                'search_attempts_before_booking': 3.2,
                'booking_abandonment_rate': 0.18,
                'students_using_search': 0.72
              },
              conversion_metrics: {
                'first_session_booking_rate': 0.58, // 58% of new students book
                'tutor_match_satisfaction': 4.2, // out of 5
                'session_completion_rate': 0.94
              },
              pain_points: [
                'Too much time spent searching for tutors',
                'Difficult to find tutors matching learning style',
                'Not sure which tutor is best for my needs'
              ]
            }
          },
          outputKey: 'user_insights'
        }
      ]
    },
    {
      name: 'create_project_plan',
      type: 'sequential',
      tasks: [
        {
          agentId: 'planner',
          input: {
            action: 'create_plan',
            project_description: 'Implement AI-powered session recommendation system for students. The system should analyze student learning patterns, tutor expertise, and session history to suggest optimal tutor matches and session times. Based on analyst insights showing 18% booking abandonment and 145 votes for this feature.',
            scope: 'Backend API, ML model integration, frontend components',
            team_size: 3,
            constraints: ['Must integrate with existing booking system', '2-week deadline', 'Use existing Gemini AI infrastructure'],
            success_metrics: [
              'Reduce booking abandonment from 18% to <10%',
              'Reduce avg time to book from 8.5min to <5min',
              'Increase first session booking rate from 58% to >70%',
              'Tutor match satisfaction score >4.5/5'
            ]
            // analyst insights will be injected from previous step
          },
          outputKey: 'project_plan'
        }
      ]
    },
    {
      name: 'break_down_tasks',
      type: 'sequential',
      tasks: [
        {
          agentId: 'planner',
          input: {
            action: 'breakdown_tasks',
            task_description: 'Implement recommendation API endpoint',
            complexity: 'high'
          },
          outputKey: 'task_breakdown'
        }
      ]
    },
    {
      name: 'generate_code',
      type: 'parallel',
      tasks: [
        {
          agentId: 'developer',
          input: {
            action: 'generate_code',
            description: 'Create a TypeScript function that generates tutor recommendations based on student profile, learning goals, and session history. Use machine learning scoring algorithm.',
            language: 'typescript',
            include_tests: true,
            include_docs: true
          },
          outputKey: 'recommendation_code'
        },
        {
          agentId: 'developer',
          input: {
            action: 'generate_code',
            description: 'Create a Next.js API route for /api/recommendations that accepts student_id and returns ranked list of recommended tutors with confidence scores',
            language: 'typescript',
            include_tests: true,
            include_docs: true
          },
          outputKey: 'api_route_code'
        }
      ]
    },
    {
      name: 'quality_assurance',
      type: 'parallel',
      tasks: [
        {
          agentId: 'tester',
          input: {
            action: 'generate_tests',
            framework: 'jest',
            component: 'RecommendationEngine'
          },
          outputKey: 'test_plan'
        },
        {
          agentId: 'qa',
          input: {
            action: 'quality_audit'
          },
          outputKey: 'quality_report'
        }
      ]
    }
  ]
};

/**
 * User Onboarding Workflow (All Roles)
 *
 * Comprehensive onboarding for all TutorWise user roles:
 * - Students: Learning goals, tutor matching, first session booking
 * - Tutors: Profile verification, subject expertise, availability setup
 * - Clients: Organization setup, team management, billing
 * - Agents: Team onboarding, workflow setup, permissions
 * - Organizations: Multi-user setup, admin configuration, compliance
 *
 * Agents: Planner → Analyst → Marketer → Developer
 */
export const USER_ONBOARDING_WORKFLOW: WorkflowDefinition = {
  id: 'tutorwise-user-onboarding',
  name: 'User Onboarding Workflow',
  description: 'Create personalized onboarding experience for all user roles (students, tutors, clients, agents, organizations)',
  expectedDuration: '8-12 minutes',
  requiredAgents: ['planner', 'analyst', 'marketer', 'developer'],
  steps: [
    {
      name: 'plan_onboarding_journey',
      type: 'sequential',
      tasks: [
        {
          agentId: 'planner',
          input: {
            action: 'create_plan',
            project_description: 'Design personalized onboarding journey based on user role. Include account setup, role-specific profile completion, feature walkthrough, and first key action (e.g., book session for students, set availability for tutors, invite team for organizations)',
            scope: 'User experience flow, email automation, in-app guidance, role-specific activation',
            team_size: 2,
            constraints: ['Must be completable in under 10 minutes', 'Mobile-friendly', 'Accessible', 'Role-adaptive'],
            // user_role will be injected: 'student' | 'tutor' | 'client' | 'agent' | 'organization'
          },
          outputKey: 'onboarding_plan'
        }
      ]
    },
    {
      name: 'analyze_user_segment',
      type: 'sequential',
      tasks: [
        {
          agentId: 'analyst',
          input: {
            action: 'identify_insights',
            time_period: '90 days',
            focus_areas: ['user_success', 'engagement', 'retention', 'activation'],
            data: {
              user_segments: {
                // Students
                'student_k12': { count: 1200, retention_rate: 0.85, avg_sessions: 12, activation_metric: 'first_session_booked' },
                'student_university': { count: 650, retention_rate: 0.78, avg_sessions: 8, activation_metric: 'first_session_booked' },
                'student_professional': { count: 250, retention_rate: 0.92, avg_sessions: 15, activation_metric: 'first_session_booked' },

                // Tutors
                'tutor_k12': { count: 180, retention_rate: 0.88, avg_sessions: 45, activation_metric: 'first_session_delivered' },
                'tutor_university': { count: 145, retention_rate: 0.82, avg_sessions: 38, activation_metric: 'first_session_delivered' },
                'tutor_professional': { count: 125, retention_rate: 0.90, avg_sessions: 52, activation_metric: 'first_session_delivered' },

                // Clients (organizations hiring tutors)
                'client_small': { count: 45, retention_rate: 0.75, avg_monthly_spend: 2500, activation_metric: 'first_tutor_hired' },
                'client_medium': { count: 18, retention_rate: 0.88, avg_monthly_spend: 8500, activation_metric: 'first_tutor_hired' },
                'client_enterprise': { count: 7, retention_rate: 0.95, avg_monthly_spend: 25000, activation_metric: 'team_setup_complete' },

                // Organizations (multi-user setups)
                'organization': { count: 32, retention_rate: 0.92, avg_users: 12, activation_metric: 'admin_configured' }
              },
              success_factors: {
                'early_activation': 0.68, // correlation with retention (first key action within 48h)
                'profile_completion': 0.62,
                'onboarding_completion_rate': 0.55,
                'feature_discovery': 0.48
              },
              activation_benchmarks: {
                'student': { time_to_first_session: '3 days', benchmark: '72 hours' },
                'tutor': { time_to_first_session: '5 days', benchmark: '120 hours' },
                'client': { time_to_first_hire: '7 days', benchmark: '168 hours' },
                'organization': { time_to_team_setup: '2 days', benchmark: '48 hours' }
              }
            }
          },
          outputKey: 'segment_insights'
        }
      ]
    },
    {
      name: 'create_welcome_content',
      type: 'parallel',
      tasks: [
        {
          agentId: 'marketer',
          input: {
            action: 'create_content',
            content_type: 'email',
            topic: 'Welcome to TutorWise - Your Journey Starts Here',
            // target_audience will be injected based on user_role
            // 'new students' | 'new tutors' | 'new clients' | 'new organizations'
            tone: 'friendly',
            length: 'medium',
            personalization_required: true,
            role_specific_cta: {
              student: 'Find Your Perfect Tutor',
              tutor: 'Set Up Your Teaching Profile',
              client: 'Post Your First Job',
              agent: 'Explore Team Features',
              organization: 'Configure Your Organization'
            }
          },
          outputKey: 'welcome_email'
        },
        {
          agentId: 'marketer',
          input: {
            action: 'create_content',
            content_type: 'ad_copy',
            topic: 'Getting Started Guide - Success in 5 Steps',
            // target_audience will be injected based on user_role
            tone: 'professional',
            length: 'short',
            role_specific_steps: {
              student: ['Complete profile', 'Set learning goals', 'Browse tutors', 'Book first session', 'Rate experience'],
              tutor: ['Complete verification', 'Set expertise', 'Configure availability', 'Accept first student', 'Deliver session'],
              client: ['Organization setup', 'Post job', 'Review candidates', 'Hire tutor', 'Manage team'],
              agent: ['Team setup', 'Configure workflows', 'Invite members', 'Set permissions', 'Track progress'],
              organization: ['Admin setup', 'Configure billing', 'Invite users', 'Set policies', 'Review compliance']
            }
          },
          outputKey: 'getting_started_guide'
        }
      ]
    },
    {
      name: 'implement_automation',
      type: 'sequential',
      tasks: [
        {
          agentId: 'developer',
          input: {
            action: 'generate_code',
            description: 'Create a TypeScript function for role-adaptive automated onboarding email sequence. Should handle all user roles (student, tutor, client, agent, organization) with role-specific email content and timing. Trigger welcome email immediately, follow-up email at day 3 with role-specific tips, and activation reminder at day 7 if key action not completed (e.g., no session booked for students, no availability set for tutors, no team invited for organizations). Use Resend API with template support.',
            language: 'typescript',
            include_tests: true,
            include_docs: true,
            requirements: [
              'Support all user roles: student, tutor, client, agent, organization',
              'Role-specific email templates',
              'Activation tracking per role (different metrics)',
              'Conditional logic for follow-ups based on user progress',
              'A/B testing support for onboarding sequences',
              'Analytics events for each step'
            ]
          },
          outputKey: 'automation_code'
        }
      ]
    }
  ]
};

/**
 * Platform Health Check Workflow
 *
 * Comprehensive platform analysis and recommendations
 * Agents: Analyst → Engineer → Security → QA
 */
export const PLATFORM_HEALTH_CHECK_WORKFLOW: WorkflowDefinition = {
  id: 'tutorwise-health-check',
  name: 'Platform Health Check Workflow',
  description: 'Comprehensive platform health analysis with recommendations',
  expectedDuration: '10-15 minutes',
  requiredAgents: ['analyst', 'engineer', 'security', 'qa'],
  steps: [
    {
      name: 'analyze_platform_metrics',
      type: 'sequential',
      tasks: [
        {
          agentId: 'analyst',
          input: {
            action: 'analyze_metrics',
            period: 'weekly',
            comparison_period: 'previous_week',
            metrics_data: {
              uptime_percentage: { current: 99.95, previous: 99.92 },
              avg_response_time_ms: { current: 145, previous: 160 },
              error_rate: { current: 0.12, previous: 0.18 },
              active_sessions: { current: 350, previous: 320 },
              database_query_time_ms: { current: 25, previous: 32 }
            }
          },
          outputKey: 'performance_metrics'
        }
      ]
    },
    {
      name: 'technical_review',
      type: 'parallel',
      tasks: [
        {
          agentId: 'engineer',
          input: {
            action: 'review_scalability',
            target_users: 10000
          },
          outputKey: 'scalability_review'
        },
        {
          agentId: 'engineer',
          input: {
            action: 'optimize_performance'
          },
          outputKey: 'performance_optimizations'
        }
      ]
    },
    {
      name: 'security_and_quality',
      type: 'parallel',
      tasks: [
        {
          agentId: 'security',
          input: {
            action: 'security_audit'
          },
          outputKey: 'security_audit'
        },
        {
          agentId: 'security',
          input: {
            action: 'scan_vulnerabilities'
          },
          outputKey: 'vulnerability_scan'
        },
        {
          agentId: 'qa',
          input: {
            action: 'quality_audit'
          },
          outputKey: 'quality_audit'
        }
      ]
    }
  ]
};

/**
 * All TutorWise Workflows
 */
export const TUTORWISE_WORKFLOWS: Record<string, WorkflowDefinition> = {
  'tutorwise-content-strategy': CONTENT_STRATEGY_WORKFLOW,
  'tutorwise-feature-development': FEATURE_DEVELOPMENT_WORKFLOW,
  'tutorwise-user-onboarding': USER_ONBOARDING_WORKFLOW,
  'tutorwise-health-check': PLATFORM_HEALTH_CHECK_WORKFLOW
};

/**
 * Get workflow by ID
 */
export function getWorkflow(workflowId: string): WorkflowDefinition | null {
  return TUTORWISE_WORKFLOWS[workflowId] || null;
}

/**
 * List all available workflows
 */
export function listWorkflows(): WorkflowDefinition[] {
  return Object.values(TUTORWISE_WORKFLOWS);
}
