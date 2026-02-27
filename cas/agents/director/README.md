# Director Agent

The **Director Agent** is the strategic decision-maker at the top of the TutorWise CAS (Cloud Agent System) organizational hierarchy. It makes strategic decisions based on organizational vision, values, goals, and business metrics.

## Position in Workflow

**Top-Down Organizational Structure:**

```
START → Director → Planner → Analyst → Developer → Tester → QA → Security → Engineer → Marketer → END
```

The Director is the **first agent** in the workflow, providing strategic oversight before any implementation begins.

## Responsibilities

### 1. Strategic Context Loading
- Reads **organizational vision** from `.ai/0-tutorwise.md`:
  - Vision statement
  - Mission statement
  - 7 Core Values
  - 5 Strategic Goals
  - Strategic Approaches (Emulate, Exploit, Elevate)

- Reads **strategic roadmap** from `.ai/1-roadmap.md`:
  - Project completion status (92%)
  - Beta release date (March 1, 2026)
  - Key metrics (pages, LOC, migrations, components, features)
  - Completed systems
  - In-progress items
  - Critical path to beta

### 2. Feature Alignment Evaluation
Evaluates if a feature aligns with:
- **Core Values:** User-centric, Community, Excellence, Innovation, Frugality, etc.
- **Strategic Goals:** Scalability, Trust, Transparency, Sustainability, Innovation
- Calculates **alignment score** (0-100%)
- Identifies specific values and goals that align

### 3. Resource Priority Assessment
Determines priority based on:
- **Feature Type:** core-system | enhancement | innovation | polish
- **Roadmap Completion:** 92% (beta imminent)
- **Timeline:** Days until beta release
- **Priority Levels:** critical | high | medium | low | deferred

### 4. Strategic Decision Making
Makes one of three decisions:
- **PROCEED:** Feature is aligned and prioritized → Continue to Planner
- **ITERATE:** Low alignment → Revise feature scope
- **DEFER:** Wrong timing or priority → Add to backlog

### 5. Production Metrics Review
Reviews post-launch metrics and recommends:
- **CONTINUE:** Feature exceeds success metrics
- **ITERATE:** Feature shows promise but needs improvement
- **DEPRECATE:** Feature underperforms and should be removed

## Architecture

### Module Structure
```
cas/agents/director/
├── src/
│   ├── index.ts                         # Main Director agent class
│   ├── modules/
│   │   ├── strategic-reader.ts          # Reads .ai/ strategic documents
│   │   └── strategic-decision-maker.ts  # Makes strategic decisions
├── package.json
├── tsconfig.json
└── README.md
```

### Key Classes

#### **DirectorAgent** (Main)
- `getOrganizationalVision()`: Returns vision summary
- `getRoadmapStatus()`: Returns roadmap status summary
- `makeStrategicDecision()`: Makes GO/NO-GO decision on features
- `reviewProductionMetrics()`: Reviews post-launch performance

#### **StrategicReader**
- `readOrganizationalVision()`: Parses `.ai/0-tutorwise.md`
- `readStrategicRoadmap()`: Parses `.ai/1-roadmap.md`

#### **StrategicDecisionMaker**
- `evaluateFeatureAlignment()`: Calculates alignment score
- `assessResourcePriority()`: Determines priority level
- `makeStrategicDecision()`: Combines alignment + priority → decision

## Usage Example

```typescript
import { director } from '@cas/director';

// Get organizational context
const vision = director.getOrganizationalVision();
const roadmap = director.getRoadmapStatus();

// Make strategic decision on a new feature
const decision = director.makeStrategicDecision(
  'AI-powered tutor matching using machine learning',
  'innovation'
);

console.log(decision.decision);      // "PROCEED" | "ITERATE" | "DEFER"
console.log(decision.reasoning);     // Strategic reasoning
console.log(decision.directives);    // Action items
```

## Decision Logic

