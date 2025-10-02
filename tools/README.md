# Tools Directory

This directory contains all development tools, utilities, and the **Contextual Autonomous System (CAS)** infrastructure for the Tutorwise project.

## Structure

```
tools/
├── scripts/              # Automation scripts and utilities
├── configs/              # Shared configuration files
├── context-engineering/  # AI context generation and migration tools
├── database/            # Database migrations and schema management
├── playwright/          # End-to-end testing configuration
├── percy/               # Visual testing setup
└── README.md           # This file
```

## Directory Contents

### `scripts/`
- Build automation scripts
- Development utilities
- Deployment helpers
- Integration scripts

### `configs/`
- **`eslint.config.js`** - Shared ESLint configuration
- Shared TypeScript configurations
- Prettier configurations
- Other linting and formatting tools

### `context-engineering/` → **Contextual Autonomous System (CAS)**
**⚠️ Migrating to `tools/cas/` for Phase 2**

This is the core of our **Contextual Autonomous System**—an AI-powered infrastructure that autonomously manages development workflows:

**CAS Components:**
- **`generate-context.js`** - Multi-source contextual intelligence aggregation
- **`jira-integration.js`** - Autonomous Jira task creation and management
- **`autonomous-ai-config.js`** - AI development orchestration
- **Integration Scripts** - GitHub, Google Docs, Calendar, Figma, Confluence sync

**CAS Capabilities:**
- **Self-Monitoring**: Daily audits, protection reports (via GitHub Actions)
- **Self-Documenting**: Auto-generated PDFs, snapshots, metrics
- **Self-Healing**: Error recovery, retry logic, fallback mechanisms
- **Self-Improving**: Pattern learning, optimization recommendations

**See**: `docs/CAS-OVERVIEW.md` for complete documentation

### `playwright/`
- **`playwright.config.ts`** - Playwright configuration for E2E tests
- Test utilities and helpers
- Browser automation setup

### `database/`
- **Database Migrations** - SQL scripts for schema changes and data migrations
- **Migration Tools** - Validation and testing scripts for database changes
- **Schema Documentation** - Database structure documentation and guides

### `percy/`
- Visual regression testing setup
- Percy configuration files
- Visual testing utilities

## Usage

### Contextual Autonomous System (CAS)
```bash
# Generate contextual intelligence from 6+ sources
npm run context:generate
# or directly
node tools/cas/generate-context.js

# Update CAS knowledge base
npm run context:update

# Initialize CAS infrastructure
npm run context:setup
```

**Note**: Commands will migrate to `cas:*` in Phase 2 (e.g., `npm run cas:generate`)

### Testing
```bash
# Run E2E tests
npm run test:e2e
# Run visual tests
npm run test:visual
```

### Database Migrations
```bash
# Apply database migrations (see tools/database/README.md)
psql -f tools/database/migrations/001_add_onboarding_system.sql

# Validate migration
psql -f tools/database/migrations/validate_onboarding_schema.sql
```

### Environment & Integration Testing
```bash
# Check environment variables (always loads from .env.local first)
node tools/scripts/utilities/load-env.js

# Test all integrations (Claude Code, Gemini, Supabase, Database)
node tools/scripts/utilities/test-integrations.js

# Test specific integration
node tools/scripts/utilities/test-integrations.js gemini
node tools/scripts/utilities/test-integrations.js supabase
```

### Claude Code Permissions
```bash
# Check if Claude Code assistant can perform an action
node tools/scripts/utilities/check-claude-permissions.js "DELETE DATABASE" production
node tools/scripts/utilities/check-claude-permissions.js "CREATE TABLE" development
```

### Development Scripts
```bash
# Various development utilities
npm run script:<script-name>
```

## Adding New Tools

When adding new development tools:

1. **Create appropriate subdirectory** in `tools/`
2. **Add README.md** explaining the tool's purpose
3. **Update package.json scripts** to reference new tool location
4. **Update this README** with new tool information
5. **Document usage and configuration**

## Related Documentation

- **CAS Overview**: See `docs/CAS-OVERVIEW.md` for Contextual Autonomous System documentation
- **CAS Implementation**: See `docs/project-management/autonomous-ai-system-summary.md`
- **Configuration**: See individual tool directories for specific configurations
- **Development Process**: See `docs/development/` for overall development workflows