# References Section Template

**Purpose**: Comprehensive references template to include in solution-design.md
**Usage**: Copy this entire section to the end of your solution-design documents

---

## References

### Related Documentation
| Document | Path | Purpose |
|----------|------|---------|
| Feature README | [./README.md](./README.md) | Feature overview & status |
| Implementation Guide | [./implementation.md](./implementation.md) | Developer how-to guide |
| AI Prompt Context | [./ai-prompt.md](./ai-prompt.md) | AI assistant context |
| Component Reference | [./components.md](./components.md) | Component API docs |
| Testing Guide | [./testing.md](./testing.md) | Test plans & cases |
| API Documentation | [./api.md](./api.md) | API endpoint reference |

### Code Files & Locations

#### Frontend Components
| File | Path | Purpose |
|------|------|---------|
| Main Component | `apps/web/src/app/components/feature/[feature-name]/MainComponent.tsx` | Primary feature component |
| Sub Component A | `apps/web/src/app/components/feature/[feature-name]/SubComponentA.tsx` | [Purpose] |
| Styles | `apps/web/src/app/components/feature/[feature-name]/*.module.css` | Component styling |

#### Pages & Routes
| Route | File | Purpose |
|-------|------|---------|
| `/[route]` | `apps/web/src/app/(authenticated)/[feature]/page.tsx` | Main feature page |
| `/[route]/[id]` | `apps/web/src/app/(authenticated)/[feature]/[id]/page.tsx` | Detail page |

#### API Layer
| File | Path | Purpose |
|------|------|---------|
| API Client | `apps/web/src/lib/api/[feature].ts` | Frontend API client |
| API Routes | `apps/web/src/app/api/[feature]/route.ts` | Next.js API routes |
| Server Actions | `apps/web/src/app/actions/[feature].ts` | Server actions |

#### Type Definitions
| File | Path | Purpose |
|------|------|---------|
| Shared Types | `packages/shared-types/src/[feature].ts` | TypeScript interfaces |
| Enums | `packages/shared-types/src/[feature]-enums.ts` | Enum definitions |

#### Utilities & Helpers
| File | Path | Purpose |
|------|------|---------|
| Helpers | `apps/web/src/lib/utils/[feature]-helpers.ts` | Utility functions |
| Hooks | `apps/web/src/lib/hooks/use[Feature].ts` | React hooks |
| Constants | `apps/web/src/lib/constants/[feature].ts` | Constants & configs |

### Database Migrations

#### Schema Migrations
| File | Date | Description |
|------|------|-------------|
| `20241001_create_[table]_table.sql` | 2024-10-01 | Initial table creation |
| `20241015_add_[column]_to_[table].sql` | 2024-10-15 | Add new column |
| `20241101_add_[index]_index.sql` | 2024-11-01 | Performance index |
| `20241201_update_[constraint].sql` | 2024-12-01 | Update constraints |

**Migration Location**: `supabase/migrations/` or `apps/api/migrations/`

**Find Migrations**:
```bash
# List all migrations for this feature
ls -la supabase/migrations/ | grep [feature]

# Show migration content
cat supabase/migrations/[migration-file].sql
```

#### Seed Data
| File | Purpose |
|------|---------|
| `seed_[table]_data.sql` | Initial data for [table] |

### Database Schema

#### Tables Used
| Table | Schema File | Purpose |
|-------|-------------|---------|
| `[table_name]` | `20241001_create_[table]_table.sql` | Primary data storage |
| `profiles` | `[migration-file]` | User profile data (foreign key) |
| `[related_table]` | `[migration-file]` | Related entity |

#### Views
| View | Migration | Purpose |
|------|-----------|---------|
| `[view_name]` | `20241015_create_[view].sql` | Aggregated data view |

#### Functions & Triggers
| Name | Migration | Purpose |
|------|-----------|---------|
| `[function_name]()` | `20241020_create_[function].sql` | Business logic |
| `[trigger_name]` | `20241020_create_[trigger].sql` | Auto-update logic |

### External Dependencies

