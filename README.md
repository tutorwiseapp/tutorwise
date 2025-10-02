# Tutorwise Tutoring Marketplace

# What is Tutorwise

Tutorwise represents a paradigm shift in the tutoring marketplace such as superprof.com and mytutor.co.uk, moving from single-service marketplaces to a user-centric ecosystem. A Typescript, Next.js fullstack for the core platform, and complemented by the Python, FastAPI backend for the resource intensive and specific functionalities. Tutorwise uses PaaS, BaaS, SaaS tools and infrastructure such as Vercel, Supabase Postgres database, Supabase Auth user authentication/ management, Stripe Connect for payments (sending and receiving payements), Railway, Railway Redis, Neo4j Aura for user-subject-lesson and client (parent, student), tutor, agent relationships. A modern tech stack with reusable UI components to reduce development time and effort significantly. 

## Key Innovations:
* Single account with multi-role: Single account for Client, Tutor, and Agent with seemless role switching.
* Dynamic dashboards: Role-based interfaces adapting to user needs (My learning hub, My teaching studio, My tutoring agency).
* Service listing management: Tutors and Agents can create, manage, and promote service offerings across Tutorwise’s seven business services. Clients can create, manage and promote service or lesson requests.
* Revenue generation: Seven business service on one platform (tutor listing service marketetplace, client request lesson reversed marketplace, agent post group sessions, agent post jobs, agent sell courses, agent listing AI tutor marketplace, and anyone can refer anything to anyone).
* Network and connections: All user can send invites and organise their connections in to groups of Maths Tutors, Year 10 English Students, etc.
* Anyone can refer anthing to anyone (RATA): All user can refer each other such as clients can refer their favourite tutors to their friends. 
* **Human-AI Collaboration**: The human provides strategic vision while the **Contextual Autonomous System (CAS)** handles tactical execution.
* **Autonomous Development**: CAS autonomously manages development workflows, monitoring, documentation, and quality assurance.
* **Proven AI Capability**: Built with Claude Code (CLI) and Gemini Pro AI, demonstrating self-managing, self-healing infrastructure.
* **Multi-Service Integration**: Seamlessly integrated with Atlassian Jira/Confluence, Google Cloud, Google Classroom/Meet, HubSpot, Pencil Spaces, Zoom.

## Monorepo Structure

This project uses a monorepo architecture with npm workspaces for better code organization and shared packages.

### Project Structure

```
tutorwise/
├── apps/                          # Applications
│   ├── web/                       # Next.js frontend (formerly the main tutorwise app)
│   └── api/                       # FastAPI backend (formerly tutorwise-railway-backend)
├── packages/                      # Shared packages
│   ├── shared-types/              # TypeScript type definitions shared across apps
│   └── ui/                        # Shared React components (future)
├── docs/                          # Documentation
│   ├── requirements/              # Business requirements and specifications
│   ├── design/                    # UI/UX and system design documentation
│   ├── development/               # CCDP process and migration reports
│   ├── testing/                   # Testing strategies and comprehensive test plans
│   ├── deployment/                # Deployment guides and CI/CD processes
│   ├── tools/                     # Development tools and context engineering
│   ├── integration/               # Third-party service integrations
│   ├── infrastructure/            # Hosting and infrastructure setup
│   ├── reference/                 # Quick guides and API references
│   └── release/                   # Release notes and versioning information
├── tools/                         # Development tools and automation
│   ├── scripts/                   # Build automation and utilities
│   ├── configs/                   # Shared configuration files
│   ├── context-engineering/       # Contextual Autonomous System (CAS) - migrating to tools/cas/
│   ├── playwright/                # End-to-end testing configuration
│   └── percy/                     # Visual testing setup
├── tests/                         # Centralized testing infrastructure
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   ├── e2e/                       # End-to-end tests (Playwright)
│   └── test-results/              # Test artifacts and results
└── [config files]                # Workspace configuration files
```

### Applications

#### `apps/web/` - Frontend Application
- **Technology**: Next.js 13+ with App Router, TypeScript, Tailwind CSS
- **Purpose**: Main web application serving tutors, agents, and clients
- **Features**: Authentication, role management, lesson booking, payments
- **Port**: 3002 (development)
- **Former location**: Root directory (migrated to monorepo)

