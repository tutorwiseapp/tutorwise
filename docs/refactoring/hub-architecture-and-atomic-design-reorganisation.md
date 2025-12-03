# HUB-ARCHITECTURE-AND-ATOMIC-DESIGN-REORGANISATION

**Status:** In Progress

**Date:** December 2, 2025

**Objective:** Restructure `apps/web/src/app/components` into a scalable Atomic Design system separating Core UI, Hub Templates, and Feature Logic.

## 1\. Architectural Philosophy

We are moving from a flat/mixed component structure to a strict three-tier hierarchy:

### 🟢 Tier 1: Core UI (`components/ui/`)

**"The Atoms"**

- **Definition:** Generic, dumb, reusable building blocks.
- **Rules:** Zero business logic. No knowledge of "Tutors" or "Bookings".
- **Sub-directories:** Grouped by function (`actions`, `forms`, `feedback`, `data-display`).

### 🔵 Tier 2: Hub System (`components/hub/`)

**"The Templates"**

- **Definition:** The standardized structural shell of the application. Defines the "TutorWise Look" (Gold Standard).
- **Rules:** Composes Atoms into Layouts. Handles the 3-column grid, sidebars, headers, and list containers.
- **Key Change:** "Sidebar Widgets" are now "Hub Cards".

### 🟠 Tier 3: Features (`components/feature/`)

**"The Organisms"**

- **Definition:** Domain-specific business logic.
- **Rules:** Consumes Atoms and Hub Templates. Connects to API/State.
- **Structure:** One folder per domain (e.g., `bookings`, `listings`).

## 2\. The "Big Rename" & Move Map

This table acts as the **Source of Truth** for the migration.

### A. Sidebar Architecture Refactor

We are standardizing the naming convention for the right-hand column.

| Legacy Component | New Component Name | New Path |
| --- | --- | --- |
| `ContextualSidebar` | **HubSidebar** | `hub/sidebar/HubSidebar.tsx` |
| `SidebarStatsWidget` | **HubStatsCard** | `hub/sidebar/cards/HubStatsCard.tsx` |
| `SidebarActionWidget` | **HubActionCard** | `hub/sidebar/cards/HubActionCard.tsx` |
| `SidebarQuickActionsWidget` | **HubQuickActionsCard** | `hub/sidebar/cards/HubQuickActionsCard.tsx` |
| `SidebarComplexWidget` | **HubComplexCard** | `hub/sidebar/cards/HubComplexCard.tsx` |

### B. UI Atom Categorization

Generic components are moved from root `ui/` to semantic subfolders.

| Component Type | Files Moved | Target Folder |
| --- | --- | --- |
| **Actions** | `Button.tsx`, `IconButton.tsx` | `ui/actions/` |
| **Branding** | `Logo.tsx` (from shared) | `ui/branding/` |
| **Data Display** | `Card.tsx`, `Chip.tsx`, `StatusBadge.tsx`, `PageHeader.tsx`, `DataTable.tsx`, `StatCard.tsx` | `ui/data-display/` |
| **Feedback** | `Modal.tsx`, `ConfirmDialog.tsx`, `Message.tsx`, `ErrorBoundary.tsx`, `VideoModal.tsx` | `ui/feedback/` |
| **Forms** | `Input.tsx`, `Select.tsx`, `Checkbox.tsx`, `Radio.tsx`, `DatePicker.tsx`, `TimePicker.tsx` | `ui/forms/` |
| **Navigation** | `Tabs.tsx`, `Breadcrumb.tsx`, `NavLink.tsx`, `GuanMenuIcon.tsx` | `ui/navigation/` |

### C. Feature Modules

All domain logic moved to `src/app/components/feature/`.

- `bookings/`
- `listings/`
- `profile/`
- `account/`
- `network/`
- `... (and 15 others)`

## 3\. Execution Workflow

### Step 1: Folder Structure Setup

Run the following to establish the new hierarchy:

```
mkdir -p apps/web/src/app/components/ui/{actions,branding,data-display,feedback,forms,navigation}
mkdir -p apps/web/src/app/components/hub/{layout,sidebar/cards,content/HubRowCard,form,styles}
mkdir -p apps/web/src/app/components/feature
mkdir -p apps/web/src/app/components/layout

```

### Step 2: File Migration

(Execute the ZSH move commands detailed in the Implementation Plan to physically move files).

### Step 3: Import Updates (Codemod)

Run the custom Node.js script to update all import paths and rename components in usage.

```
node hub-file-reorganisation-rename.js

```

## 4\. Validation Checklist

Use this to verify the migration before committing:

- \[ \] **Project Builds:** Run `npm run build` (or `pnpm build`).
- \[ \] **No Circular Dependencies:** Check terminal for warnings.
- \[ \] **Sidebar Naming:** Search codebase for `ContextualSidebar`. Should be 0 results (except in this doc).
- \[ \] **Widget Naming:** Search codebase for `SidebarStatsWidget`. Should be 0 results.
- \[ \] **UI Imports:** Check a feature file (e.g., `BookingCard.tsx`). It should import `Button` from `@/components/ui/actions/Button`, not `@/components/ui/Button`.
- \[ \] **CSS Modules:** Verify `hub-actions.module.css` is loading correctly from `hub/styles/`.


The execution files are:
tutorwise/hub-migration-move-files.sh
tutorwise/hub-file-reorganisation-rename.js
docs/hub-architecture-and-atomic-design-reorganisation.md
docs/hub-architecture-migration-guide

