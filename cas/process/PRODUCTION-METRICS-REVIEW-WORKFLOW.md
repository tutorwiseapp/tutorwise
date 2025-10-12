# CAS Process: Production Metrics Review

**Owner:** Marketer Agent (as facilitator)
**Status:** Active
**Version:** 1.0.0

---

## 1. Purpose

To "close the loop" on the development cycle by measuring the real-world impact of a deployed feature against its original goals. This workflow transforms CAS from a feature factory into a data-driven, learning system focused on delivering value, not just code.

---

## 2. The Review Team (The "Amigos" Reconvene)

1.  **The "Measure" Lead:** The **Marketer Agent**. It gathers and presents the production data.
2.  **The "Did it Work?" Analyst:** The **Analyst Agent**. It compares the data against the original success metrics.
3.  **The "Is it Healthy?" Engineer:** The **Developer Agent**. It assesses the feature's technical performance in production.

---

## 3. Trigger

This workflow is automatically triggered **7 days after the Engineer Agent confirms a feature has been successfully deployed to production**.

---

## 4. Workflow Steps

### Step 4.1: Gather Production Data

The **Marketer Agent** gathers quantitative and qualitative data for the feature.

- **Quantitative Data:**
    - Feature adoption rates (e.g., % of users who have used the feature).
    - Funnel conversion metrics (if applicable).
    - User engagement statistics (e.g., time spent, frequency of use).
    - A/B test results.
- **Qualitative Data:**
    - User feedback from surveys or support channels.
    - Positive/negative mentions in support tickets.

The output is a **Production Performance Report**.

### Step 4.2: Asynchronous Review

The Marketer Agent shares the report with the Analyst and Developer agents.

#### **Analyst Agent's "Impact Review"**
- Compares the production metrics against the **Success Metrics** defined in the original Feature Brief.
- **Answers the question: "Did we achieve the business goal?"**
- Provides a summary of "Goal vs. Reality."

#### **Developer Agent's "Technical Health Review"**
- Reviews monitoring dashboards and error logs for the feature.
- **Answers the question: "Is the feature performing well technically?"**
- Reports on any new errors, performance bottlenecks, or unexpected technical behavior.

### Step 4.3: Synthesize and Recommend

The **Marketer Agent** synthesizes the findings from all three perspectives into a single **Feature Impact Summary** and provides a recommendation.

**Recommendation Categories:**
- **SUCCESS:** The feature met or exceeded its goals.
- **ITERATE:** The feature is valuable but can be improved.
- **REMOVE:** The feature failed to meet its goals and is not being used.

### Step 4.4: Strategic Decision

The **Planner Agent** receives the Feature Impact Summary and makes the final strategic decision.

- **If SUCCESS:** The Planner archives the report and documents the key learnings.
- **If ITERATE:** The Planner creates a new, prioritized task in the backlog for the Analyst to begin the workflow on an improved version.
- **If REMOVE:** The Planner creates a new task to properly deprecate and remove the feature.

---

## 5. Output

- A **Feature Impact Summary** document.
- A final strategic decision from the Planner Agent.
- Potentially, new tasks added to the backlog for iteration or removal.

---

## 6. Next Step

The development loop is now closed. The insights from production are used to feed the next cycle of development, ensuring CAS is continuously improving the product based on real user data.