#### `apps/api/` - Backend API
- **Technology**: FastAPI with Python, PostgreSQL, Redis
- **Purpose**: Backend services, API endpoints, data processing
- **Features**: User management, payment processing, lesson scheduling
- **Port**: 8000 (development)
- **Former location**: `tutorwise-railway-backend/` (migrated to monorepo)

### Shared Packages

#### `packages/shared-types/`
- **Purpose**: TypeScript type definitions shared between frontend and backend
- **Exports**: User types, lesson types, payment types, API response types
- **Import**: `@tutorwise/shared-types`

#### `packages/ui/` *(Future)*
- **Purpose**: Shared React components library
- **Exports**: Reusable UI components, design system
- **Import**: `@tutorwise/ui`

## Development

### Getting Started

```bash
# Install dependencies
npm install

# Start frontend development server
npm run dev
# or specifically
npm run dev:web

# Start backend development server
npm run dev:api
```

### Available Scripts

```bash
# Frontend
npm run dev              # Start web app (port 3002)
npm run build            # Build web app for production
npm run lint             # Lint web app code
npm run test             # Run web app tests

# Backend
npm run dev:api          # Start FastAPI server (port 8000)
npm run test:backend     # Run Python tests
npm run lint:backend     # Lint Python code

# Testing
npm run test:e2e         # Run End-to-End tests (Playwright)
npm run test:visual      # Run visual tests (Percy)
npm run test:all         # Run all tests (frontend + backend)
npm run quality:check    # Complete quality pipeline (lint + tests)

# Contextual Autonomous System (CAS)
npm run cas:generate     # Generate contextual intelligence
npm run cas:update       # Update CAS knowledge base
npm run cas:setup        # Initialize CAS infrastructure
```

### Environment Setup

