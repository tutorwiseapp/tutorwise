# NPM Scripts Reference for Tutorwise

## Development Scripts

### Core Development
```bash
npm run dev                    # Start Next.js development server
npm run build                  # Build production application
npm run start                  # Start production server
npm run lint                   # Run ESLint for frontend code
```

### Development with Context
```bash
npm run dev:with-context       # Sync context data then start dev server
npm run dev:with-optimization  # Sync context, optimize DSPy, then start dev
```

## Testing Scripts

### Frontend Testing
```bash
npm test                       # Run Jest unit tests
npm run test:watch             # Run Jest in watch mode
npm run test:coverage          # Run tests with coverage report
npm run test:unit              # Run unit tests only
npm run test:integration       # Run integration tests only
```

### End-to-End Testing
```bash
npm run test:e2e               # Run Playwright E2E tests
npm run test:e2e:ui            # Run E2E tests with UI
npm run test:e2e:headed        # Run E2E tests in headed mode
```

### Backend Testing
```bash
npm run test:backend           # Run Python backend tests
npm run test:backend:coverage  # Run backend tests with coverage
```

### Comprehensive Testing
```bash
npm run test:all               # Run all test suites (frontend, backend, E2E)
```

## Code Quality Scripts

### Linting
```bash
npm run lint                   # Lint frontend code
npm run lint:backend           # Lint Python backend code
npm run lint:backend:fix       # Lint and auto-fix backend code
npm run lint:all               # Lint both frontend and backend
```

### Quality Gates
```bash
npm run quality:check          # Run linting and all tests
```

## Health Monitoring
```bash
npm run health:check           # Run backend health check
```

## Integration and Sync Scripts

### Individual Service Syncs
```bash
npm run sync:jira              # Sync Jira tickets and sprint data
npm run sync:github            # Sync GitHub repository data
npm run sync:google-docs       # Sync Google Docs content
npm run sync:confluence        # Sync Confluence documentation
npm run sync:mermaid          # Process Mermaid diagrams
npm run sync:figma            # Sync Figma design data
npm run sync:calendar         # Sync Google Calendar events
```

### Bulk Sync Operations
```bash
npm run sync:context          # Sync core integrations (Jira, GitHub, Mermaid, Figma, Calendar)
npm run sync:all              # Sync all available integrations including Google Docs and Confluence
```

## AI and Gemini CLI Scripts

### Interactive Gemini CLI
```bash
npm run gemini                 # Open interactive Gemini CLI menu
npm run gemini:interactive     # Start Gemini CLI in interactive mode
npm run ai:gemini             # Sync context then start interactive Gemini CLI
```

### Direct Gemini Commands
```bash
npm run gemini:chat           # Direct chat mode (requires --query parameter)
npm run gemini:plan           # Generate development plan
npm run gemini:analyze        # Analyze Jira ticket (requires --ticket parameter)
npm run gemini:review         # Code review (requires --query parameter)
npm run gemini:debug          # Debug assistance (requires --query parameter)
```

### Gemini Usage Examples
```bash
# Quick question
npm run gemini:chat -- -q "How to implement authentication?"

# Analyze specific ticket
npm run gemini:analyze -- -t TUTOR-20

# Code review
npm run gemini:review -- -q "Review my payment integration"

# Debug help
npm run gemini:debug -- -q "API returning 404 errors"

# Interactive with fresh context
npm run ai:gemini
```

## Optimization Scripts
```bash
npm run optimize:dspy          # Optimize DSPy configurations
```

## Script Categories and Usage Patterns

### Daily Development Workflow
```bash
# Morning routine
npm run sync:context          # Get latest context
npm run dev:with-context      # Start development with context

# During development
npm run gemini:analyze -- -t TUTOR-XX  # Analyze current ticket
npm run test                   # Run tests frequently

# Before committing
npm run quality:check          # Ensure code quality
```

### Integration Management
```bash
# Full context refresh (weekly)
npm run sync:all

# Quick context update (daily)
npm run sync:context

# Specific service updates (as needed)
npm run sync:jira             # After sprint changes
npm run sync:github           # After PR updates
```

