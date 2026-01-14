# Tutorwise Code Patterns & Conventions

**Last Updated**: 2026-01-14
**Platform Status**: 95% Complete (Beta Release: Feb 1, 2026)
**Tech Stack**: Next.js 15.x, TypeScript 5.x, Supabase, Stripe Connect

---

## 🏗️ **Project Structure Patterns**

### Directory Organization (Current)
```
apps/web/src/
├── app/
│   ├── (admin)/admin/              # 12 admin sections with HubComplexModal pattern
│   │   ├── accounts/               # User management (soft/hard delete)
│   │   ├── forms/                  # Shared fields admin (drag-and-drop)
│   │   ├── organisations/          # Team management
│   │   └── [other-sections]/      # 9 other admin sections
│   ├── (auth)/                     # Authentication routes
│   ├── (dashboard)/                # User dashboards (role-based)
│   ├── api/                        # API routes (141 endpoints)
│   ├── components/                 # Reusable components (353 total)
│   │   ├── ui/                     # Base design system
│   │   ├── admin/                  # Admin-specific components
│   │   ├── feature/                # Feature-specific components
│   │   └── layout/                 # Layout components
│   └── onboarding/                 # Page-based onboarding (5 steps/role)
├── lib/
│   ├── api/                        # API utilities
│   │   ├── formConfig.ts           # Form configuration API
│   │   └── sharedFields.ts         # Shared fields API
│   ├── supabase/
│   │   └── server.ts               # Server-side Supabase client
│   └── stripe.ts                   # Stripe Connect client
└── utils/                          # Utility functions

tools/database/migrations/          # 237 database migrations
```

### Naming Conventions
- **Files**: PascalCase for components (`HubComplexModal.tsx`), camelCase for utilities (`formatDate.ts`)
- **Components**: PascalCase (`<UnifiedSelect />`, `<HubComplexModal />`)
- **Variables**: camelCase (`isLoading`, `userProfile`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **CSS Modules**: camelCase (`styles.modalContainer`)

---

## 🧩 **Component Patterns**

### Standard Component Structure
```typescript
'use client';

import { useState, useEffect } from 'react';
import styles from './ComponentName.module.css';

interface ComponentProps {
  title: string;
  isVisible?: boolean;
  onAction?: () => void;
}

export default function ComponentName({ title, isVisible = true, onAction }: ComponentProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Component setup
  }, []);

  const handleClick = () => {
    onAction?.();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.container}>
      <h2>{title}</h2>
      {/* Component JSX */}
    </div>
  );
}
```

### HubComplexModal Pattern (Admin Detail Views)

**Purpose**: Standardized modal for displaying detailed entity information across all 12 admin sections.

**Key Characteristics**:
- Large modal with multiple tabs/sections
- Consistent header with title, status badge, and close button
- Tabbed or sectioned content area
- Action buttons at bottom (Edit, Delete, Close)
- Loading and error states
- Responsive design (mobile/tablet/desktop)

**Example Structure** (from `apps/web/src/app/(admin)/admin/accounts/components/`):
```typescript
'use client';

import { useState, useEffect } from 'react';
import styles from './HubComplexModal.module.css';

interface HubComplexModalProps {
  entityId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function EntityDetailModal({ entityId, isOpen, onClose, onUpdate }: HubComplexModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EntityType | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && entityId) {
      fetchEntityDetails();
    }
  }, [isOpen, entityId]);

  const fetchEntityDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/entities/${entityId}`);
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching entity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>{data?.name || 'Loading...'}</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={activeTab === 'overview' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={activeTab === 'details' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewSection data={data} />}
              {activeTab === 'details' && <DetailsSection data={data} />}
            </>
          )}
        </div>

        {/* Actions */}
        <div className={styles.modalActions}>
          <button className={styles.buttonSecondary} onClick={onClose}>
            Close
          </button>
          <button className={styles.buttonPrimary} onClick={handleEdit}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Used In**:
- `apps/web/src/app/(admin)/admin/accounts/components/AdminUserDetailModal.tsx`
- `apps/web/src/app/(admin)/admin/organisations/components/AdminOrganisationDetailModal.tsx`
- `apps/web/src/app/(admin)/admin/referrals/components/AdminReferralDetailModal.tsx`
- All other admin detail modals (12 sections total)

---

### UnifiedSelect Pattern (Standardized Form Selects)

**Purpose**: Consistent select/multi-select components across onboarding, account forms, organisation forms, and listings.

**Key Characteristics**:
- Integrates with Shared Fields System (23 global fields)
- Consistent styling and behavior
- Support for single and multi-select
- Option to fetch options from shared_fields table or provide custom options
- Accessible (ARIA labels, keyboard navigation)
- Error state handling

