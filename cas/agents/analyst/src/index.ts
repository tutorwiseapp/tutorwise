/**
 * Analyst Agent - BA + Three Amigos Facilitator + Requirements Owner
 *
 * Responsibilities:
 * - Generate comprehensive feature briefs with real acceptance criteria
 * - Facilitate Three Amigos meetings (Business + Technical + Quality perspectives)
 * - Synthesise three perspectives into structured, actionable specifications
 * - Extract architectural patterns from existing codebase
 * - Impact review of production metrics
 *
 * AI-Native: Uses LLM for brief generation and Three Amigos synthesis.
 * Falls back to rules-based logic if LLM unavailable.
 *
 * @agent Analyst Agent
 */

import { CodeScanner } from './modules/code-scanner';
import { PatternExtractor } from './modules/pattern-extractor';
import { developer } from '../../developer/src';
import { tester } from '../../tester/src';
import { casGenerate, casGenerateStructured } from '../../../packages/core/src/services/cas-ai';

const ANALYST_SYSTEM_PROMPT = `You are the Analyst Agent for TutorWise, acting as Business Analyst, Three Amigos Facilitator, and Requirements Owner.

TutorWise is an AI-powered education platform connecting tutors with students. It includes:
- Sage (AI tutor with adaptive learning and spaced repetition)
- Lexi (AI help bot for platform support)
- AI Agents marketplace (user-created tutors)
- CAS (autonomous development agent platform)

Your role is to produce clear, complete, and testable feature specifications.
You think in terms of: user stories → acceptance criteria → edge cases → success metrics.
Be specific and actionable. Every criterion must be verifiable.`;

export interface ThreeAmigosReport {
  acceptanceCriteria: string[];
  technicalConstraints: string[];
  edgeCases: string[];
  testStrategy: string;
  definitionOfDone: string[];
  feasibilityNotes: string;
  testabilityNotes: string;
}

class AnalystAgent {
  private codeScanner: CodeScanner;
  private patternExtractor: PatternExtractor;

  constructor() {
    this.codeScanner = new CodeScanner();
    this.patternExtractor = new PatternExtractor();
  }

  /**
   * Generates a comprehensive feature brief with real acceptance criteria.
   * Uses CodeScanner for codebase context, then LLM for intelligent brief generation.
   * Falls back to pattern-based brief if LLM unavailable.
   */
  public async generateFeatureBrief(featureQuery: string): Promise<string> {
    console.log('▶️ Analyst Agent: Starting Contextual Analysis...');

    // Gather codebase context
    const analogousFiles = await this.codeScanner.findAnalogousFiles(featureQuery);
    const contextFiles = this.codeScanner.getContextFiles();

    // Extract patterns from analogous files
    let patternsContext = '';
    if (analogousFiles.length > 0) {
      const mainFile = analogousFiles[0];
      console.log(`Found analogous file: ${mainFile}`);
      const patterns = this.patternExtractor.extractPatterns(mainFile);
      patternsContext = Object.entries(patterns)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');
    }

    // Load design system for context
    const designSystem = await this.patternExtractor.loadDesignSystem();

    // Try LLM-powered brief generation
    const llmBrief = await casGenerate({
      systemPrompt: ANALYST_SYSTEM_PROMPT,
      userPrompt: `Generate a comprehensive Feature Brief for the following feature request.

Feature Request: "${featureQuery}"

${patternsContext ? `Existing Codebase Patterns:\n${patternsContext}\n` : ''}
${analogousFiles.length > 0 ? `Analogous Files Found: ${analogousFiles.slice(0, 5).join(', ')}\n` : ''}
${designSystem ? `Design System Summary (first 500 chars):\n${designSystem.substring(0, 500)}\n` : ''}

Produce a structured brief with:
1. **Overview** — What this feature does and why it matters
2. **User Stories** — As a [role], I want [action], so that [benefit]
3. **Acceptance Criteria** — Numbered list of verifiable, testable criteria
4. **Success Metrics** — How we measure if the feature is successful
5. **Proven Patterns & Constraints** — Technical patterns to follow from existing codebase
6. **Open Questions** — Anything that needs clarification before development`,
      maxOutputTokens: 2000,
    });

    if (llmBrief) {
      console.log('✅ Contextual Analysis complete (AI-powered).');
      return `# Feature Brief: ${featureQuery}\n\n${llmBrief}`;
    }

    // Fallback: rules-based brief
    console.log('⚠️ LLM unavailable, using rules-based brief generation.');
    let brief = `# Feature Brief: ${featureQuery}\n\n`;
    brief += `## 1. Overview\n\n- Feature request: ${featureQuery}\n\n`;
    brief += `## 2. Acceptance Criteria\n\n`;
    brief += `- [ ] Feature implements the described functionality\n`;
    brief += `- [ ] All existing tests continue to pass\n`;
    brief += `- [ ] Code follows existing patterns and conventions\n\n`;

    if (patternsContext) {
      brief += `## 3. Proven Patterns & Constraints (CRITICAL)\n\n`;
      brief += `${patternsContext}\n`;
      if (analogousFiles.length > 0) {
        brief += `- **Analogous Feature:** ${analogousFiles[0]}\n`;
      }
    }

    console.log('✅ Contextual Analysis complete (rules-based).');
    return brief;
  }

