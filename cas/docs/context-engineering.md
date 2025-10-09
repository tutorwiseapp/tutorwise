# Context Engineering System for Tutorwise Monorepo

## Overview

Context Engineering is a systematic approach to making codebases more discoverable, understandable, and maintainable by providing rich contextual information to developers and AI assistants.

## Goals

1. **Faster Onboarding**: New developers can understand the system quickly
2. **Better AI Assistance**: AI tools can provide more accurate help
3. **Reduced Cognitive Load**: Developers spend less time understanding context
4. **Improved Code Quality**: Better understanding leads to better decisions
5. **Enhanced Collaboration**: Shared understanding across team members

## Context Engineering Components

### 1. Architectural Documentation

#### A. System Map (`docs/architecture/system-map.md`)
```markdown
# Tutorwise System Architecture

## Applications
- **apps/web/**: Next.js 13+ frontend with App Router
  - Purpose: User-facing web application
  - Key Features: Authentication, role management, payments
  - Entry Point: `apps/web/src/app/layout.tsx`

- **apps/api/**: FastAPI backend
  - Purpose: Business logic, database operations
  - Key Features: Auth, Neo4j/Redis connections, health monitoring
  - Entry Point: `apps/api/app/main.py`

## Packages
- **packages/shared-types/**: Shared TypeScript definitions
- **packages/ui/**: Shared UI components (future)

## Data Flow
Frontend → API Routes → Backend Services → Databases (Supabase, Neo4j, Redis)
```

#### B. Dependency Graph (`docs/architecture/dependencies.md`)
Visual representation of how components depend on each other.

### 2. Code Organization Patterns

#### A. File Naming Conventions
```
apps/web/src/app/
├── (auth)/           # Route groups for organization
├── api/              # API routes
├── components/       # Reusable components
│   ├── ui/          # Pure UI components
│   └── layout/      # Layout-specific components
└── [feature]/       # Feature-based routing
```

#### B. Import Path Standards
```typescript
// Absolute imports using @ alias
import { Button } from '@/components/ui/Button'
import { UserProfileContext } from '@/contexts/UserProfileContext'

// Shared packages
import type { User } from '@tutorwise/shared-types'
```

### 3. Context-Aware Documentation

#### A. Component Documentation Template
```typescript
/**
 * @fileoverview NavMenu component with role switching functionality
 * @context Used in main layout for authenticated users
 * @dependencies Radix UI, UserProfileContext, role management
 * @related apps/web/src/app/components/layout/RoleSwitcher.tsx
 * @updated 2025-09-27 - Added role switching integration
 */
```

#### B. API Route Documentation
```typescript
/**
 * @route POST /api/stripe/create-checkout-session
 * @purpose Creates Stripe checkout session for payments
 * @auth Required - uses Supabase authentication
 * @database Updates payment records in Supabase
 * @related Frontend: apps/web/src/app/payments/page.tsx
 */
```

### 4. Development Tools Integration

#### A. VS Code Settings (`.vscode/settings.json`)
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "path-intellisense.mappings": {
    "@": "${workspaceFolder}/apps/web/src"
  },
  "files.associations": {
    "*.md": "markdown"
  }
}
```

#### B. TypeScript Path Intelligence
```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@tutorwise/shared-types": ["../../packages/shared-types/src"],
      "@tutorwise/ui": ["../../packages/ui/src"]
    }
  }
}
```

### 5. Automated Context Generation

#### A. Code Analysis Scripts
- **Dependency analyzer**: Maps component relationships
- **API route discovery**: Auto-generates API documentation
- **Import graph**: Visualizes import dependencies

#### B. Documentation Generators
- **Component catalog**: Auto-generated from TypeScript comments
- **API reference**: Auto-generated from route handlers
- **Database schema**: Auto-generated from Supabase types

## Implementation Plan

### Phase 1: Documentation Infrastructure
1. Create `docs/` directory structure
2. Document current architecture
3. Establish documentation standards

### Phase 2: Code Enhancement
1. Add comprehensive TypeScript comments
2. Implement consistent naming conventions
3. Create shared type definitions

### Phase 3: Tooling Integration
1. Configure VS Code workspace
2. Set up automated documentation generation
3. Create development utilities

### Phase 4: AI-Specific Enhancements
1. Create AI context files
2. Implement code relationship mapping
3. Build query interfaces for codebase exploration

## Context Files for AI

### A. Project Context (`.claude/CLAUDE.md`)
Already implemented - contains project overview, tech stack, and development guidelines.

### B. Feature Context Files
```
.claude/contexts/
├── auth-system.md      # Authentication flow and components
├── payment-system.md   # Stripe integration details
├── role-management.md  # Role switching functionality
└── ui-components.md    # Design system and component usage
```

### C. Task-Specific Context
```
.claude/tasks/
├── onboarding-new-dev.md    # Steps for new developer setup
├── adding-new-feature.md    # Feature development workflow
├── debugging-guide.md       # Common issues and solutions
└── deployment-process.md    # Deployment checklist and process
```

## Benefits of This System

### For Developers
- **Faster Problem Solving**: Quickly understand code relationships
- **Reduced Ramp-up Time**: Clear documentation and patterns
- **Better Decision Making**: Full context for architectural choices

### For AI Assistants
- **More Accurate Suggestions**: Better understanding of codebase
- **Context-Aware Responses**: Suggestions that fit project patterns
- **Efficient Code Generation**: Follows established conventions

### For Project Maintenance
- **Knowledge Preservation**: Documentation survives team changes
- **Consistent Quality**: Patterns enforce good practices
- **Scalable Architecture**: Clear boundaries for growth

## Next Steps

1. Would you like me to implement the documentation infrastructure?
2. Should I create the AI-specific context files for different features?
3. Do you want to set up the automated tooling for context generation?

This system will make our monorepo much more maintainable and AI-friendly for future development.