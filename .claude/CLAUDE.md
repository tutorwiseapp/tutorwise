# Filename: .claude/CLAUDE.md

# Tutorwise Project Context

## Project Overview
Tutorwise is a full-stack educational platform built with modern web technologies. This is a production application serving tutors, agents and clients (students, parrents) with features for lesson management, payments, and user interaction.

## Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **Development Environment**: VS Code with TypeScript support

### Backend & Database
- **Database**: Supabase PostgreSQL with real-time features
- **Authentication**: Supabase Auth
- **API**: Next.js API routes + Supabase functions
- **Database**: Neo4j Aura graph database


### Payments & Business Logic
- **Payment Processing**: Stripe integration with connect
- **Subscription Management**: Stripe subscriptions
- **Webhooks**: Stripe webhook handling for payment events

### Deployment & Infrastructure
- **Fullstack Hosting**: Vercel (optimized for Next.js)
- **Backend Services**: Railway for additional radis and container services
- **Database**: Supabase cloud hosting
- **Database**: Neo4j cloud hosting
- **Monitoring**: Integrated with deployment platforms

### Project Management
- **Version Control**: Git with GitHub
- **Issue Tracking**: Atlassian (Jira/Confluence)
- **CI/CD**: Automated through Vercel and Railway

## Key Development Guidelines

### Route Group Patterns
- **Development routes** in `(dev)/` for testing and development features
- **Public routes** in `a/` for unauthenticated access
- **Dynamic agent routes** with `[agentId]` parameter for personalized experiences
- **Feature-based organization** with dedicated folders for each major functionality

### TypeScript Configuration
- Uses TypeScript throughout with `.ts` extensions for configs
- Custom type definitions in `/types` directory
- Proper Next.js TypeScript integration with `next-env.d.ts`

### Database & API Patterns
- Use Supabase client for database operations
- Implement Row Level Security (RLS) policies
- Use TypeScript types generated from Supabase schema
- Handle real-time subscriptions properly
- Implement proper error states for all database operations

### Stripe Integration
- Never expose Stripe secret keys in client-side code
- Use Stripe webhooks for payment confirmations
- Implement idempotency for payment operations
- Handle all Stripe error scenarios gracefully
- Test payment flows in Stripe test mode

### Security Considerations
- Never commit environment variables to version control
- Use Supabase RLS for data access control
- Validate all user inputs server-side
- Implement proper authentication checks on all protected routes
- Follow OWASP security guidelines for web applications

## File Structure Expectations

tutorwise/
├── app/                    # Next.js 13+ app directory
├── components/            # Reusable React components
├── lib/                   # Utility functions and configurations
├── types/                 # TypeScript type definitions
├── prisma/ or migrations/ # Database schema
├── public/                # Static assets
├── .env.local            # Environment variables (not in git)
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration

## Common Tasks & Workflows

### When Adding New Features
1. Create TypeScript interfaces for new data structures
2. Update database schema if needed (with migrations)
3. Implement API routes with proper error handling
4. Create reusable components following existing patterns
5. Add appropriate tests for critical functionality
6. Update environment variables for new integrations

### When Working with Payments
- Always test in Stripe test mode first
- Implement proper webhook verification
- Handle asynchronous payment confirmations
- Update user subscription status appropriately
- Log payment events for debugging

### Deployment Process
- Development: Local environment with test databases
- Staging: Railway/Vercel preview deployments
- Production: Vercel main deployment with production Supabase

## Environment Variables Structure

# Database
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Payments
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Deployment
VERCEL_URL=
RAILWAY_STATIC_URL=


## Development Preferences
- Prefer server-side rendering where appropriate
- Use React Server Components for data fetching
- Implement loading states and error boundaries
- Follow accessibility (a11y) best practices
- Optimize for mobile-first responsive design
- Maintain performance with Next.js built-in optimizations

## When I Ask for Help
- Consider the full-stack implications of changes
- Suggest TypeScript-first solutions
- Recommend security best practices
- Provide production-ready code, not just examples
- Consider performance and user experience
- Follow the established patterns in the codebase

## Integration Priorities
1. **Supabase**: Database operations, authentication, real-time features
2. **Stripe**: Payment processing, subscription management, webhooks
3. **Vercel**: Deployment, edge functions, analytics
4. **Railway**: Additional backend services, databases
5. **GitHub**: Version control, CI/CD integration
6. **Atlassian**: Project management, documentation