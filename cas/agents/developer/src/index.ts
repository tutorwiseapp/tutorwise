/**
 * Developer Agent - Tech Lead + Architect + Implementer
 *
 * Responsibilities:
 * - Technical feasibility review of feature briefs
 * - Implementation plan generation (LLM-powered)
 * - Architecture decisions and dependency mapping
 * - Technical health review of production metrics
 *
 * AI-Native: Uses LLM for feasibility analysis and plan generation.
 * Falls back to rules-based logic if LLM unavailable.
 *
 * @agent Developer Agent
 */

import { FeaturePlanUpdater } from './FeaturePlanUpdater';
import { casGenerate, casGenerateStructured } from '../../../packages/core/src/services/cas-ai';

const DEVELOPER_SYSTEM_PROMPT = `You are the Developer Agent for TutorWise, acting as Tech Lead, Architect, and Implementer.

TutorWise tech stack:
- Next.js 16 (app router, server components, server actions)
- TypeScript, CSS Modules, Tailwind CSS
- Supabase (PostgreSQL + pgvector + Auth + Storage + Realtime)
- AI: Gemini (default), DeepSeek, Claude — no OpenAI
- Testing: Jest
- Monorepo: apps/web/, sage/, lexi/, cas/

Your role is to assess technical feasibility, design architecture, and produce structured implementation plans.
Be specific about file paths, component structure, and data flow.
Reference existing patterns when available. Avoid over-engineering.`;

export interface DevelopmentPlan {
  architecture: string;
  filesToCreate: Array<{ path: string; purpose: string }>;
  filesToModify: Array<{ path: string; changes: string }>;
  dependencies: string[];
  implementationSteps: Array<{ step: number; description: string; files: string[] }>;
  estimatedComplexity: 'low' | 'medium' | 'high';
  risks: string[];
}

class DeveloperAgent {
  public planUpdater: FeaturePlanUpdater;

  constructor() {
    this.planUpdater = new FeaturePlanUpdater();
  }

  /**
   * Performs a Feasibility Review on a Feature Brief.
   * Uses LLM for real technical analysis. Falls back to includes() checks.
   */
  public async reviewFeatureBrief(featureBrief: string): Promise<string> {
    console.log('▶️ Developer Agent: Performing Feasibility Review...');

    const llmReview = await casGenerate({
      systemPrompt: DEVELOPER_SYSTEM_PROMPT,
      userPrompt: `Review this feature brief for technical feasibility. Produce a Feasibility Report covering:

1. **Technical Feasibility** — Rate High/Medium/Low with reasoning
2. **Architecture Approach** — How would you implement this? Which patterns to follow?
3. **Component Plan** — What components to create/reuse?
4. **Data Model Impact** — Any database changes needed?
5. **Dependencies** — External libraries or internal modules needed
6. **Risks & Blockers** — What could go wrong?

Feature Brief:
${featureBrief}`,
      maxOutputTokens: 1500,
    });

    if (llmReview) {
      console.log('✅ Feasibility Review complete (AI-powered).');
      return `## Feasibility Report\n\n${llmReview}`;
    }

    // Fallback: rules-based review
    console.log('⚠️ LLM unavailable, using rules-based feasibility review.');
    const hasPatterns = featureBrief.includes('Proven Patterns') || featureBrief.includes('Technical Constraints');
    const hasAcceptanceCriteria = featureBrief.includes('Acceptance Criteria');

    let report = `## Feasibility Report\n\n`;
    if (hasPatterns && hasAcceptanceCriteria) {
      report += `- **Technical Feasibility:** ✅ High. The brief provides clear patterns and criteria.\n`;
      report += `- **Blockers:** None identified.\n`;
    } else if (hasAcceptanceCriteria) {
      report += `- **Technical Feasibility:** ⚠️ Medium. Criteria provided but architectural patterns are missing.\n`;
      report += `- **Recommendation:** Analyst should provide codebase context.\n`;
    } else {
      report += `- **Technical Feasibility:** ❌ Low. Missing acceptance criteria and architectural guidance.\n`;
      report += `- **Blockers:** Development cannot proceed without specifications.\n`;
    }

    console.log('✅ Feasibility Review complete (rules-based).');
    return report;
  }

