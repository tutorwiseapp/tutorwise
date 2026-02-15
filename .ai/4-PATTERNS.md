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
│   ├── (admin)/admin/              # 13 admin sections with HubComplexModal pattern
│   │   ├── accounts/               # User management (soft/hard delete)
│   │   ├── forms/                  # Shared fields admin (drag-and-drop)
│   │   ├── organisations/          # Team management
│   │   └── [other-sections]/      # Additional admin sections
│   ├── (auth)/                     # Authentication routes
│   ├── (dashboard)/                # User dashboards (role-based)
│   ├── api/                        # API routes (222 endpoints)
│   ├── components/                 # Reusable components (382 total)
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

tools/database/migrations/          # 270 database migrations
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

### VerticalDotsMenu Pattern (Table Row Actions)

**Purpose**: Shared 3-dot action menu for admin data table rows. Uses `createPortal` to render the dropdown to `document.body`, escaping the `overflow: hidden` on HubDataTable cells.

**Location**: `apps/web/src/app/components/ui/actions/VerticalDotsMenu.tsx`

**Key Characteristics**:
- `createPortal` renders menu to `document.body` (required — HubDataTable `.dataCell` has `overflow: hidden`)
- Fixed positioning calculated from button's `getBoundingClientRect()`
- Closes on outside click and scroll
- Each instance manages its own open/close state (no parent state needed)
- `z-index: 1000` to sit above all table layers

**Usage Example**:
```typescript
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';

// In a HubDataTable column render:
{
  key: 'actions',
  label: 'Actions',
  width: '100px',
  sortable: false,
  render: (item) => (
    <VerticalDotsMenu
      actions={[
        { label: 'Edit', onClick: () => router.push(`/admin/edit/${item.id}`) },
        { label: 'Delete', onClick: () => handleDelete(item.id), variant: 'danger' },
      ]}
    />
  ),
}
```

**MenuAction Interface**:
```typescript
interface MenuAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}
```

**Used In / Should Be Used In**:
- `ArticlesTable` (Resources) — currently uses this component
- `UsersTable` (Accounts) — can be migrated
- `ListingsTable`, `BookingsTable`, `ReviewsTable`, `OrganisationsTable`, `ReferralsTable` — can be migrated

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

### Proxy for URL Redirects (Next.js 16)
```typescript
// proxy.ts (renamed from middleware.ts in Next.js 16 upgrade - 2026-01-28)
// Route protection is handled at API/page level via Supabase auth checks
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Add URL redirects/rewrites here as needed
  return NextResponse.next();
}

export const config = {
  matcher: [],
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

## 🏛️ **Hub Architecture Pattern (Feature Implementation Template)**

This section documents the Hub Architecture pattern used for major features. Use this as a template when implementing new features like Sage, EduPay, Bookings, Referrals, etc.

### Overview

The Hub Architecture provides a consistent, scalable pattern for feature pages:
- **HubPageLayout**: Main container with header, tabs, sidebar, and content areas
- **HubHeader**: Title, filters, and action buttons
- **HubTabs**: Tab navigation with counts
- **HubSidebar**: Contextual widgets and stats
- **HubPagination**: Paginated content lists
- **HubEmptyState**: Empty state messaging

### Reference Implementation: Sage AI Tutor

**Sage** is the AI tutoring assistant that helps students learn between human tutor sessions. This section documents its full architecture as a reference for future features.

---

### 1. AppSidebar Integration

Add feature entry to navigation with submenus:

**Location**: `apps/web/src/app/components/layout/AppSidebar.tsx`

```typescript
// Add after EduPay link
{
  name: 'Sage',
  href: '/sage',
  icon: BookOpenIcon,
  roles: ['student', 'client', 'tutor', 'agent'], // Role-based visibility
  subItems: [
    { name: 'Chat', href: '/sage', icon: ChatBubbleIcon },
    { name: 'History', href: '/sage/history', icon: ClockIcon },
    { name: 'Progress', href: '/sage/progress', icon: ChartBarIcon },
    { name: 'Materials', href: '/sage/materials', icon: DocumentIcon },
  ]
}
```

---

### 2. Hub Component Inventory

#### Reusable Hub Components (from `components/hub/`)

| Component | Location | Purpose |
|-----------|----------|---------|
| `HubPageLayout` | `hub/layout/HubPageLayout.tsx` | Main page wrapper with slots for header, tabs, sidebar, content |
| `HubHeader` | `hub/layout/HubHeader.tsx` | Title + filters + actions container |
| `HubTabs` | `hub/layout/HubTabs.tsx` | Tab navigation with badge counts |
| `HubPagination` | `hub/layout/HubPagination.tsx` | Page navigation for lists |
| `HubSidebar` | `hub/sidebar/HubSidebar.tsx` | Sidebar widget container |
| `HubStatsCard` | `hub/sidebar/cards/HubStatsCard.tsx` | Stats widget with rows |
| `HubActionCard` | `hub/sidebar/cards/HubActionCard.tsx` | CTA card with action button |
| `HubEmptyState` | `hub/content/HubEmptyState.tsx` | Empty state with icon/title/description/action |
| `HubDetailCard` | `hub/content/HubDetailCard/HubDetailCard.tsx` | Detail card for list items |

#### Custom Feature Components (Sage-specific)

| Component | Purpose |
|-----------|---------|
| `SageChat` | Main chat interface with messages |
| `SageMessage` | Individual message bubble (user/assistant) |
| `SageMessageInput` | Input area with send button |
| `SageTypingIndicator` | "Sage is thinking..." animation |
| `SageMarkdown` | Markdown renderer for AI responses |
| `SageProgressWidget` | Subject progress bars |
| `SageStreakWidget` | Learning streak display |
| `SageRecentSessionsWidget` | Recent sessions list |
| `SageHelpWidget` | Quick help tips |
| `SageTipWidget` | Daily learning tip |
| `SageSessionCard` | Session history card |
| `SageSessionDetailModal` | Full session transcript modal |
| `SagePracticeModal` | Practice problem interface |
| `SageUploadModal` | Document upload interface |
| `SageSkeleton` | Loading state skeleton |
| `SageError` | Error state with retry |

---

### 3. Page Structure

#### Main Page: `/sage`
```
apps/web/src/app/(authenticated)/sage/
├── page.tsx              # Main Sage chat page
├── page.module.css       # Page-specific styles
├── history/
│   └── page.tsx          # Session history
├── progress/
│   └── page.tsx          # Learning progress
└── materials/
    └── page.tsx          # Uploaded materials
