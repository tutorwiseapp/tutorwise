# Process Studio — Solution Design

**Version:** 2.0
**Date:** March 1, 2026
**Owner:** Michael Quan
**Status:** Approved — Key Decisions Resolved

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-01 | Michael Quan | Initial solution design with Fuchsia porting plan |
| 1.1 | 2026-03-01 | Michael Quan | Renamed Workflow Builder → Process Studio |
| 1.2 | 2026-03-01 | Michael Quan | Added Supabase Realtime for V1 canvas updates |
| 1.3 | 2026-03-01 | Michael Quan | Fixed layout diagram (toolbar top), component naming |
| 1.4 | 2026-03-01 | Michael Quan | Fixed Section 4.2 WebSocket inconsistency |
| 2.0 | 2026-03-01 | Michael Quan | Design system alignment, accessibility, error handling, state management, operational standards |

---

## 1. Executive Summary

The Process Studio is the **unified visual workflow design tool** for the TutorWise platform. It enables admins to visualize, design, edit, and export the platform's operational workflows — bookings, listings, referrals, user onboarding, and any future processes — using a combination of AI-powered generation and interactive visual editing.

TutorWise's platform workflows have been designed and iterated using AI and documentation throughout development. The Process Studio makes these workflows **visible, editable, and shareable** — turning implicit process knowledge into interactive, exportable process maps that anyone (not just developers) can understand and modify.

The feature draws architectural patterns from the Fuchsia enterprise automation platform (visual workflow designer, chat-driven canvas updates) and builds on TutorWise's existing CAS admin infrastructure (ReactFlow components, Supabase persistence, admin dashboard patterns).

---

## 2. Requirements

### 2.1 Functional Requirements

From `process-studio-requirements.md`:

| # | Requirement | Description |
|---|-------------|-------------|
| R1 | AI Auto-Visualize | The AI agent reads a process map and visualizes it automatically in near real-time |
| R2 | Chat UI Editing | The user edits the process using a Chat UI, with manual save and PDF export |
| R3 | Visual UI Editing | The user edits the process using a Visualizer UI, with manual save and PDF export |

**Constraint:** The feature can be a new component or an extension of the existing WorkflowVisualizer component.

### 2.2 Platform Context — Why This Matters

TutorWise is an EdTech platform connecting tutors, students, and organisations. The platform has several core operational workflows that have been designed and refined using AI throughout development:

| Platform Workflow | Current State | What the Builder Enables |
|---|---|---|
| **Booking Workflow** | Designed in code/docs via AI | Visualize the full flow: search → select tutor → book → pay → confirm → attend → review. Edit steps, add approval gates, export for stakeholders |
| **Listing Workflow** | Designed in code/docs via AI | Map the pipeline: create listing → set pricing → add media → publish → search indexing → discovery. Modify steps visually |
| **Referral Workflow** | Designed in code/docs via AI | Visualize triggers, validation, reward distribution. Add conditions, modify reward logic visually |
| **User Onboarding** | Designed in code/docs via AI | Map the journey: signup → email verify → profile setup → preferences → first search → first booking. Identify drop-off points |
| **Tutor Onboarding** | Designed in code/docs via AI | Organisation-specific flow: apply → background check → credential verify → platform training → first session → review |
| **CAS Agent Pipeline** | Exists in WorkflowVisualizer | Cross-reference: the Builder designs processes, the Visualizer monitors CAS execution |
| **Future Workflows** | Not yet designed | Build any new process from scratch via canvas, AI chat, or templates |

### 2.3 Key Benefits

1. **Visibility** — Platform workflows move from implicit code/docs into interactive visual maps that non-technical stakeholders can understand
2. **Editability** — Product managers and admins can propose workflow changes visually, without needing to read code
3. **Documentation** — PDF export creates professional process documentation for compliance, onboarding, and investor materials
4. **AI-Assisted Design** — Describe a new workflow in natural language, AI generates the initial process map, then refine visually or via chat
5. **Standardization** — Templates establish best-practice workflows that can be reused across the platform
6. **Iteration Speed** — Modify workflows faster than editing code — try different approaches, compare, export the best one

---

## 3. Key Decisions (Resolved)

### 3.1 Process Map Input Scope

**Decision:** Text-first, multi-modal input — dynamic like the visualizer.

**What Fuchsia uses (7 input methods):**

| Method | Fuchsia Implementation | V1 Adoption |
|--------|----------------------|-------------|
| Chat text → YAML generation | `chat.py` sends user text to OpenAI, gets YAML back | Yes — core of R1, using Gemini + JSON (not YAML) |
| Intent detection → template match | `intent_agent.py` (DSPy) classifies intent, loads matching template | Yes — Gemini structured output replaces DSPy; same capability, simpler implementation |
| Template selection dialog | `WorkflowDesigner.tsx` — grid of templates from DB + localStorage | Yes — template selector modal |
| File upload (JSON/YAML) | `templateService.loadTemplateFromFile()` — accepts .json/.yaml | Yes — JSON import |
| Manual canvas building | `addNewNode()` + drag-and-drop + connect | Yes — core of R3 |
| AI canvas update (WebSocket) | `canvasUpdateService.ts` — YAML via WebSocket during execution | Yes — real-time canvas updates during AI generation and chat mutations via Supabase Realtime |
| Zapier-style sequential steps | `CanvasComponent.tsx` — vertical step builder | No — ReactFlow handles linear flows natively; ChatPanel serves as the "simple mode" for non-technical users. Two canvas modes doubles maintenance without clear benefit for admin users |

**Key insight:** Fuchsia has **no image/PDF-to-workflow conversion**. All inputs are text-based or template-based.

**V1 input methods (in priority order):**
1. Text description → AI auto-visualize (R1)
2. Template selection (pre-built onboarding processes)
3. Manual canvas building (drag, connect, edit) (R3)
4. Chat-based modification of existing workflow (R2)
5. JSON file import

**P2 enhancement:** PDF/image → workflow using Gemini vision API.

### 3.2 Location — Admin Dashboard

**Decision:** `/admin/process-studio` — separate admin page, not a CAS tab.

**Rationale:**
- Auth + RBAC infrastructure already exists at admin level
- Distinct from CAS (different domain: process mapping vs agent orchestration)
- Layout and permission patterns are proven
- Future: expose at top-level `/process-studio` when ready for non-admin users

### 3.3 Build Approach — Incremental

**Decision:** Build in phases: R3 (visual editor) → R1 (AI auto-visualize) → R2 (chat editing).

The visual editor is the foundation. AI generation and chat editing both produce the same output (nodes + edges), so the canvas must exist first.

### 3.4 Porting Strategy — Fuchsia → TutorWise

**Decision:** Port patterns and architecture, not raw code. Detailed porting plan in Section 13.

**Rationale:** Fuchsia uses a different stack (React+Vite+FastAPI+SQLAlchemy+OpenAI+Zustand) vs TutorWise (Next.js+Supabase+Gemini+React hooks). Direct code copy would create technical debt. Instead, we port the proven patterns into TutorWise's conventions.

---

## 4. Architecture Overview

### 4.1 High-Level Layout

The page uses `HubPageLayout` with a `HubHeader` (title, breadcrumbs) and `HubTabs` (underline style) for switching between "Design" and "Templates" views. The 3-column workspace is the content area of the Design tab.

```
┌──────────────────────────────────────────────────────────────────┐
│  HubHeader: Process Studio        [Breadcrumb: Admin > PS]      │
│  HubTabs: [Design] [Templates]                                  │
├──────────────────────────────────────────────────────────────────┤
│                     Design Tab Content                           │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Toolbar: Save | Export PDF | Import | Clear | Undo | Redo   ││
│  │ [Process Name]                    3 steps · 2 connections   ││
│  └──────────────────────────────────────────────────────────────┘│
│  ┌────────────┐  ┌──────────────────────────┐  ┌─────────────┐  │
│  │            │  │                          │  │             │  │
│  │  Chat      │  │   ReactFlow Canvas       │  │ Properties  │  │
│  │  Panel     │  │                          │  │ Drawer      │  │
│  │            │  │   ┌─────┐    ┌─────┐     │  │             │  │
│  │  User:     │  │   │Start├───→│ HR  │     │  │ Node Label  │  │
│  │  "Add IT   │  │   └─────┘    └──┬──┘     │  │ Type        │  │
│  │   setup    │  │                 │        │  │ Description │  │
│  │   after    │  │              ┌──▼──┐     │  │ Objective   │  │
│  │   orient-  │  │              │ IT  │     │  │ Completion  │  │
│  │   ation"   │  │              │Setup│     │  │  Criteria   │  │
│  │            │  │              └──┬──┘     │  │ Expected    │  │
│  │  AI:       │  │                 │        │  │  Outputs    │  │
│  │  "Added    │  │              ┌──▼──┐     │  │             │  │
│  │   IT Setup │  │              │End  │     │  │ [Save]      │  │
│  │   step..." │  │              └─────┘     │  │ [Delete]    │  │
│  │            │  │                          │  │             │  │
│  └────────────┘  └──────────────────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Architecture

```
ProcessStudio
├── Toolbar                      (R2 + R3 — global actions)
│   ├── SaveButton
│   ├── ExportPDFButton
│   ├── ImportButton
│   ├── ClearButton
│   ├── UndoButton
│   └── RedoButton
│
├── ChatPanel                    (R2 — natural language editing)
│   ├── MessageList              (chat history display)
│   ├── MessageInput             (user input + send)
│   └── SuggestionChips          (quick actions)
│
├── ProcessStudioCanvas          (R1 + R3 — visual editing)
│   ├── ProcessStepNode          (custom ReactFlow node)
│   ├── DecisionNode             (conditional branching)
│   ├── MiniMap                  (navigation)
│   ├── Controls                 (zoom/pan)
│   └── Background               (grid)
│
└── PropertiesDrawer             (R3 — node detail editing)
    ├── NodeLabelInput
    ├── NodeTypeSelect
    ├── DescriptionTextarea
    ├── ObjectiveInput
    ├── CompletionCriteriaList
    └── ExpectedOutputsList
