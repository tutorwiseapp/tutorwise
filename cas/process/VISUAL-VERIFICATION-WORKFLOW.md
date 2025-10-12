# CAS Process: Visual Verification Workflow

**Owner:** QA Agent
**Status:** Active
**Version:** 1.0.0

---

## 1. Purpose

To automate the detection of visual regressions and ensure that all new UI components and features adhere strictly to the application's design system. This workflow guarantees that what is developed *looks* correct before it is merged.

This process is a direct response to the "Listing Wizard" incident, where the initial AI-developed feature had significant visual defects (wrong colors, spacing, layout) that were not caught by unit tests.

---

## 2. Trigger

This workflow is triggered when the **Developer Agent** completes a UI-related task and has successfully created the required **Storybook stories** for the new components.

---

## 3. Workflow Steps

### Step 3.1: Storybook Integration

The foundation of this workflow is a comprehensive Storybook implementation. The Developer Agent is required to create stories that cover all states of a component (e.g., default, hover, disabled, with different props).

### Step 3.2: Snapshot Generation

The **QA Agent** will use a visual regression testing tool (e.g., Percy, Chromatic) to process the Storybook stories.

**Process:**
1.  The QA Agent checks out the feature branch.
2.  It runs the visual regression testing command (e.g., `percy snapshot`).
3.  The tool opens a headless browser, renders each Storybook story, and takes a pixel-perfect screenshot (a "snapshot").

### Step 3.3: Baseline Comparison

The newly generated snapshots are compared against the "baseline" snapshots from the `main` branch.

- **If there are no changes:** The visual verification passes.
- **If there are changes:** The tool will highlight the exact pixel differences.

### Step 3.4: Automated Review

The **QA Agent** will analyze the results of the comparison:

1.  **Intentional Changes:** If the feature is new, all snapshots will be new. The QA Agent will automatically approve these as the new baseline.
2.  **Unintentional Changes:** If an existing component has changed visually, the QA Agent will flag this as a potential regression.
3.  **Thresholds:** A small pixel difference threshold (e.g., < 1%) may be tolerated to account for minor rendering variations, but any significant deviation will be treated as a failure.

---

## 4. Output & Gatekeeping

- **Success:** If all visual checks pass, the QA Agent will add a "✅ Visual Verification Passed" status check to the pull request.
- **Failure:** If there are unexpected visual regressions, the QA Agent will:
    1.  Add a "❌ Visual Verification Failed" status check to the pull request.
    2.  **Block the pull request from being merged.**
    3.  Create a new task for the Developer Agent, assigning it back with a report of the visual differences that need to be fixed.

---

## 5. Next Step

- **On Success:** The feature proceeds to the **Tester Agent** for E2E testing.
- **On Failure:** The feature is returned to the **Developer Agent** for rework.
