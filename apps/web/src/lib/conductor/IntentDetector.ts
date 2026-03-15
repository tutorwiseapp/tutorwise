/*
 * Filename: src/lib/conductor/IntentDetector.ts
 * Purpose: Semantic intent classification for the Conductor Command Center
 * Phase: Conductor 4B
 * Created: 2026-03-10
 *
 * Equivalent to Fuschia's intent_agent.py (DSPy-based), built using getAIService().generateJSON()
 * Routes admin queries to: agent chat, workflow trigger, analytics view, or Lexi fallback.
 */

import { getAIService } from '@/lib/ai';

export interface IntentResult {
  intent: 'query_agent' | 'trigger_workflow' | 'view_analytics' | 'general';
  target_agent_slug?: string;   // only for 'query_agent'
  target_process_id?: string;   // only for 'trigger_workflow'
  analytics_tab?: string;       // only for 'view_analytics' — e.g. 'referral', 'bookings'
  prompt?: string;              // cleaned user query to forward to agent/workflow
  confidence: number;           // 0.0–1.0
  reasoning?: string;           // brief explanation for debugging
}

const SYSTEM_PROMPT = `You are an intent classifier for an admin platform dashboard called Conductor.
Classify the admin's natural-language query into ONE of four intents:

1. "query_agent" — admin wants to query or ask a specific AI agent (e.g. "show me at-risk tutors", "ask operations monitor about cancellations")
2. "trigger_workflow" — admin wants to run or trigger a workflow/process (e.g. "run commission payout", "start tutor approval for John")
3. "view_analytics" — admin wants to see an analytics view or dashboard (e.g. "show referral analytics", "open marketplace intelligence")
4. "general" — doesn't clearly match any of the above (below 70% confidence for specific intent)

For "query_agent", identify the most relevant agent from the available agents list.
For "trigger_workflow", identify the most relevant process from the available processes list.
For "view_analytics", identify the analytics tab: caas|resources|seo|signal|marketplace|listings|bookings|financials|virtualspace|referral|retention|ai_adoption|org_conversion|ai_studio.
Confidence < 0.7 should default to "general".

Return ONLY valid JSON.`;

const VALID_INTENTS: ReadonlySet<IntentResult['intent']> = new Set([
  'query_agent',
  'trigger_workflow',
  'view_analytics',
  'general',
]);

export class IntentDetector {
  /**
   * Classify an admin query into one of four routing intents.
   * @param input Raw admin query string
   * @param context Available agents and processes for target resolution
   */
  static async classify(
    input: string,
    context: { agents: string[]; processes: { id: string; slug: string; name: string }[] }
  ): Promise<IntentResult> {
    const agentList = context.agents.join(', ');
    const processList = context.processes.map((p) => `${p.slug} (${p.name})`).join(', ');

    try {
      const { data } = await getAIService().generateJSON<IntentResult>({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Admin query: "${input}"

Available agents: ${agentList}
Available processes: ${processList}

Return JSON: { "intent": "...", "target_agent_slug": "...", "target_process_id": "...", "analytics_tab": "...", "prompt": "...", "confidence": 0.0, "reasoning": "..." }`,
        temperature: 0.1,
      });

      const rawIntent = data.intent;
      const intent: IntentResult['intent'] =
        typeof rawIntent === 'string' && VALID_INTENTS.has(rawIntent as IntentResult['intent'])
          ? (rawIntent as IntentResult['intent'])
          : 'general';

      return {
        intent,
        target_agent_slug: data.target_agent_slug,
        target_process_id: data.target_process_id,
        analytics_tab: data.analytics_tab,
        prompt: data.prompt ?? input,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
        reasoning: data.reasoning,
      };
    } catch (error) {
      // Graceful fallback to general on AI failure
      console.error('[IntentDetector] Classification failed:', error);
      return { intent: 'general', prompt: input, confidence: 0 };
    }
  }
}
