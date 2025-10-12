# CAS Process: Contextual Analysis Workflow

**Owner:** Analyst Agent
**Status:** Active
**Version:** 1.0.0

---

## 1. Purpose

To prevent the development of features that are architecturally inconsistent or violate the established design system of the target application. This workflow ensures that every new feature is built with a deep understanding of existing, proven patterns within the codebase.

This process is a direct response to the "Listing Wizard" incident, where a feature was functionally developed but contextually incorrect, leading to significant rework.

---

## 2. Trigger

This workflow is triggered by the **Planner Agent** when it assigns a new feature development task to the **Analyst Agent**.

---

## 3. Workflow Steps

### Step 3.1: Identify Analogous Features

The Analyst Agent will first search the target codebase for existing features that are functionally or structurally similar to the requested feature.

**Methodology:**
- **Keyword Analysis:** Use keywords from the task description (e.g., "wizard," "form," "table," "dashboard").
- **Directory Scanning:** Scan relevant directories (e.g., `apps/web/src/app/components/`) for components with matching names.
- **Code Search:** Use `grep` or a similar tool to search for code patterns related to the feature.

**Example:** For a "new listing wizard," the Analyst would identify the "onboarding wizard" as the primary analogous feature.

### Step 3.2: Extract Proven Patterns

Once an analogous feature is identified, the Analyst Agent will extract its core architectural and design patterns. This is a critical step to ensure consistency.

**Patterns to Extract:**
1.  **Layout System:** How is the feature's top-level component rendered? Does it use a CSS module, a specific wrapper component, or utility classes? (e.g., `div className={styles.pageWrapper}`).
2.  **Design System:**
    *   **Color Palette:** Identify the primary (e.g., `teal-600`) and secondary colors used.
    *   **Typography:** Document the font sizes, weights, and styles for headings, paragraphs, and labels.
    *   **Spacing:** Identify the spacing scale used (e.g., 8px-based, `mb-4`, `space-y-8`).
3.  **Component Usage:** List the core, reusable components that the feature is built from (e.g., `<Button>`, `<Input>`, `<ProgressDots>`).
4.  **State Management:** How is state managed? (e.g., `useState`, `useReducer`, a state management library).

### Step 3.3: Generate the Feature Brief

The output of this workflow is an enhanced **Feature Brief** that will be passed to the Developer Agent. This document is the blueprint for development.

**Feature Brief Structure:**
- **1. Overview:** The user story and acceptance criteria.
- **2. Requirements:** The functional requirements.
- **3. Proven Patterns & Constraints:** (This is the new, critical section)
    - **Analogous Feature:** (e.g., `apps/web/src/app/onboarding/`)
    - **Layout:** Must use the CSS module pattern from the analogous feature.
    - **Colors:** Primary action color must be `teal-600`.
    - **Typography:** `h1` must be `text-4xl font-bold`.
    - **Spacing:** Must adhere to the 8px-based spacing scale.
    - **Required Components:** Must use the shared `<Button>` and `<ProgressDots>` components.

---

## 4. Output

A comprehensive **Feature Brief** document that is saved in the `cas/agents/analyst/research/` directory.

---

## 5. Next Step

The Feature Brief is passed to the **Developer Agent**, which now has all the context needed to build the feature correctly the first time.
