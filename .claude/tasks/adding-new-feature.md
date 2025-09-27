# Adding New Features to Tutorwise Monorepo

## Feature Development Workflow

### 1. Planning Phase

#### A. Define Feature Scope
- **Purpose**: What problem does this solve?
- **Users**: Which roles (Agent/Tutor/Client) are affected?
- **Dependencies**: What existing systems does it interact with?
- **Success Criteria**: How do we measure success?

#### B. Technical Planning
```markdown
# Feature: [Feature Name]

## Overview
Brief description of the feature

## Affected Components
- Frontend: apps/web/src/app/[areas]
- Backend: apps/api/app/[modules]
- Shared: packages/shared-types/
- Database: [tables/collections affected]

## Dependencies
- External: [APIs, services]
- Internal: [existing components]

## Implementation Plan
1. Step 1
2. Step 2
3. Step 3
```

### 2. Setup Phase

#### A. Create Feature Branch
```bash
git checkout -b feature/feature-name
```

#### B. Update Context Documentation
```bash
# Add feature context file
touch .claude/contexts/feature-name.md

# Update relevant existing context files
# Update docs/architecture/ if needed
```

### 3. Implementation Phase

#### A. Shared Types First
```bash
# Start with shared types
cd packages/shared-types/src
# Add new type definitions
```

#### B. Backend Implementation (if needed)
```bash
cd apps/api
# Add new API endpoints
# Update database schemas
# Add tests
```

#### C. Frontend Implementation
```bash
cd apps/web
# Add new components
# Update existing components
# Add pages/routes
```

### 4. Testing Strategy

#### A. Unit Tests
```bash
# Frontend tests
cd apps/web
npm run test

# Backend tests
cd apps/api
npm run test:backend
```

#### B. Integration Tests
```bash
# E2E tests from root
npm run test:e2e
```

#### C. Manual Testing
- Test all affected user roles
- Test role switching with new feature
- Test on different screen sizes
- Test error states

### 5. Code Quality Checks

#### A. Linting
```bash
npm run lint            # Frontend
npm run lint:backend    # Backend
```

#### B. Build Verification
```bash
npm run build
```

#### C. Type Checking
```bash
cd apps/web
npx tsc --noEmit
```

## Component Development Guidelines

### 1. Frontend Components

#### A. File Structure
```
apps/web/src/app/components/[category]/
├── ComponentName.tsx
├── ComponentName.module.css
└── index.ts
```

#### B. Component Template
```tsx
/**
 * @fileoverview [Component purpose]
 * @context [Where it's used]
 * @dependencies [Key dependencies]
 * @related [Related components]
 */

import styles from './ComponentName.module.css';

interface ComponentNameProps {
  // Props definition
}

export default function ComponentName({ }: ComponentNameProps) {
  return (
    <div className={styles.container}>
      {/* Component content */}
    </div>
  );
}
```

#### C. CSS Module Conventions
```css
/* ComponentName.module.css */
.container {
  /* Main container styles */
}

.title {
  /* Follow existing design system */
}

.button {
  /* Use consistent spacing (8px grid) */
}
```

### 2. API Route Development

#### A. Route Structure
```
apps/web/src/app/api/[feature]/
├── route.ts
└── [dynamic]/
    └── route.ts
```

#### B. Route Template
```typescript
/**
 * @route [HTTP_METHOD] /api/[path]
 * @purpose [What this endpoint does]
 * @auth [Authentication requirements]
 * @database [Database operations]
 * @related [Related frontend components]
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Implementation
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3. Database Integration

#### A. Supabase Integration
```typescript
// Use existing Supabase client
import { createClient } from '@/utils/supabase/server';

const supabase = createClient();
const { data, error } = await supabase
  .from('table_name')
  .select('*');
```

#### B. Type Safety
```typescript
// Define database types in shared-types
export interface DatabaseTable {
  id: string;
  // other fields
}

// Use in components
import type { DatabaseTable } from '@tutorwise/shared-types';
```

## Role-Based Feature Implementation

### 1. Multi-Role Features
```tsx
// Check current role
const { activeRole } = useUserProfile();

return (
  <>
    {activeRole === 'agent' && <AgentView />}
    {activeRole === 'provider' && <TutorView />}
    {activeRole === 'seeker' && <ClientView />}
  </>
);
```

### 2. Permission Checking
```tsx
// Create permission utilities
const canAccess = (role: UserRole, feature: string) => {
  // Permission logic
};

// Use in components
if (!canAccess(activeRole, 'feature-name')) {
  return <AccessDenied />;
}
```

## State Management

### 1. Local State
```tsx
// Use React hooks for component state
const [data, setData] = useState<DataType[]>([]);
```

### 2. Global State
```tsx
// Extend UserProfileContext for app-wide state
// Or create new context for feature-specific state
```

### 3. Server State
```tsx
// Use SWR or similar for server state management
import useSWR from 'swr';

const { data, error } = useSWR('/api/endpoint', fetcher);
```

## Performance Considerations

### 1. Code Splitting
```tsx
// Use dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'));
```

### 2. Optimization
```tsx
// Use React.memo for expensive components
export default React.memo(ComponentName);

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() =>
  heavyCalculation(data), [data]
);
```

## Error Handling

### 1. Component Error Boundaries
```tsx
// Wrap components in error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <FeatureComponent />
</ErrorBoundary>
```

### 2. API Error Handling
```typescript
// Consistent error responses
try {
  // API logic
} catch (error) {
  console.error('Feature error:', error);
  return NextResponse.json(
    { error: 'Feature operation failed' },
    { status: 500 }
  );
}
```

## Documentation Requirements

### 1. Code Documentation
- TypeScript comments for complex functions
- JSDoc for public APIs
- README updates for significant features

### 2. Context Documentation
- Update `.claude/contexts/[feature].md`
- Update system architecture docs
- Add to troubleshooting guides

## Deployment Checklist

### 1. Pre-Deployment
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Feature flags configured (if applicable)

### 2. Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify feature works in production
- [ ] Update team on feature availability

## Common Patterns

### 1. Loading States
```tsx
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <FeatureContent data={data} />;
```

### 2. Form Handling
```tsx
// Use controlled components with validation
const [formData, setFormData] = useState(initialData);
const [errors, setErrors] = useState({});

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  // Validation and submission logic
};
```

### 3. Data Fetching
```tsx
// Consistent data fetching pattern
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/endpoint');
      const data = await response.json();
      setData(data);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [dependency]);
```

This workflow ensures consistent, high-quality feature development within the Tutorwise monorepo structure.