  /**
   * Creates a structured implementation plan using LLM.
   * This replaces the hardcoded task list in PlanningGraph's developerTool.
   */
  public async createImplementationPlan(
    featureBrief: string,
    acceptanceCriteria?: string[],
    technicalConstraints?: string[]
  ): Promise<DevelopmentPlan | null> {
    console.log('▶️ Developer Agent: Creating implementation plan...');

    const plan = await casGenerateStructured<DevelopmentPlan>({
      systemPrompt: DEVELOPER_SYSTEM_PROMPT,
      userPrompt: `Create a detailed implementation plan for this feature.

Feature Brief:
${featureBrief}

${acceptanceCriteria ? `Acceptance Criteria:\n${acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n` : ''}
${technicalConstraints ? `Technical Constraints:\n${technicalConstraints.map(c => `- ${c}`).join('\n')}\n` : ''}

Create a structured implementation plan. Use real file paths following Next.js app router conventions (e.g., apps/web/src/app/feature-name/page.tsx).`,
      jsonSchema: `{
  "architecture": "string - high-level architecture description",
  "filesToCreate": [{ "path": "string", "purpose": "string" }],
  "filesToModify": [{ "path": "string", "changes": "string" }],
  "dependencies": ["string - any new packages or internal modules needed"],
  "implementationSteps": [{ "step": 1, "description": "string", "files": ["string"] }],
  "estimatedComplexity": "low | medium | high",
  "risks": ["string"]
}`,
      maxOutputTokens: 2000,
    });

    if (plan) {
      console.log(`✅ Implementation plan created (AI-powered): ${plan.implementationSteps.length} steps, complexity: ${plan.estimatedComplexity}`);
      return plan;
    }

    // Fallback: generic plan structure
    console.log('⚠️ LLM unavailable, using generic implementation plan.');
    return {
      architecture: 'Standard Next.js page with server actions and Supabase integration',
      filesToCreate: [
        { path: 'apps/web/src/app/feature/page.tsx', purpose: 'Main feature page' },
        { path: 'apps/web/src/app/feature/actions.ts', purpose: 'Server actions' },
      ],
      filesToModify: [],
      dependencies: [],
      implementationSteps: [
        { step: 1, description: 'Set up page structure and routing', files: ['apps/web/src/app/feature/page.tsx'] },
        { step: 2, description: 'Implement core logic and server actions', files: ['apps/web/src/app/feature/actions.ts'] },
        { step: 3, description: 'Add error handling and validation', files: ['apps/web/src/app/feature/page.tsx'] },
        { step: 4, description: 'Write tests', files: ['apps/web/src/__tests__/feature.test.ts'] },
      ],
      estimatedComplexity: 'medium',
      risks: ['Implementation details depend on feature specifics'],
    };
  }

  /**
   * Performs a Technical Health Review on a Production Performance Report.
   * Uses LLM for nuanced interpretation. Falls back to threshold checks.
   */
  public async reviewProductionMetrics(productionReport: string): Promise<string> {
    console.log('▶️ Developer Agent: Performing Technical Health Review...');

    const llmReview = await casGenerate({
      systemPrompt: DEVELOPER_SYSTEM_PROMPT,
      userPrompt: `Review this production performance report from a technical health perspective.

Production Report:
${productionReport}

Assess:
1. **Status** — HEALTHY, WARNING, or ACTION REQUIRED
2. **Error Analysis** — Any concerning error patterns?
3. **Performance** — Any bottlenecks or degradation?
4. **Technical Debt** — Any indicators of accumulating debt?
5. **Recommendations** — What technical actions should be taken?`,
      maxOutputTokens: 1000,
    });

    if (llmReview) {
      console.log('✅ Technical Health Review complete (AI-powered).');
      return `## Technical Health Review\n\n${llmReview}`;
    }

    // Fallback
    const hasErrors = productionReport.includes('Error Rate') && !productionReport.includes('Error Rate: 0%');
    let review = `## Technical Health Review\n\n`;
    if (hasErrors) {
      review += `- **Status:** ⚠️ ACTION REQUIRED. Non-zero error rate detected.\n`;
    } else {
      review += `- **Status:** ✅ HEALTHY. No errors or performance bottlenecks detected.\n`;
    }

    console.log('✅ Technical Health Review complete (rules-based).');
    return review;
  }
}

export const developer = new DeveloperAgent();
export * from './FeaturePlanUpdater';