**Single Select Example**:
```typescript
'use client';

import { useState, useEffect } from 'react';
import styles from './UnifiedSelect.module.css';

interface UnifiedSelectProps {
  fieldName: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  fetchFromSharedFields?: boolean;
  required?: boolean;
  error?: string;
  helpText?: string;
}

export default function UnifiedSelect({
  fieldName,
  label,
  value,
  onChange,
  options: providedOptions,
  fetchFromSharedFields = false,
  required = false,
  error,
  helpText
}: UnifiedSelectProps) {
  const [options, setOptions] = useState(providedOptions || []);
  const [loading, setLoading] = useState(fetchFromSharedFields);

  useEffect(() => {
    if (fetchFromSharedFields) {
      fetchOptions();
    }
  }, [fetchFromSharedFields, fieldName]);

  const fetchOptions = async () => {
    try {
      const response = await fetch(`/api/shared-fields/${fieldName}/options`);
      const result = await response.json();
      setOptions(result.options || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.fieldContainer}>
      <label htmlFor={fieldName} className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>

      {loading ? (
        <div className={styles.loading}>Loading options...</div>
      ) : (
        <select
          id={fieldName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${styles.select} ${error ? styles.selectError : ''}`}
          required={required}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {helpText && <p className={styles.helpText}>{helpText}</p>}
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
```

**Multi-Select Example** (`UnifiedMultiSelect.tsx`):
```typescript
// Similar structure but with multi-select logic
// Stores array of selected values
// Renders checkboxes or multi-select dropdown
// Used for subjects, key stages, AI tools, etc.
```

**Used In**:
- Onboarding flows (Tutor, Client, Agent - 5 steps each)
- Account professional info forms
- Organisation settings forms
- Create/Edit listing forms
- Integrated with Shared Fields System API

**Shared Fields Integration**:
```typescript
// Fetch options from shared_fields table
const response = await fetch(`/api/shared-fields/${fieldName}/options`);

// Example fields: subjects, keyStages, aiTools, languages, qualifications, etc.
// 23 global fields mapped to 106 context-specific implementations
```

---

### Shared Fields System Pattern

**Purpose**: Single source of truth for form field definitions across 9 contexts.

**Architecture**:
```
23 Global Fields (shared_fields table)
    ↓
106 Context Mappings (form_context_fields table)
    ↓
9 Contexts (3 roles × 3 form types)
```

**Contexts**:
1. Onboarding Tutor
2. Onboarding Client
3. Onboarding Agent
4. Account Tutor
5. Account Client
6. Account Agent
7. Organisation Tutor
8. Organisation Client
9. Organisation Agent

**Example Usage**:
```typescript
// Fetch context-specific fields
const response = await fetch(`/api/form-config?formType=onboarding&userRole=tutor`);
const { fields } = await response.json();

// Fields include:
// - Field definition from shared_fields (options, validation, metadata)
// - Context-specific customization (isRequired, isEnabled, displayOrder, customLabel)

// Render with UnifiedSelect/UnifiedMultiSelect
fields.map(field => (
  <UnifiedSelect
    key={field.id}
    fieldName={field.shared_fields.field_name}
    label={field.customLabel || field.shared_fields.label}
    options={field.shared_fields.options}
    required={field.isRequired}
    helpText={field.customHelpText || field.shared_fields.help_text}
  />
))
```

---

## 📊 **State Management Patterns**

### React Query (TanStack Query) - Server State
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['users', userId],
  queryFn: async () => {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutations with optimistic updates
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: async (newData) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData),
    });
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

### Zustand - Client State
```typescript
import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));

// Usage
const { sidebarOpen, setSidebarOpen } = useAppStore();
```

---

## 🔌 **API Integration Patterns**

### Next.js 15 API Route Pattern
```typescript
// app/api/route-name/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // API logic
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validation
    if (!body.field) {
      return NextResponse.json(
        { error: 'Field is required' },
        { status: 400 }
      );
    }

    // Insert/Update logic
    const { data, error } = await supabase
      .from('table_name')
      .insert({ ...body, user_id: user.id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Service Role Client Pattern (Admin Operations)
```typescript
import { createClient as createAdminClient } from '@supabase/supabase-js';

// ONLY use for admin operations that bypass RLS
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Example: Admin user deletion
const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
```

---

## 🗃️ **Database Patterns**

### Supabase Client Pattern (Server-Side)
```typescript
import { createClient } from '@/utils/supabase/server';

// Server component or API route
const supabase = await createClient();

// Standard query with RLS
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

if (error) {
  console.error('Database error:', error);
  return { error: error.message };
}
```

### Complex Query Pattern
```typescript
// Join with related tables
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    profiles:user_id (
      id,
      full_name,
      avatar_url
    ),
    shared_fields:listing_fields (
      field_name,
      options
    )
  `)
  .eq('is_active', true)
  .order('created_at', { ascending: false })
  .limit(10);
```

### Shared Fields Query Pattern
```typescript
// Fetch context-specific form fields
const { data: fields, error } = await supabase
  .from('form_context_fields')
  .select(`
    *,
    shared_fields (
      id,
      field_name,
      field_type,
      label,
      placeholder,
      help_text,
      options,
      validation_rules
    )
  `)
  .eq('form_type', formType)
  .eq('user_role', userRole)
  .eq('is_enabled', true)
  .order('display_order', { ascending: true });
```

---

## 🔐 **Authentication Patterns**

### Server-Side Auth Check
```typescript
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <div>Protected content</div>;
}
```

### Middleware for Route Protection
```typescript
// middleware.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