### AI-Assisted Development
```bash
# Start AI session with context
npm run ai:gemini

# Quick AI questions
npm run gemini:chat -- -q "Your question here"

# Ticket-specific analysis
npm run gemini:analyze -- -t TICKET-KEY

# Code review assistance
npm run gemini:review -- -q "Review description"
```

### Testing Strategy
```bash
# Development testing
npm run test:watch            # Continuous unit testing

# Pre-commit testing
npm run test:unit
npm run test:integration

# Pre-deployment testing
npm run test:all              # Full test suite

# Specific test types
npm run test:e2e              # User journey testing
npm run test:backend          # API testing
```

### Quality Assurance
```bash
# Code quality check
npm run lint:all              # Check all code style

# Auto-fix issues
npm run lint:backend:fix      # Fix backend linting

# Comprehensive quality gate
npm run quality:check         # All linting + all tests
```

## Environment-Specific Usage

### Development Environment
```bash
npm run dev                   # Basic development
npm run dev:with-context      # Development with AI context
npm run test:watch            # Continuous testing
```

### Continuous Integration
```bash
npm run quality:check         # Quality gate
npm run test:all             # Complete test suite
npm run build                # Production build test
```

### Production Deployment
```bash
npm run build                # Build application
npm run start                # Start production server
npm run health:check         # Verify health
```

## Advanced Usage Patterns

### Context-Driven Development
```bash
# Full context setup
npm run sync:all
npm run ai:gemini

# Ticket-driven workflow
npm run sync:jira
npm run gemini:analyze -- -t CURRENT-TICKET
npm run dev:with-context
```

### Automated Quality Workflow
```bash
# Pre-commit hook simulation
npm run sync:context
npm run gemini:review -- -q "Review staged changes"
npm run quality:check
```

### Integration Testing Workflow
```bash
# Backend testing
npm run test:backend
npm run health:check

# Frontend testing
npm run test:unit
npm run test:integration

# End-to-end validation
npm run test:e2e
```

## Script Dependencies and Requirements

### Required Environment Variables

**For AI/Gemini Scripts:**
- `GOOGLE_AI_API_KEY` - Required for all Gemini CLI operations

**For Integration Scripts:**
- `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` - For Jira sync
- `GITHUB_TOKEN` - For GitHub sync
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` - For Google services

### System Requirements
- Node.js 18+ for all npm scripts
- Python 3.8+ for backend and Gemini CLI scripts
- Playwright browsers for E2E testing

### File Dependencies
- `.ai/` directory structure for context scripts
- Backend code in `tutorwise-railway-backend/` for backend scripts
- Test files in `tests/` directories

## Troubleshooting Scripts

### Debug Information
```bash
# Check environment
npm run gemini:chat -- -q "Environment check" --minimal

# Test integrations
npm run sync:context | head -20

# Validate tests
npm run test:unit --verbose
```

### Common Issues
```bash
# If Gemini CLI fails
python3 .ai/scripts/gemini-cli.py --help

# If sync fails
npm run sync:jira              # Test individual sync

# If tests fail
npm run test -- --detectOpenHandles  # Debug hanging tests
```

## Performance Considerations

### Fast Operations (< 30 seconds)
- `npm run gemini:chat` with `--minimal`
- `npm run sync:mermaid`
- `npm run test:unit`

### Medium Operations (30 seconds - 2 minutes)
- `npm run sync:context`
- `npm run test:integration`
- `npm run quality:check`

### Slow Operations (> 2 minutes)
- `npm run sync:all`
- `npm run test:all`
- `npm run test:e2e`

## Best Practices

### Script Usage
1. Use `npm run sync:context` daily for fresh AI context
2. Run `npm run quality:check` before committing
3. Use `npm run ai:gemini` for complex development tasks
4. Leverage `npm run test:watch` during active development

### Performance Optimization
1. Use `--minimal` flag for quick AI queries
2. Run specific sync scripts instead of `sync:all` when possible
3. Use `test:unit` during development, `test:all` before deployment
4. Cache context data when running multiple AI operations

### Integration Workflow
1. Morning: `npm run sync:context`
2. Development: `npm run dev:with-context`
3. Testing: `npm run test:watch`
4. AI assistance: `npm run gemini:analyze -- -t TICKET`
5. Quality check: `npm run quality:check`
6. Deployment: `npm run build && npm run test:all`