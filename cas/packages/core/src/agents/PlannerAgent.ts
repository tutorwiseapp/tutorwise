/**
 * Planner Agent - Strategic PDM (Product Delivery Manager)
 *
 * Combines roles:
 * - Product Manager: Product vision, roadmap, strategic prioritization
 * - Delivery Manager: Agent coordination, workflow orchestration
 * - Lead Architect: Technical architecture decisions (ADRs, RFCs)
 * - Co-founder: Strategic business decisions
 *
 * Workflow Philosophy: Kanban continuous delivery (not Scrum)
 * - Continuous flow, no sprints
 * - WIP limits and pull-based system
 * - Cycle time / lead time metrics
 * - Continuous prioritization
 *
 * Uses Gemini AI for intelligent planning and decision-making
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AgentExecutorInterface, AgentExecutionContext, AgentExecutionResult, AgentCapability } from './AgentExecutorInterface';

export class PlannerAgent implements AgentExecutorInterface {
  readonly agentId = 'planner';
  readonly name = 'Planner Agent (Strategic PDM)';
  readonly description = 'AI agent combining Product Manager, Delivery Manager, Lead Architect, and Co-founder roles with Kanban continuous delivery';

  private genAI: GoogleGenerativeAI | null = null;

  readonly capabilities: AgentCapability[] = [
    // Project Planning (Delivery Manager)
    { name: 'create_plan', description: 'Create project plan with tasks and milestones' },
    { name: 'breakdown_tasks', description: 'Break down large tasks into smaller subtasks' },
    { name: 'estimate_timeline', description: 'Estimate project timeline and dependencies' },
    { name: 'allocate_resources', description: 'Suggest resource allocation and assignment' },

    // Product Management (Product Manager)
    { name: 'create_roadmap', description: 'Create product roadmap with strategic priorities' },
    { name: 'set_okrs', description: 'Define OKRs and strategic goals' },
    { name: 'prioritize_backlog', description: 'Continuously prioritize backlog based on value and urgency' },

    // Architecture (Lead Architect)
    { name: 'create_adr', description: 'Create Architectural Decision Record (ADR)' },
    { name: 'review_rfc', description: 'Review technical RFC (Request for Comments)' },

    // Kanban Flow Management (Delivery Manager)
    { name: 'manage_kanban_flow', description: 'Manage Kanban flow: WIP limits, cycle time, lead time' },
    { name: 'identify_blockers', description: 'Identify blockers in continuous flow' },

    // Strategic Decisions (Co-founder)
    { name: 'make_strategic_decision', description: 'Make strategic business decisions' }
  ];

  async initialize(): Promise<void> {
    console.log(`[${this.agentId}] Initializing Planner Agent...`);

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.warn(`[${this.agentId}] GOOGLE_AI_API_KEY not found - agent will run in offline mode`);
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log(`[${this.agentId}] Gemini AI client initialized`);
    }

    console.log(`[${this.agentId}] Initialized successfully`);
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { taskId, input, onProgress, onLog } = context;

    try {
      onLog?.('info', `Starting task ${taskId}`, { input });
      onProgress?.(0.1, 'Analyzing request...');

      const action = input.action;
      if (!action) {
        throw new Error('No action specified');
      }

      onProgress?.(0.3, `Executing ${action}...`);

      let result;
      switch (action) {
        // Project Planning
        case 'create_plan':
          result = await this.createPlan(input, context);
          break;
        case 'breakdown_tasks':
          result = await this.breakdownTasks(input, context);
          break;
        case 'estimate_timeline':
          result = await this.estimateTimeline(input, context);
          break;
        case 'allocate_resources':
          result = await this.allocateResources(input, context);
          break;

        // Product Management
        case 'create_roadmap':
          result = await this.createRoadmap(input, context);
          break;
        case 'set_okrs':
          result = await this.setOKRs(input, context);
          break;
        case 'prioritize_backlog':
          result = await this.prioritizeBacklog(input, context);
          break;

        // Architecture
        case 'create_adr':
          result = await this.createADR(input, context);
          break;
        case 'review_rfc':
          result = await this.reviewRFC(input, context);
          break;

        // Kanban Flow Management
        case 'manage_kanban_flow':
          result = await this.manageKanbanFlow(input, context);
          break;
        case 'identify_blockers':
          result = await this.identifyBlockers(input, context);
          break;

        // Strategic Decisions
        case 'make_strategic_decision':
          result = await this.makeStrategicDecision(input, context);
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      onProgress?.(1.0, 'Task completed');
      onLog?.('info', `Task ${taskId} completed successfully`);

      return {
        output: result,
        status: 'success',
        metadata: {
          action,
          completedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      onLog?.('error', `Task ${taskId} failed: ${error.message}`, { error });
      return {
        output: {},
        status: 'error',
        error: error.message
      };
    }
  }

  // ============================================================================
  // AI-Powered Planning Methods
  // ============================================================================

  private async createPlan(input: any, context: AgentExecutionContext): Promise<any> {
    const { project_description, scope, team_size = 5, constraints = [] } = input;

    context.onProgress?.(0.5, 'Creating project plan...');

    if (!this.genAI || !project_description) {
      context.onLog?.('warn', 'Running in offline mode - returning placeholder');
      return {
        project_name: input.project_name || 'New Project',
        duration_weeks: 12,
        phases: [],
        milestones: [],
        ai_generated: false
      };
    }

    try {
      context.onLog?.('info', 'Generating plan with Gemini AI');

      const prompt = `You are a project manager. Create a detailed project plan.

Project Description: ${project_description}
${scope ? `Scope: ${scope}` : ''}
Team Size: ${team_size}
${constraints.length > 0 ? `Constraints: ${constraints.join(', ')}` : ''}

Provide a JSON response with:
{
  "project_name": "Brief project name",
  "duration_weeks": <number>,
  "phases": [
    {
      "phase": "Phase name",
      "weeks": <number>,
      "tasks": ["task 1", "task 2"],
      "deliverables": ["deliverable 1"]
    }
  ],
  "milestones": [
    {"name": "Milestone", "week": <number>, "criteria": "Completion criteria"}
  ],
  "risks": ["risk 1", "risk 2"],
  "assumptions": ["assumption 1"]
}

Focus on realistic timelines and achievable milestones.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      context.onProgress?.(0.9, 'Processing plan...');

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash'
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse plan JSON');
      }

      return {
        raw_plan: response,
        ai_generated: true,
        model: 'gemini-2.0-flash'
      };

    } catch (error: any) {
      context.onLog?.('error', `Plan creation failed: ${error.message}`, { error });
      return {
        project_name: input.project_name || 'New Project',
        error: error.message,
        ai_generated: false
      };
    }
  }

  private async breakdownTasks(input: any, context: AgentExecutionContext): Promise<any> {
    const { task_description, complexity = 'medium' } = input;

    context.onProgress?.(0.5, 'Breaking down tasks...');

    if (!this.genAI || !task_description) {
      return {
        original_task: task_description || 'Task',
        subtasks: [],
        ai_generated: false
      };
    }

    try {
      context.onLog?.('info', 'Breaking down task with Gemini AI');

      const prompt = `You are a technical project manager. Break down this task into subtasks.

Task: ${task_description}
Complexity: ${complexity}

Provide a JSON response with:
{
  "original_task": "${task_description}",
  "subtasks": [
    {
      "id": <number>,
      "name": "Subtask name",
      "estimated_hours": <number>,
      "dependencies": [<array of subtask ids>],
      "skills_required": ["skill1", "skill2"]
    }
  ],
  "total_estimated_hours": <number>,
  "critical_path": [<array of subtask ids>]
}

Make subtasks specific, measurable, and realistic.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash'
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse breakdown JSON');
      }

      return {
        original_task: task_description,
        raw_breakdown: response,
        ai_generated: true
      };

    } catch (error: any) {
      context.onLog?.('error', `Task breakdown failed: ${error.message}`, { error });
      return {
        original_task: task_description,
        error: error.message,
        ai_generated: false
      };
    }
  }

  private async estimateTimeline(input: any, context: AgentExecutionContext): Promise<any> {
    context.onProgress?.(0.5, 'Estimating timeline...');

    // Placeholder (can be enhanced with AI)
    return {
      project_complexity: 'medium',
      team_size: input.team_size || 5,
      estimated_duration_weeks: 12,
      confidence_level: 0.80,
      assumptions: ['Team velocity stable'],
      risks: ['Scope creep'],
      ai_generated: this.genAI !== null
    };
  }

  private async allocateResources(input: any, context: AgentExecutionContext): Promise<any> {
    context.onProgress?.(0.5, 'Allocating resources...');

    // Placeholder (can be enhanced with AI)
    return {
      recommendations: [],
      total_person_weeks: 24,
      ai_generated: this.genAI !== null
    };
  }

  // ============================================================================
  // Product Management Methods
  // ============================================================================

  private async createRoadmap(input: any, context: AgentExecutionContext): Promise<any> {
    const { business_goals = [], time_horizon = '12 months', constraints = [] } = input;

    context.onProgress?.(0.5, 'Creating product roadmap...');

    if (!this.genAI) {
      return {
        roadmap_name: 'Product Roadmap',
        quarters: [],
        ai_generated: false
      };
    }

    try {
      const prompt = `You are a strategic product manager. Create a product roadmap.

Business Goals: ${business_goals.join(', ')}
Time Horizon: ${time_horizon}
${constraints.length > 0 ? `Constraints: ${constraints.join(', ')}` : ''}

Provide a JSON response with:
{
  "roadmap_name": "Q1-Q4 2026 Product Roadmap",
  "quarters": [
    {
      "quarter": "Q1 2026",
      "theme": "Foundation & Growth",
      "objectives": ["Objective 1", "Objective 2"],
      "key_features": [
        {
          "name": "Feature name",
          "priority": "P0|P1|P2",
          "business_value": "Description of business impact",
          "estimated_effort_weeks": <number>
        }
      ],
      "success_metrics": ["Metric 1: Target"]
    }
  ],
  "strategic_bets": ["Bet 1", "Bet 2"],
  "risks": ["Risk 1", "Risk 2"]
}

Focus on business value and strategic alignment.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 3072
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash'
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse roadmap JSON');
      }

      return {
        raw_roadmap: response,
        ai_generated: true
      };

    } catch (error: any) {
      context.onLog?.('error', `Roadmap creation failed: ${error.message}`);
      return {
        error: error.message,
        ai_generated: false
      };
    }
  }

  private async setOKRs(input: any, context: AgentExecutionContext): Promise<any> {
    const { period = 'Q1 2026', company_objectives = [], team = 'Product' } = input;

    context.onProgress?.(0.5, 'Setting OKRs...');

    if (!this.genAI) {
      return {
        period,
        objectives: [],
        ai_generated: false
      };
    }

    try {
      const prompt = `You are a strategic leader. Define OKRs (Objectives and Key Results).

Period: ${period}
Team: ${team}
${company_objectives.length > 0 ? `Company Objectives: ${company_objectives.join(', ')}` : ''}

Provide a JSON response with:
{
  "period": "${period}",
  "team": "${team}",
  "objectives": [
    {
      "objective": "Clear, inspiring objective statement",
      "why": "Why this matters to the business",
      "key_results": [
        {
          "kr": "Measurable key result",
          "baseline": "Current state",
          "target": "Goal state",
          "measurement": "How to measure"
        }
      ],
      "confidence": "0.7 (70% confidence of achieving)"
    }
  ],
  "alignment": "How these align with company objectives"
}

Make objectives ambitious but achievable. Key results must be measurable.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash'
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse OKRs JSON');
      }

      return {
        raw_okrs: response,
        ai_generated: true
      };

    } catch (error: any) {
      context.onLog?.('error', `OKR setting failed: ${error.message}`);
      return {
        error: error.message,
        ai_generated: false
      };
    }
  }

  private async prioritizeBacklog(input: any, context: AgentExecutionContext): Promise<any> {
    const { backlog_items = [], criteria = ['business_value', 'effort', 'urgency'] } = input;

    context.onProgress?.(0.5, 'Prioritizing backlog...');

    if (!this.genAI || backlog_items.length === 0) {
      return {
        prioritized_items: backlog_items,
        ai_generated: false
      };
    }

    try {
      const prompt = `You are a product manager using Kanban continuous delivery. Prioritize this backlog.

Backlog Items:
${backlog_items.map((item: any, i: number) => `${i + 1}. ${typeof item === 'string' ? item : item.title || item.name}`).join('\n')}

Criteria: ${criteria.join(', ')}

Provide a JSON response with:
{
  "prioritized_items": [
    {
      "rank": 1,
      "item": "Item name/description",
      "priority": "P0|P1|P2",
      "justification": "Why this ranking",
      "business_value": "high|medium|low",
      "effort": "high|medium|low",
      "urgency": "high|medium|low",
      "recommended_action": "Start now|Queue|Defer"
    }
  ],
  "wip_limit_recommendation": <number>,
  "notes": "Strategic notes on prioritization"
}

Use Kanban principles: pull highest value work when capacity available.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash'
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse backlog JSON');
      }

      return {
        raw_prioritization: response,
        ai_generated: true
      };

    } catch (error: any) {
      context.onLog?.('error', `Backlog prioritization failed: ${error.message}`);
      return {
        error: error.message,
        ai_generated: false
      };
    }
  }

  // ============================================================================
  // Architecture Methods (Lead Architect)
  // ============================================================================

  private async createADR(input: any, context: AgentExecutionContext): Promise<any> {
    const { decision_context, problem_statement, options = [], constraints = [] } = input;

    context.onProgress?.(0.5, 'Creating ADR...');

    if (!this.genAI || !problem_statement) {
      return {
        adr_title: 'Architecture Decision Record',
        status: 'proposed',
        ai_generated: false
      };
    }

    try {
      const prompt = `You are a lead architect. Create an Architectural Decision Record (ADR).

Context: ${decision_context}
Problem: ${problem_statement}
${options.length > 0 ? `Options Considered: ${options.join(', ')}` : ''}
${constraints.length > 0 ? `Constraints: ${constraints.join(', ')}` : ''}

Provide a JSON response following ADR format:
{
  "adr_number": <next ADR number>,
  "title": "Brief decision title",
  "status": "proposed|accepted|deprecated",
  "context": "What is the architectural issue?",
  "decision": "What is the change we're proposing?",
  "consequences": {
    "positive": ["Benefit 1", "Benefit 2"],
    "negative": ["Trade-off 1", "Trade-off 2"],
    "risks": ["Risk 1", "Risk 2"]
  },
  "alternatives_considered": [
    {
      "option": "Alternative approach",
      "pros": ["Pro 1"],
      "cons": ["Con 1"],
      "why_not_chosen": "Reason"
    }
  ],
  "implementation_notes": "How to implement this decision"
}

Be thorough in analyzing trade-offs and consequences.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash',
            created_at: new Date().toISOString()
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse ADR JSON');
      }

      return {
        raw_adr: response,
        ai_generated: true
      };

    } catch (error: any) {
      context.onLog?.('error', `ADR creation failed: ${error.message}`);
      return {
        error: error.message,
        ai_generated: false
      };
    }
  }

  private async reviewRFC(input: any, context: AgentExecutionContext): Promise<any> {
    const { rfc_title, rfc_content, technical_area = 'general' } = input;

    context.onProgress?.(0.5, 'Reviewing RFC...');

    if (!this.genAI || !rfc_content) {
      return {
        review_status: 'pending',
        ai_generated: false
      };
    }

    try {
      const prompt = `You are a lead architect reviewing a technical RFC (Request for Comments).

RFC Title: ${rfc_title}
Technical Area: ${technical_area}

RFC Content:
${rfc_content}

Provide a JSON response with your review:
{
  "review_status": "approved|approved_with_changes|needs_revision|rejected",
  "summary": "Brief summary of the RFC proposal",
  "strengths": ["Strength 1", "Strength 2"],
  "concerns": [
    {
      "concern": "Issue description",
      "severity": "critical|major|minor",
      "recommendation": "How to address"
    }
  ],
  "architecture_alignment": "How well this aligns with existing architecture",
  "scalability_assessment": "Will this scale?",
  "maintainability_assessment": "Is this maintainable?",
  "security_considerations": ["Security point 1", "Security point 2"],
  "performance_impact": "Expected performance impact",
  "recommended_changes": ["Change 1", "Change 2"],
  "approval_conditions": ["Condition 1", "Condition 2"],
  "overall_recommendation": "Final recommendation"
}

Be thorough and constructive. Focus on long-term impact.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash',
            reviewed_at: new Date().toISOString()
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse RFC review JSON');
      }

      return {
        raw_review: response,
        ai_generated: true
      };

    } catch (error: any) {
      context.onLog?.('error', `RFC review failed: ${error.message}`);
      return {
        error: error.message,
        ai_generated: false
      };
    }
  }

  // ============================================================================
  // Kanban Flow Management Methods
  // ============================================================================

  private async manageKanbanFlow(input: any, context: AgentExecutionContext): Promise<any> {
    const {
      current_wip = 0,
      wip_limit = 5,
      items_in_progress = [],
      cycle_times = [],
      lead_times = []
    } = input;

    context.onProgress?.(0.5, 'Analyzing Kanban flow...');

    if (!this.genAI) {
      return {
        flow_health: 'unknown',
        recommendations: [],
        ai_generated: false
      };
    }

    try {
      const avgCycleTime = cycle_times.length > 0
        ? cycle_times.reduce((a: number, b: number) => a + b, 0) / cycle_times.length
        : 0;
      const avgLeadTime = lead_times.length > 0
        ? lead_times.reduce((a: number, b: number) => a + b, 0) / lead_times.length
        : 0;

      const prompt = `You are a delivery manager using Kanban methodology. Analyze this flow.

Current State:
- Work In Progress (WIP): ${current_wip}
- WIP Limit: ${wip_limit}
- Items in progress: ${items_in_progress.length}
- Average Cycle Time: ${avgCycleTime.toFixed(1)} days
- Average Lead Time: ${avgLeadTime.toFixed(1)} days

Provide a JSON response with:
{
  "flow_health": "healthy|warning|critical",
  "wip_status": {
    "current": ${current_wip},
    "limit": ${wip_limit},
    "utilization": "${((current_wip / wip_limit) * 100).toFixed(0)}%",
    "recommendation": "Increase|Decrease|Maintain WIP limit"
  },
  "cycle_time_analysis": {
    "average_days": ${avgCycleTime.toFixed(1)},
    "trend": "improving|stable|degrading",
    "target_days": <recommended target>,
    "improvement_actions": ["Action 1", "Action 2"]
  },
  "lead_time_analysis": {
    "average_days": ${avgLeadTime.toFixed(1)},
    "bottlenecks": ["Bottleneck 1", "Bottleneck 2"]
  },
  "recommendations": [
    {
      "action": "Action to take",
      "impact": "Expected impact",
      "priority": "high|medium|low"
    }
  ],
  "flow_efficiency": "Calculation of flow efficiency %"
}

Focus on continuous improvement and smooth flow.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash',
            analyzed_at: new Date().toISOString()
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse Kanban flow JSON');
      }

      return {
        raw_analysis: response,
        ai_generated: true
      };

    } catch (error: any) {
      context.onLog?.('error', `Kanban flow analysis failed: ${error.message}`);
      return {
        error: error.message,
        ai_generated: false
      };
    }
  }

  private async identifyBlockers(input: any, context: AgentExecutionContext): Promise<any> {
    const { items = [], agent_statuses = {} } = input;

    context.onProgress?.(0.5, 'Identifying blockers...');

    if (!this.genAI) {
      return {
        blockers: [],
        ai_generated: false
      };
    }

    try {
      const prompt = `You are a delivery manager. Identify blockers in continuous flow.

Items in Progress:
${items.map((item: any, i: number) => `${i + 1}. ${typeof item === 'string' ? item : item.title || item.name} - Age: ${item.age_days || 'unknown'} days`).join('\n')}

Agent Statuses:
${Object.entries(agent_statuses).map(([agent, status]) => `${agent}: ${JSON.stringify(status)}`).join('\n')}

Provide a JSON response with:
{
  "blockers": [
    {
      "blocker_id": <unique id>,
      "type": "dependency|resource|technical|external",
      "severity": "critical|high|medium|low",
      "blocked_item": "Item name",
      "blocking_reason": "Why it's blocked",
      "impact": "Business impact of this blocker",
      "recommended_action": "How to unblock",
      "owner": "Who should resolve this",
      "estimated_resolution_time": "<time estimate>"
    }
  ],
  "flow_impediments": ["Systemic issue 1", "Systemic issue 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Prioritize by business impact and age of blocker.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash',
            identified_at: new Date().toISOString()
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse blockers JSON');
      }

      return {
        raw_blockers: response,
        ai_generated: true
      };

    } catch (error: any) {
      context.onLog?.('error', `Blocker identification failed: ${error.message}`);
      return {
        error: error.message,
        ai_generated: false
      };
    }
  }

  // ============================================================================
  // Strategic Decision Methods (Co-founder)
  // ============================================================================

  private async makeStrategicDecision(input: any, context: AgentExecutionContext): Promise<any> {
    const {
      decision_type = 'general',
      situation,
      options = [],
      stakeholders = [],
      constraints = [],
      data = {}
    } = input;

    context.onProgress?.(0.5, 'Making strategic decision...');

    if (!this.genAI || !situation) {
      return {
        decision: 'pending',
        ai_generated: false
      };
    }

    try {
      const prompt = `You are a strategic co-founder making a business decision.

Decision Type: ${decision_type}
Situation: ${situation}
${options.length > 0 ? `Options: ${options.join(', ')}` : ''}
${stakeholders.length > 0 ? `Stakeholders: ${stakeholders.join(', ')}` : ''}
${constraints.length > 0 ? `Constraints: ${constraints.join(', ')}` : ''}
${Object.keys(data).length > 0 ? `Data: ${JSON.stringify(data)}` : ''}

Provide a JSON response with:
{
  "decision": "Clear, actionable decision",
  "rationale": "Why this decision makes strategic sense",
  "analysis": {
    "options_evaluated": [
      {
        "option": "Option name",
        "pros": ["Pro 1", "Pro 2"],
        "cons": ["Con 1", "Con 2"],
        "risk_level": "high|medium|low",
        "alignment_with_vision": "How it aligns"
      }
    ],
    "recommended_option": "Which option to choose",
    "confidence_level": "0.8 (80% confidence)"
  },
  "implementation_plan": {
    "immediate_actions": ["Action 1", "Action 2"],
    "timeline": "Expected timeline",
    "resources_needed": ["Resource 1", "Resource 2"],
    "success_metrics": ["Metric 1", "Metric 2"]
  },
  "risks": [
    {
      "risk": "Risk description",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation": "How to mitigate"
    }
  ],
  "stakeholder_communication": "How to communicate this decision",
  "reversibility": "Can this decision be reversed? How?"
}

Think long-term. Consider second-order effects.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 3072
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash',
            decided_at: new Date().toISOString()
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse strategic decision JSON');
      }

      return {
        raw_decision: response,
        ai_generated: true
      };

    } catch (error: any) {
      context.onLog?.('error', `Strategic decision failed: ${error.message}`);
      return {
        error: error.message,
        ai_generated: false
      };
    }
  }

  validateInput(capability: string, input: any): boolean {
    return true;
  }

  async getHealth(): Promise<{ healthy: boolean; message?: string }> {
    return {
      healthy: true,
      message: `AI Provider: ${this.genAI ? 'Gemini' : 'offline'}`
    };
  }

  async cleanup(): Promise<void> {
    console.log(`[${this.agentId}] Cleaning up resources...`);
  }
}