```

#### Page Layout Pattern
```typescript
// apps/web/src/app/(authenticated)/sage/page.tsx
'use client';

import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import SageChat from '@/app/components/feature/sage/SageChat';
import SageProgressWidget from '@/app/components/feature/sage/SageProgressWidget';
import SageStreakWidget from '@/app/components/feature/sage/SageStreakWidget';
import SageHelpWidget from '@/app/components/feature/sage/SageHelpWidget';

export default function SagePage() {
  const { profile } = useUserProfile();
  const [subject, setSubject] = useState<SubjectType>('general');

  // React Query for session data
  const { data: session, isLoading } = useQuery({
    queryKey: ['sage-session', profile?.id, subject],
    queryFn: () => createSageSession(subject),
    enabled: !!profile?.id,
  });

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Sage"
          filters={<SubjectSelector value={subject} onChange={setSubject} />}
          actions={<Button onClick={handleNewSession}>New Session</Button>}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'chat', label: 'Chat', active: true },
            { id: 'history', label: 'History', href: '/sage/history' },
            { id: 'progress', label: 'Progress', href: '/sage/progress' },
            { id: 'materials', label: 'Materials', href: '/sage/materials' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <SageProgressWidget studentId={profile?.id} />
          <SageStreakWidget studentId={profile?.id} />
          <SageHelpWidget />
        </HubSidebar>
      }
    >
      {isLoading ? (
        <SageSkeleton />
      ) : session ? (
        <SageChat session={session} subject={subject} />
      ) : (
        <HubEmptyState
          title="Start Learning with Sage"
          description="Select a subject and ask a question to begin."
          actionLabel="Start Session"
          onAction={handleNewSession}
        />
      )}
    </HubPageLayout>
  );
}
```

---

### 4. API Routes Structure

```
apps/web/src/app/api/sage/
├── session/
│   └── route.ts          # POST: Create session, GET: Get active session
├── message/
│   └── route.ts          # POST: Send message (non-streaming)
├── stream/
│   └── route.ts          # POST: Send message (streaming response)
├── history/
│   └── route.ts          # GET: Session history list
├── progress/
│   └── route.ts          # GET: Learning progress data
├── materials/
│   └── route.ts          # GET/POST: Uploaded materials
├── feedback/
│   └── route.ts          # POST: Message feedback (thumbs up/down)
└── capabilities/
    └── route.ts          # GET: Available tools and subjects