```

### 4.3 Data Flow

```
┌─────────────┐     ┌───────────────────┐     ┌─────────────────┐
│ Process Map  │────→│ AI Parser API     │──┐  │ ReactFlow State │
│ (text/file)  │     │ (Gemini)          │  │  │ (nodes + edges) │
└─────────────┘     └───────────────────┘  │  └────────┬────────┘
                                            │           │
┌─────────────┐     ┌───────────────────┐  │           │
│ Chat Input   │────→│ AI Mutation API   │──┤           │
│ (user msg)   │     │ (Gemini)          │  │           │
└─────────────┘     └───────────────────┘  │           │
                                            │           │
                    ┌───────────────────┐  │           │
                    │ Supabase Realtime  │←─┘           │
                    │ (broadcast channel)│──────────────┤
                    └───────────────────┘               │
                                                        │
┌─────────────┐                                        │
│ Visual Edit  │───────────────────────────────────────┤
│ (drag/click) │                                        │
└─────────────┘                                        │
                                                        ▼
                    ┌───────────────────┐     ┌─────────────────┐
                    │ Supabase          │←────│ Save Action     │
                    │ (persistence)     │     │ (manual)        │
                    └───────────────────┘     └─────────────────┘
                                                        │
                    ┌───────────────────┐              │
                    │ PDF Export        │←──────────────┘
                    │ (html-to-image +  │
                    │  jsPDF)           │
                    └───────────────────┘
```

**Real-time flow:** AI API routes broadcast canvas updates via Supabase Realtime channels. The frontend subscribes to the channel and applies mutations as they arrive — enabling streaming AI generation where nodes appear on the canvas progressively rather than all at once after the API completes.

---

## 5. Existing Infrastructure Analysis

### 5.1 TutorWise — What We Can Reuse

| Component | Location | Reusable For |
|-----------|----------|-------------|
| `WorkflowVisualizer` | `cas/packages/core/src/admin/WorkflowVisualizer.tsx` | Base canvas, AgentNode pattern, drawer, toolbar, layout persistence |
| `WorkflowVisualizerAdvanced` | `cas/packages/core/src/admin/WorkflowVisualizerAdvanced.tsx` | PNG/SVG/JSON export, Supabase persistence, custom node types |
| `PlanningGraphDashboard` | `cas/packages/core/src/admin/PlanningGraphDashboard.tsx` | Dashboard wrapper pattern, demo execution |
| CAS Admin Page | `apps/web/src/app/(admin)/admin/cas/page.tsx` | Tab structure, permission checks, Supabase Realtime |
| Fullscreen Layout | `apps/web/src/app/(fullscreen)/workflow-fullscreen/` | Auth-protected fullscreen pattern |
| RBAC Hooks | `apps/web/src/lib/rbac/hooks.ts` | Permission gating (`usePermission`) |

**Key ReactFlow patterns already established:**
- `useNodesState` / `useEdgesState` for state management
- Custom node components with `Handle` positioning
- Layout persistence (localStorage + Supabase fallback)
- Execution state tracking with node status + edge animation
- Side drawer for node inspection/editing
- Toolbar with action buttons
- React Query for API data fetching (60s stale, 90s refetch)
- Auto-save with 1000ms debounce

### 5.2 Fuchsia — Patterns to Adopt

| Pattern | Fuchsia Implementation | Adoption Strategy |
|---------|----------------------|-------------------|
| **Chat-driven canvas updates** | `ChatPanel.tsx` + `canvasUpdateService.ts` — AI generates YAML, backend detects markers, WebSocket pushes to canvas | Adapt for Next.js: API route returns structured JSON (not YAML), real-time canvas updates via Supabase Realtime channels |
| **Node property editing** | `WorkflowDesigner.tsx` — gear icon opens side drawer with label, type, description, objective, completion criteria | Extend existing TutorWise drawer with process-specific fields |
| **Intent detection** | `intent_agent.py` (DSPy) — classifies user intent, suggests templates, triggers workflow generation | Simplify: use Gemini structured output for intent → mutation mapping |
| **Template system** | `workflow_templates` table with `template_data` (JSON nodes/edges), categories, complexity levels | Create equivalent Supabase table for process templates |
| **YAML serialization** | `yamlParser.ts` — `YaMl_StArT`/`YaMl_EnD` markers, bidirectional YAML↔ReactFlow conversion | Use JSON instead of YAML for simplicity; YAML optional for import/export |
| **Canvas update notifications** | Toast notifications when AI updates canvas, auto-hide after 5 seconds | Adopt pattern for chat-driven updates |
| **Workflow metadata panel** | Top-center panel showing workflow name, category, step count, save status | Include in toolbar area |

### 5.3 What Needs Building New

| Component | Reason |
|-----------|--------|
| `ProcessStepNode` | New custom node type for onboarding process steps (different from CAS agent nodes) |
| `ChatPanel` | Chat UI for natural language workflow editing |
| Process Map Parser API | AI endpoint to convert text/documents into workflow graph |
| Chat Mutation API | AI endpoint to interpret edit commands and return graph mutations |
| PDF Export | `jsPDF` integration with canvas capture |
| `workflow_processes` table | Supabase table for persisting process workflows |
| Undo/Redo system | State history management for visual edits |

---

## 6. Detailed Component Design

### 6.1 ProcessStepNode — Custom ReactFlow Node

**Purpose:** Renders a single step in an onboarding process (distinct from CAS agent nodes).

**Node Types:**

Colors are defined as CSS custom properties in `globals.css` under `--ps-node-*` tokens, extending the TutorWise design system. Icon + label together differentiate types (WCAG 1.4.1 — not color alone).

| Type | Icon | CSS Token | Fallback | Use Case |
|------|------|-----------|----------|----------|
| `trigger` | ▶ | `--ps-node-trigger` | `--color-success` (#34a853) | Process start |
| `action` | ● | `--ps-node-action` | `--color-info` (#3b82f6) | Standard task step |
| `condition` | ◇ | `--ps-node-condition` | `--color-warning` (#b06000) | Decision/branching point |
| `approval` | ✓ | `--ps-node-approval` | `#8b5cf6` | Human approval required |
| `notification` | ✉ | `--ps-node-notification` | `#06b6d4` | Send email/notification |
| `end` | ■ | `--ps-node-end` | `--color-gray-500` (#6b7280) | Process completion |

**Node Data Shape:**

```typescript
interface ProcessStepData {
  // Display
  label: string;                    // e.g., "IT Equipment Setup"
  type: ProcessStepType;            // trigger | action | condition | approval | notification | end
  description: string;              // What this step does
  color: string;                    // Hex color (derived from type)

  // Process metadata (Fuchsia-inspired)
  objective?: string;               // Goal of this step
  completionCriteria?: string[];    // When is this step "done"?
  expectedOutputs?: string[];       // What this step produces
  assignee?: string;                // Role/person responsible
  estimatedDuration?: string;       // e.g., "2 hours", "1 day"

  // State
  status?: 'pending' | 'active' | 'completed' | 'skipped';
  editable: boolean;                // Always true in builder mode
}
```

**Visual Design:**

```
┌──────────────────────────┐
│  ● IT Equipment Setup    │  ← Icon (by type) + Label
│  ─────────────────────── │
│  Set up laptop, accounts │  ← Description (truncated)
│  👤 IT Admin · ⏱ 2h     │  ← Assignee + Duration
└──────────────────────────┘
    ○ (input handle, top)
    ○ (output handle, bottom)
```

- Width: 240px (fixed)
- Border: 2px solid `var(--ps-node-{type})` with `var(--border-radius-md)` (8px)
- Background: white with `var(--shadow-sm)`
- Selected state: thicker border + `var(--color-primary)` shadow
- Hover: `var(--shadow-md)` elevation
- Font: `var(--font-primary)` (Inter)
- All styles via CSS Modules (`ProcessStepNode.module.css`)

**Condition node variant** (diamond-style or labeled outputs):

```
┌──────────────────────────┐
│  ◇ Background Check      │
│  ─────────────────────── │
│  Verify employment refs  │
└──────────────────────────┘
    ○ (input, top)
  ○ Yes    ○ No (two output handles, bottom-left and bottom-right)
```

### 6.2 ChatPanel — Natural Language Workflow Editing

**Purpose:** Side panel where users describe process changes in natural language. AI interprets the intent and mutates the workflow graph.

**UI Structure:**

```
┌─────────────────────────┐
│  💬 Process Assistant    │  ← Header with title
│  ────────────────────── │
│                          │
│  ┌─────────────────────┐│
│  │ AI: Here's your     ││  ← Message history
│  │ onboarding process  ││
│  │ with 8 steps...     ││
│  └─────────────────────┘│
│                          │
│  ┌─────────────────────┐│
│  │ You: Add an IT      ││
│  │ setup step after    ││
│  │ orientation         ││
│  └─────────────────────┘│
│                          │
│  ┌─────────────────────┐│
│  │ AI: Done! Added     ││
│  │ "IT Equipment Setup"││
│  │ after Orientation.  ││
│  │ [View Changes]      ││
│  └─────────────────────┘│
│                          │
│  ┌─ Quick Actions ─────┐│
│  │ [Add Step] [Remove] ││  ← Suggestion chips
│  │ [Reorder] [Connect] ││
│  └─────────────────────┘│
│                          │
│  ┌─────────────────────┐│
│  │ Type a message...  ↩││  ← Input + send button
│  └─────────────────────┘│
└─────────────────────────┘
```

**Width:** 320px (collapsible)

**Message Types:**

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  // If the AI made changes, include the mutation for undo
  mutation?: WorkflowMutation;
}

