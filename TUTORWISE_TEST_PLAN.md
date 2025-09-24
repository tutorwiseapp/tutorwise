# Tutorwise Test Plan & Developer Workflow Guide

## Overview

This guide provides comprehensive instructions for development workflows, testing procedures, and quality assurance for the Tutorwise platform.

## Prerequisites

- Node.js 22.x
- Python 3.8+
- Access to development environment variables

## Quick Start Commands

```bash
# Install all dependencies
npm install
cd tutorwise-railway-backend && pip install -r requirements.txt

# Run complete quality checks
npm run quality:check

# Development servers
npm run dev                    # Frontend development server
npm run health:check          # Backend health verification
```

## Testing Strategy

### Frontend (TypeScript/Next.js)

#### Unit Tests
```bash
# Run all frontend tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

#### Critical Business Logic Coverage
- **Stripe Payment Processing**: Checkout session creation, customer management
- **Supabase Integration**: Authentication, profile management
- **API Route Testing**: All protected endpoints

#### Test Files Location
- `__tests__/api/stripe/` - Payment processing tests
- `__tests__/api/auth/` - Authentication tests
- `src/components/__tests__/` - Component tests

### Backend (Python/FastAPI)

#### Unit & Integration Tests
```bash
# Run all backend tests
npm run test:backend

# Run with coverage reporting
npm run test:backend:coverage

# Direct pytest commands (from backend directory)
cd tutorwise-railway-backend
python3 -m pytest tests/ -v
python3 -m pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html
```

#### Test Categories
- **Unit Tests**: Database connections, configuration management
- **Integration Tests**: Health endpoints, API responses
- **Database Tests**: Redis, Neo4j connectivity

#### Test Files Location
- `tutorwise-railway-backend/tests/unit/` - Unit tests
- `tutorwise-railway-backend/tests/integration/` - Integration tests

### Combined Testing

```bash
# Run all tests (frontend + backend)
npm run test:all

# Full quality pipeline
npm run quality:check  # Runs linting + all tests
```

## Code Quality & Linting

### Frontend (TypeScript)
```bash
# ESLint checking
npm run lint

# Auto-fix linting issues
npm run lint --fix
```

### Backend (Python)
```bash
# Ruff linting
npm run lint:backend

# Auto-fix Python code issues
npm run lint:backend:fix

# Direct ruff commands (from backend directory)
cd tutorwise-railway-backend
python3 -m ruff check app/
python3 -m ruff check --fix app/
```

### Combined Linting
```bash
# Run all linters
npm run lint:all
```

## Coverage Reports

### Frontend Coverage
- **Threshold**: 70% minimum for branches, functions, lines, statements
- **Output**: `coverage/` directory with HTML reports
- **Command**: `npm run test:coverage`

### Backend Coverage
- **Threshold**: 80% minimum coverage
- **Output**: `htmlcov/` directory with HTML reports
- **Command**: `npm run test:backend:coverage`

### Viewing Coverage Reports
```bash
# Frontend coverage (after running npm run test:coverage)
open coverage/lcov-report/index.html

# Backend coverage (after running npm run test:backend:coverage)
cd tutorwise-railway-backend && open htmlcov/index.html
```

## Health Monitoring

### Backend Health Check
```bash
# Verify backend services
npm run health:check

# Expected response: Redis and Neo4j operational status
```

### Database Connections
- **Redis**: Automatic retry logic with fallback to public endpoints
- **Neo4j**: Connection verification with authentication
- **Health Endpoint**: `/health` provides comprehensive service status

## Development Environment

### Environment Variables
Required for development:
```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key

# Backend (.env in tutorwise-railway-backend/)
REDIS_URL=your_redis_url
NEO4J_URI=your_neo4j_uri
NEO4J_USER=your_neo4j_user
NEO4J_PASSWORD=your_neo4j_password
```

### Local Development
```bash
# Frontend development
npm run dev  # Starts on http://localhost:3000

# Backend development (from tutorwise-railway-backend/)
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Deployment & CI/CD

### Pre-deployment Checklist
1. **Run Quality Pipeline**: `npm run quality:check`
2. **Verify Health**: `npm run health:check`
3. **Check Coverage**: Ensure both frontend and backend meet thresholds
4. **Environment Variables**: Confirm all required vars are set

### Railway Backend Deployment
- **Automatic**: Deploys on push to main branch
- **Health Check**: Automatic verification via `/health` endpoint
- **Monitoring**: Railway dashboard provides logs and metrics

### Vercel Frontend Deployment
- **Automatic**: Deploys on push to main branch
- **Preview**: Creates preview deployments for pull requests
- **Edge Functions**: API routes deployed to Vercel edge network

## Troubleshooting

### Common Issues

#### Redis Connection Failures
```bash
# Check Redis connectivity
npm run health:check

# Common fix: Railway internal URLs may need public endpoint conversion
# This is handled automatically in the connection logic
```

#### Test Environment Issues
```bash
# Clear Jest cache
npm run test -- --clearCache

# Verify Node.js version
node --version  # Should be 22.x

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Python Dependencies
```bash
# Refresh Python environment
cd tutorwise-railway-backend
pip install -r requirements.txt --upgrade
```

### Debug Commands
```bash
# Verbose test output
npm run test -- --verbose
npm run test:backend -- -vvv

# Database connection debugging
npm run health:check

# Check linting issues
npm run lint:all
```

## Best Practices

### Code Quality
- **TypeScript**: Use strict type checking
- **Python**: Follow PEP 8 standards with Ruff
- **Testing**: Aim for 70%+ coverage on critical business logic
- **Documentation**: Update this guide when adding new workflows

### Testing Guidelines
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database interactions
- **Mocking**: Use proper mocks for external services (Stripe, Supabase)
- **Error Scenarios**: Test both success and failure cases

### Security Considerations
- **Environment Variables**: Never commit sensitive keys
- **Testing**: Use test keys for Stripe integration
- **Authentication**: Verify auth checks on all protected routes
- **Database**: Use proper Row Level Security (RLS) policies

## Support

For issues or questions:
1. Check this documentation first
2. Run diagnostic commands: `npm run quality:check`
3. Review test output and coverage reports
4. Check Railway and Vercel deployment logs