#### NPM Packages
| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.x | Database client |
| `@tanstack/react-query` | ^5.x | Data fetching |
| `zod` | ^3.x | Schema validation |
| `[package-name]` | ^x.x | [Purpose] |

**Check Versions**:
```bash
# From package.json
cat apps/web/package.json | grep [package-name]
```

#### Third-Party Services
| Service | Integration Doc | Purpose |
|---------|----------------|---------|
| Supabase | [Docs/integration/integration-supabase/](../../integration/integration-supabase/) | Database & Auth |
| Stripe | [Docs/integration/integration-stripe/](../../integration/integration-stripe/) | Payments |
| Resend | [Docs/integration/integration-resend/](../../integration/integration-resend/) | Email |
| [Service] | [Link] | [Purpose] |

### Related Features

#### Dependencies (This feature depends on)
| Feature | Doc Link | Relationship |
|---------|----------|--------------|
| authentication | [Docs/feature/authentication/](../authentication/) | Requires user auth |
| public-profile | [Docs/feature/public-profile/](../public-profile/) | Uses profile data |
| [feature] | [Link] | [Relationship] |

#### Dependents (These features depend on this)
| Feature | Doc Link | Relationship |
|---------|----------|--------------|
| [feature-name] | [Link] | Uses this feature's API |
| [feature-name] | [Link] | References this data |

### External References

