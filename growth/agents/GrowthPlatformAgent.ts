/**
 * Growth Platform Agent
 *
 * Platform-owned Growth Agent — the personalised business advisor.
 * Extends PlatformAIAgent. Admin creates it; all users can access it.
 * Subscription: £10/month enforced via rate-limit gate (not hard block).
 *
 * Roles: tutor / client / agent / organisation
 * DB access: user's live Tutorwise data (scoped to profile_id)
 * Knowledge: injected into system prompt from growth/knowledge/
 *
 * @module growth/agents
 */

import { PlatformAIAgent } from '@sage/agents/PlatformAIAgent';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserInfo } from '@cas/packages/core/src/context';
import type {
  BaseAIAgent,
  AgentConfig,
  AIAgentSession,
  AIAgentMessage,
  AgentKnowledgeSource,
} from '@sage/agents/base/types';
import { growthOrchestrator } from '../core/orchestrator';
import type { GrowthUserMetrics, GrowthUserRole } from '../tools/types';

// ============================================================================
// STATIC AGENT IDENTITY
// ============================================================================

export const GROWTH_PLATFORM_AGENT: BaseAIAgent = {
  id: 'growth-agent-platform',
  owner_id: 'platform',
  name: 'growth-agent',
  display_name: 'Growth Agent',
  description: 'Your personalised AI business growth advisor on Tutorwise.',
  agent_type: 'growth_advisor',
  agent_context: 'platform',
  subject: 'general',
  status: 'published',
  is_platform_owned: true,
  storage_used_mb: 0,
  storage_limit_mb: 1024,
  is_featured: true,
  priority_rank: 1,
  total_sessions: 0,
  total_revenue: 0,
  total_reviews: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const GROWTH_AGENT_CONFIG: AgentConfig = {
  provider: 'gemini',
  temperature: 0.7,
  maxTokens: 2048,
  enableRAG: false,       // Knowledge is in system prompt, not RAG
  knowledgeSources: [],
  tone: 'professional',
  detailLevel: 'detailed',
  useExamples: true,
  askQuestions: false,    // Agent has live data — doesn't ask what it knows
  provideHints: false,
};

// ============================================================================
// GROWTH PLATFORM AGENT
// ============================================================================

export class GrowthPlatformAgent extends PlatformAIAgent {
  private growthRole: GrowthUserRole;

  constructor(role: GrowthUserRole = 'tutor') {
    super(GROWTH_PLATFORM_AGENT, GROWTH_AGENT_CONFIG);
    this.growthRole = role;
  }

  // --- Override PlatformAIAgent methods (use growthOrchestrator, not sageOrchestrator) ---

  async initialize(supabase?: SupabaseClient): Promise<void> {
    this.supabase = supabase;
    // No sageOrchestrator or knowledgeRetriever — Growth uses its own orchestrator
  }

  async startSession(
    user: UserInfo,
    options?: { subject?: string; level?: string; sessionGoal?: string }
  ): Promise<AIAgentSession> {
    const sessionId = growthOrchestrator.startSession(user.id, this.growthRole);

    return {
      id: sessionId,
      agent_id: this.agent.id,
      user_id: user.id,
      user_role: user.role,
      status: 'active',
      message_count: 0,
      duration_minutes: 0,
      started_at: new Date().toISOString(),
    };
  }

  async processMessage(
    sessionId: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<AIAgentMessage> {
    try {
      const session = growthOrchestrator.getSession(sessionId);
      const role = session?.role ?? this.growthRole;
      const systemPrompt = growthOrchestrator.buildSystemPrompt(role, session?.metrics);

      // For non-streaming use (tool calls, short answers)
      // Streaming is handled separately via streamMessage()
      return {
        id: `growth-msg-${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: systemPrompt, // placeholder — streaming is the primary path
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      return {
        id: `growth-msg-error-${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: this.handleError(error, 'processMessage'),
        created_at: new Date().toISOString(),
      };
    }
  }

  async endSession(sessionId: string): Promise<void> {
    growthOrchestrator.endSession(sessionId);
  }

  async getKnowledgeSources(_userId: string): Promise<AgentKnowledgeSource[]> {
    return []; // Knowledge injected into system prompt
  }

  // --- Growth-specific overrides ---

  requiresSubscription(): boolean {
    return true; // £10/month — enforced via rate-limit gate in API routes
  }

  isAvailableToUser(): boolean {
    return true; // Soft gate: free tier gets 10 questions/day, pro gets unlimited
  }

  getGreeting(userName?: string): string {
    return growthOrchestrator.getGreeting(this.growthRole, userName || 'there');
  }

  // --- Role management ---

  setRole(role: GrowthUserRole): void {
    this.growthRole = role;
  }

  getRole(): GrowthUserRole {
    return this.growthRole;
  }

  // --- Growth-specific methods ---

  setMetrics(sessionId: string, metrics: GrowthUserMetrics): void {
    growthOrchestrator.setSessionMetrics(sessionId, metrics);
  }

  buildSystemPrompt(metrics?: GrowthUserMetrics): string {
    return growthOrchestrator.buildSystemPrompt(this.growthRole, metrics);
  }

  getSuggestions(): string[] {
    return growthOrchestrator.getSuggestions(this.growthRole);
  }

  getTools() {
    return growthOrchestrator.getTools(this.growthRole);
  }

  async executeTool(name: string, args: Record<string, unknown>) {
    return growthOrchestrator.executeTool(name, args);
  }

  async runRevenueAudit(metrics: GrowthUserMetrics) {
    return growthOrchestrator.runRevenueAudit(metrics);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createGrowthPlatformAgent(role: GrowthUserRole = 'tutor'): GrowthPlatformAgent {
  return new GrowthPlatformAgent(role);
}

export default GrowthPlatformAgent;