```

#### API Route Pattern
```typescript
// apps/web/src/app/api/sage/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SageOrchestrator } from '@sage/core/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, level } = await request.json();

    // Initialize orchestrator
    const orchestrator = new SageOrchestrator({
      studentId: user.id,
      subject,
      level,
    });

    const session = await orchestrator.createSession();

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Sage session error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
```

---

### 5. React Query Patterns

```typescript
// Standard query configuration for feature data
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['feature-name', profile?.id, ...dependencies],
  queryFn: fetchFunction,
  enabled: !!profile?.id,
  placeholderData: keepPreviousData,
  staleTime: 30_000,              // 30 seconds
  gcTime: 10 * 60_000,            // 10 minutes
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
});

// Mutation with cache invalidation
const mutation = useMutation({
  mutationFn: updateFunction,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['feature-name'] });
  },
});
```

---

### 6. Streaming Response Pattern

```typescript
// apps/web/src/app/api/sage/stream/route.ts
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const orchestrator = new SageOrchestrator(config);

        for await (const chunk of orchestrator.streamResponse(message)) {
          const data = JSON.stringify({ type: 'chunk', content: chunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const errorData = JSON.stringify({ type: 'error', message: error.message });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

### 7. Custom Hook Pattern

```typescript
// apps/web/src/app/components/feature/sage/useSageChat.ts
import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseSageChatOptions {
  sessionId: string;
  subject: string;
  onError?: (error: Error) => void;
}

export function useSageChat({ sessionId, subject, onError }: UseSageChatOptions) {
  const [messages, setMessages] = useState<SageMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/sage/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content, subject }),
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body?.getReader();
      // Stream processing...

    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsStreaming(false);
    }
  }, [sessionId, subject, onError]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    stopStreaming,
  };
}
```

---

### 8. Sidebar Widget Pattern

```typescript
// apps/web/src/app/components/feature/sage/SageProgressWidget.tsx
'use client';

import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface SageProgressWidgetProps {
  studentId?: string;
}

export default function SageProgressWidget({ studentId }: SageProgressWidgetProps) {
  const { data: progress } = useQuery({
    queryKey: ['sage-progress', studentId],
    queryFn: () => fetchProgress(studentId!),
    enabled: !!studentId,
  });

  const stats: StatRow[] = [
    {
      label: 'Sessions This Week',
      value: progress?.weeklySessionCount ?? 0,
      valueColor: 'default',
    },
    {
      label: 'Topics Covered',
      value: progress?.topicCount ?? 0,
      valueColor: 'green',
    },
    {
      label: 'Current Streak',
      value: `${progress?.streakDays ?? 0} days`,
      valueColor: progress?.streakDays > 0 ? 'orange' : 'default',
    },
  ];

  return <HubStatsCard title="Learning Progress" stats={stats} />;
}
```

---

### 9. Implementation Order (Checklist)

When implementing a new feature using the Hub Architecture:

1. **Documentation** (Optional but recommended)
   - [ ] Create `docs/feature/{feature-name}/{feature-name}-solution-design.md`

2. **Backend Core** (if AI/service layer needed)
   - [ ] Create orchestrator/service in dedicated directory
   - [ ] Define types and interfaces
   - [ ] Implement core business logic

3. **API Routes**
   - [ ] Create `/api/{feature}/` directory
   - [ ] Implement CRUD routes (GET, POST, PUT, DELETE)
   - [ ] Add streaming routes if needed
   - [ ] Add authentication checks

4. **UI Components**
   - [ ] Create `components/feature/{feature}/` directory
   - [ ] Implement custom feature components
   - [ ] Create custom hooks for data management
   - [ ] Add CSS modules for styling

5. **Pages**
   - [ ] Create `(authenticated)/{feature}/page.tsx`
   - [ ] Use HubPageLayout with header, tabs, sidebar
   - [ ] Add sub-pages as needed (history, settings, etc.)
   - [ ] Implement loading, error, and empty states

6. **Navigation**
   - [ ] Add to AppSidebar with icon and submenus
   - [ ] Configure role-based visibility

7. **Integration**
   - [ ] Connect to existing systems (CAS, profiles, etc.)
   - [ ] Add React Query caching
   - [ ] Test full user flow

---

### 10. File Naming Conventions

```
Feature Components:
  {Feature}Chat.tsx           # Main interaction component
  {Feature}Message.tsx        # Message display
  {Feature}Card.tsx           # List item card
  {Feature}DetailModal.tsx    # Detail view modal
  {Feature}StatsWidget.tsx    # Sidebar stats widget
  {Feature}HelpWidget.tsx     # Sidebar help/tips widget
  use{Feature}Chat.ts         # Chat/interaction hook
  use{Feature}History.ts      # History data hook
  {Feature}.module.css        # Component styles

Pages:
  page.tsx                    # Main feature page
  page.module.css             # Page-specific styles

API Routes:
  route.ts                    # Standard route file

Types:
  types.ts or index.ts        # Type definitions
```

---

### 11. CSS Module Pattern

```css
/* Feature page styles */
.pageContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.contentArea {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.cardList {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Feature-specific skeleton */
.skeleton {
  animation: pulse 2s infinite;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: var(--radius-md);
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### 12. Error Boundary Pattern

```typescript
// apps/web/src/app/components/feature/sage/SageError.tsx
'use client';

import Button from '@/app/components/ui/actions/Button';
import styles from './SageError.module.css';

interface SageErrorProps {
  error: Error;
  onRetry?: () => void;
}

export default function SageError({ error, onRetry }: SageErrorProps) {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <h3 className={styles.errorTitle}>Something went wrong</h3>
      <p className={styles.errorMessage}>{error.message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
```

---

### 13. Lessons Learned & Common Mistakes

This section documents mistakes made during the Sage implementation and how to avoid them in future features. Use this as a pre-implementation checklist.

#### Mistake 1: Wrong Theme Colors

**What went wrong**: Used purple (#7c3aed) in CSS instead of the app's teal theme (#006c67).

**Root cause**: Copied colors from external sources or assumed colors without checking design system.

**How to avoid**:
- ALWAYS check `.ai/6-design-system.md` before writing any CSS
- App primary color: `#006c67` (teal), NOT purple
- App primary light: `#E6F0F0`
- Search for existing color usage: `grep -r "#006c67" apps/web/src`

**Quick reference**:
```css
/* CORRECT - App theme colors */
--primary: #006c67;
--primary-hover: #005550;
--primary-dark: #004442;
--primary-light: #99c7c4;
--primary-bg: #E6F0F0;

/* WRONG - Do NOT use */
--purple: #7c3aed;  /* Not our theme */
```

---

#### Mistake 2: Not Using Hub Components

**What went wrong**: Created custom empty states instead of using `HubEmptyState`.

**Root cause**: Didn't check available Hub components before implementation.

**How to avoid**:
- Review `components/hub/` directory before creating new components
- Use these Hub components for consistency:
  - `HubEmptyState` - All empty state messaging
  - `HubStatsCard` - Sidebar statistics
  - `HubDetailCard` - List item details
  - `HubPagination` - Paginated lists

**Pattern**:
```typescript
// CORRECT
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';

<HubEmptyState
  title="No sessions yet"
  description="Start learning to see your history here."
  actionLabel="Start Learning"
  onAction={() => router.push('/sage')}
/>

// WRONG - Custom empty state
<div className={styles.emptyState}>
  <h3>No sessions yet</h3>
  ...
</div>
```

---

#### Mistake 3: Using Icons/Emojis in Feature Components

**What went wrong**: Used SVG icons, emojis, and icon fonts in feature components.

**Root cause**: Assumed icons improve UX; didn't check codebase conventions.

**How to avoid**:
- Feature components should use TEXT LABELS, not icons
- Replace: SVG icons → text (e.g., "Send", "Delete", "Yes", "No")
- Replace: Emojis → nothing or text
- Only use icons in design system UI components (`components/ui/`)

**Examples**:
```typescript
// CORRECT
<button>Send</button>
<button>Delete</button>
<span>PDF</span>
<span>IMG</span>

// WRONG
<button><SendIcon /></button>
<button>🗑️</button>
<span>📄</span>
<span>🔥</span>  /* Fire emoji in streak widget */
```

---

#### Mistake 4: Missing Search Bar in Header

**What went wrong**: Headers lacked search input, breaking consistency.

**Root cause**: Didn't check reference implementation (bookings).

**How to avoid**:
- EVERY Hub page header should have a search input
- Use `filterStyles.filtersContainer` for search + filters
- Check bookings feature as reference

**Pattern**:
```typescript
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';

<HubHeader
  title="Feature Name"
  filters={
    <div className={filterStyles.filtersContainer}>
      <input
        type="search"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={filterStyles.searchInput}
      />
      <UnifiedSelect ... />
    </div>
  }
  actions={...}
/>
```

---

#### Mistake 5: Wrong Header Action Pattern

**What went wrong**: Actions not using hub primary/secondary dropdown pattern.

**Root cause**: Didn't check existing hub action styles.

**How to avoid**:
- Import `actionStyles` from hub styles
- Primary action: Full button with text
- Secondary action: Dropdown menu with "..." button

**Pattern**:
```typescript
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

<HubHeader
  actions={
    <>
      <Button variant="primary" size="sm" onClick={handlePrimaryAction}>
        Primary Action
      </Button>
      <div className={actionStyles.dropdownContainer}>
        <Button variant="secondary" size="sm" square onClick={toggleMenu}>
          ...
        </Button>
        {showMenu && (
          <>
            <div className={actionStyles.backdrop} onClick={closeMenu} />
            <div className={actionStyles.dropdownMenu}>
              <button onClick={handleOption1} className={actionStyles.menuButton}>
                Option 1
              </button>
            </div>
          </>
        )}
      </div>
    </>
  }
/>
```

---

#### Mistake 6: API Errors When Tables Don't Exist

**What went wrong**: API returned 500 errors when database tables were missing.

**Root cause**: Didn't handle database errors gracefully during development.

**How to avoid**:
- Check for database errors and return empty results gracefully
- Log warning but don't throw error
- Allows UI to work during development before migrations run

**Pattern**:
```typescript
// CORRECT - Graceful handling
const { data, error } = await supabase.from('table_name').select('*');

if (error) {
  console.warn('[Feature] Database error (may be missing table):', error.message);
  return NextResponse.json({
    items: [],
    total: 0,
    limit,
    offset,
  });
}

// WRONG - Throws 500 error
if (error) {
  throw error;  // Causes UI to show error state
}
```

---

#### Mistake 7: Missing Gold Standard React Query Config

**What went wrong**: Initial queries missing `keepPreviousData`, retry config, etc.

**Root cause**: Didn't copy react-query config from reference implementation.

**How to avoid**:
- ALWAYS apply this config to useQuery calls:

**Gold Standard Config**:
```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';

const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['feature-name', profile?.id, ...dependencies],
  queryFn: async () => {
    const res = await fetch('/api/feature');
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  },
  enabled: !!profile?.id,
  // === GOLD STANDARD CONFIG - ALWAYS INCLUDE ===
  staleTime: 2 * 60 * 1000,        // 2 minutes
  gcTime: 5 * 60 * 1000,           // 5 minutes
  placeholderData: keepPreviousData,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
});
```

---

#### Mistake 8: Wrong Module Import Paths

**What went wrong**: Used non-existent paths like `@sage/services/session`.

**Root cause**: Assumed path structure without checking tsconfig or actual files.

**How to avoid**:
- Check `tsconfig.json` for path aliases
- Verify file exists before importing
- Use IDE auto-import when possible

**Check paths**:
```bash
# Verify path alias exists
grep -r "@sage" tsconfig.json

# Find actual module location
find . -name "*.ts" -path "*/sage/*" | head -20
```

---

### 14. Pre-Implementation Checklist

Use this checklist BEFORE starting any new Hub feature:

```markdown
## Pre-Implementation Checklist

### Design System
- [ ] Read `.ai/6-design-system.md` for colors, spacing, typography
- [ ] Primary color is teal (#006c67), NOT purple
- [ ] Check existing component patterns in `components/hub/`

### Reference Implementation
- [ ] Review bookings feature as gold standard template
- [ ] Check how similar features handle loading/error/empty states
- [ ] Review existing Hub component usage patterns

### Component Rules
- [ ] NO icons or emojis in feature components (use text labels)
- [ ] Use HubEmptyState for empty states
- [ ] Use HubStatsCard for sidebar stats
- [ ] Use HubDetailCard for list items

### Header Pattern
- [ ] Include search input in EVERY page header
- [ ] Use filterStyles.filtersContainer for search + filters
- [ ] Use actionStyles.dropdownContainer for primary + secondary actions

### API Routes
- [ ] Handle missing database tables gracefully (return empty results)
- [ ] Use proper error codes (401, 403, 404, 500)
- [ ] Log errors with feature prefix: `[FeatureName] Error:`

### React Query
- [ ] Apply gold standard config (keepPreviousData, retry, etc.)
- [ ] Use proper query keys with all dependencies
- [ ] Implement loading, error, and success states

### Testing
- [ ] Test with empty data (no sessions, no materials)
- [ ] Test with missing database tables
- [ ] Test loading states
- [ ] Test error states with retry
```

---

*This document reflects production patterns as of February 14, 2026*
*Platform at 98% completion, production-ready*
*Update this document as new patterns emerge*
