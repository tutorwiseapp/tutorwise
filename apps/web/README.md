# Tutorwise Web Application

The frontend web application for the Tutorwise educational platform. Built with Next.js 13+ App Router, TypeScript, and Tailwind CSS, this application provides a modern, responsive user interface for tutors, agents, and clients.

## Overview

This is a production-ready Next.js application that serves as the primary user interface for the Tutorwise platform, featuring role-based dashboards, lesson management, payment processing, and real-time educational interactions.

## Technology Stack

- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **UI Components**: Radix UI for accessible components
- **Authentication**: Supabase Auth integration
- **Payments**: Stripe integration with React Stripe.js
- **Database**: Supabase PostgreSQL with real-time features
- **Deployment**: Vercel for optimized Next.js hosting

## Project Structure

```
apps/web/
├── src/
│   ├── app/                   # Next.js 13+ App Router
│   │   ├── (auth)/           # Authentication routes
│   │   ├── dashboard/        # User dashboard pages
│   │   ├── api/              # API route handlers
│   │   └── globals.css       # Global styles
│   ├── components/           # Reusable React components
│   │   ├── ui/              # Base UI components
│   │   ├── layout/          # Layout components
│   │   └── features/        # Feature-specific components
│   ├── lib/                 # Utility functions and configurations
│   ├── hooks/               # Custom React hooks
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── package.json            # Dependencies and scripts
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, yarn, pnpm, or bun package manager
- Access to required environment variables

### Installation

1. **Install Dependencies**
   ```bash
   # From project root (recommended)
   npm install

   # Or directly from apps/web
   cd apps/web
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.local.example .env.local

   # Edit .env.local with your configuration
   nano .env.local
   ```

3. **Required Environment Variables**
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Stripe Configuration
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # Application Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

### Development

**Start Development Server**
```bash
# From project root (recommended)
npm run dev

# Or specifically target web app
npm run dev:web

# Or directly from apps/web
cd apps/web
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

**Development Features**
- Hot reloading for instant updates
- TypeScript type checking
- Tailwind CSS with JIT compilation
- ESLint and Prettier integration

### Building and Testing

**Build for Production**
```bash
# From project root
npm run build

# Or directly from apps/web
cd apps/web
npm run build
```

**Run Tests**
```bash
# From project root
npm run test

# Or directly from apps/web
cd apps/web
npm run test
```

**Code Quality**
```bash
# Linting
npm run lint

# Type checking
npm run type-check
```

## Key Features

### User Experience

**Role-Based Dashboards**
- Dynamic dashboard content based on user role (client, tutor, agent)
- Role switching functionality for multi-role users
- Personalized navigation and feature access

**Authentication & User Management**
- Secure authentication with Supabase Auth
- User profile management and preferences
- Session management and security

**Lesson Management**
- Lesson scheduling and booking interface
- Real-time lesson status updates
- Tutor-student communication tools

**Payment Processing**
- Stripe integration for secure payments
- Subscription management interface
- Payment history and invoicing

### Technical Features

**Performance Optimizations**
- Next.js 13+ App Router for optimal performance
- Server-side rendering (SSR) and static generation
- Automatic code splitting and lazy loading
- Optimized image loading with Next.js Image

**Responsive Design**
- Mobile-first responsive design with Tailwind CSS
- Cross-device compatibility and testing
- Accessible UI components with Radix UI

**Real-time Features**
- Real-time updates with Supabase subscriptions
- Live notifications and messaging
- Dynamic content updates

## API Integration

### Internal API Routes

**Authentication**
- `/api/auth/*` - Authentication endpoints
- `/api/user/profile` - User profile management

**Lessons**
- `/api/lessons` - Lesson management endpoints
- `/api/lessons/[id]` - Individual lesson operations

**Payments**
- `/api/payments/stripe` - Stripe integration endpoints
- `/api/webhooks/stripe` - Stripe webhook handlers

### External Services

**Supabase Integration**
- Real-time database subscriptions
- Row Level Security (RLS) policies
- File storage and CDN

**Stripe Integration**
- Payment processing and webhooks
- Subscription management
- Customer portal integration

## Deployment

### Vercel Deployment (Recommended)

The application is optimized for Vercel deployment:

```bash
# Automatic deployment from Git
# Push to main branch triggers production deployment
# Pull requests create preview deployments
```

**Configuration**
- Build command: `npm run build`
- Output directory: `.next`
- Environment variables: Set in Vercel dashboard
- Custom domains: Configure in Vercel settings

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## Configuration

### Next.js Configuration

Key configurations in `next.config.js`:
- Monorepo workspace support
- Image optimization settings
- Environment variable validation
- Webpack optimizations

### Tailwind CSS

Custom configuration in `tailwind.config.js`:
- Design system colors and typography
- Custom component styles
- Responsive breakpoints
- Plugin configurations

### TypeScript

Strict TypeScript configuration:
- Path mapping for clean imports
- Strict type checking enabled
- Custom type definitions
- IDE integration support

## Development Guidelines

### Code Organization

**Component Structure**
- Reusable components in `components/ui/`
- Feature-specific components in `components/features/`
- Layout components in `components/layout/`

**Styling Conventions**
- Tailwind CSS utility classes
- Component-scoped styles when needed
- Design system consistency
- Mobile-first responsive design

**State Management**
- React Context for global state
- Custom hooks for complex logic
- Local state for component-specific data

### Best Practices

**Performance**
- Use Next.js Image for optimized images
- Implement proper loading states
- Optimize bundle size with tree shaking
- Use React.memo for expensive components

**Accessibility**
- Semantic HTML structure
- ARIA attributes where needed
- Keyboard navigation support
- Screen reader compatibility

**Security**
- Environment variable validation
- Input sanitization and validation
- Secure authentication flows
- HTTPS enforcement in production

## Troubleshooting

### Common Issues

**Environment Variables**
- Ensure all required variables are set in `.env.local`
- Restart development server after changing environment variables
- Check variable names match exactly (case-sensitive)

**Build Errors**
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run type-check`

**Supabase Connection**
- Verify Supabase URL and keys are correct
- Check Supabase dashboard for service status
- Ensure RLS policies allow access

**Stripe Integration**
- Use test keys during development
- Verify webhook endpoints are configured
- Check Stripe dashboard for error logs

## Contributing

### Development Workflow

1. Create feature branch from main
2. Implement changes with proper testing
3. Run linting and type checking
4. Update documentation as needed
5. Submit pull request with detailed description

### Code Review Checklist

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] TypeScript types are properly defined
- [ ] Components are accessible
- [ ] Performance impact is considered
- [ ] Documentation is updated

## Support

For development questions and issues:
- Check Next.js documentation for framework-specific questions
- Review component examples in the codebase
- Refer to monorepo documentation in `/docs`
- Follow troubleshooting guidelines above

This web application provides a modern, scalable frontend for the Tutorwise educational platform with comprehensive features for all user types and robust development practices.
