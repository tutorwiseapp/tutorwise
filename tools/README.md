# Tools Directory

This directory contains all development tools, utilities, and shared configurations for the Tutorwise monorepo.

## Structure

```
tools/
├── scripts/              # Automation scripts and utilities
├── configs/              # Shared configuration files
├── context-engineering/  # AI context generation and migration tools
├── playwright/          # End-to-end testing configuration
├── percy/               # Visual testing setup
└── README.md           # This file
```

## Directory Contents

### `scripts/`
- Build automation scripts
- Development utilities
- Deployment helpers
- Database migration scripts

### `configs/`
- **`eslint.config.js`** - Shared ESLint configuration
- Shared TypeScript configurations
- Prettier configurations
- Other linting and formatting tools

### `context-engineering/`
- **`generate-context.js`** - Main context generation tool
- **`migrate-to-monorepo.js`** - Monorepo migration utilities
- **`update-imports.js`** - Import path updating tools
- Other migration and context tools

### `playwright/`
- **`playwright.config.ts`** - Playwright configuration for E2E tests
- Test utilities and helpers
- Browser automation setup

### `percy/`
- Visual regression testing setup
- Percy configuration files
- Visual testing utilities

## Usage

### Context Generation
```bash
# Generate fresh context maps
npm run context:generate
# or directly
node tools/context-engineering/generate-context.js
```

### Testing
```bash
# Run E2E tests
npm run test:e2e
# Run visual tests
npm run test:visual
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

- **Configuration**: See individual tool directories for specific configurations
- **Development Process**: See `docs/development/` for overall development workflows
- **Context Engineering**: See `docs/tools/` for detailed context engineering documentation