interface WorkflowMutation {
  type: 'add_node' | 'remove_node' | 'update_node' | 'add_edge' | 'remove_edge' | 'reorder' | 'bulk';
  before: { nodes: Node[]; edges: Edge[] };  // Snapshot for undo
  after: { nodes: Node[]; edges: Edge[] };   // New state
  description: string;                        // Human-readable summary
}
```

**Supported Intent Categories:**

| Intent | Example User Input | AI Action |
|--------|-------------------|-----------|
| Add step | "Add an IT setup step after orientation" | Insert node, create edges |
| Remove step | "Remove the probation review" | Delete node, reconnect edges |
| Modify step | "Change the orientation duration to 2 days" | Update node data |
| Reorder | "Move IT setup before paperwork" | Reposition node, update edges |
| Connect | "Add a path from background check to rejection if it fails" | Add conditional edge |
| Generate | "Create an onboarding process for software engineers" | Generate full workflow |
| Describe | "What does the orientation step include?" | Read node data, respond |
| Export | "Export this as PDF" | Trigger PDF export |

### 6.3 PropertiesDrawer — Node Detail Editor

**Purpose:** Right-side drawer for editing selected node properties. Extends the existing TutorWise drawer pattern with process-specific fields.

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Label | Text input | Yes | Node display name |
| Type | Select dropdown | Yes | trigger, action, condition, approval, notification, end |
| Description | Textarea | Yes | What this step does |
| Objective | Text input | No | Goal of this step |
| Completion Criteria | Tag list (add/remove) | No | List of criteria |
| Expected Outputs | Tag list (add/remove) | No | What this step produces |
| Assignee | Text input | No | Role or person responsible |
| Estimated Duration | Text input | No | Free text (e.g., "2 hours") |

**Behavior:**
- Opens on node click or double-click
- Auto-saves on field blur (with debounce)
- Close via X button or clicking away
- Delete button for non-start/end nodes
- Width: 400px (matches existing TutorWise drawer)

### 6.4 Toolbar — Global Actions

**Buttons (left to right):**

| Button | Icon | Action | Keyboard Shortcut |
|--------|------|--------|-------------------|
| Save | 💾 | Save to Supabase | Ctrl+S |
| Export PDF | 📄 | Generate and download PDF | — |
| Import | 📂 | Load from JSON file | — |
| Clear | 🗑 | Clear canvas (with confirmation) | — |
| Undo | ↩ | Revert last action | Ctrl+Z |
| Redo | ↪ | Re-apply undone action | Ctrl+Shift+Z |
| Fullscreen | ⛶ | Toggle fullscreen mode | F11 |

**Button styling:** All toolbar buttons use `var(--button-height-compact)` (32px) to keep the toolbar compact. Styled via CSS Modules (`Toolbar.module.css`) using the shared `Button` component variants (primary, secondary, ghost).

**Metadata display (center):**
- Process name (editable inline)
- Step count / Connection count
- Last saved timestamp
- Save status indicator (saved/unsaved/saving)

### 6.5 PDF Export

**Approach:** Canvas capture via `html-to-image` (already used in `WorkflowVisualizerAdvanced`) + `jsPDF` for PDF wrapping.

**PDF Layout:**

```
┌────────────────────────────────┐
│  Page 1: Title Page            │
│  ─────────────────────────     │
│  Process Name                  │
│  Description                   │
│  Created: [date]               │
│  Last Modified: [date]         │
│  Steps: [count]                │
│  Author: [name]                │
│                                │
│  ┌──────────────────────────┐  │
│  │  [Canvas Screenshot]     │  │
│  │  (full workflow diagram) │  │
│  └──────────────────────────┘  │
│                                │
├────────────────────────────────┤
│  Page 2+: Step Details         │
│  ─────────────────────────     │
│  Step 1: Orientation           │
│  Type: Action                  │
│  Description: ...              │
│  Objective: ...                │
│  Completion Criteria:          │
│    - Criteria 1                │
│    - Criteria 2                │
│  Expected Outputs:             │
│    - Output 1                  │
│  Assignee: HR Manager          │
│  Duration: 4 hours             │
│  ─────────────────────────     │
│  Step 2: IT Equipment Setup    │
│  ...                           │
└────────────────────────────────┘
```

**Dependencies:**
- `html-to-image` (already in project via WorkflowVisualizerAdvanced)
- `jspdf` (new dependency — `npm install jspdf`)

---

## 7. AI Integration

### 7.1 Process Map Parser (R1)

**Endpoint:** `POST /api/process-studio/parse`

**Purpose:** Accept a text description (or pasted content) of an onboarding process and return structured `{nodes, edges}` for ReactFlow.

**Request:**

```typescript
{
  input: string;         // Text description of the process
  inputType: 'text' | 'structured';  // Future: 'pdf' | 'image'
}
```

**AI Prompt Strategy:**

```
You are a process mapping expert. Given a description of an employee
onboarding process, extract the steps, decisions, and connections into
a structured workflow graph.

For each step, identify:
- label: Short name (3-5 words)
- type: trigger | action | condition | approval | notification | end
- description: What happens in this step
- objective: The goal of this step
- completionCriteria: When is this step complete?
- expectedOutputs: What this step produces
- assignee: Who is responsible
- estimatedDuration: How long it takes
- connections: Which steps come next (and conditions if applicable)

Return a JSON object with nodes and edges arrays.
```

**Gemini Configuration:**
- Model: `gemini-2.0-flash` (fast, structured output)
- Temperature: 0.2 (deterministic for structure extraction)
- Response format: JSON schema with `generateContent` + `responseMimeType: 'application/json'`

**Response:**

```typescript
{
  success: boolean;
  workflow: {
    name: string;
    description: string;
    nodes: ProcessNode[];
    edges: ProcessEdge[];
  };
  metadata: {
    stepCount: number;
    hasConditions: boolean;
    estimatedTotalDuration: string;
  };
}
```

**Auto-layout:** After parsing, apply Dagre layout algorithm (already available via `@dagrejs/dagre` or manual positioning) to arrange nodes in a readable top-to-bottom flow.

### 7.2 Chat Mutation API (R2)

**Endpoint:** `POST /api/process-studio/chat`

**Purpose:** Accept a chat message + current workflow state, interpret the user's intent, and return the updated workflow state.

**Request:**

```typescript
{
  message: string;                    // User's natural language input
  currentWorkflow: {
    nodes: ProcessNode[];
    edges: ProcessEdge[];
  };
  chatHistory: ChatMessage[];         // Last 10 messages for context
}
```

**AI Prompt Strategy:**

```
You are a process workflow editing assistant. The user wants to modify
an employee onboarding process workflow.

Current workflow has these steps:
{serialized current nodes and edges}

The user says: "{message}"

Determine what change they want and return:
1. The updated nodes and edges arrays
2. A natural language description of what you changed
3. The mutation type (add_node, remove_node, update_node, etc.)

Rules:
- Preserve existing node IDs when not removing them
- When adding a node, generate a unique ID
- When removing a node, reconnect its incoming edges to its outgoing edges
- When reordering, update all affected edges
- If the request is ambiguous, ask a clarifying question instead of making changes
```

**Response:**

```typescript
{
  success: boolean;
  response: string;                   // AI's natural language reply
  mutation?: {
    type: string;
    nodes: ProcessNode[];
    edges: ProcessEdge[];
    description: string;
  };
  clarificationNeeded?: boolean;      // If true, response contains a question
}
```

### 7.3 AI Model & Cost Considerations

| Endpoint | Model | Avg Tokens | Est. Cost/Call |
|----------|-------|-----------|---------------|
| Parse process map | `gemini-2.0-flash` | ~2000 in + ~1500 out | ~$0.001 |
| Chat mutation | `gemini-2.0-flash` | ~3000 in + ~1000 out | ~$0.001 |

Using Gemini Flash keeps costs negligible while maintaining structured output quality. The existing `casGenerateStructured()` utility from CAS can be adapted, or a new `workflowBuilderAI()` utility can be created using the same `@google/generative-ai` SDK pattern.

---

## 8. Database Design

### 8.1 New Table: `workflow_processes`

```sql
CREATE TABLE workflow_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'onboarding',

  -- Workflow graph data (ReactFlow format)
  -- JSONB structure validated at application layer via TypeScript types
  -- nodes: Array of { id, type, position, data: ProcessStepData }
  -- edges: Array of { id, source, target, label? }
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Ownership
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user's workflows
CREATE INDEX idx_workflow_processes_created_by
  ON workflow_processes(created_by);

-- Index for category filtering
CREATE INDEX idx_workflow_processes_category
  ON workflow_processes(category);

-- RLS policies
ALTER TABLE workflow_processes ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own workflows
CREATE POLICY "Users can manage own workflows" ON workflow_processes
  FOR ALL USING (auth.uid() = created_by);

-- Admins can read all workflows
CREATE POLICY "Admins can read all workflows" ON workflow_processes
  FOR SELECT USING (public.is_admin());
