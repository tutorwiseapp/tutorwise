# Tutorwise AI & Development Documentation

This document serves as the central hub for Tutorwise's AI integration suite and development workflow documentation.

## Current Project Architecture

### Monorepo Structure
- **apps/web** - Next.js 13+ frontend with TypeScript
- **apps/api** - FastAPI backend with Python
- **packages/** - Shared utilities and components
- **docs/** - Comprehensive documentation system
- **tools/** - Development tools and automation
- **tests/** - Centralized test results and artifacts

### Technology Stack
- **Frontend**: Next.js 13+ App Router, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.8+, uvicorn
- **Databases**: Supabase PostgreSQL, Neo4j Aura (graph), Redis (caching)
- **Payments**: Stripe integration with connect and webhooks
- **Testing**: Jest (frontend), pytest (backend), Playwright (E2E), Percy (visual)
- **Deployment**: Vercel (frontend), Railway (backend services)

## Available Documentation

### Core Development
- [**CCDP-TUTORWISE.md**](./CCDP-TUTORWISE.md) - Comprehensive project overview and architecture
- [**Monorepo Migration Report**](./monorepo-migration-report.md) - Recent structural improvements
- [**Setup Complete Guide**](./SETUP_COMPLETE.md) - Development environment setup

### Testing & Quality
- [**Test Plan**](../testing/tutorwise-test-plan.md) - Comprehensive testing strategy and FastAPI infrastructure
- [**Testing Documentation**](../testing/) - Unit, integration, E2E, and visual testing guides

### Design & Planning
- [**Requirements**](../requirements/) - Business requirements and specifications
- [**Design**](../design/) - UI/UX and system design documentation

## Development Tools & Automation

### Context Engineering
- **Location**: `tools/context-engineering/`
- **Generate Context**: `npm run context:generate`
- **Update Context**: `npm run context:update`

### Testing Infrastructure
- **Frontend Tests**: `npm run test` (Jest)
- **Backend Tests**: `npm run test:backend` (pytest)
- **E2E Tests**: `npm run test:e2e` (Playwright)
- **Visual Tests**: `npm run test:visual` (Percy)

### Development Servers
- **Frontend**: `npm run dev` or `npm run dev:web`
- **Backend**: `npm run dev:api`
- **Health Check**: `npm run health:check`

### Code Quality
- **Frontend Linting**: `npm run lint`
- **Backend Linting**: `npm run lint:backend`
- **Combined Quality**: `npm run quality:check`

## FastAPI Testing Infrastructure

### Test Configuration (`apps/api/tests/conftest.py`)
- **TestClient & AsyncClient**: Comprehensive FastAPI testing setup
- **Database Mocking**: Redis and Neo4j mock fixtures
- **Authentication**: JWT token generation and user session fixtures
- **Sample Data**: User, lesson, and payment test data factories

### Testing Utilities (`apps/api/tests/utils.py`)
- **APITestUtils**: Response validation, auth headers, mock data
- **DatabaseTestUtils**: Database connection and query mocking
- **AsyncTestUtils**: Async endpoint testing and test runners
- **PaymentTestUtils**: Stripe integration testing
- **AuthTestUtils**: JWT and authentication testing
- **TestDataFactory**: Configurable test data generation

## Quick Start Commands

```bash
# Install dependencies
npm install
cd apps/api && pip install -r requirements.txt

# Start development
npm run dev          # Frontend on :3000
npm run dev:api      # Backend on :8000

# Run tests
npm run test:all     # All tests
npm run quality:check # Complete quality pipeline

# Health verification
npm run health:check # Backend service status
```

## Recent Improvements

### Monorepo Migration (Complete)
- Consolidated from separate repositories
- Improved workspace structure with npm workspaces
- Centralized documentation and tools
- Enhanced testing infrastructure

### Testing Infrastructure (Enhanced)
- Comprehensive FastAPI testing utilities
- Improved test organization and fixtures
- Percy visual testing integration
- Playwright E2E testing configuration

### Documentation Organization (Updated)
- Four-tier structure: apps/, packages/, docs/, tools/
- Centralized test results in tests/test-results/
- Context engineering tools moved to tools/context-engineering/
- Updated all path references for new structure

## Development Workflow

1. **Setup**: Follow SETUP_COMPLETE.md for environment configuration
2. **Development**: Use npm scripts for development servers and testing
3. **Testing**: Run comprehensive test suites before deployment
4. **Quality**: Use linting and quality checks throughout development
5. **Context**: Generate fresh context when making significant changes

## AI Integration Features

- **Context Generation**: Automated project context for AI development assistance
- **Documentation**: AI-friendly documentation structure
- **Testing**: Comprehensive test coverage for AI-assisted development
- **Automation**: Scripts and tools for enhanced development workflow

This documentation reflects the current state of the Tutorwise platform following successful recovery and enhancement of the development infrastructure.