### Alignment Evaluation
- **Core Value Match:** Check if feature keywords match value themes
- **Strategic Goal Match:** Check if feature advances goals
- **Alignment Score:** `(coreValueMatches / 7) * 50 + (goalMatches / 5) * 50`
- **Threshold:** Minimum 30% alignment required

### Resource Priority Rules

**At 92% Completion (Current State):**
- **Polish features:** CRITICAL priority (beta imminent)
- **Core systems:** CRITICAL if incomplete
- **Enhancements:** MEDIUM (don't delay beta)
- **Innovations:** DEFERRED (post-beta)

**Decision Matrix:**
| Alignment | Priority | Decision |
|-----------|----------|----------|
| Low (<30%) | Any | **ITERATE** (revise scope) |
| Good | Deferred | **DEFER** (post-beta backlog) |
| Good | Critical/High | **PROCEED** (implement now) |
| Good | Medium | **PROCEED** (balanced) |

## Integration with LangGraph Workflow

### PlanningGraph.ts Changes
1. **Added Director Node:**
   - `directorTool`: Wraps Director decision-making
   - `directorNode`: LangGraph node function
   - `routeFromDirector`: Routes based on PROCEED/DEFER

2. **Updated Workflow:**
   - START now points to `director` (was `analyst`)
   - Director → Planner (if PROCEED)
   - Planner now does sprint planning (was at END)
   - Marketer is now final agent (was Planner)

3. **Updated State:**
   - Added `directorDecision` field to PlanningState

### WorkflowVisualizer.tsx Changes
- Added **Director** agent at position 1 (after START)
- Updated **Planner** description to "Sprint planning and roadmap alignment"
- Reordered visual workflow to match implementation

## Example Decision Outputs

### PROCEED Decision
```json
{
  "decision": "PROCEED",
  "reasoning": "Strong alignment (65%) and critical priority.",
  "directives": [
    "Fast-track this feature. Essential for beta quality.",
    "✅ Align with Planner for sprint planning and resource allocation.",
    "📈 Ensure success metrics align with strategic goals: Scalability, Innovation"
  ],
  "alignment": {
    "alignmentScore": 65,
    "coreValueAlignment": ["Champion Innovation", "Focus on the User-centric Experience"],
    "strategicGoalAlignment": ["Scalability", "Innovation"]
  },
  "priority": {
    "priority": "critical",
    "reasoning": "Beta launch in 2 days. Focus on polish and critical fixes."
  }
}
```

### DEFER Decision
```json
{
  "decision": "DEFER",
  "reasoning": "Innovation features should wait until after beta launch (March 1, 2026).",
  "directives": [
    "Defer to post-beta roadmap (Q2 2026).",
    "📅 Add to post-beta backlog with clear success metrics."
  ]
}
```

## Testing

Run the Director agent standalone:

```bash
cd cas/agents/director
npm run build
node -e "const { runDirector } = require('./dist/index.js'); runDirector();"
```

This will:
1. Display organizational vision
2. Display roadmap status
3. Evaluate sample features
4. Review sample production metrics

## Future Enhancements

1. **ML-Based Alignment:** Use embeddings to measure semantic alignment
2. **Historical Analysis:** Learn from past feature success/failure patterns
3. **Automated Backlog Prioritization:** Re-prioritize backlog based on roadmap changes
4. **Multi-Stakeholder Input:** Incorporate feedback from users, investors, advisors
5. **Real-Time Metrics Integration:** Connect to live platform metrics for dynamic decisions

## Related Documentation

- [`.ai/0-tutorwise.md`](../../../.ai/0-tutorwise.md) - Organizational vision
- [`.ai/1-roadmap.md`](../../../.ai/1-roadmap.md) - Strategic roadmap
- [`PlanningGraph.ts`](../../packages/core/src/workflows/PlanningGraph.ts) - LangGraph workflow
- [`WorkflowVisualizer.tsx`](../../packages/core/src/admin/WorkflowVisualizer.tsx) - Visual representation

---

**Version:** 1.0.0
**Created:** 2026-02-27
**Author:** TutorWise CAS Team
