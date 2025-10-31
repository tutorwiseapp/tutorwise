# Task: Create Logo Component

**Assigned to:** Developer Agent
**Date:** 2025-10-12

## 1. Objective

Create a new, reusable `Logo` React component for the `tutorwise` web application.

## 2. Requirements

- The component should be a simple SVG logo.
- The component must adhere to the standards and patterns defined in the CAS "world model".

## 3. Instructions

1.  **Read the World Model:** Before starting, you must read and understand the following documents:
    *   `cas/docs/codebase-analysis.md`
    *   `cas/docs/design-system.md`
    *   `cas/docs/proven-patterns.md`

2.  **Component Implementation:**
    *   Create a new file at `apps/web/src/app/components/shared/Logo.tsx`.
    *   The component should render an SVG that represents the `tutorwise` logo.
    *   The SVG should use the `primary` color from the design system for its fill color. You should use the CSS variable `var(--color-primary)` for this.

3.  **Styling:**
    *   The component should be styled using CSS Modules. Create a `Logo.module.css` file in the same directory.
    *   The component should not have any hard-coded colors or styles. All styling should be done through CSS classes and the design tokens defined in the design system.

## 4. Acceptance Criteria

- The `Logo.tsx` and `Logo.module.css` files are created in the correct directory.
- The component renders an SVG logo.
- The logo's color is controlled by the `--color-primary` CSS variable.
- The code is clean, well-formatted, and adheres to the project's ESLint rules.