```

### 8.2 New Table: `workflow_process_templates`

Pre-built templates for TutorWise platform workflows:

```sql
CREATE TABLE workflow_process_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,               -- 'booking', 'listing', 'referral', 'onboarding', 'tutor-onboarding', 'custom'
  complexity TEXT DEFAULT 'medium',      -- 'simple', 'medium', 'advanced'

  -- Template data
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  preview_steps TEXT[],                  -- First 3-4 step names for preview
  tags TEXT[],

  -- System
  is_system BOOLEAN DEFAULT false,       -- System templates vs user-created
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Template 1: Booking Workflow
INSERT INTO workflow_process_templates (name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES (
  'Booking Workflow',
  'End-to-end tutoring session booking flow from search to post-session review.',
  'booking',
  'medium',
  '[
    {"id": "start", "type": "trigger", "label": "Student Searches", "description": "Student searches for a tutor by subject, location, or availability"},
    {"id": "select", "type": "action", "label": "Select Tutor", "description": "Browse profiles, view ratings, check availability", "assignee": "Student"},
    {"id": "book", "type": "action", "label": "Book Session", "description": "Choose date/time, select delivery mode (online/in-person)", "assignee": "Student"},
    {"id": "pay", "type": "action", "label": "Process Payment", "description": "Stripe checkout, apply promo codes, confirm payment", "assignee": "System"},
    {"id": "confirm", "type": "notification", "label": "Send Confirmations", "description": "Email/push notifications to student and tutor with session details", "assignee": "System"},
    {"id": "remind", "type": "notification", "label": "Session Reminders", "description": "24h and 1h reminders with join link or location", "assignee": "System"},
    {"id": "attend", "type": "action", "label": "Attend Session", "description": "Student and tutor meet for the tutoring session", "assignee": "Student + Tutor"},
    {"id": "review", "type": "action", "label": "Post-Session Review", "description": "Student rates tutor, leaves feedback, tutor logs session notes", "assignee": "Student + Tutor"},
    {"id": "end", "type": "end", "label": "Booking Complete", "description": "Session completed, payment released to tutor"}
  ]'::jsonb,
  '[
    {"source": "start", "target": "select"},
    {"source": "select", "target": "book"},
    {"source": "book", "target": "pay"},
    {"source": "pay", "target": "confirm"},
    {"source": "confirm", "target": "remind"},
    {"source": "remind", "target": "attend"},
    {"source": "attend", "target": "review"},
    {"source": "review", "target": "end"}
  ]'::jsonb,
  ARRAY['Select Tutor', 'Book Session', 'Process Payment', 'Attend Session'],
  ARRAY['booking', 'student', 'tutor', 'payment'],
  true
);

-- Template 2: Listing Workflow
INSERT INTO workflow_process_templates (name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES (
  'Listing Workflow',
  'Tutor listing creation pipeline from draft to live discovery.',
  'listing',
  'medium',
  '[
    {"id": "start", "type": "trigger", "label": "Tutor Creates Listing", "description": "Tutor initiates a new listing from their dashboard"},
    {"id": "details", "type": "action", "label": "Enter Details", "description": "Subject, level, description, learning outcomes", "assignee": "Tutor"},
    {"id": "pricing", "type": "action", "label": "Set Pricing", "description": "Hourly rate, package deals, delivery mode pricing", "assignee": "Tutor"},
    {"id": "media", "type": "action", "label": "Add Media", "description": "Profile photo, intro video, qualification certificates", "assignee": "Tutor"},
    {"id": "review-check", "type": "condition", "label": "Quality Check", "description": "System validates completeness, checks for policy violations"},
    {"id": "publish", "type": "action", "label": "Publish Listing", "description": "Listing goes live, indexed for search", "assignee": "System"},
    {"id": "embed", "type": "action", "label": "Generate Embeddings", "description": "AI generates search embeddings for hybrid search discovery", "assignee": "System"},
    {"id": "end", "type": "end", "label": "Listing Live", "description": "Listing visible to students in search results"}
  ]'::jsonb,
  '[
    {"source": "start", "target": "details"},
    {"source": "details", "target": "pricing"},
    {"source": "pricing", "target": "media"},
    {"source": "media", "target": "review-check"},
    {"source": "review-check", "target": "publish", "label": "Pass"},
    {"source": "review-check", "target": "details", "label": "Needs revision"},
    {"source": "publish", "target": "embed"},
    {"source": "embed", "target": "end"}
  ]'::jsonb,
  ARRAY['Enter Details', 'Set Pricing', 'Quality Check', 'Publish Listing'],
  ARRAY['listing', 'tutor', 'search', 'embeddings'],
  true
);

-- Template 3: Referral Workflow
INSERT INTO workflow_process_templates (name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES (
  'Referral Workflow',
  'Referral program flow from invite to reward distribution.',
  'referral',
  'simple',
  '[
    {"id": "start", "type": "trigger", "label": "User Shares Referral", "description": "Existing user generates and shares a referral link"},
    {"id": "signup", "type": "action", "label": "Referee Signs Up", "description": "New user registers via referral link, link tracked", "assignee": "Referee"},
    {"id": "validate", "type": "condition", "label": "Validate Referral", "description": "Check referral is genuine: unique user, not self-referral, within limits"},
    {"id": "first-booking", "type": "action", "label": "First Booking", "description": "Referee completes their first paid booking", "assignee": "Referee"},
    {"id": "reward", "type": "action", "label": "Distribute Rewards", "description": "Credit referrer account, apply referee discount", "assignee": "System"},
    {"id": "notify", "type": "notification", "label": "Reward Notifications", "description": "Notify both parties of earned rewards", "assignee": "System"},
    {"id": "end", "type": "end", "label": "Referral Complete", "description": "Both users rewarded, referral cycle complete"}
  ]'::jsonb,
  '[
    {"source": "start", "target": "signup"},
    {"source": "signup", "target": "validate"},
    {"source": "validate", "target": "first-booking", "label": "Valid"},
    {"source": "validate", "target": "end", "label": "Invalid"},
    {"source": "first-booking", "target": "reward"},
    {"source": "reward", "target": "notify"},
    {"source": "notify", "target": "end"}
  ]'::jsonb,
  ARRAY['Referee Signs Up', 'Validate Referral', 'First Booking', 'Distribute Rewards'],
  ARRAY['referral', 'rewards', 'growth'],
  true
);

-- Template 4: User Onboarding
INSERT INTO workflow_process_templates (name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES (
  'User Onboarding',
  'New student/parent onboarding journey from signup to first booking.',
  'onboarding',
  'medium',
  '[
    {"id": "start", "type": "trigger", "label": "User Signs Up", "description": "New user registers via email, Google, or referral link"},
    {"id": "verify", "type": "action", "label": "Email Verification", "description": "Confirm email address, activate account", "assignee": "System"},
    {"id": "profile", "type": "action", "label": "Complete Profile", "description": "Name, role (student/parent), learning goals, preferences", "assignee": "User"},
    {"id": "preferences", "type": "action", "label": "Set Preferences", "description": "Subjects of interest, preferred delivery mode, budget range", "assignee": "User"},
    {"id": "explore", "type": "action", "label": "Explore Platform", "description": "Guided tour, browse tutors, view sample listings", "assignee": "User"},
    {"id": "first-search", "type": "action", "label": "First Search", "description": "User searches for a tutor using hybrid search", "assignee": "User"},
    {"id": "first-booking", "type": "action", "label": "First Booking", "description": "User books their first tutoring session", "assignee": "User"},
    {"id": "check-in", "type": "notification", "label": "7-Day Check-in", "description": "Automated email: how was your experience? Need help?", "assignee": "System"},
    {"id": "end", "type": "end", "label": "Onboarded", "description": "User is active and engaged on the platform"}
  ]'::jsonb,
  '[
    {"source": "start", "target": "verify"},
    {"source": "verify", "target": "profile"},
    {"source": "profile", "target": "preferences"},
    {"source": "preferences", "target": "explore"},
    {"source": "explore", "target": "first-search"},
    {"source": "first-search", "target": "first-booking"},
    {"source": "first-booking", "target": "check-in"},
    {"source": "check-in", "target": "end"}
  ]'::jsonb,
  ARRAY['Email Verification', 'Complete Profile', 'First Search', 'First Booking'],
  ARRAY['onboarding', 'student', 'parent', 'activation'],
  true
);

-- Template 5: Tutor Onboarding
INSERT INTO workflow_process_templates (name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES (
  'Tutor Onboarding',
  'Organisation-managed tutor onboarding from application to first session.',
  'tutor-onboarding',
  'advanced',
  '[
    {"id": "start", "type": "trigger", "label": "Tutor Applies", "description": "Tutor submits application to join the platform or an organisation"},
    {"id": "bg-check", "type": "condition", "label": "Background Check", "description": "DBS/criminal record check, identity verification", "assignee": "Organisation Admin"},
    {"id": "credentials", "type": "approval", "label": "Credential Verification", "description": "Verify qualifications, teaching certificates, references", "assignee": "Organisation Admin"},
    {"id": "account", "type": "action", "label": "Create Account", "description": "Set up tutor profile, assign to organisation, configure permissions", "assignee": "System"},
    {"id": "training", "type": "action", "label": "Platform Training", "description": "Platform walkthrough, booking system, payment setup, Sage AI tutor tools", "assignee": "Tutor", "estimatedDuration": "2 hours"},
    {"id": "first-listing", "type": "action", "label": "Create First Listing", "description": "Tutor creates their first subject listing with guidance", "assignee": "Tutor"},
    {"id": "shadow", "type": "action", "label": "Shadow Session", "description": "Tutor observes or co-teaches a session with an experienced tutor", "assignee": "Tutor + Mentor"},
    {"id": "first-session", "type": "action", "label": "First Solo Session", "description": "Tutor delivers their first independent tutoring session", "assignee": "Tutor"},
    {"id": "review", "type": "approval", "label": "Performance Review", "description": "Manager reviews first session feedback, student ratings", "assignee": "Organisation Admin"},
    {"id": "end", "type": "end", "label": "Tutor Active", "description": "Tutor fully onboarded and taking bookings independently"}
  ]'::jsonb,
  '[
    {"source": "start", "target": "bg-check"},
    {"source": "bg-check", "target": "credentials", "label": "Clear"},
    {"source": "bg-check", "target": "end", "label": "Failed"},
    {"source": "credentials", "target": "account", "label": "Approved"},
    {"source": "credentials", "target": "end", "label": "Rejected"},
    {"source": "account", "target": "training"},
    {"source": "training", "target": "first-listing"},
    {"source": "first-listing", "target": "shadow"},
    {"source": "shadow", "target": "first-session"},
    {"source": "first-session", "target": "review"},
    {"source": "review", "target": "end"}
  ]'::jsonb,
  ARRAY['Background Check', 'Credential Verification', 'Platform Training', 'First Solo Session'],
  ARRAY['tutor', 'onboarding', 'organisation', 'verification'],
  true
);
```

### 8.3 Migration

**File:** `tools/database/migrations/330_create_workflow_processes.sql`

Contains both tables and the seed data above.

---

## 9. API Routes

### 9.1 CRUD Routes

**Base path:** `/api/process-studio/`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/process-studio/processes` | List user's saved processes |
| `GET` | `/api/process-studio/processes/[id]` | Get a specific process |
| `POST` | `/api/process-studio/processes` | Create a new process |
| `PUT` | `/api/process-studio/processes/[id]` | Update a process |
| `DELETE` | `/api/process-studio/processes/[id]` | Delete a process |
| `GET` | `/api/process-studio/templates` | List available templates |

