/**
 * Planner Agent - Scrum Master + Delivery Manager + Flow Manager
 *
 * Responsibilities:
 * - Kanban board management (backlog, WIP limits, flow)
 * - Task creation from Three Amigos output
 * - WIP limit enforcement (max 3 in-progress)
 * - Cycle time tracking and bottleneck detection
 * - Backlog prioritization using LLM
 *
 * Uses cas_planner_tasks table for persistent Kanban board.
 * AI-Native: Uses LLM for prioritization and bottleneck detection.
 *
 * @agent Planner Agent
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { casGenerate, casGenerateStructured } from '../../../packages/core/src/services/cas-ai';

const PLANNER_SYSTEM_PROMPT = `You are the Planner Agent for TutorWise, acting as Scrum Master, Delivery Manager, and Flow Manager.
You manage a Kanban board for continuous delivery (not sprints).
Your principles: limit WIP (max 3), optimise flow, detect bottlenecks, prioritise by impact.
Be pragmatic. Focus on throughput and cycle time, not ceremony.`;

const WIP_LIMIT = 3;

export interface KanbanTask {
  id?: string;
  title: string;
  description: string;
  task_type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'dismissed';
  assigned_to?: string;
  estimated_impact?: string;
  created_at?: string;
}

export interface PlannerWorkPlan {
  taskId: string | null;
  canProceed: boolean;
  wipStatus: { count: number; limit: number; atCapacity: boolean };
  reasoning: string;
  directives: string[];
}

class PlannerAgent {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.initSupabase();
  }

  private initSupabase(): void {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  /**
   * Plan work based on Director decision and Three Amigos report.
   * Creates a Kanban task, checks WIP limits, returns work plan.
   */
  public async planWork(
    directorDecision: { decision: string; directives: string[]; reasoning: string },
    threeAmigosReport?: {
      acceptanceCriteria?: string[];
      technicalConstraints?: string[];
      testStrategy?: string;
    },
    featureName?: string
  ): Promise<PlannerWorkPlan> {
    console.log('▶️ Planner Agent: Planning work...');

    // Check WIP limits
    const wipStatus = await this.checkWIPLimits();

    if (directorDecision.decision === 'DEFER') {
      return {
        taskId: null,
        canProceed: false,
        wipStatus,
        reasoning: 'Director deferred this feature. Adding to backlog for future consideration.',
        directives: ['📅 Feature deferred. Will be reconsidered in future planning.'],
      };
    }

    if (directorDecision.decision === 'ITERATE') {
      return {
        taskId: null,
        canProceed: false,
        wipStatus,
        reasoning: 'Director requires iteration on this feature before proceeding.',
        directives: directorDecision.directives,
      };
    }

    // PROCEED — create task and check WIP
    const taskDescription = this.buildTaskDescription(threeAmigosReport);

    const task = await this.createTask({
      title: featureName || 'New Feature',
      description: taskDescription,
      task_type: 'feature',
      priority: 'high',
      source: 'cas_workflow',
      status: wipStatus.atCapacity ? 'pending' : 'in_progress',
    });

    if (wipStatus.atCapacity) {
      return {
        taskId: task,
        canProceed: false,
        wipStatus,
        reasoning: `WIP limit reached (${wipStatus.count}/${wipStatus.limit}). Task queued in backlog.`,
        directives: [
          `⏳ Task created but queued — ${wipStatus.count} tasks already in progress.`,
          '📋 Complete an existing task before starting new work.',
        ],
      };
    }

    return {
      taskId: task,
      canProceed: true,
      wipStatus,
      reasoning: `Task created and ready to start. WIP: ${wipStatus.count + 1}/${wipStatus.limit}.`,
      directives: [
        '✅ Task created and moved to In Progress.',
        '🔄 Proceed to Developer for implementation planning.',
        ...directorDecision.directives,
      ],
    };
  }

  /**
   * Create a task in the Kanban board (cas_planner_tasks table).
   */
  public async createTask(task: Omit<KanbanTask, 'id' | 'created_at'>): Promise<string | null> {
    console.log(`📝 Planner: Creating task: "${task.title}"`);

    if (!this.supabase) {
      console.warn('⚠️ No Supabase connection. Task creation simulated.');
      return `simulated-${Date.now()}`;
    }

    try {
      const { data, error } = await this.supabase
        .from('cas_planner_tasks')
        .insert(task)
        .select('id')
        .single();

      if (error) {
        console.warn(`⚠️ Failed to create task: ${error.message}`);
        return null;
      }

      console.log(`✅ Task created: ${data.id}`);
      return data.id;
    } catch (err: any) {
      console.warn(`⚠️ Task creation error: ${err.message}`);
      return null;
    }
  }

  /**
   * Get the current Kanban board state.
   */
  public async getBoard(): Promise<Record<string, KanbanTask[]>> {
    if (!this.supabase) return { pending: [], in_progress: [], completed: [] };

    try {
      const { data } = await this.supabase
        .from('cas_planner_tasks')
        .select('*')
        .in('status', ['pending', 'approved', 'in_progress', 'completed'])
        .order('created_at', { ascending: false })
        .limit(50);

      const tasks = (data || []) as KanbanTask[];
      const board: Record<string, KanbanTask[]> = {
        pending: tasks.filter(t => t.status === 'pending' || t.status === 'approved'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        completed: tasks.filter(t => t.status === 'completed'),
      };

      return board;
    } catch {
      return { pending: [], in_progress: [], completed: [] };
    }
  }

  /**
   * Move a task to a new status.
   */
  public async moveTask(taskId: string, newStatus: KanbanTask['status']): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('cas_planner_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) {
        console.warn(`⚠️ Failed to move task: ${error.message}`);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check WIP limits. Max 3 in-progress tasks.
   */
  public async checkWIPLimits(): Promise<{ count: number; limit: number; atCapacity: boolean }> {
    if (!this.supabase) {
      return { count: 0, limit: WIP_LIMIT, atCapacity: false };
    }

    try {
      const { count } = await this.supabase
        .from('cas_planner_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      const wipCount = count || 0;
      return {
        count: wipCount,
        limit: WIP_LIMIT,
        atCapacity: wipCount >= WIP_LIMIT,
      };
    } catch {
      return { count: 0, limit: WIP_LIMIT, atCapacity: false };
    }
  }

  /**
   * Detect bottlenecks by analyzing cycle times.
   * Uses LLM for intelligent analysis. Falls back to simple metrics.
   */
  public async detectBottlenecks(): Promise<string> {
    console.log('▶️ Planner: Detecting bottlenecks...');

    const board = await this.getBoard();
    const inProgress = board.in_progress || [];
    const pending = board.pending || [];

    const boardSummary = `Kanban Board Status:
- Pending: ${pending.length} tasks
- In Progress: ${inProgress.length} tasks (WIP limit: ${WIP_LIMIT})
- In Progress tasks: ${inProgress.map(t => `"${t.title}" (priority: ${t.priority})`).join(', ') || 'none'}`;

    const analysis = await casGenerate({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      userPrompt: `Analyze this Kanban board for bottlenecks and flow issues:

${boardSummary}

Identify:
1. Are there bottleneck stages?
2. Are WIP limits being respected?
3. What actions would improve flow?`,
      maxOutputTokens: 500,
    });

    if (analysis) return analysis;

    // Fallback
    if (inProgress.length >= WIP_LIMIT) {
      return `⚠️ WIP at capacity (${inProgress.length}/${WIP_LIMIT}). Complete existing tasks before starting new work.`;
    }
    return `✅ Flow is healthy. ${inProgress.length}/${WIP_LIMIT} WIP, ${pending.length} in backlog.`;
  }

  /**
   * Prioritize backlog using LLM reasoning.
   */
  public async prioritizeBacklog(): Promise<string[]> {
    const board = await this.getBoard();
    const pending = board.pending || [];

    if (pending.length <= 1) return pending.map(t => t.title);

    const llmResult = await casGenerateStructured<{ prioritizedTitles: string[] }>({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      userPrompt: `Prioritize these backlog tasks by impact and urgency:

${pending.map((t, i) => `${i + 1}. "${t.title}" (priority: ${t.priority}, type: ${t.task_type}): ${t.description?.substring(0, 100) || 'no description'}`).join('\n')}

Return them in priority order (highest first).`,
      jsonSchema: `{ "prioritizedTitles": ["task title in priority order"] }`,
      maxOutputTokens: 500,
    });

    return llmResult?.prioritizedTitles || pending.map(t => t.title);
  }

  /**
   * Legacy: Makes a strategic decision based on impact summary.
   * Kept for backward compatibility but now routes to Kanban methods.
   */
  public async makeStrategicDecision(impactSummary: string): Promise<void> {
    console.log('\n▶️ Planner Agent: Processing impact summary...');

    if (impactSummary.includes('**ITERATE**') || impactSummary.includes('ITERATION')) {
      await this.createTask({
        title: 'Iteration: Address production feedback',
        description: impactSummary.substring(0, 500),
        task_type: 'iteration',
        priority: 'high',
        source: 'marketer_feedback',
        status: 'pending',
      });
      console.log('✅ Created iteration task in Kanban backlog.');
    } else if (impactSummary.includes('**SUCCESS**') || impactSummary.includes('SUCCESS')) {
      console.log('✅ Feature successful. Archiving learnings.');
    } else if (impactSummary.includes('**REMOVE**') || impactSummary.includes('DEPRECATE')) {
      await this.createTask({
        title: 'Deprecation: Remove underperforming feature',
        description: impactSummary.substring(0, 500),
        task_type: 'deprecation',
        priority: 'medium',
        source: 'marketer_feedback',
        status: 'pending',
      });
      console.log('✅ Created deprecation task in Kanban backlog.');
    }

    console.log('✅ Strategic decision complete.');
  }

  private buildTaskDescription(report?: {
    acceptanceCriteria?: string[];
    technicalConstraints?: string[];
    testStrategy?: string;
  }): string {
    if (!report) return 'Feature task created by CAS workflow.';

    let desc = '';
    if (report.acceptanceCriteria?.length) {
      desc += `## Acceptance Criteria\n${report.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n`;
    }
    if (report.technicalConstraints?.length) {
      desc += `## Technical Constraints\n${report.technicalConstraints.map(c => `- ${c}`).join('\n')}\n\n`;
    }
    if (report.testStrategy) {
      desc += `## Test Strategy\n${report.testStrategy}\n`;
    }
    return desc || 'Feature task created by CAS workflow.';
  }
}

export const planner = new PlannerAgent();

export const runPlanner = async (): Promise<void> => {
  console.log('▶️ Running Planner Agent...');
  const plannerInstance = new PlannerAgent();

  const board = await plannerInstance.getBoard();
  console.log('Kanban Board:', board);

  const bottlenecks = await plannerInstance.detectBottlenecks();
  console.log('Bottleneck Analysis:', bottlenecks);
};
