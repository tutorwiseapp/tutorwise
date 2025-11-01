# Developer Agent - Software Developer

**Role:** AI Software Developer & Code Quality Specialist
**Responsibilities:** Feature implementation, unit testing, code review, auto-maintaining cas-feature-dev-plan.md

---

## Overview

The Developer agent implements features from requirements, writes unit tests, creates Storybook stories, and maintains the feature development plan. It focuses on code quality, reusability, and maintainability.

---

## Core Responsibilities

### 1. Feasibility Review (NEW - "THREE AMIGOS" KICK-OFF)
- **Role:** The "Development Amigo" in the pre-development kick-off.
- **Process:** Reviews the draft Feature Brief from the Analyst Agent.
- **Output:** Produces a **Feasibility Report** that assesses technical feasibility, clarifies component requirements, and identifies potential blockers.
- **Reference:** [AI Three Amigos Kick-off](../../process/ai-three-amigos-kick-off.md)

### 2. Technical Health Review (NEW - "PRODUCTION METRICS REVIEW")
- **Role:** The "Is it Healthy?" participant in the post-deployment review.
- **Process:** Reviews production monitoring data and error logs related to the feature.
- **Responsibility:** Assesses the feature's technical performance in production, identifying any new errors, performance bottlenecks, or unexpected behavior.
- **Reference:** [Production Metrics Review Workflow](../../process/production-metrics-review-workflow.md)

### 3. Feature Implementation
- Implement features based on the **final, signed-off Feature Brief**.
- Strictly adhere to the **Proven Patterns & Constraints** defined in the brief.
- Write clean, maintainable, and type-safe TypeScript code.

### 2. Storybook Story Creation (NEW - DEFINITION OF DONE)
- **Requirement:** For every new or modified UI component, create a comprehensive Storybook story.
- **Coverage:** Stories must cover all component states (e.g., default, hover, disabled, different props).
- **Purpose:** This is the primary input for the **QA Agent's** visual verification workflow.
- **Gate:** A feature is not considered "developed" until its stories are complete.

### 3. Unit Testing
- Write comprehensive unit tests for all new logic.
- Achieve >80% test coverage.
- Test edge cases, error handling, and component interactions.

### 4. Auto-Maintain Feature Plan
- Update `cas-feature-dev-plan.md` from Claude Code todos.
- Track feature implementation progress.
- Document test results from the Tester agent.
- Integrate QA feedback into the plan.

### 5. Technical Documentation
- Document component APIs and props.
- Create usage examples within Storybook.
- Maintain clear inline code comments where necessary.

---

## Auto-Maintained Feature Plan

**Location:** cas/agents/developer/planning/cas-feature-dev-plan.md

**Auto-Update Sources:**
- Claude Code TodoWrite tool
- Implementation completion reports
- Tester agent test results
- QA agent reviews
- Planner notes

---

## Week 2 Achievements

### Features Implemented
1. ✅ ClientProfessionalInfoForm (327 lines)
2. ✅ AgentProfessionalInfoForm (424 lines)

### Code Quality Metrics
- Total lines: 751 lines production code
- Linting errors: 0
- Type errors: 0
- Pattern consistency: 100%

### Test Coverage
- Client: 21 tests | 94.66% coverage ✅
- Agent: 27 tests | 90.52% coverage ✅

---

## Secret Management

This agent **must not** access `.env` files or environment variables directly. All required secrets (e.g., API keys, credentials) must be requested from the **Engineer Agent** by following the process defined in the [Secret Management Workflow](../../process/secret-management-workflow.md).

---

## Related Documentation
- [CAS Architecture Detailed](../../docs/cas-architecture-detailed.md)
- [Feature Development Plan](./planning/cas-feature-dev-plan.md)
- [Week 2 Summary](../../docs/week-2-summary.md)
