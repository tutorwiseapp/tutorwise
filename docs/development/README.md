# Development Documentation

This folder contains development processes, migration reports, context engineering, and implementation guides for the Tutorwise platform.

## Current Documents

- **`CCDP-TUTORWISE.md`** - Claude Code Development Process customized for Tutorwise
- **`monorepo-migration-report.md`** - Complete report of the successful monorepo migration
- **`context-engineering.md`** - Framework specification for AI-assisted development
- **`context-engineering-implementation.md`** - Implementation details of the context engineering system
- **`adding-new-feature.md`** - Comprehensive workflow for adding new features

## Structure

```
development/
├── README.md                           # This file
├── CCDP-TUTORWISE.md                  # Development process methodology
├── monorepo-migration-report.md        # Migration success report
├── context-engineering.md             # Context engineering framework
├── context-engineering-implementation.md # Context system implementation
├── adding-new-feature.md              # Feature development workflow
├── setup-guide.md                     # Development environment setup
├── testing-strategy.md                # Testing approaches and standards
└── deployment-guide.md                # Deployment processes and CI/CD
```

## Development Tools

### Context Engineering
- **AI Context Generation**: `npm run context:generate`
- **Automated Analysis**: Codebase mapping and dependency graphs
- **Documentation**: AI-friendly project context

### Available Scripts
```bash
# Development
npm run dev              # Start web app
npm run dev:api          # Start backend API
npm run build            # Build for production
npm run test             # Run tests
npm run lint             # Code linting

# Context Engineering
npm run context:generate # Generate fresh context maps
```

## Guidelines

When adding development documentation:
1. Follow the CCDP process outlined in `CCDP-TUTORWISE.md`
2. Update context maps after significant changes
3. Document migration strategies and rollback plans
4. Include both human and AI-readable documentation
5. Link to related design documents in `../design/`
6. Update this index when adding new files

## Related Documentation

- **Requirements**: See `../requirements/` for specifications
- **Design**: See `../design/` for system architecture
- **AI Context**: See `/.claude/` for generated context maps