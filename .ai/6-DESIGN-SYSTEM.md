# Design System

# The Tutorwise Design System
*Version: 2.0*
*Date: February 28, 2026*
*Merged from Engineering Team (v1.0) and CAS Analyst Agent (v1.1) documents, verified against actual codebase.*

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Design Tokens](#2-design-tokens)
3. [File System & Naming Conventions](#3-file-system--naming-conventions)
4. [Shared UI Components](#4-shared-ui-components)
5. [Hub Architecture](#5-hub-architecture)
6. [Layout & Responsive](#6-layout--responsive)
7. [Form Patterns](#7-form-patterns)
8. [Data Tables](#8-data-tables)
9. [Modals & Dialogs](#9-modals--dialogs)
10. [Status Badges & Empty States](#10-status-badges--empty-states)
11. [Gold Standard Page Patterns](#11-gold-standard-page-patterns)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Core Principles

1. **Token-Based Design:** All styles are defined as CSS custom properties in `globals.css`. This is the single source of truth.
2. **CSS Modules:** All component styling uses CSS Modules (`.module.css`). No Tailwind utility classes, no inline styles, no styled-components.
3. **Hub Architecture:** All authenticated pages follow the same HubPageLayout pattern with header, tabs, content, and sidebar.
4. **Composition Over Duplication:** Complex components are built from simple, shared base components (`Card`, `Button`, `Input`, etc.).
5. **Strategic Border Usage:** Interactive elements (cards, inputs, checkboxes) use borders for affordance. Container elements (modals, page wrappers) use shadows and spacing instead.

---

## 2. Design Tokens

All tokens are defined in `apps/web/src/app/globals.css`.

### 2.1 Color System

**Brand Colors (Teal)**

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-primary` | `#006C67` | Primary buttons, links, active states |
| `--color-primary-accent` | `#4CAEAD` | Button backgrounds (`.btn-primary`), secondary accents |
| `--color-primary-accent-dark` | `#3A9B9A` | Button hover state |
| `--color-primary-light` | `#E6F0F0` | Light backgrounds, sidebar widget headers, modal headers |
| `--color-primary-dark` | `#005550` | Hover/pressed states |

**Gray Scale**

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-gray-50` | `#f9fafb` | Light backgrounds |
| `--color-gray-100` | `#f3f4f6` | Subtle backgrounds, dividers |
| `--color-gray-200` | `#e5e7eb` | Standard border color |
| `--color-gray-300` | `#d1d5db` | Empty state icons, disabled borders |
| `--color-gray-400` | `#9ca3af` | Disabled text |
| `--color-gray-500` | `#6b7280` | Secondary text, placeholder |
| `--color-gray-600` | `#4b5563` | Body text |
| `--color-gray-700` | `#374151` | Medium emphasis text |
| `--color-gray-800` | `#1f2937` | Modal titles, headings |
| `--color-gray-900` | `#111827` | Primary text (card titles) |

**Semantic Text Colors**

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-text-primary` | `#202124` | Main body text |
| `--color-text-secondary` | `#5f6368` | Secondary/body text |
| `--color-text-placeholder` | `#9aa0a6` | Placeholder text |

**Background & Border Colors**

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-bg-page` | `#ffffff` | Page background |
| `--color-bg-card` | `#ffffff` | Card backgrounds |
| `--color-bg-box` | `#f5f5f5` | Box backgrounds |
| `--color-border` | `#dfe1e5` | Standard border (cards, inputs) |

**Status Colors**

| Category | Variable | Hex |
|----------|----------|-----|
| Success | `--color-success` | `#34a853` |
| Success | `--color-success-500` | `#10b981` |
| Success | `--color-success-600` | `#059669` |
| Error | `--color-error` | `#d93025` |
| Error | `--color-error-500` | `#ef4444` |
| Error | `--color-error-600` | `#dc2626` |
| Warning | `--color-warning` | `#b06000` |
| Warning | `--color-warning-500` | `#f59e0b` |
| Warning | `--color-warning-600` | `#d97706` |
| Info | `--color-info-500` | `#3b82f6` |
| Info | `--color-info-600` | `#2563eb` |

### 2.2 Typography

**Font Family:** Inter (set via `--font-primary` in `layout.tsx`), sans-serif fallback.

**Font Sizes**

| Variable | Size | Pixels | Usage |
|----------|------|--------|-------|
| `--font-size-xs` | `0.75rem` | 12px | Badges, helper text, footnotes |
| `--font-size-sm` | `0.875rem` | 14px | Labels, secondary text, table cells |
| `--font-size-base` | `1rem` | 16px | Body text, inputs |
| `--font-size-lg` | `1.125rem` | 18px | Section headers |
| `--font-size-xl` | `1.25rem` | 20px | Page subtitles |
| `--font-size-2xl` | `1.5rem` | 24px | Page titles |
| `--font-size-3xl` | `2rem` | 32px | Hero/display titles |

**Font Weights**

| Variable | Value | Usage |
|----------|-------|-------|
| `--font-weight-regular` | 400 | Body text |
| `--font-weight-medium` | 500 | Labels, emphasized text |
| `--font-weight-semibold` | 600 | Headings, important values |
| `--font-weight-bold` | 700 | Page titles |

### 2.3 Spacing (8px Grid)

| Variable | Value | Pixels |
|----------|-------|--------|
| `--space-0` | `0rem` | 0px |
| `--space-1` | `0.5rem` | 8px |
| `--space-2` | `1rem` | 16px |
| `--space-3` | `1.5rem` | 24px |
| `--space-4` | `2rem` | 32px |
| `--space-5` | `3rem` | 48px |
| `--space-6` | `4rem` | 64px |

### 2.4 Border Radius

| Variable | Value | Usage |
|----------|-------|-------|
| `--border-radius-sm` | `4px` | Minimal use |
| `--border-radius-md` | `8px` | **Default** for cards, inputs, modals, buttons |
| `--border-radius-lg` | `16px` | Large containers |
| `--border-radius-full` | `9999px` | Avatars, pills, status badges |

### 2.5 Shadows

| Variable | Value | Usage |
|----------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.04)` | Cards at rest, sidebar widgets |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | Cards on hover, elevated elements |

### 2.6 Button Heights

| Variable | Value | Usage |
|----------|-------|-------|
| `--button-height-standard` | `40px` | **Default** for all buttons |
| `--button-height-compact` | `32px` | Small/icon buttons |
| `--button-height-large` | `48px` | Prominent CTAs |

---

## 3. File System & Naming Conventions

### 3.1 Directory Structure

```
apps/web/src/app/
├── (authenticated)/           # User-facing authenticated routes
│   └── {feature}/
│       ├── page.tsx
│       ├── page.module.css
│       ├── components/        # Feature-specific components
│       └── hooks/
│
├── (admin)/                   # Admin-only routes
│   └── admin/
│       └── {feature}/
│           ├── page.tsx
│           ├── page.module.css
│           ├── components/
│           └── hooks/
│
├── components/
│   ├── hub/                   # Hub architecture (SHARED)
│   │   ├── layout/            # HubPageLayout, HubHeader, HubTabs, HubPagination
│   │   ├── sidebar/           # HubSidebar, sidebar cards
│   │   ├── content/           # HubEmptyState, HubRowCard, HubDetailCard
│   │   ├── data/              # HubDataTable
│   │   ├── charts/            # HubKPICard, HubKPIGrid, HubTrendChart
│   │   ├── form/              # HubForm, HubToggle
│   │   ├── modal/             # HubDetailModal, HubComplexModal
│   │   └── toolbar/           # HubToolbar
│   │
│   ├── ui/                    # Base UI components
│   │   ├── actions/           # Button, VerticalDotsMenu
│   │   ├── forms/             # Input, UnifiedSelect, Checkbox, Radio, FormGroup, ToggleSwitch
│   │   ├── feedback/          # Modal, Message, LoadingSkeleton
│   │   ├── data-display/      # StatusBadge, Card, StatCard, StatGrid, DataTable
│   │   └── navigation/        # Tabs, Breadcrumb, NavLink
│   │
│   ├── admin/                 # Admin-specific shared components
│   │   ├── layout/            # AdminLayout
│   │   ├── sidebar/           # AdminSidebar
│   │   └── widgets/           # AdminStatsWidget, AdminHelpWidget, AdminTipWidget
│   │
│   └── feature/               # Feature-specific shared components
│       └── {feature}/
```

### 3.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | `page.tsx` (Next.js App Router) | `admin/edupay/rules/page.tsx` |
| Page Styles | `page.module.css` | `admin/edupay/rules/page.module.css` |
| Components | PascalCase | `WalletsTable.tsx` |
| Component Styles | PascalCase + `.module.css` | `WalletsTable.module.css` |
| Hooks | camelCase with `use` prefix | `useAdminEduPayMetrics.ts` |
| Constants | UPPER_SNAKE_CASE | `ITEMS_PER_PAGE = 20` |

### 3.3 Component File Structure

```typescript
'use client';

import React, { useState } from 'react';
// External imports
import { useQuery } from '@tanstack/react-query';
// Internal imports - absolute paths
import { HubDataTable } from '@/app/components/hub/data';
import Button from '@/app/components/ui/actions/Button';
// Local imports
import styles from './ComponentName.module.css';

// Types
interface ComponentNameProps { /* ... */ }

// Main component
export default function ComponentName({ prop }: ComponentNameProps) {
  const [state, setState] = useState();
  const { data } = useQuery({ /* ... */ });
  const handleAction = () => { /* ... */ };

  return (
    <div className={styles.container}>
      {/* ... */}
    </div>
  );
}
```

---

## 4. Shared UI Components

### 4.1 Button

**File:** `components/ui/actions/Button.tsx`

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'google';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  href?: string;
  fullWidth?: boolean;
  square?: boolean;
}
```

**Variants:**
- `primary`: `#006C67` background, white text, hover `#005550`
- `secondary`: white background, `#006C67` text/border, hover `#E6F0F0`
- `danger`: transparent, `#c53030` border, hover `#fed7d7`
- `ghost`: transparent, no border
- `google`: `#f3f4f6` background

**Sizes:** `sm` = 32px, `md` = 40px (default), `lg` = 48px

**Usage:**
```tsx
import Button from '@/app/components/ui/actions/Button';

<Button variant="primary" size="sm" onClick={handleAction}>Save</Button>
<Button variant="secondary" onClick={onCancel}>Cancel</Button>
<Button variant="danger" onClick={handleDelete}>Delete</Button>
<Button isLoading>Saving...</Button>
<Button square><Icon size={16} /></Button>
```

### 4.2 Card

**File:** `components/ui/data-display/Card.tsx`

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}
```

**Styles:** White background, `#dfe1e5` border, `8px` radius, `24px` padding, `--shadow-sm`.

### 4.3 Input

**File:** `components/ui/forms/Input.tsx`

```typescript
type InputProps = React.ComponentPropsWithoutRef<'input'> & {
  variant?: 'default' | 'quiet';
};
```

- Height: `44px`
- Border: `#dfe1e5` (default), `#f3f7fa` background (quiet variant)
- Focus: `#006C67` border, `3px rgba(0,108,103,0.1)` shadow

### 4.4 FormGroup

**File:** `components/ui/forms/FormGroup.tsx`

```typescript
interface FormGroupProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  footnote?: string;
  compact?: boolean;
}
```

- Bottom margin: `24px` (or `16px` with `compact`)
- Label: `14px`, weight `500`, secondary text color
- Footnote: `12px`, secondary text, `8px` margin-top

### 4.5 UnifiedSelect

**File:** `components/ui/forms/UnifiedSelect.tsx`

```typescript
interface UnifiedSelectProps {
  options: SelectOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md'; // 28px, 36px, 44px
}
```

Built on Radix UI DropdownMenu.

### 4.6 Modal

**File:** `components/ui/feedback/Modal.tsx`

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
```

- Overlay: `rgba(0,0,0,0.5)`
- Escape key to close, click outside to close
- Border radius: `8px`

### 4.7 StatusBadge

**File:** `components/ui/data-display/StatusBadge.tsx`

```typescript
interface StatusBadgeProps {
  status: string;
}
```

- Shape: Pill (`border-radius: 9999px`), solid background, white text
- Padding: `4px 12px`, font: `12px`, weight `600`
- Colors by status:
  - `statusSignedUp`, `statusBooked`, `statusAccepted` -> `#006C67` (primary)
  - `statusPaid` -> `#34a853` (success green)
  - `statusPending` -> `#fbbc05` (warning yellow, dark text)
  - `statusDeclined`, `statusFailed` -> `#d93025` (error red)
  - Default (`statusOpen`, `statusVisited`, `statusShared`) -> `#5f6368` (secondary gray)

### 4.8 Other UI Components

| Component | File | Key Props |
|-----------|------|-----------|
| `Message` | `ui/feedback/Message.tsx` | `type: 'success' \| 'error' \| 'warning'`, `children` |
| `StatGrid` | `ui/data-display/StatGrid.tsx` | `stats: { title, value, icon }[]` |
| `StatCard` | `ui/data-display/StatCard.tsx` | `title`, `value` (wraps Card) |
| `Checkbox` | `ui/forms/Checkbox.tsx` | 20x20px, `#4CAEAD` when checked |
| `Radio` | `ui/forms/Radio.tsx` | 20x20px circle, `#006C67` when selected |
| `ToggleSwitch` | `ui/forms/ToggleSwitch.tsx` | 44x24px, `#006C67` when checked |
| `Tabs` | `ui/navigation/Tabs.tsx` | `tabs: Tab[]`, `activeTab`, `onTabChange` (underline style) |
| `VerticalDotsMenu` | `ui/actions/VerticalDotsMenu.tsx` | 3-dot action menu for tables |
| `LoadingSkeleton` | `ui/feedback/LoadingSkeleton.tsx` | Shimmer loading states |
| `DataTable` | `ui/data-display/DataTable.tsx` | `columns`, `data`, expandable rows, pagination |

---

## 5. Hub Architecture

### 5.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Global Header                                                       │
├──────────┬──────────────────────────────────────────┬───────────────┤
│          │                                          │               │
│ Sidebar  │  HubPageLayout                          │  HubSidebar   │
│ (240px)  │  ┌────────────────────────────────────┐ │  (320px)      │
│          │  │ HubHeader                           │ │               │
│          │  │ [Title] [Filters] [Actions]         │ │  Stats Widget │
│          │  ├────────────────────────────────────┤ │               │
│          │  │ HubTabs (underline style)           │ │  Help Widget  │
│          │  ├────────────────────────────────────┤ │               │
│          │  │ Content Area                        │ │  Tips Widget  │
│          │  │ - KPI Cards / Charts (overview)    │ │               │
│          │  │ - Card Lists / Tables (list tabs)  │ │  Video Widget │
│          │  │ - Empty States                     │ │               │
│          │  │ - HubPagination                    │ │               │
│          │  └────────────────────────────────────┘ │               │
└──────────┴──────────────────────────────────────────┴───────────────┘
```

### 5.2 Hub Layout Components

| Component | Path | Props |
|-----------|------|-------|
| `HubPageLayout` | `hub/layout/` | `header`, `tabs?`, `children`, `sidebar?`, `fullWidth?` |
| `HubHeader` | `hub/layout/` | `title`, `subtitle?`, `filters?`, `actions?`, `className?` |
| `HubTabs` | `hub/layout/` | `tabs: HubTab[]`, `onTabChange`, `className?` |
| `HubPagination` | `hub/layout/` | `currentPage`, `totalItems`, `itemsPerPage`, `onPageChange` |
| `HubSidebar` | `hub/sidebar/` | `children` |

**HubTab interface:**
```typescript
interface HubTab {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
  href?: string;
}
```

**HubTabs style:** Underline tabs with `border-bottom` indicator (not pill/segmented).

### 5.3 Hub Content Components

| Component | Path | Purpose |
|-----------|------|---------|
| `HubDataTable` | `hub/data/` | Data table with toolbar, filters, pagination |
| `HubEmptyState` | `hub/content/` | Empty state with icon, title, description, CTA |
| `HubRowCard` | `hub/content/` | Card for list views (160px image + content) |
| `HubDetailCard` | `hub/content/` | Card for detail views |
| `HubToolbar` | `hub/toolbar/` | Search, filters, bulk actions |
| `HubKanbanBoard` | `hub/content/` | Kanban/pipeline layout |

### 5.4 Hub Chart Components

| Component | Path | Key Props |
|-----------|------|-----------|
| `HubKPIGrid` | `hub/charts/` | Responsive 3-column grid for KPI cards |
| `HubKPICard` | `hub/charts/` | `label`, `value`, `sublabel?`, `icon?`, `trend?`, `variant?` |
| `HubTrendChart` | `hub/charts/` | Line chart for trends |
| `HubCategoryBreakdownChart` | `hub/charts/` | Pie/donut chart for breakdowns |

**HubKPICard:** Teal header (`#006C67`) with icon + label, large value display, optional trend arrow.

### 5.5 Hub Sidebar Widgets

All sidebar widgets share these standards:
- Header background: `#E6F0F0` (primary-light)
- Header: `14px`, weight `600`, color `#1f2937`, padding `12px 16px`
- Border: `1px solid #e5e7eb`, radius `8px`
- Shadow: `--shadow-sm`

| Widget | Purpose |
|--------|---------|
| `AdminStatsWidget` | Key metrics display |
| `AdminHelpWidget` | FAQ-style Q&A |
| `AdminTipWidget` | Actionable tips list |
| `HubStatsCard` | Statistics (label + value pairs) |
| `HubActionCard` | CTA with button |
| `HubComplexCard` | Rich content (videos, tutorials) |

### 5.6 CSS Custom Properties for Page Overrides

Each page can customize Hub components via CSS custom properties:

```css
.pageHeader {
  --hub-header-margin-top: 1.5rem;
  --hub-header-margin-bottom: 0;
  --hub-header-height: 3rem;
  --hub-header-padding-x: 1rem;
  --hub-header-actions-gap: 0.5rem;
}

.pageTabs {
  --hub-tabs-margin-top: 3rem;
  --hub-tabs-margin-bottom: 1rem;
}

@media (max-width: 767px) {
  .pageHeader { --hub-header-margin-top: 0; }
  .pageTabs { --hub-tabs-margin-top: 0; }
}
```

---

## 6. Layout & Responsive

### 6.1 Breakpoints

| Breakpoint | Value | Layout |
|------------|-------|--------|
| Mobile | `max-width: 768px` | No left sidebar, floating button for right sidebar |
| Tablet | `769px - 1024px` | Narrower sidebars (200px) |
| Desktop | `1025px+` | Full 3-column layout |

### 6.2 Desktop Layout (1024px+)

```css
.layoutWrapper { display: flex; }
.mainArea { flex: 1; display: flex; flex-direction: column; }
.contentContainer { flex: 1; padding: 1rem; padding-bottom: 5rem; }
.sidebarPanel { width: 320px; border-left: 1px solid #e5e7eb; overflow-y: auto; }
```

- Left sidebar (AppSidebar): `240px` fixed
- Content: fluid
- Right sidebar (HubSidebar): `320px` fixed

### 6.3 Mobile Layout (max-width: 1023px)

```css
.sidebarPanel {
  position: fixed; top: 0; right: 0;
  width: 320px; max-width: 90vw; height: 100vh;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
}
.sidebarPanel.sidebarOpen { transform: translateX(0); }

.floatingButton {
  position: fixed; bottom: 80px; right: 16px;
  width: 56px; height: 56px;
  background-color: #006C67; border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

### 6.4 Authenticated Layout

```css
.mainContent {
  flex: 1;
  margin-left: 240px; /* AppSidebar width on desktop */
}
@media (max-width: 768px) { .mainContent { margin-left: 0; } }
@media (min-width: 769px) and (max-width: 1024px) { .mainContent { margin-left: 200px; } }
```

---

## 7. Form Patterns

### 7.1 Standard Form Structure

```tsx
import FormGroup from '@/app/components/ui/forms/FormGroup';
import Input from '@/app/components/ui/forms/Input';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';

<FormGroup label="Field Label" htmlFor="fieldName" footnote="Helper text">
  <Input
    id="fieldName"
    type="text"
    placeholder="Enter value"
    value={formData.fieldName}
    onChange={(e) => setFormData({...formData, fieldName: e.target.value})}
  />
</FormGroup>

<FormGroup label="Select Option">
  <UnifiedSelect
    options={options}
    value={selected}
    onChange={setSelected}
    placeholder="Choose..."
  />
</FormGroup>
```

### 7.2 Form Styling

```css
.formGroup { margin-bottom: 1.5rem; }
.formGroup label {
  display: block; margin-bottom: 0.5rem;
  font-size: 0.875rem; font-weight: 500;
  color: var(--color-text-primary);
}
.formActions {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  margin-top: 2rem; padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}
```

### 7.3 Form Modal Pattern

```tsx
export default function EditItemModal({ isOpen, onClose, item, onSuccess }: Props) {
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (item) setFormData({ /* ... */ }); }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateItem(item.id, formData);
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Item">
      <form onSubmit={handleSubmit}>
        {error && <Message type="error">{error}</Message>}
        <FormGroup label="Field" htmlFor="field1">
          <Input id="field1" value={formData.field1} onChange={...} required />
        </FormGroup>
        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
```

---

## 8. Data Tables

### 8.1 User vs Admin Lists

| Dashboard Type | List Component | Pattern |
|---------------|----------------|---------|
| User Dashboard | Card-based list (e.g. BookingCard) | Card lists, NOT tables |
| Admin Dashboard | HubDataTable with VerticalDotsMenu | Full data tables |

### 8.2 HubDataTable Usage (Admin)

```tsx
import { HubDataTable } from '@/app/components/hub/data';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';

const columns = [
  { key: 'id', label: 'ID', width: '100px', render: (row) => formatId(row.id) },
  { key: 'name', label: 'Name', width: '200px', sortable: true },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  {
    key: 'actions', label: 'Actions', width: '100px',
    render: (row) => (
      <VerticalDotsMenu actions={[
        { label: 'View', onClick: () => handleView(row) },
        { label: 'Edit', onClick: () => handleEdit(row) },
        { label: 'Delete', onClick: () => handleDelete(row), variant: 'danger' },
      ]} />
    ),
  },
];

<HubDataTable
  columns={columns}
  data={items}
  loading={isLoading}
  onRowClick={handleRowClick}
  onRefresh={() => refetch()}
  filters={filters}
  pagination={paginationConfig}
  emptyMessage="No items found."
  searchPlaceholder="Search..."
/>
```

### 8.3 Column Order (Universal)

1. ID (truncated UUID)
2. Created date
3. Primary identifier (name, title)
4. Domain-specific fields
5. Status (StatusBadge)
6. Actions (VerticalDotsMenu) - always last

### 8.4 Admin Multiple Modals Pattern

```tsx
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
const [itemToView, setItemToView] = useState<Item | null>(null);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [itemToEdit, setItemToEdit] = useState<Item | null>(null);

// In VerticalDotsMenu
<VerticalDotsMenu actions={[
  { label: 'View Details', onClick: () => { setItemToView(row); setIsDetailModalOpen(true); } },
  { label: 'Edit', onClick: () => { setItemToEdit(row); setIsEditModalOpen(true); } },
]} />

// Render modals at component bottom
<ItemDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} item={itemToView} />
<EditItemModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} item={itemToEdit} onSuccess={() => { setIsEditModalOpen(false); refetch(); }} />
```

---

## 9. Modals & Dialogs

### 9.1 Base Modal

- Overlay: `rgba(0,0,0,0.5)`
- Border radius: `8px`
- Max-height: `90vh` with scroll
- Close: Escape key, click outside

### 9.2 Hub Modal Variants

**HubDetailModal** (read-only detail view):
- Header: `#E6F0F0` background, `14px` title weight `600`, `12px` subtitle
- Content: `32px` padding, 2-column grid on desktop

**HubComplexModal** (forms, multi-step):
- Header: identical to HubDetailModal
- Content: zero padding (children control spacing)
- Footer: `24px 32px` padding, border-top, right-aligned buttons

### 9.3 Modal Sizes

| Size | Width |
|------|-------|
| `sm` | 400px |
| `md` | 500-600px |
| `lg` | 640-800px |
| `xl` | 1000px |

---

## 10. Status Badges & Empty States

### 10.1 StatusBadge

Pill-shaped (`border-radius: 9999px`), solid colored backgrounds, white text. See Section 4.7 for full color mapping.

### 10.2 Empty States

**Full-page empty state (`HubEmptyState`):**
```tsx
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { FileText } from 'lucide-react';

<HubEmptyState
  icon={<FileText size={48} />}
  title="No items found"
  description="Get started by creating your first item."
  actionLabel="Create Item"
  onAction={() => setShowCreateModal(true)}
/>
```

**Empty state variants:**
- No data: "No {items} yet" + "Get started by..." + Create CTA
- No results: "No results found" + "Try different keywords." + optional "Clear Filters"
- Error: "Something went wrong" + error message + "Try Again"

**Inline empty state** (for kanban columns, sub-sections):
- No background, minimal padding (`2.5rem 1rem`), centered
- Icon: `32-40px`, color `#d1d5db`
- Text: `14px`, color `#6b7280`

---

## 11. Gold Standard Page Patterns

### 11.1 User Dashboard Page

**Reference:** `apps/web/src/app/(authenticated)/network/page.tsx`

```tsx
<HubPageLayout
  header={
    <HubHeader
      title="Network & Connections"
      filters={
        <div className={filterStyles.filtersContainer}>
          <input type="search" placeholder="Search..." value={searchQuery} onChange={...} />
          <UnifiedSelect options={sortOptions} value={sortBy} onChange={setSortBy} />
        </div>
      }
      actions={<Button variant="primary" onClick={handleAdd}>+ Add</Button>}
    />
  }
  tabs={
    <HubTabs
      tabs={[
        { id: 'all', label: 'All', count: totalCount, active: activeTab === 'all' },
        { id: 'pending', label: 'Pending', count: pendingCount, active: activeTab === 'pending' },
      ]}
      onTabChange={setActiveTab}
    />
  }
  sidebar={
    <HubSidebar>
      <StatsWidget {...stats} />
      <HelpWidget />
    </HubSidebar>
  }
>
  {paginatedItems.length === 0 ? (
    <HubEmptyState title="No items" description="..." actionLabel="Create" onAction={...} />
  ) : (
    <>
      <div className={styles.grid}>
        {paginatedItems.map(item => <ItemCard key={item.id} {...item} />)}
      </div>
      <HubPagination currentPage={currentPage} totalItems={filteredItems.length}
        itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
    </>
  )}
</HubPageLayout>
```

**Key patterns:**
- User dashboards use **card-based lists**, not tables
- URL-based tab filtering (`?tab=` or `?filter=`)
- Wrap page content in `<Suspense>` for `useSearchParams`
- Use `paginatedItems` in map, not `filteredItems`
- Reset pagination when filters change

### 11.2 React Query Configuration (Mandatory)

```typescript
const { data, isLoading, isFetching, error, refetch } = useQuery({
  queryKey: ['resource', profile?.id, currentTab],
  queryFn: fetchFunction,
  enabled: !!profile?.id,
  placeholderData: keepPreviousData,
  staleTime: 30_000,
  gcTime: 10 * 60_000,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
});
```

### 11.3 Admin Dashboard Page

**Key differences from user dashboard:**

| Aspect | User Dashboard | Admin Dashboard |
|--------|---------------|-----------------|
| List display | Card-based lists | HubDataTable |
| Sidebar | AppSidebar | AdminSidebar |
| Route prefix | `/(authenticated)/{feature}` | `/(admin)/admin/{feature}` |
| Tab behavior | URL-based (`?tab=`) | State-based or navigation |
| Caching | `staleTime: 30s` | `force-dynamic` |
| Actions | User-level | Admin (view, edit, delete, bulk) |

**Admin page types:**
1. **Overview + Tabs** (state-based): `activeTab` state switches content within page
2. **Navigation Tabs**: `router.push()` navigates to sub-pages

```typescript
// Force dynamic for admin pages
export const dynamic = 'force-dynamic';
```

### 11.4 Public Profile Page

Server-rendered with ISR:
- `generateMetadata()` for SEO
- Parallel server-side data fetching with `Promise.all()`
- Resilient URLs: `/public-profile/[id]/[[...slug]]` (lookup by ID, redirect if slug wrong)
- `revalidate = 300` (5 min for profiles), `180` (3 min for listings)

### 11.5 Loading & Error States (Mandatory)

```typescript
// Loading - dedicated skeleton component
if (isLoading) return <FeatureSkeleton variant="list" count={3} />;

// Error - dedicated error component
if (error) return <FeatureError error={error} onRetry={() => refetch()} />;

// Empty state
{paginatedItems.length === 0 && <HubEmptyState title="No items" ... />}
```

---

## 12. Implementation Checklist

### New Page

- [ ] Use `HubPageLayout` with header, tabs, sidebar
- [ ] Create `page.module.css` with Hub CSS custom properties
- [ ] Implement `HubTabs` (required on all pages)
- [ ] Add sidebar widgets (stats, help, tips)
- [ ] Handle loading, error, and empty states
- [ ] Test responsive (mobile, tablet, desktop)
- [ ] Add to navigation sidebar

### New Data Table (Admin)

- [ ] Define columns following universal order (ID, Created, Name, ..., Status, Actions)
- [ ] Use `VerticalDotsMenu` for row actions
- [ ] Configure filters and pagination
- [ ] Add empty state message
- [ ] Test column hiding on mobile/tablet

### New Modal

- [ ] Choose appropriate size (sm/md/lg/xl)
- [ ] Handle form validation and loading state
- [ ] Reset form on close
- [ ] Escape key and click-outside close

### New Feature

- [ ] Create feature folder with `page.tsx`, `page.module.css`, `components/`, `hooks/`
- [ ] Create main page with tabs
- [ ] Create card/table component for list view
- [ ] Create CRUD modals
- [ ] Add to sidebar navigation

---

## Appendix: Component Import Quick Reference

```tsx
// Hub Layout
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';

// Hub Content
import { HubDataTable } from '@/app/components/hub/data';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';

// Hub Charts
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts';

// UI Components
import Button from '@/app/components/ui/actions/Button';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import Modal from '@/app/components/ui/feedback/Modal';
import StatusBadge from '@/app/components/ui/data-display/StatusBadge';
import Input from '@/app/components/ui/forms/Input';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import Card from '@/app/components/ui/data-display/Card';

// Admin Widgets
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
```

---

**End of Design System Documentation**
