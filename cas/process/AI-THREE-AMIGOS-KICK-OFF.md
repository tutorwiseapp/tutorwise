# CAS Process: AI Three Amigos Kick-off

**Owner:** Analyst Agent (as facilitator)
**Status:** Active
**Version:** 1.0.0

---

## 1. Purpose

To ensure a shared understanding of a feature's requirements, implementation plan, and testing strategy *before* development begins. This workflow is a form of **defect prevention** that "shifts quality left" by identifying ambiguities, technical challenges, and edge cases at the earliest possible stage.

It is an automated implementation of the agile "Three Amigos" concept.

---

## 2. The Three Amigos (The Participants)

1.  **The Business Amigo (The "What"):** The **Analyst Agent**. It owns the Feature Brief and represents the business and user needs.
2.  **The Development Amigo (The "How"):** The **Developer Agent**. It represents the technical implementation and feasibility.
3.  **The Testing Amigo (The "What If"):** The **Tester Agent**. It represents quality, edge cases, and testability.

---

## 3. Trigger

This workflow is triggered automatically when the **Analyst Agent** completes the first draft of a **Feature Brief**.

---

## 4. Workflow Steps

### Step 4.1: Publish the Draft Feature Brief

The Analyst Agent publishes the draft brief to a designated "review" area (e.g., a specific directory or a status in a tracking system).

### Step 4.2: Asynchronous Review by the Amigos

The Developer and Tester agents are automatically notified and begin their asynchronous review of the brief.

#### **Developer Agent's "Feasibility Review"**
The Developer Agent analyzes the brief and produces a **Feasibility Report**, answering:
- **Technical Feasibility:** Is the feature buildable with the current tech stack?
- **Pattern Clarity:** Are the "Proven Patterns & Constraints" clear and sufficient?
- **Component Plan:** What new components will need to be built vs. what existing components can be reused?
- **Data Model:** Are the data requirements clear?
- **Blockers:** Are there any immediate technical blockers or dependencies?

#### **Tester Agent's "Testability Review"**
The Tester Agent analyzes the brief and produces a **Testability Report**, answering:
- **Criteria Clarity:** Are the acceptance criteria specific, measurable, and testable?
- **E2E Test Plan:** What is the high-level plan for the end-to-end test script? (e.g., "1. Navigate to page. 2. Fill form. 3. Verify submission.")
- **Edge Cases:** What are the potential edge cases? (e.g., invalid input, API errors, empty states, user permissions).
- **Test Data:** What specific test data will be required?

### Step 4.3: Synthesize Feedback & Update Brief

The **Analyst Agent** (acting as facilitator) collects the Feasibility and Testability reports.
- It automatically synthesizes the feedback.
- It updates the Feature Brief to incorporate the clarifications, new edge cases, and technical notes.

### Step 4.4: Conflict Resolution & Escalation

- If the feedback is straightforward, the brief is updated, and the process moves to the next step.
- If a major conflict arises (e.g., the Developer reports a major technical blocker), the Analyst **escalates the issue to the Planner Agent**. The Planner will then decide whether to de-scope the feature, find an alternative solution, or escalate further to the human-in-the-loop.

### Step 4.5: Final Sign-off

Once the brief is updated and all conflicts are resolved, all three agents provide a digital "sign-off," confirming they have a shared understanding of the feature.

---

## 5. Output & Gatekeeping

- **Output:** A final, signed-off **Feature Brief** that has been vetted from the business, development, and testing perspectives.
- **Gate:** The feature **cannot** be passed to the Planner Agent for scheduling until it has received the sign-off from all three amigos.

---

## 6. Next Step

The signed-off Feature Brief is passed to the **Planner Agent**, which can now confidently add the feature to the development queue, knowing that it is well-understood and ready for implementation.