### 9.2 AI Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/process-studio/parse` | Parse text into workflow (R1) |
| `POST` | `/api/process-studio/chat` | Chat-based editing (R2) |

### 9.3 Authentication

All routes require authenticated user via Supabase auth. Admin routes (list all, delete any) gated by `is_admin()`.

### 9.4 Error Response Schema

All API routes return consistent error responses:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string, code: string, details?: unknown }
```

| HTTP Status | Code | When |
|-------------|------|------|
| 400 | `INVALID_INPUT` | Missing or malformed request body |
| 401 | `UNAUTHORIZED` | No valid Supabase session |
| 403 | `FORBIDDEN` | User lacks `is_admin()` for admin routes |
| 404 | `NOT_FOUND` | Process or template ID doesn't exist |
| 422 | `AI_PARSE_FAILED` | Gemini returned invalid/empty structure |
| 429 | `RATE_LIMITED` | Rate limit exceeded (see Section 16) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### 9.5 Rate Limiting

AI endpoints use Upstash Redis rate limiting (existing TutorWise pattern):

| Endpoint | Limit | Window | Implementation |
|----------|-------|--------|----------------|
| `/api/process-studio/parse` | 20 calls | per minute | `@upstash/ratelimit` sliding window |
| `/api/process-studio/chat` | 60 calls | per minute | `@upstash/ratelimit` sliding window |
| CRUD routes | 120 calls | per minute | `@upstash/ratelimit` sliding window |

---

## 10. Page & Route Structure

### 10.1 New Pages

| Route | Layout | Description |
|-------|--------|-------------|
| `/admin/process-studio` | Admin layout (with admin nav) | Workflow builder with chat + canvas + drawer |
| `/admin/process-studio/[id]` | Admin layout | Edit existing saved workflow |
| `/admin/process-studio/fullscreen` | Fullscreen layout | Canvas-only fullscreen mode |

**Note:** Located under `/admin/` per Decision D2. The admin layout provides auth checks, RBAC, and consistent navigation. When ready for non-admin users, a top-level `/process-studio` route can be added with its own auth.

### 10.2 File Structure

Per `.ai/6-DESIGN-SYSTEM.md`, components are organized under `components/feature/` for feature-specific components. All styling uses CSS Modules (`.module.css`), not inline styles.

```
apps/web/src/
├── app/
│   ├── (admin)/admin/process-studio/
│   │   ├── page.tsx                    # Main builder page (HubPageLayout wrapper)
│   │   ├── [id]/page.tsx              # Edit existing workflow
│   │   └── layout.tsx                 # Admin auth + RBAC check
│   │
│   ├── (fullscreen)/process-studio-fullscreen/
│   │   ├── page.tsx                    # Fullscreen canvas
│   │   └── layout.tsx                 # Auth-only layout (no admin nav)
│   │
│   └── api/process-studio/
│       ├── processes/
│       │   ├── route.ts               # GET (list) + POST (create)
│       │   └── [id]/route.ts          # GET + PUT + DELETE
│       ├── templates/route.ts          # GET templates
│       ├── parse/route.ts             # POST AI parse
│       └── chat/route.ts             # POST AI chat
│
├── components/feature/process-studio/
│   ├── ProcessStudioCanvas.tsx        # Main ReactFlow canvas
│   ├── ProcessStudioCanvas.module.css # Canvas styles
│   ├── ProcessStepNode.tsx            # Custom node component
│   ├── ProcessStepNode.module.css     # Node styles (uses --ps-node-* tokens)
│   ├── DecisionNode.tsx               # Conditional node variant
│   ├── ChatPanel.tsx                  # Chat sidebar
│   ├── ChatPanel.module.css           # Chat styles
│   ├── PropertiesDrawer.tsx           # Node editor drawer
│   ├── PropertiesDrawer.module.css    # Drawer styles
│   ├── Toolbar.tsx                    # Top toolbar
│   ├── Toolbar.module.css             # Toolbar styles
│   ├── TemplateSelector.tsx           # Template picker modal
│   ├── PDFExporter.tsx                # PDF generation utility
│   ├── canvasUpdateService.ts         # Real-time canvas update handler (Supabase Realtime)
│   ├── store.ts                       # Zustand store (useProcessStudioStore)
│   └── types.ts                       # Shared TypeScript types
│
└── hooks/
    ├── useCanvasRealtime.ts           # Supabase Realtime subscription for canvas updates
    ├── useUndoRedo.ts                 # Undo/redo state history
    └── useAutoSave.ts                 # Debounced auto-save
```

---

## 11. State Management

### 11.1 State Management Architecture

Per TutorWise conventions (`.ai/4-PATTERNS.md`), state is split across three layers:

| Layer | Tool | What It Manages |
|-------|------|-----------------|
| **Server state** | React Query (TanStack Query) | CRUD operations — save, load, list processes, fetch templates. 60s stale, 90s refetch. |
| **Client state** | Zustand store (`useProcessStudioStore`) | UI state — selectedNodeId, isDrawerOpen, isChatOpen, chatMessages, isDirty, lastSavedAt |
| **Canvas state** | React hooks (`useNodesState`, `useEdgesState`) | ReactFlow nodes + edges — owned by the canvas component, passed down as props |
| **History state** | Custom hook (`useUndoRedo`) | Undo/redo snapshots — separate from Zustand to avoid store bloat |

### 11.2 Zustand Store: `useProcessStudioStore`

```typescript
interface ProcessStudioStore {
  // Process metadata
  processId: string | null;
  processName: string;
  processDescription: string;

  // UI state
  selectedNodeId: string | null;
  isDrawerOpen: boolean;
  isChatOpen: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;

  // Chat state
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // Actions
  setSelectedNode: (id: string | null) => void;
  toggleDrawer: () => void;
  toggleChat: () => void;
  markDirty: () => void;
  markSaved: () => void;
  addChatMessage: (msg: ChatMessage) => void;
}
```

### 11.3 React Query Hooks

```typescript
// Server state — CRUD operations
useProcessQuery(id)           // GET /api/process-studio/processes/[id]
useProcessListQuery()         // GET /api/process-studio/processes
useTemplateListQuery()        // GET /api/process-studio/templates
useSaveProcessMutation()      // PUT /api/process-studio/processes/[id]
useCreateProcessMutation()    // POST /api/process-studio/processes
useDeleteProcessMutation()    // DELETE /api/process-studio/processes/[id]
useParseProcessMutation()     // POST /api/process-studio/parse
useChatMutationMutation()     // POST /api/process-studio/chat
```

### 11.4 Undo/Redo System

```typescript
interface WorkflowSnapshot {
  nodes: Node<ProcessStepData>[];
  edges: Edge[];
  timestamp: Date;
  description: string;  // "Added IT Equipment Setup step"
}

function useUndoRedo(maxHistory = 50) {
  // Push snapshot before each mutation
  // Undo: restore history[index - 1]
  // Redo: restore history[index + 1]
  // New mutation after undo: truncate forward history
}
```

### 11.5 Auto-Save

Follow the existing TutorWise pattern:
- Debounce: 1000ms after last change
- Save to localStorage immediately (offline safety)
- Save to Supabase on manual save action
- Visual indicator: "Saved" / "Unsaved changes" / "Saving..."

---

## 12. Fuchsia Reference Implementation Mapping

This section maps Fuchsia's existing implementations to what we'll build in TutorWise.

### 12.1 Component Mapping

| Fuchsia Component | Fuchsia File | TutorWise Equivalent | Notes |
|-------------------|-------------|---------------------|-------|
| `WorkflowDesigner` | `frontend/src/components/workflow/WorkflowDesigner.tsx` | `ProcessStudioCanvas` | Simplified: no template_type, no memory_enhancement |
| `WorkflowStepNode` | (inline in WorkflowDesigner) | `ProcessStepNode` | Extended with objective, completionCriteria, expectedOutputs |
| `ChatPanel` | `frontend/src/components/layout/ChatPanel.tsx` | `ChatPanel` | Adapted: Supabase Realtime replaces socket.io; no agent mode, no LLM provider switching |
| `canvasUpdateService` | `frontend/src/services/canvasUpdateService.ts` | `canvasUpdateService.ts` | Adapted: Supabase Realtime channels instead of socket.io; JSON instead of YAML |
| `yamlParser` | `frontend/src/utils/yamlParser.ts` | JSON serialization | Simpler; JSON native to JS/React |
| `templateService` | `frontend/src/services/templateService.ts` | API route + React Query | Supabase-native instead of REST+localStorage |
| Properties drawer | Gear icon → side drawer | `PropertiesDrawer` | Same pattern, different fields |

### 12.2 Backend Mapping

| Fuchsia Backend | Fuchsia File | TutorWise Equivalent | Notes |
|-----------------|-------------|---------------------|-------|
| `chat.py` (enhanced endpoint) | `backend/app/api/endpoints/chat.py` | `/api/process-studio/chat` route | Next.js API route, Gemini instead of OpenAI |
| `intent_agent.py` | `backend/app/services/intent_agent.py` | Inline in chat route | Gemini structured output replaces DSPy intent detection |
| `workflow_orchestrator.py` | `backend/app/services/workflow_orchestrator.py` | Not needed for MVP | No execution engine needed; builder only |
| `workflows.py` (CRUD) | `backend/app/api/endpoints/workflows.py` | `/api/process-studio/processes` route | Supabase client instead of SQLAlchemy |
| `postgres.py` (models) | `backend/app/db/postgres.py` | Migration SQL + TypeScript types | Supabase-native |

### 12.3 Key Differences from Fuchsia

| Aspect | Fuchsia | TutorWise Process Studio |
|--------|---------|---------------------------|
| **Backend** | FastAPI (Python) | Next.js API routes (TypeScript) |
| **Database** | PostgreSQL via SQLAlchemy | Supabase (PostgreSQL + RLS) |
| **AI Provider** | OpenAI (gpt-3.5-turbo) | Gemini (gemini-2.0-flash) |
| **State Management** | Zustand (global store) | Zustand (UI) + React Query (server) + React hooks (canvas) |
| **Real-time** | WebSocket (socket.io) | Supabase Realtime (channels + broadcast) |
| **Serialization** | YAML (YaMl_StArT/YaMl_EnD markers) | JSON (native) |
| **Auth** | JWT + role-based | Supabase auth + RLS |
| **Execution** | Full workflow engine (LangGraph) | No execution (design-only tool) |

---

## 13. Porting Plan: Fuchsia → TutorWise

This section provides a safe, step-by-step plan for porting patterns from the Fuchsia codebase (`projects/fuschia`) into TutorWise. We port **proven patterns and architecture**, not raw code, because the tech stacks differ significantly.

### 13.1 Porting Principles

1. **Read, understand, rewrite** — Don't copy-paste. Read the Fuchsia implementation, understand the pattern, then rewrite in TutorWise conventions (TypeScript, Next.js API routes, Supabase, Gemini)
2. **One component at a time** — Port one component, verify it builds, then move to the next
3. **Test after each port** — `npm run build` must pass after each component is ported
4. **Preserve Fuchsia** — Never modify the Fuchsia codebase; it's a read-only reference
5. **Document adaptations** — When a pattern changes during porting, document why in code comments

### 13.2 Porting Sequence

Port in this order (matches the incremental build phases):

```
Phase 1 (R3 - Visual Editor):
  Step 1: Types & data models
  Step 2: ProcessStepNode (from WorkflowStepNode)
  Step 3: ProcessStudioCanvas (from WorkflowDesigner)
  Step 4: PropertiesDrawer (from node property drawer)
  Step 5: Toolbar (from WorkflowDesigner toolbar)
  Step 6: Database + API (from workflow_templates + workflows.py)