#### Design Resources
- [Figma Design](https://figma.com/...) - UI/UX designs
- [Design System](../../design/) - Component library
- [Style Guide](../../design/style-guide.md) - Visual standards
- [Color Palette](../../design/colors.md) - Brand colors

#### API Documentation
- [Supabase API Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [React Query Docs](https://tanstack.com/query/latest)
- [Third-party API Docs](https://...)

#### Research & Context
- [Original RFC/Proposal](link) - Initial design document
- [User Research](link) - User interviews & feedback
- [Competitive Analysis](link) - Market research
- [Technical Blog Post](link) - Related articles

### Git History

#### Key Commits
| Date | Commit | Description | Author |
|------|--------|-------------|--------|
| 2024-10-01 | `abc123` | Initial implementation | [Name] |
| 2024-11-15 | `def456` | Added feature X | [Name] |
| 2024-12-12 | `ghi789` | Major refactor | [Name] |

**Commands**:
```bash
# View file history
git log --follow --oneline -- [file-path]

# View commit details
git show [commit-hash]

# Find when line was added
git blame [file-path] | grep [search-term]

# View all changes to this feature
git log --all --grep="[feature-name]"
```

### Deployment Information

#### Environment Variables
| Variable | Location | Purpose | Example |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | Admin key (secret) | `eyJ...` |
| `NEXT_PUBLIC_[VAR]` | `.env.local` | Public config | `value` |
| `[SECRET_VAR]` | `.env.local` | Secret config | `secret` |

**Env Docs**: See [.env.example](.env.example) for all variables

#### Feature Flags
| Flag | Service | Default | Purpose |
|------|---------|---------|---------|
| `enable_[feature]` | Vercel | `false` | Feature toggle |
| `[feature]_beta` | Internal | `false` | Beta access |

### Testing Files

#### Test Locations
| Type | Path | Coverage |
|------|------|----------|
| Unit Tests | `apps/web/src/app/components/feature/[feature]/__tests__/` | Component tests |
| Integration | `apps/web/src/lib/api/__tests__/[feature].test.ts` | API tests |
| E2E | `apps/web/e2e/[feature].spec.ts` | End-to-end tests |

**Run Tests**:
```bash
# Run all tests for this feature
npm test -- [feature]

# Run specific test file
npm test -- [file-name].test.ts

# E2E tests
npm run test:e2e -- [feature].spec.ts

# Coverage report
npm test -- --coverage [feature]
```

### Performance Metrics

#### Monitoring Dashboards
- [Vercel Analytics](https://vercel.com/...) - Page load times, Core Web Vitals
- [Supabase Metrics](https://supabase.com/...) - Database query performance
- [Sentry](https://sentry.io/...) - Error tracking & performance
- [LogRocket](https://logrocket.com/...) - User session replay

#### Performance Targets
| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | < 2s | [?] |
| API Response (p95) | < 500ms | [?] |
| Database Query (p95) | < 100ms | [?] |
| Lighthouse Score | > 90 | [?] |

### Changelog

| Version | Date | Migration | Changes | Author | Commit |
|---------|------|-----------|---------|--------|--------|
| v1.0 | 2024-10-01 | `20241001_create_[table]` | Initial implementation | [Name] | `abc123` |
| v1.1 | 2024-11-15 | `20241115_add_column` | Added [feature] | [Name] | `def456` |
| v2.0 | 2024-12-12 | `20241212_refactor` | Major refactor | [Name] | `ghi789` |

---

## Appendix

### Quick Reference Card

```

              [Feature Name] Quick Reference                  
$
 Main Route:   /[route]                                      
 API Endpoint: /api/[feature]                                
 Database:     [table_name]                                  
 Component:    apps/web/.../feature/[name]/Component.tsx    
 Migration:    20241001_create_[table].sql                   
 Types:        packages/shared-types/src/[feature].ts       
 Docs:         Docs/feature/[feature-name]/                 
 Tests:        apps/web/.../__tests__/[feature].test.ts     

```

### Common Commands

```bash
# Development
npm run dev                              # Start dev server
npm run build                            # Build for production
npm run lint                             # Run linter
npm run type-check                       # TypeScript check

# Database
npm run db:migrate                       # Run migrations
npm run db:reset                         # Reset database
npm run db:seed                          # Seed data
npm run db:studio                        # Open Supabase Studio

# Testing
npm test [feature]                       # Run tests
npm run test:watch                       # Watch mode
npm run test:e2e                         # E2E tests
npm run test:coverage                    # Coverage report

# Code Analysis
git log --follow -- [file-path]          # File history
git blame [file-path]                    # Line-by-line history
git diff [commit1] [commit2] -- [path]   # Compare versions

# Find Usage
grep -r "[function-name]" apps/web/src/  # Find all references
rg "[pattern]" --type ts                 # Ripgrep search
```

### File Locator Commands

```bash
# Find component files
find apps/web/src -name "*[Feature]*" -type f

# Find all TypeScript files for feature
find apps/web/src -path "*[feature]*" -name "*.tsx" -o -name "*.ts"

# Find migrations
ls -la supabase/migrations/ | grep [feature]

# Find tests
find apps/web -path "*__tests__*" -name "*[feature]*"

# Check imports/exports
grep -r "from.*[feature]" apps/web/src/
```

---

## Example: Public Profile Feature References

### Related Documentation
- Feature README: [Docs/feature/public-profile/README.md](../public-profile/README.md)
- Solution Design v4.8: [public-profile-solution-design-v4.8.md](../public-profile/public-profile-solution-design-v4.8.md)

### Code Files (15 Components)
| File | Purpose |
|------|---------|
| `ServicesCard.tsx` | Display user's service listings (updated 2025-12-12) |
| `AboutCard.tsx` | About section |
| `ProfileHeroSection.tsx` | Hero banner with avatar |
| `GetInTouchCard.tsx` | Contact CTA (sticky sidebar) |
| ... | (11 more components) |

**Location**: `apps/web/src/app/components/feature/public-profile/`

### Page Routes
- `/public-profile/[id]/[[...slug]]` - Main profile page

**File**: `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`

### Database
- Table: `profiles`
- Table: `listings` (for ServicesCard)
- Table: `profile_reviews` (for ReviewsCard)

### Recent Changes (2025-12-12)
- ServicesCard: Added `excludeListingId` prop
- ServicesCard: Badge navigation to `/listings`
- All card headers: Added `border-radius: 8px 8px 0 0`
- Card component: Added `overflow: hidden`

### Git Commits
```bash
# Latest commits
git log --oneline --since="2025-12-01" -- apps/web/src/app/components/feature/public-profile/
```

---

**Document Status**: Active | Updated: 2025-12-12
