/**
 * QA Agent - Release Manager + Quality Gate Owner
 *
 * Responsibilities:
 * - Quality assurance review of test results
 * - Acceptance criteria validation (semantic matching)
 * - Regression detection via historical comparison
 * - Release gate decisions (APPROVE / REWORK / BLOCK)
 *
 * @agent QA Agent
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { casGenerateStructured } from '../../../packages/core/src/services/cas-ai';

const QA_SYSTEM_PROMPT = `You are the QA Agent for TutorWise, acting as Release Manager and Quality Gate Owner.
Your role is to make objective, evidence-based decisions about whether a feature is ready for release.
You evaluate: test results, code coverage, acceptance criteria fulfillment, and regression risk.
You are the last quality gate before security review and deployment.
Be rigorous but fair. Base decisions on evidence, not speculation.`;

export interface QAVerdict {
  decision: 'APPROVE' | 'REWORK' | 'BLOCK';
  criteriaValidation: Array<{ criterion: string; met: boolean; evidence: string }>;
  coverageAssessment: { sufficient: boolean; gaps: string[] };
  regressions: Array<{ metric: string; previous: number; current: number }>;
  reasoning: string;
}

class QaAgent {
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
   * Performs QA review with structured verdict.
   * Uses LLM for semantic matching of test results against acceptance criteria.
   * Falls back to threshold-based assessment if LLM unavailable.
   */
  async performQAReview(
    featureName: string,
    testResults: any,
    acceptanceCriteria?: string[]
  ): Promise<QAVerdict> {
    console.log(`▶️ QA Agent: Performing QA review for "${featureName}"...`);

    const coverage = testResults?.coverage || 0;
    const passedTests = testResults?.passedTests || 0;
    const totalTests = testResults?.totalTests || 0;
    const passed = testResults?.passed || false;
    const failures = testResults?.failures || [];

    // Query previous test results for regression detection
    const previousResults = await this.getPreviousTestResults(featureName);

    // Try LLM-powered review if we have acceptance criteria
    if (acceptanceCriteria && acceptanceCriteria.length > 0) {
      const llmVerdict = await casGenerateStructured<QAVerdict>({
        systemPrompt: QA_SYSTEM_PROMPT,
        userPrompt: `Review these test results against the acceptance criteria and make a release decision.

Feature: ${featureName}

Test Results:
- Total tests: ${totalTests}
- Passed: ${passedTests}
- Failed: ${totalTests - passedTests}
- Coverage: ${coverage}%
- Status: ${passed ? 'ALL PASSING' : 'FAILURES DETECTED'}
${failures.length > 0 ? `- Failures:\n${failures.map((f: any) => `  - ${f.test}: ${f.error}`).join('\n')}` : ''}

Acceptance Criteria:
${acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Previous Test Results (for regression detection):
${previousResults.length > 0
  ? previousResults.map((r: any) => `- ${r.event_data?.coverage || 0}% coverage, ${r.event_data?.passedTests || 0}/${r.event_data?.totalTests || 0} tests`).join('\n')
  : 'No previous results available'}

Decision criteria:
- APPROVE: All criteria met, coverage >= 80%, no regressions, all tests passing
- REWORK: Some criteria unmet or coverage < 80%, but no critical failures
- BLOCK: Critical failures, major regressions, or coverage < 50%`,
        jsonSchema: `{
  "decision": "APPROVE | REWORK | BLOCK",
  "criteriaValidation": [{ "criterion": "string", "met": true/false, "evidence": "string" }],
  "coverageAssessment": { "sufficient": true/false, "gaps": ["string"] },
  "regressions": [{ "metric": "string", "previous": 0, "current": 0 }],
  "reasoning": "string"
}`,
        maxOutputTokens: 1500,
      });

      if (llmVerdict) {
        console.log(`✅ QA Review complete (AI-powered): ${llmVerdict.decision}`);
        return llmVerdict;
      }
    }

    // Fallback: threshold-based assessment
    console.log('⚠️ Using rules-based QA review.');
    return this.rulesBasedReview(featureName, testResults, previousResults, acceptanceCriteria);
  }

  /**
   * Generates a markdown QA report from a verdict (for backward compatibility).
   */
  generateReport(featureName: string, verdict: QAVerdict): string {
    let report = `## QA Review: ${featureName}\n\n`;
    report += `**Decision:** ${verdict.decision}\n\n`;
    report += `**Reasoning:** ${verdict.reasoning}\n\n`;

    if (verdict.criteriaValidation.length > 0) {
      report += `### Acceptance Criteria Validation\n`;
      for (const cv of verdict.criteriaValidation) {
        report += `- ${cv.met ? '✅' : '❌'} ${cv.criterion}: ${cv.evidence}\n`;
      }
      report += '\n';
    }

    report += `### Coverage Assessment\n`;
    report += `- Coverage sufficient: ${verdict.coverageAssessment.sufficient ? '✅ Yes' : '❌ No'}\n`;
    if (verdict.coverageAssessment.gaps.length > 0) {
      report += `- Gaps: ${verdict.coverageAssessment.gaps.join(', ')}\n`;
    }
    report += '\n';

    if (verdict.regressions.length > 0) {
      report += `### Regressions Detected\n`;
      for (const reg of verdict.regressions) {
        report += `- ⚠️ ${reg.metric}: ${reg.previous} → ${reg.current}\n`;
      }
    }

    return report;
  }

  private rulesBasedReview(
    featureName: string,
    testResults: any,
    previousResults: any[],
    acceptanceCriteria?: string[]
  ): QAVerdict {
    const coverage = testResults?.coverage || 0;
    const passedTests = testResults?.passedTests || 0;
    const totalTests = testResults?.totalTests || 0;
    const passed = testResults?.passed || false;

    // Detect regressions
    const regressions: Array<{ metric: string; previous: number; current: number }> = [];
    if (previousResults.length > 0) {
      const lastResult = previousResults[0]?.event_data;
      if (lastResult) {
        if (lastResult.coverage && coverage < lastResult.coverage - 5) {
          regressions.push({ metric: 'coverage', previous: lastResult.coverage, current: coverage });
        }
        if (lastResult.passedTests && passedTests < lastResult.passedTests) {
          regressions.push({ metric: 'passedTests', previous: lastResult.passedTests, current: passedTests });
        }
      }
    }

    // Coverage assessment
    const coverageAssessment = {
      sufficient: coverage >= 80,
      gaps: [] as string[],
    };
    if (coverage < 80) coverageAssessment.gaps.push(`Coverage ${coverage}% below 80% threshold`);
    if (coverage < 50) coverageAssessment.gaps.push(`Coverage critically low at ${coverage}%`);

    // Criteria validation (basic: just check if criteria exist)
    const criteriaValidation = (acceptanceCriteria || []).map(c => ({
      criterion: c,
      met: passed && coverage >= 80,
      evidence: passed ? 'All tests passing' : 'Tests failing — cannot validate',
    }));

    // Decision
    let decision: 'APPROVE' | 'REWORK' | 'BLOCK';
    let reasoning: string;

    if (!passed || coverage < 50) {
      decision = 'BLOCK';
      reasoning = `Tests ${passed ? 'passing' : 'failing'} with ${coverage}% coverage. Critical quality issues.`;
    } else if (coverage < 80 || regressions.length > 0) {
      decision = 'REWORK';
      reasoning = `Coverage ${coverage}% ${coverage < 80 ? 'below threshold' : 'acceptable'}. ${regressions.length} regression(s) detected.`;
    } else {
      decision = 'APPROVE';
      reasoning = `All tests passing with ${coverage}% coverage. No regressions detected. Quality standards met.`;
    }

    console.log(`✅ QA Review complete (rules-based): ${decision}`);
    return { decision, criteriaValidation, coverageAssessment, regressions, reasoning };
  }

  private async getPreviousTestResults(featureName: string): Promise<any[]> {
    if (!this.supabase) return [];

    try {
      const { data } = await this.supabase
        .from('cas_agent_events')
        .select('event_data')
        .eq('agent_id', 'tester')
        .eq('event_type', 'test_results')
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    } catch {
      return [];
    }
  }
}

export const qa = new QaAgent();

export const runQA = (): void => {
  console.log('▶️ Running QA Agent...');
};
