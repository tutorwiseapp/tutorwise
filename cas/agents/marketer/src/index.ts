import { analyst } from '../../analyst/src';
import { developer } from '../../developer/src';

class MarketerAgent {
  /**
   * Generates a mock Production Performance Report.
   */
  private generateProductionReport(): string {
    console.log('▶️ Marketer Agent: Gathering production data...');
    // In a real implementation, this would connect to analytics APIs.
    let report = `## Production Performance Report\n\n`;
    report += `- **Feature:** Listing Creation Wizard\n`;
    report += `- **Time Period:** 7 days post-deployment\n`;
    report += `- **Adoption:** 75% of eligible users have used the feature.\n`;
    report += `- **Conversion:** 90% of users who start the wizard complete it.\n`;
    report += `- **Error Rate:** 0.5% of sessions encountered a non-critical UI error.\n`;
    console.log('✅ Production Performance Report generated.');
    return report;
  }

  /**
   * Orchestrates the full Production Metrics Review workflow.
   * @param originalBrief The original Feature Brief for context.
   * @returns The final Feature Impact Summary with a recommendation.
   */
  public runProductionMetricsReview(originalBrief: string): string {
    console.log('\n▶️ Marketer Agent: Initiating Production Metrics Review...');
    
    const productionReport = this.generateProductionReport();
    const impactReview = analyst.reviewProductionMetrics(productionReport, originalBrief);
    const healthReview = developer.reviewProductionMetrics(productionReport);

    let summary = `## Feature Impact Summary\n\n`;
    summary += `This report summarizes the production performance of the "Listing Creation Wizard" feature.\n\n`;
    summary += productionReport;
    summary += impactReview;
    summary += healthReview;
    summary += `\n---\n\n`;
    summary += `### Recommendation\n\n`;
    summary += `**ITERATE**. The feature is a success in terms of adoption, but the presence of a new error rate and the failure to meet the primary success metric indicates that an iteration is required.`;

    console.log('✅ Production Metrics Review complete. Final summary generated.');
    return summary;
  }
}

export const runMarketer = (): void => {
  console.log('▶️ Running Marketer Agent Full Workflow...');
  const marketer = new MarketerAgent();
  const originalBrief = `# Feature Brief: Listing Creation Wizard\n\n- Success Metric: 80% Adoption`;
  const impactSummary = marketer.runProductionMetricsReview(originalBrief);
  console.log('\n--- Final Feature Impact Summary ---\n');
  console.log(impactSummary);
};
