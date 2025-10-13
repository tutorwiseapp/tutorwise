import { CodeScanner } from './modules/code-scanner';
import { PatternExtractor } from './modules/pattern-extractor';
import { developer } from '../../developer/src';
import { tester } from '../../tester/src';

class AnalystAgent {
  private codeScanner: CodeScanner;
  private patternExtractor: PatternExtractor;

  constructor() {
    this.codeScanner = new CodeScanner();
    this.patternExtractor = new PatternExtractor();
  }

  /**
   * Orchestrates the full Contextual Analysis workflow.
   * @param featureQuery A description of the feature to be built.
   * @returns A formatted Feature Brief as a markdown string.
   */
  public async generateFeatureBrief(featureQuery: string): Promise<string> {
    console.log('▶️ Analyst Agent: Starting Contextual Analysis...');
    
    const analogousFiles = await this.codeScanner.findAnalogousFiles(featureQuery);
    if (analogousFiles.length === 0) {
      console.warn('⚠️ No analogous features found. Proceeding without patterns.');
      return `# Feature Brief: ${featureQuery}\n\n- No patterns found.`;
    }

    // For simplicity, we'll just analyze the first file found.
    const mainFile = analogousFiles[0];
    console.log(`Found analogous file: ${mainFile}`);
    const patterns = this.patternExtractor.extractPatterns(mainFile);

    let brief = `# Feature Brief: ${featureQuery}\n\n`;
    brief += `## 1. Overview\n\n- Acceptance Criteria...\n\n`;
    brief += `## 2. Proven Patterns & Constraints (CRITICAL)\n\n`;
    brief += `- **Analogous Feature:** ${mainFile}\n`;
    
    for (const [key, value] of Object.entries(patterns)) {
      brief += `- **${key}:** ${value}\n`;
    }

    console.log('✅ Contextual Analysis complete. Feature Brief generated.');
    return brief;
  }

  public async runThreeAmigosKickoff(featureBrief: string): Promise<string> {
    console.log('\n▶️ Analyst Agent: Initiating AI Three Amigos Kick-off...');

    // 1. Get reviews from the other "amigos"
    const feasibilityReport = developer.reviewFeatureBrief(featureBrief);
    const testabilityReport = tester.reviewFeatureBrief(featureBrief);

    // 2. Synthesize the feedback into the brief
    let finalBrief = featureBrief;
    finalBrief += `\n---\n\n## 4. Feasibility & Testability Review\n\n`;
    finalBrief += feasibilityReport;
    finalBrief += `\n`;
    finalBrief += testabilityReport;

    // 3. Simulate sign-off
    console.log('✅ All reviews complete. Synthesizing final brief.');
    console.log('✍️ Analyst Agent: SIGNED OFF');
    console.log('✍️ Developer Agent: SIGNED OFF');
    console.log('✍️ Tester Agent: SIGNED OFF');
    console.log('✅ AI Three Amigos Kick-off complete. Feature is ready for planning.');

    return finalBrief;
  }

  /**
   * Performs an Impact Review on a Production Performance Report.
   * @param productionReport The report from the Marketer Agent.
   * @param originalBrief The original Feature Brief with success metrics.
   * @returns An Impact Review summary.
   */
  public reviewProductionMetrics(productionReport: string, originalBrief: string): string {
    console.log('▶️ Analyst Agent: Performing Impact Review...');

    // In a real implementation, this would parse the report and compare numbers.
    const goalAchieved = productionReport.includes('Adoption: 75%');

    let review = `## Impact Review\n\n`;
    if (goalAchieved) {
      review += `- **Outcome:** ✅ SUCCESS. The feature met or exceeded its primary success metric.\n`;
    } else {
      review += `- **Outcome:** ⚠️ ITERATION REQUIRED. The feature is seeing use, but has not yet met its success metric.\n`;
    }
    
    console.log('✅ Impact Review complete.');
    return review;
  }
}

export const runAnalyst = async (): Promise<void> => {
  console.log('▶️ Running Analyst Agent Full Workflow...');
  const analyst = new AnalystAgent();
  
  // Step 1: Contextual Analysis
  const featureQuery = 'A new multi-step wizard for creating a service listing.';
  const draftBrief = analyst.generateFeatureBrief(featureQuery);
  
  console.log('\n--- Draft Feature Brief ---\n');
  console.log(draftBrief);

  // Step 2: Three Amigos Kick-off
  const finalBrief = await analyst.runThreeAmigosKickoff(draftBrief);

  console.log('\n--- Final, Signed-Off Feature Brief ---\n');
  console.log(finalBrief);
};