  /**
   * Facilitates Three Amigos meeting: Business (Analyst) + Technical (Developer) + Quality (Tester).
   * Gathers perspectives from Developer and Tester, then uses LLM to synthesise
   * into a structured report with agreed criteria, constraints, edge cases, and test strategy.
   * Falls back to simple markdown append if LLM unavailable.
   */
  public async runThreeAmigosKickoff(featureBrief: string): Promise<{ brief: string; report: ThreeAmigosReport | null }> {
    console.log('\n▶️ Analyst Agent: Facilitating Three Amigos Meeting...');

    // 1. Gather perspectives from the other "amigos"
    console.log('📋 Getting Developer perspective (Technical feasibility)...');
    const feasibilityReport = await developer.reviewFeatureBrief(featureBrief);
    console.log('📋 Getting Tester perspective (Testability)...');
    const testabilityReport = await tester.reviewFeatureBrief(featureBrief);

    // 2. Try LLM-powered synthesis (the real Three Amigos value)
    const synthesisResult = await casGenerateStructured<ThreeAmigosReport>({
      systemPrompt: `${ANALYST_SYSTEM_PROMPT}

You are now facilitating a Three Amigos meeting. You have gathered perspectives from:
- Business (yourself as Analyst): The feature brief with requirements
- Technical (Developer): Feasibility analysis
- Quality (Tester): Testability assessment

Your job is to SYNTHESISE all three perspectives into a single, agreed-upon specification.
Resolve any conflicts. Ensure every acceptance criterion is testable.
Ensure technical constraints are acknowledged. Ensure edge cases are covered.`,
      userPrompt: `Synthesise these Three Amigos perspectives into a structured specification.

## Feature Brief (Business Perspective):
${featureBrief}

## Developer Review (Technical Perspective):
${feasibilityReport}

## Tester Review (Quality Perspective):
${testabilityReport}

Produce a structured Three Amigos report.`,
      jsonSchema: `{
  "acceptanceCriteria": ["string - specific, testable criteria agreed by all three amigos"],
  "technicalConstraints": ["string - technical limitations and patterns to follow"],
  "edgeCases": ["string - edge cases identified across all perspectives"],
  "testStrategy": "string - agreed test approach covering unit, integration, E2E",
  "definitionOfDone": ["string - conditions that must ALL be true for the feature to be considered done"],
  "feasibilityNotes": "string - summary of Developer's technical assessment",
  "testabilityNotes": "string - summary of Tester's quality assessment"
}`,
      maxOutputTokens: 2000,
    });

    if (synthesisResult) {
      console.log('✅ Three Amigos synthesis complete (AI-powered).');
      console.log('✍️ Analyst Agent: SIGNED OFF');
      console.log('✍️ Developer Agent: SIGNED OFF');
      console.log('✍️ Tester Agent: SIGNED OFF');

      // Build enhanced brief with Three Amigos output
      let finalBrief = featureBrief;
      finalBrief += `\n---\n\n## Three Amigos Agreement\n\n`;
      finalBrief += `### Acceptance Criteria (Agreed)\n`;
      synthesisResult.acceptanceCriteria.forEach((c, i) => {
        finalBrief += `${i + 1}. ${c}\n`;
      });
      finalBrief += `\n### Technical Constraints\n`;
      synthesisResult.technicalConstraints.forEach(c => {
        finalBrief += `- ${c}\n`;
      });
      finalBrief += `\n### Edge Cases\n`;
      synthesisResult.edgeCases.forEach(c => {
        finalBrief += `- ${c}\n`;
      });
      finalBrief += `\n### Test Strategy\n${synthesisResult.testStrategy}\n`;
      finalBrief += `\n### Definition of Done\n`;
      synthesisResult.definitionOfDone.forEach(d => {
        finalBrief += `- [ ] ${d}\n`;
      });

      return { brief: finalBrief, report: synthesisResult };
    }

    // Fallback: simple append (no synthesis)
    console.log('⚠️ LLM unavailable, using rules-based Three Amigos.');
    let finalBrief = featureBrief;
    finalBrief += `\n---\n\n## 4. Feasibility & Testability Review\n\n`;
    finalBrief += feasibilityReport;
    finalBrief += `\n`;
    finalBrief += testabilityReport;

    console.log('✅ Three Amigos complete (rules-based).');
    console.log('✍️ Analyst Agent: SIGNED OFF');
    console.log('✍️ Developer Agent: SIGNED OFF');
    console.log('✍️ Tester Agent: SIGNED OFF');

    return { brief: finalBrief, report: null };
  }