Phase 2 (R1 - AI Parse):
  Step 7: Parse API route (from chat.py workflow generation)
  Step 8: Template system (from templateService)

Phase 3 (R2 - Chat):
  Step 9: ChatPanel (from ChatPanel.tsx)
  Step 10: Chat mutation API (from intent_agent.py + chat.py)

Phase 4 (PDF):
  Step 11: PDF export (new — Fuchsia doesn't have this)
```

### 13.3 Detailed Porting Guide

#### Step 1: Types & Data Models

**Read from Fuchsia:**
- `frontend/src/components/workflow/WorkflowDesigner.tsx` — `WorkflowStepData` interface
- `backend/app/db/postgres.py` — `workflow_templates` SQLAlchemy model
- `frontend/src/services/templateService.ts` — `Template` interface

**Create in TutorWise:** `apps/web/src/components/feature/process-studio/types.ts`

**Adaptation notes:**

| Fuchsia Type | TutorWise Adaptation |
|-------------|---------------------|
| `WorkflowStepData { label, type, description }` | `ProcessStepData { label, type, description, objective, completionCriteria, expectedOutputs, assignee, estimatedDuration }` — extended with richer metadata |
| `type: 'trigger' \| 'action' \| 'condition' \| 'end'` | Add `'approval'` and `'notification'` types |
| `template_type: 'workflow' \| 'agent'` | Remove — we only have workflow type |
| `use_memory_enhancement: boolean` | Remove — not applicable |
| `complexity: 'simple' \| 'medium' \| 'advanced'` | Keep — useful for template categorization |

#### Step 2: ProcessStepNode Component

**Read from Fuchsia:**
- `WorkflowDesigner.tsx` lines 140-205 — `WorkflowStepNode` component
- Node handles, type-based coloring, label display

**Also read from TutorWise:**
- `WorkflowVisualizer.tsx` lines 223-351 — `AgentNode` component (existing pattern)

**Create in TutorWise:** `apps/web/src/components/feature/process-studio/ProcessStepNode.tsx`

**Porting approach:**
- Use TutorWise's `AgentNode` as the structural template (Handle positioning, selection styling, status indicators)
- Apply Fuchsia's node type system (trigger/action/condition/end + our additions)
- Add Fuchsia's description display inside the node
- Use CSS Modules (`.module.css`) per TutorWise design system — NOT inline styles (WorkflowVisualizer uses inline styles but it's in `cas/` package, outside design system scope)

**Key differences:**
```
Fuchsia AgentNode:                    TutorWise ProcessStepNode:
├── Tailwind CSS classes              ├── CSS Modules (.module.css)
├── lucide-react icons                ├── Emoji/text icons (existing pattern)
├── No status indicator               ├── Status indicator (from AgentNode)
├── Simple label + type badge          ├── Label + description + assignee + duration
└── @xyflow/react Handle              └── reactflow Handle (check installed version)
```

#### Step 3: ProcessStudioCanvas

**Read from Fuchsia:**
- `WorkflowDesigner.tsx` lines 264-1109 — Full component
  - `useNodesState`, `useEdgesState` (lines 306-307)
  - `addNewNode` callback (lines 321-347)
  - `onConnect` callback (lines 349-351)
  - Template loading (lines 264-294)
  - Save dialog (lines 1009-1109)
  - Template loader dialog (lines 919-1006)
  - Canvas notifications (lines 712-745)

**Also read from TutorWise:**
- `WorkflowVisualizer.tsx` — Full component (layout, toolbar, drawer integration, React Query)
- `WorkflowVisualizerAdvanced.tsx` — Export functions, custom node types

**Create in TutorWise:** `apps/web/src/components/feature/process-studio/ProcessStudioCanvas.tsx`

**Porting approach:**
- Start from TutorWise's `WorkflowVisualizer` structure (already has toolbar, drawer, mini-map, controls)
- Replace agent-specific logic with process-builder logic from Fuchsia
- Port Fuchsia's `addNewNode()` pattern (position calculation, default data)
- Port Fuchsia's save/load dialog patterns
- Use React hooks (not Zustand) per TutorWise convention
- Wrap canvas in `useProcessStudio` custom hook instead of inline state

**Do NOT port:**
- `isMemoryEnhanced` toggle — not applicable
- Agent mode switching — not applicable
- LLM provider selector — TutorWise uses Gemini only

**Port with adaptation:**
- WebSocket canvas updates → Supabase Realtime channels for streaming AI responses and real-time canvas mutations

#### Step 4: PropertiesDrawer

**Read from Fuchsia:**
- `WorkflowDesigner.tsx` lines 905-916 — Drawer with `NodePropertyForm`
- `README-workflow-properties.md` — Gear icon pattern, drawer UX

**Also read from TutorWise:**
- `WorkflowVisualizer.tsx` lines 906-1181 — Existing inspection drawer

**Create in TutorWise:** `apps/web/src/components/feature/process-studio/PropertiesDrawer.tsx`

**Porting approach:**
- Use TutorWise's drawer structure (400px width, header/content/footer, close button)
- Add Fuchsia-inspired fields: objective, completion criteria, expected outputs
- Add node type selector dropdown
- Add assignee and estimated duration fields

#### Step 5: Toolbar

**Read from Fuchsia:**
- `WorkflowDesigner.tsx` lines 750-918 — Toolbar with Add Step, Run, Save, Load, Clear, Memory Enhanced, Export
- Workflow metadata panel (name, category, step count)

**Also read from TutorWise:**
- `WorkflowVisualizer.tsx` lines 780-878 — Existing toolbar (Sync, Add Note, Reset)

**Create in TutorWise:** `apps/web/src/components/feature/process-studio/Toolbar.tsx`

**Porting approach:**
- Use TutorWise's toolbar layout pattern (top-left panel)
- Port Fuchsia's button set but adapted: Save, Export PDF, Import, Clear, Undo, Redo, Fullscreen
- Remove: Run (no execution), Memory Enhanced (not applicable)
- Add: Undo/Redo (new), Export PDF (new)
- Port Fuchsia's metadata display (process name, step count, save status)

#### Step 6: Database + API Routes

**Read from Fuchsia:**
- `backend/app/db/postgres.py` — `workflow_templates` model
- `backend/app/api/endpoints/workflows.py` — CRUD endpoints
- `frontend/src/services/workflowService.ts` — Frontend API client

**Create in TutorWise:**
- `tools/database/migrations/330_create_workflow_processes.sql`
- `apps/web/src/app/api/process-studio/processes/route.ts`
- `apps/web/src/app/api/process-studio/processes/[id]/route.ts`

**Porting approach:**
- Fuchsia uses SQLAlchemy ORM → TutorWise uses Supabase client directly
- Port the data model structure, not the ORM code
- Add RLS policies (Fuchsia has no RLS)
- Add `is_admin()` check for admin-only operations
- Port validation logic from Fuchsia's Pydantic models into Zod schemas or inline validation

**Key SQL adaptation:**
```
Fuchsia (SQLAlchemy):                 TutorWise (Supabase):
├── Column(UUID, primary_key)         ├── UUID DEFAULT gen_random_uuid()
├── Column(String)                    ├── TEXT
├── Column(JSON)                      ├── JSONB (+ GIN index)
├── No RLS                            ├── RLS with auth.uid() + is_admin()
├── created_by as user_id FK          ├── created_by REFERENCES auth.users(id)
└── SQLAlchemy session.add()          └── supabase.from('...').insert()
```

#### Step 7: Parse API Route (AI Auto-Visualize)

**Read from Fuchsia:**
- `backend/app/api/endpoints/chat.py` lines 166-198 — System prompt for YAML generation
- The prompt structure: "Define a process as YAML with Nodes and Edges arrays"

**Create in TutorWise:** `apps/web/src/app/api/process-studio/parse/route.ts`

**Porting approach:**
- Port Fuchsia's system prompt concept but output JSON (not YAML)
- Replace OpenAI `chat.completions.create()` → Gemini `generateContent()` with `responseMimeType: 'application/json'`
- Add JSON schema for structured output (Gemini supports this natively)
- Add input sanitization before including in prompt
- Add output validation before returning to client

**Prompt adaptation:**
```
Fuchsia: "When asked to return YAML, only return YAML..."
         → OpenAI gpt-3.5-turbo → YAML string → yamlParser.ts → ReactFlow

TutorWise: "Return a JSON object with nodes and edges arrays..."
           → Gemini 2.0 Flash → JSON object → direct ReactFlow state
```

#### Step 8: Template System

**Read from Fuchsia:**
- `frontend/src/services/templateService.ts` — Local template storage, file loading
- `frontend/src/services/workflowService.ts` — Database template CRUD
- `WorkflowDesigner.tsx` lines 919-1006 — Template loader dialog

**Create in TutorWise:**
- `apps/web/src/app/api/process-studio/templates/route.ts`
- `apps/web/src/components/feature/process-studio/TemplateSelector.tsx`

**Porting approach:**
- Simplify Fuchsia's dual-storage (DB + localStorage) to Supabase-only
- Port the template grid UI pattern from Fuchsia's loader dialog
- Seed templates via SQL migration (not runtime code)
- Use React Query for template fetching

#### Step 9: ChatPanel

**Read from Fuchsia:**
- `frontend/src/components/layout/ChatPanel.tsx` — Full chat UI
  - Message list rendering
  - Input handling
  - LLM provider switching (we don't need this)
  - Human-in-the-loop pattern
  - Agent mode (we don't need this)

**Create in TutorWise:** `apps/web/src/components/feature/process-studio/ChatPanel.tsx`

**Porting approach:**
- Port the message list UI pattern (role-based styling, timestamps)
- Port the input component (text area + send button)
- Remove: LLM provider selector, agent mode toggle
- Adapt: WebSocket → Supabase Realtime for streaming AI canvas updates
- Add: suggestion chips for common actions
- Add: mutation display (show what the AI changed)
- Integrate with `useProcessStudio` hook for state mutations

**Key differences:**
```
Fuchsia ChatPanel:                    TutorWise ChatPanel:
├── WebSocket (socket.io)             ├── Supabase Realtime channels
├── LLM provider selector             ├── Gemini only (no selector)
├── Agent mode toggle                  ├── No agent mode
├── Human-in-the-loop requests        ├── No execution context
├── Execution status polling          ├── Streaming AI response via Realtime
├── Global Zustand store              ├── Props from useProcessStudio
└── ~500 lines                        └── ~250 lines (focused)
```

#### Step 10: Chat Mutation API

**Read from Fuchsia:**
- `backend/app/services/intent_agent.py` — DSPy-based intent classification
- `backend/app/api/endpoints/chat.py` — Enhanced chat with workflow context

**Create in TutorWise:** `apps/web/src/app/api/process-studio/chat/route.ts`

**Porting approach:**
- Fuchsia uses DSPy for intent detection → Replace with Gemini structured output
- Port the concept of intent categories (add/remove/modify/reorder/connect)
- Include current workflow state in prompt (Fuchsia does this via context)
- Return updated nodes/edges + natural language response
- Add mutation metadata for undo support

#### Step 11: PDF Export (New — Not in Fuchsia)

**No Fuchsia reference** — Fuchsia only exports YAML/JSON.

**Create in TutorWise:** `apps/web/src/components/feature/process-studio/PDFExporter.tsx`

**Use existing TutorWise patterns:**
- `WorkflowVisualizerAdvanced.tsx` `exportAsPNG()` — canvas capture via `html-to-image`
- Wrap in `jsPDF` document with title page and step detail pages

### 13.4 Porting Safety Checklist

Before each step:
- [ ] Read the Fuchsia source file completely
- [ ] Identify which parts apply to TutorWise and which don't
- [ ] Check for Fuchsia-specific dependencies (Zustand, socket.io, DSPy, OpenAI)

After each step:
- [ ] `npm run build` passes with zero errors
- [ ] No Fuchsia-specific imports leaked into TutorWise code
- [ ] No `any` types introduced (except where Fuchsia's types don't translate)
- [ ] Component renders correctly in the admin dashboard
- [ ] No console errors in browser dev tools

### 13.5 Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| ReactFlow version mismatch (`reactflow` v11 vs `@xyflow/react` v12) | Check `apps/web/package.json` first; use whatever is installed. Fuchsia uses v12 — if TutorWise uses v11, adapt import paths (`import { ReactFlow } from 'reactflow'` vs `import { ReactFlow } from '@xyflow/react'`) |
| Fuchsia YAML patterns leaking in | Use JSON everywhere; never import `yamlParser.ts` |
| Zustand patterns in ported code | Replace all `useAppStore.getState()` with React hook state or props |
| OpenAI SDK usage | Replace all `openai.chat.completions.create()` with Gemini `generateContent()` |
| FastAPI response shapes | Adapt all `{ detail: ... }` error responses to Next.js `NextResponse.json()` pattern |
| Python type patterns | Rewrite Pydantic `BaseModel` schemas as TypeScript interfaces |

---

## 14. Implementation Plan

### Phase 1: Foundation (Canvas + Visual Editing) — R3

**Goal:** Interactive ReactFlow canvas with process step nodes, drag/connect, properties drawer, save/load.

| Task | Files | Effort |
|------|-------|--------|
| Create `ProcessStepNode` component | `components/feature/process-studio/ProcessStepNode.tsx` | Small |
| Create `ProcessStudioCanvas` with ReactFlow | `components/feature/process-studio/ProcessStudioCanvas.tsx` | Medium |
| Create `PropertiesDrawer` | `components/feature/process-studio/PropertiesDrawer.tsx` | Small |
| Create `Toolbar` with save/clear/undo/redo | `components/feature/process-studio/Toolbar.tsx` | Small |
| Create Zustand store | `components/feature/process-studio/store.ts` | Medium |
| Create `useUndoRedo` hook | `hooks/useUndoRedo.ts` | Small |
| Create shared types | `components/feature/process-studio/types.ts` | Small |
| Create database migration | `tools/database/migrations/330_create_workflow_processes.sql` | Small |
| Create CRUD API routes | `app/api/process-studio/processes/` | Medium |
| Create main page | `app/(admin)/admin/process-studio/page.tsx` | Medium |
| Create fullscreen page | `app/(fullscreen)/process-studio-fullscreen/page.tsx` | Small |

### Phase 2: AI Auto-Visualize — R1

**Goal:** User inputs text description → AI generates workflow → canvas renders it.

| Task | Files | Effort |
|------|-------|--------|
| Create parse API route | `app/api/process-studio/parse/route.ts` | Medium |
| Create AI prompt + Gemini integration | (inline in parse route) | Medium |
| Create `canvasUpdateService` | `components/feature/process-studio/canvasUpdateService.ts` | Medium |
| Create `useCanvasRealtime` hook | `hooks/useCanvasRealtime.ts` | Medium |
| Add text input UI (modal or inline) | `components/feature/process-studio/ProcessInput.tsx` | Small |
| Add auto-layout algorithm (Dagre) | `components/feature/process-studio/layout.ts` | Small |
| Create template selector | `components/feature/process-studio/TemplateSelector.tsx` | Small |
| Seed default templates | Migration 330 (included above) | Small |

### Phase 3: Chat UI Editing — R2

**Goal:** Side panel chat for natural language workflow editing.

| Task | Files | Effort |
|------|-------|--------|
| Create `ChatPanel` component | `components/feature/process-studio/ChatPanel.tsx` | Medium |
| Create chat API route | `app/api/process-studio/chat/route.ts` | Medium |
| Create AI prompt for mutations | (inline in chat route) | Medium |
| Integrate mutations with undo/redo | (update `useProcessStudio`) | Small |
| Add suggestion chips | (inline in ChatPanel) | Small |

### Phase 4: PDF Export

**Goal:** Export workflow as formatted PDF with diagram + step details.

| Task | Files | Effort |
|------|-------|--------|
| Install `jspdf` dependency | `package.json` | Tiny |
| Create `PDFExporter` utility | `components/feature/process-studio/PDFExporter.tsx` | Medium |
| Add export button to toolbar | (update Toolbar) | Tiny |

### Phase 5: Polish & Templates

**Goal:** Template library, import/export JSON, keyboard shortcuts.

| Task | Files | Effort |
|------|-------|--------|
| Template selector modal with previews | `TemplateSelector.tsx` | Small |
| JSON import/export | (update Toolbar) | Small |
| Keyboard shortcuts (Ctrl+S, Ctrl+Z, etc.) | (update page) | Small |
| Responsive layout adjustments | (CSS) | Small |

---

## 15. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **UI Framework** | React 19 + Next.js 16 | Existing stack |
| **Canvas** | ReactFlow (`reactflow` or `@xyflow/react`) | Existing in project; check which version |
| **Server State** | React Query (TanStack Query) | CRUD, templates, AI calls |
| **Client State** | Zustand + React hooks (`useNodesState`, `useEdgesState`) | UI state + canvas state |
| **AI** | Gemini 2.0 Flash via `@google/generative-ai` | Existing SDK in project |
| **Database** | Supabase (PostgreSQL) | Existing; new tables with RLS |
| **PDF** | `html-to-image` + `jspdf` | `html-to-image` already in project |
| **Layout** | Dagre (`@dagrejs/dagre`) or manual | For auto-arranging AI-generated graphs |
| **Styling** | CSS Modules (`.module.css`) | Follows existing TutorWise pattern |

---

## 16. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **AI prompt injection** | Sanitize user input before including in AI prompts; validate AI output structure before applying |
| **XSS via node labels** | React's default escaping handles this; avoid `dangerouslySetInnerHTML` |
| **Data access** | RLS policies ensure users only see their own workflows; admins see all |
| **API rate limiting** | AI endpoints should have rate limits (e.g., 20 parse calls/min, 60 chat calls/min) |
| **Input validation** | Validate node/edge structure server-side before persisting |
| **Export size** | Limit PDF export to reasonable workflow sizes (< 200 nodes) |

---

## 17. Testing Strategy

| Layer | Approach | Tools |
|-------|----------|-------|
| **Components** | Unit tests for ProcessStepNode, ChatPanel, PropertiesDrawer | Jest + React Testing Library |
| **Hooks** | Unit tests for useProcessStudio, useUndoRedo | Jest + renderHook |
| **API Routes** | Integration tests for CRUD + AI endpoints | Jest + supertest patterns |
| **AI Quality** | Manual testing with diverse process descriptions | Sample inputs doc |
| **E2E** | Critical flows: create → edit → save → export | Playwright (if available) |
| **Build** | Must pass `npm run build` with zero errors | Pre-commit hook |

---

## 18. Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| **Color not sole differentiator** (1.4.1) | Node types use icon + label + color together; icons are primary differentiator |
| **Keyboard navigation** (2.1.1) | ReactFlow provides built-in keyboard nav (Tab through nodes, Enter to select, Arrow keys to pan). ChatPanel and PropertiesDrawer use standard form keyboard nav |
| **Focus visible** (2.4.7) | All interactive elements show visible focus ring via CSS Modules (`outline: 2px solid var(--color-primary)`) |
| **ARIA labels** (4.1.2) | Canvas: `role="application"` with `aria-label="Process workflow editor"`. Nodes: `aria-label="{type}: {label}"`. ChatPanel: `role="log"` with `aria-live="polite"` for AI responses |
| **Screen reader announcements** | AI canvas updates announced via `aria-live="assertive"` region: "Added node: {label}" |
| **Color contrast** (1.4.3) | All text meets 4.5:1 ratio. Node border colors on white bg verified. Status text uses `--color-gray-700` minimum |
| **Touch targets** (2.5.5) | Toolbar buttons min 32×32px (compact height). Node minimum 240×60px |

---

## 19. UX States

### 19.1 Empty States

| Context | Component | Content |
|---------|-----------|---------|
| **New canvas** (no process loaded) | `HubEmptyState` | Icon: workflow diagram. Title: "Design your first process". Description: "Start from a template, describe your workflow to AI, or build manually." CTAs: [Start from Template] [Describe to AI] [Build Manually] |
| **No saved processes** (list view) | `HubEmptyState` | Icon: folder. Title: "No saved processes". Description: "Create a process to get started." CTA: [Create Process] |
| **No templates match filter** | `HubEmptyState` | Icon: search. Title: "No templates found". Description: "Try a different category or create from scratch." |
| **Chat panel empty** | Inline | Placeholder: "Describe a change to your workflow, or ask me to generate one from scratch." + suggestion chips |

### 19.2 Loading States

| Context | Component | Behavior |
|---------|-----------|----------|
| **Process loading** | `LoadingSkeleton` | Canvas area shows skeleton with node placeholders |
| **Template list loading** | `LoadingSkeleton` | Grid of skeleton cards |
| **AI generating** | Inline spinner + progress | ChatPanel shows typing indicator. Canvas shows "Generating..." overlay. Nodes stream in via Supabase Realtime |
| **Saving** | Toolbar indicator | Save status: "Saving..." with spinner → "Saved" with checkmark |
| **PDF exporting** | Modal | "Generating PDF..." with progress bar |

### 19.3 Error States

| Context | Component | Recovery |
|---------|-----------|----------|
| **AI parse returns empty/invalid** | `Message` (error variant) | "AI couldn't parse that description. Try being more specific, or build manually." + [Try Again] [Build Manually] |
| **AI chat mutation fails** | ChatPanel error message | "Couldn't apply that change. Try rephrasing." + undo available |
| **Save fails (network)** | Toast notification (error) | "Save failed. Your work is safe in browser storage." + [Retry Save] |
| **Supabase Realtime disconnects** | Toast notification (warning) | "Real-time connection lost. Reconnecting..." + auto-reconnect with exponential backoff |
| **PDF export fails** | Modal error | "Export failed for workflows over 200 nodes. Try simplifying." |
| **Template load fails** | `Message` (error variant) | "Couldn't load templates. Check your connection." + [Retry] |

---

## 20. Monitoring & Observability

| What | How | Where |
|------|-----|-------|
| **AI API success/failure rates** | Structured logging with `console.log(JSON.stringify({...}))` | API routes: `/api/process-studio/parse`, `/api/process-studio/chat` |
| **AI response quality** | Log token counts, response time, whether output passed validation | Same API routes |
| **Supabase Realtime health** | Monitor channel subscription status, reconnect events | Client-side: `useCanvasRealtime` hook |
| **Save success/failure** | Log save attempts, failures, localStorage fallback usage | `useAutoSave` hook + CRUD API routes |
| **Error tracking** | Unhandled errors captured by Vercel error boundary | Vercel dashboard |
| **Performance** | Canvas render time for workflows > 20 nodes | Client-side performance marks |

---

## 21. Database Migration Rollback

**Migration:** `tools/database/migrations/330_create_workflow_processes.sql`

**Rollback SQL** (stored as comment in migration file):

```sql
-- ROLLBACK: DROP TABLE workflow_process_templates; DROP TABLE workflow_processes;
```

**Schema evolution strategy:** If node/edge JSONB schema changes after data exists:
1. Add new fields as optional (backward compatible)
2. Create a data migration script for existing rows
3. Never remove fields without a migration that handles existing data
4. Version the JSONB schema via a `schema_version` column if breaking changes are needed

---

## 22. Future Enhancements (Out of Scope for V1)

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **PDF/Image input** | Upload a process map image/PDF, AI extracts steps via vision | P2 |
| **Workflow execution** | Actually run the process (assign tasks, track completion) | P3 |
| **Collaboration** | Multiple users editing same workflow (Supabase Realtime) | P3 |
| **Version history** | Track revisions, diff view, rollback | P2 |
| **BPMN import/export** | Standard format interoperability | P3 |
| **Process analytics** | Track actual onboarding times vs estimates | P3 |
| **Template marketplace** | Share templates between organizations | P4 |
| **CAS integration** | CAS agents generate/optimize onboarding workflows | P3 |
| **Process mining** | Discover actual processes from event logs (Fuchsia module) | P4 |

---

## 23. Dependencies & Risks

### New Dependencies

| Package | Purpose | Size Impact |
|---------|---------|------------|
| `jspdf` | PDF generation | ~300KB |
| `@dagrejs/dagre` | Auto-layout for AI-generated graphs | ~30KB |

Both are well-maintained, widely used packages.

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI generates poor workflow structure | Medium | Medium | Strong prompts with examples; manual edit always available |
| ReactFlow version conflicts | Low | High | Check existing `reactflow` version; use same |
| Performance with large workflows (50+ nodes) | Low | Medium | Limit node count; virtualization if needed |
| Chat mutation correctness | Medium | Medium | Always include undo; snapshot before mutation |
| PDF export quality | Low | Low | Canvas capture is proven; `jsPDF` is mature |

---

## 24. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| AI parse accuracy | 80%+ steps correctly identified | Manual review of 20 test inputs |
| Chat mutation success rate | 90%+ correct on first try | Logged mutation results |
| Time to create workflow | < 5 min for standard onboarding | User testing |
| PDF export quality | Professional-quality output | Visual review |
| User satisfaction | Users prefer this over manual diagramming | Feedback |

---

## 25. Open Questions

1. **ReactFlow version:** The project has `reactflow` (v11) in some places and `@xyflow/react` (v12) in Fuchsia. Which should the Process Studio use?
   - **Recommendation:** Use whichever version is currently installed in `apps/web/package.json` for consistency.
   - **Action:** Check before Phase 1 starts.

2. ~~**Route placement:** Should the Process Studio be under `/admin/` (admin-only) or top-level (all authenticated users)?~~
   - **RESOLVED (3.2):** `/admin/process-studio` — admin dashboard, alongside existing visualizer. Future: expose top-level when ready.

3. **Process scope:** The requirements mention "employee onboarding" specifically. Should the builder be generic (any process) or onboarding-specific?
   - **Recommendation:** Build generic but seed templates for onboarding. The node types and fields work for any process.

4. **Offline support:** Should the builder work offline with localStorage fallback?
   - **Recommendation:** Yes for editing (localStorage auto-save), no for AI features (requires API).

---

## 26. References

| Document | Location | Relevance |
|----------|----------|-----------|
| Process Studio Requirements | `fuchsia/process-studio-requirements.md` | Source requirements |
| Fuchsia Blog Article | `fuchsia/fuchsia-blog-article.pdf` | Reference architecture + UI patterns |
| Fuchsia PRD | `projects/fuschia/PRD.md` | Enterprise automation context |
| Fuchsia YAML Canvas Update | `projects/fuschia/YAML_CANVAS_UPDATE_FEATURE.md` | Chat → canvas update pattern |
| Fuchsia Workflow Properties | `projects/fuschia/frontend/src/components/workflow/README-workflow-properties.md` | Properties drawer pattern |
| CAS Solution Design | `cas/docs/CAS-SOLUTION-DESIGN.md` | Existing TutorWise architecture |
| CAS Roadmap | `cas/docs/CAS-ROADMAP.md` | Platform context |
| TutorWise Design System | `.ai/6-DESIGN-SYSTEM.md` | UI/UX standards, tokens, component patterns |
| TutorWise Patterns | `.ai/4-PATTERNS.md` | Code conventions, state management, naming |
| WorkflowVisualizer | `cas/packages/core/src/admin/WorkflowVisualizer.tsx` | Existing ReactFlow patterns |
| WorkflowVisualizerAdvanced | `cas/packages/core/src/admin/WorkflowVisualizerAdvanced.tsx` | Export + persistence patterns |

---

**END OF DOCUMENT**