---

## 💰 **Payment Processing Patterns**

### Stripe Connect Integration
```typescript
import { stripe } from '@/lib/stripe';

// Create payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000, // $20.00
  currency: 'gbp',
  application_fee_amount: 200, // 10% platform fee
  transfer_data: {
    destination: connectedAccountId,
  },
});

// Create connected account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'GB',
  email: tutorEmail,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});
```

### GDPR-Compliant Stripe Cleanup
```typescript
// Delete Stripe Connect Account
if (stripeAccountId) {
  await stripe.accounts.del(stripeAccountId);
}

// Delete Stripe Customer
if (stripeCustomerId) {
  await stripe.customers.del(stripeCustomerId);
}
```

---

## 🎯 **Error Handling Patterns**

### API Error Response Format
```typescript
// Standard error response
return NextResponse.json(
  {
    error: 'Validation failed',
    details: 'Email address is required',
    code: 'VALIDATION_ERROR'
  },
  { status: 400 }
);

// Authentication error
return NextResponse.json(
  { error: 'Unauthorized' },
  { status: 401 }
);

// Not found error
return NextResponse.json(
  { error: 'Resource not found' },
  { status: 404 }
);
```

### Component Error Display
```typescript
{error && (
  <div className={styles.errorMessage}>
    <p className={styles.errorTitle}>Error:</p>
    <p className={styles.errorDetail}>{error}</p>
  </div>
)}
```

---

## 🧪 **Testing Patterns**

### Unit Testing with Jest
```typescript
// __tests__/ComponentName.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    const mockHandler = jest.fn();
    render(<ComponentName onAction={mockHandler} />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Testing with Playwright
```typescript
// tests/e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test('user can complete onboarding', async ({ page }) => {
  await page.goto('/onboarding');

  // Step 1: Personal Info
  await page.fill('input[name="full_name"]', 'Test User');
  await page.click('button:has-text("Next")');

  // Verify next step loaded
  await expect(page).toHaveURL(/.*professional/);
});
```

---

## 🔄 **Development Workflow Patterns**

### Git Commit Message Convention
```
feat: add shared fields admin UI with drag-and-drop
fix: resolve admin hard delete Stripe cleanup issue
docs: update PATTERNS.md with HubComplexModal pattern
test: add unit tests for UnifiedSelect component
style: update button component styling for consistency
refactor: consolidate shared fields API logic
```

### Code Review Checklist
- [ ] TypeScript types properly defined (no `any` without justification)
- [ ] Error handling implemented (try/catch, user feedback)
- [ ] Authentication checks in place (RLS policies, middleware)
- [ ] Responsive design considered (mobile/tablet/desktop)
- [ ] Accessibility attributes added (ARIA labels, keyboard navigation)
- [ ] Performance optimizations applied (React Query caching, lazy loading)
- [ ] Tests written/updated (unit tests for logic, E2E for workflows)
- [ ] Documentation updated (README, PATTERNS.md, inline comments)

---

## 📱 **Responsive Design Patterns**

### Breakpoint Usage (Mobile-First)
- **Base**: Mobile styles (< 768px)
- **Tablet**: `md:` prefix (768px+)
- **Desktop**: `lg:` prefix (1024px+)
- **Large Desktop**: `xl:` prefix (1280px+)

### Grid Patterns
```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## 🎨 **Styling Patterns**

### CSS Modules Convention
```css
/* ComponentName.module.css */
.container {
  padding: var(--space-4);
  border-radius: var(--radius-md);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cardGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
}
```

### Tailwind + CSS Modules Hybrid
```typescript
// Use Tailwind for rapid prototyping
<div className="flex items-center gap-4 p-4">

// Use CSS Modules for component-specific styling
<div className={styles.complexComponent}>
```

---

*This document reflects production patterns as of January 14, 2026*
*Platform at 95% completion, beta release February 1, 2026*
*Update this document as new patterns emerge*