1. **Frontend Environment** (`apps/web/.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
   ```

2. **Backend Environment** (`apps/api/.env`):
   ```
   DATABASE_URL=your_database_url
   STRIPE_SECRET_KEY=your_stripe_secret
   ```

## Architecture

### Tech Stack

- **Frontend**: Next.js 13+, TypeScript, Tailwind CSS, Radix UI
- **Backend**: FastAPI, Python, PostgreSQL, Redis
- **Database**: Supabase PostgreSQL, Neo4j Graph Database
- **Payments**: Stripe Connect with subscriptions
- **Authentication**: Supabase Auth
- **Testing**: Jest (frontend), pytest (backend), Playwright (E2E), Percy (visual)
- **Test Infrastructure**: Comprehensive FastAPI testing utilities, mock fixtures, database mocking
- **Deployment**: Vercel (frontend), Railway (backend)
- **Monitoring**: Integrated platform monitoring

### Key Features

- **Role Management**: Agent/Tutor role switching with personalized experiences
- **Payment Processing**: Stripe integration with connect accounts
- **Real-time Features**: Live notifications and updates
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript coverage across frontend and backend

## Testing Infrastructure

Comprehensive testing setup across all applications:

### Frontend Testing
- **Unit Tests**: Jest with React Testing Library
- **Component Tests**: Isolated component testing
- **Integration Tests**: API route testing with mock data

### Backend Testing (FastAPI)
- **Test Client Configuration**: Comprehensive fixtures in `apps/api/tests/conftest.py`
- **Testing Utilities**: Helper classes in `apps/api/tests/utils.py`
- **Database Mocking**: Redis and Neo4j mock fixtures
- **Authentication Testing**: JWT token generation and validation
- **Payment Testing**: Stripe integration mocking
- **Async Testing**: AsyncClient and async test runners

### End-to-End Testing
- **Playwright**: Browser automation and E2E testing
- **Percy**: Visual regression testing
- **Test Results**: Centralized in `tests/test-results/`

## Contextual Autonomous System (CAS)

This project demonstrates a **Contextual Autonomous System (CAS)**—an AI-powered infrastructure that autonomously manages software development, monitoring, and evolution:

### CAS Capabilities
- **Self-Monitoring**: Daily project audits and protection reports (24/7 via GitHub Actions)
- **Self-Documenting**: Auto-generated audit PDFs, markdown reports, and snapshots
- **Self-Healing**: Error detection, retry logic, and automatic recovery
- **Self-Improving**: Pattern recognition, metric analysis, and optimization recommendations

### CAS Commands
```bash
npm run cas:generate  # Generate contextual intelligence from 6+ sources
npm run cas:update    # Update CAS knowledge base
npm run cas:setup     # Initialize CAS infrastructure

# Backward compatible aliases (still work):
npm run context:generate
npm run context:update
npm run context:setup
```

### CAS Architecture
- **Contextual Intelligence**: Jira, GitHub, Google Docs, Calendar, Figma, Confluence integration
- **Autonomous Execution**: Self-managing workflows, task automation, quality gates
- **System Integration**: End-to-end automation from planning to production
- **Location**: `tools/cas/`

**See**: `docs/CAS-OVERVIEW.md` for complete CAS documentation

## Documentation

- **Requirements**: See `docs/requirements/` for project specifications and business requirements
- **Design**: See `docs/design/` for system architecture and UI/UX designs
- **Development**: See `docs/development/` for CCDP process and migration reports
- **Features**: See `docs/features/` for feature-specific documentation and workflows
- **Testing**: See `docs/testing/` for testing strategies and test plans
- **Deployment**: See `docs/deployment/` for deployment guides and CI/CD processes
- **Tools**: See `docs/tools/` for development tools and context engineering
- **Integration**: See `docs/integration/` for third-party service integrations
- **Infrastructure**: See `docs/infrastructure/` for hosting and infrastructure setup
- **Reference**: See `docs/reference/` for quick guides and API references
- **Release**: See `docs/release/` for release notes and versioning information

## Deployment

### Frontend (Vercel)
- **Build Command**: `cd apps/web && npm run build`
- **Output Directory**: `apps/web/.next`
- **Environment**: Production Supabase, Stripe live keys

### Backend (Railway)
- **Build**: Docker container from `apps/api/`
- **Environment**: Production database, Redis instance
- **Health Check**: `/health` endpoint

## Migration History

This project was successfully migrated from a single-repo structure to a monorepo on September 27, 2024:

- **Success Rate**: 100% with zero breaking changes
- **Files Migrated**: 189 files with preserved git history
- **Import Updates**: 197 @ imports updated automatically
- **Build Verification**: All builds and deployments working correctly

For detailed migration information, see `docs/development/monorepo-migration-report.md`.

## Contributing

1. Follow the established patterns in each application
2. Update shared types when adding new data structures
3. Run tests and linting before committing
4. Use the CCDP process documented in `docs/development/CCDP-TUTORWISE.md`
5. Generate fresh context maps after significant changes

## Documentation Standards

### README Files as Primary Documentation

README files serve as the primary form of documentation throughout the Tutorwise monorepo. Each directory contains comprehensive README documentation that provides:

- **Overview and Purpose**: Clear explanation of the directory's role
- **Setup Instructions**: Complete installation and configuration guides
- **Usage Examples**: Practical examples and best practices
- **Development Guidelines**: Standards and workflows for contributors
- **Troubleshooting**: Common issues and solutions

### AI-Generated and Maintained Documentation

The documentation system in this project is **AI-generated and maintained** to ensure:

- **Consistency**: Uniform structure and tone across all documentation
- **Currency**: Regular updates aligned with code changes and project evolution
- **Completeness**: Comprehensive coverage of all features and components
- **Professional Standards**: High-quality technical writing without decorative elements
- **Synchronization**: Cross-referenced and interconnected documentation

### Documentation Locations

- **Root README**: Project overview and monorepo structure
- **Application READMEs**: Detailed guides for apps/web/ and apps/api/
- **Package READMEs**: Complete documentation for all shared packages
- **Tool READMEs**: Configuration and usage for development tools
- **Documentation Directory**: Structured guides in docs/ for all aspects of development

### Maintenance Process

Documentation is updated automatically as part of the development workflow:
- **Major Changes**: Documentation updated with significant feature additions
- **Structural Changes**: README files synchronized with monorepo modifications
- **Regular Reviews**: Periodic validation of accuracy and completeness
- **AI Enhancement**: Continuous improvement of documentation quality and coverage

This approach ensures that Tutorwise maintains professional, accurate, and comprehensive documentation that supports effective development and maintenance workflows.

## Support

- **Documentation**: Check `docs/` directory for comprehensive guides
- **AI Documentation**: See `docs/development/ai-documentation.md` for AI integration
- **Testing Guide**: See `docs/testing/tutorwise-test-plan.md` for testing procedures
- **Issues**: Use GitHub issues for bug reports and feature requests
- **Development Process**: Follow CCDP guidelines in `docs/development/CCDP-TUTORWISE.md`
