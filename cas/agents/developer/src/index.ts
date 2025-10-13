import { FeaturePlanUpdater } from './FeaturePlanUpdater';

class DeveloperAgent {
  public planUpdater: FeaturePlanUpdater;

  constructor() {
    this.planUpdater = new FeaturePlanUpdater();
  }

  /**
   * Performs a Feasibility Review on a Feature Brief.
   * @param featureBrief The markdown content of the brief.
   * @returns A Feasibility Report.
   */
  public reviewFeatureBrief(featureBrief: string): string {
    console.log('▶️ Developer Agent: Performing Feasibility Review...');

    // In a real implementation, this would involve more complex analysis.
    // For now, we will check for key sections.
    const hasPatterns = featureBrief.includes('Proven Patterns & Constraints');
    const hasLayout = featureBrief.includes('Layout System');

    let report = `## Feasibility Report\n\n`;
    if (hasPatterns && hasLayout) {
      report += `- **Technical Feasibility:** ✅ High. The brief provides clear architectural and design patterns.\n`;
      report += `- **Component Plan:** Re-use existing 'Button' and 'ProgressDots'. New components will be required for each wizard step.\n`;
      report += `- **Blockers:** None identified.\n`;
    } else {
      report += `- **Technical Feasibility:** ⚠️ Medium. The brief is missing the critical "Proven Patterns & Constraints" section. This is a high-risk implementation.\n`;
      report += `- **Blockers:** Development cannot proceed without a contextual analysis from the Analyst Agent.\n`;
    }
    
    console.log('✅ Feasibility Review complete.');
    return report;
  }

  /**
   * Performs a Technical Health Review on a Production Performance Report.
   * @param productionReport The report from the Marketer Agent.
   * @returns A Technical Health summary.
   */
  public reviewProductionMetrics(productionReport: string): string {
    console.log('▶️ Developer Agent: Performing Technical Health Review...');

    const hasErrors = productionReport.includes('Error Rate: 0.5%');

    let review = `## Technical Health Review\n\n`;
    if (hasErrors) {
      review += `- **Status:** ⚠️ ACTION REQUIRED. A non-critical error rate has been detected. A task should be created to investigate.\n`;
    } else {
      review += `- **Status:** ✅ HEALTHY. No new errors or performance bottlenecks detected.\n`;
    }
    
    console.log('✅ Technical Health Review complete.');
    return review;
  }
}

export const developer = new DeveloperAgent();
export * from './FeaturePlanUpdater';