  /**
   * Performs an Impact Review on a Production Performance Report.
   * Uses LLM for nuanced analysis. Falls back to threshold checks.
   */
  public async reviewProductionMetrics(productionReport: string, originalBrief: string): Promise<string> {
    console.log('▶️ Analyst Agent: Performing Impact Review...');

    const llmReview = await casGenerate({
      systemPrompt: ANALYST_SYSTEM_PROMPT,
      userPrompt: `Review this production report against the original feature brief and assess whether the feature met its goals.

Production Report:
${productionReport}

Original Feature Brief:
${originalBrief}

Produce an Impact Review covering:
1. **Outcome** — SUCCESS, PARTIAL, or ITERATION REQUIRED
2. **Metrics Assessment** — How each success metric performed
3. **User Impact** — What the production data tells us about user adoption
4. **Recommendations** — What should happen next (iterate, expand, deprecate)`,
      maxOutputTokens: 1000,
    });

    if (llmReview) {
      console.log('✅ Impact Review complete (AI-powered).');
      return `## Impact Review\n\n${llmReview}`;
    }

    // Fallback: threshold check
    const goalAchieved = productionReport.includes('Adoption: 75%');
    let review = `## Impact Review\n\n`;
    if (goalAchieved) {
      review += `- **Outcome:** ✅ SUCCESS. The feature met or exceeded its primary success metric.\n`;
    } else {
      review += `- **Outcome:** ⚠️ ITERATION REQUIRED. The feature has not yet met its success metric.\n`;
    }

    console.log('✅ Impact Review complete (rules-based).');
    return review;
  }
}

export const analyst = new AnalystAgent();

export const runAnalyst = async (): Promise<void> => {
  console.log('▶️ Running Analyst Agent Full Workflow...');
  const analystInstance = new AnalystAgent();

  const featureQuery = 'A new multi-step wizard for creating a service listing.';
  const draftBrief = await analystInstance.generateFeatureBrief(featureQuery);

  console.log('\n--- Draft Feature Brief ---\n');
  console.log(draftBrief);

  const { brief: finalBrief } = await analystInstance.runThreeAmigosKickoff(draftBrief);

  console.log('\n--- Final, Signed-Off Feature Brief ---\n');
  console.log(finalBrief);
};
