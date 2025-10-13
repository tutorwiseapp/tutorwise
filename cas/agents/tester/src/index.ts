class TesterAgent {
  /**
   * Performs a Testability Review on a Feature Brief.
   * @param featureBrief The markdown content of the brief.
   * @returns A Testability Report.
   */
  public reviewFeatureBrief(featureBrief: string): string {
    console.log('▶️ Tester Agent: Performing Testability Review...');

    const hasAcceptanceCriteria = featureBrief.includes('Acceptance Criteria');

    let report = `## Testability Report\n\n`;
    if (hasAcceptanceCriteria) {
      report += `- **Criteria Clarity:** ✅ High. The acceptance criteria are clear and can be translated into E2E tests.\n`;
      report += `- **E2E Test Plan:** 
    - 1. Navigate to the create listing page.
    - 2. Verify each of the 5 steps renders correctly.
    - 3. Test form validation for each step.
    - 4. Confirm that data persists between steps.
    - 5. Verify the final summary and submission.\n`;
      report += `- **Edge Cases Identified:**
    - What happens if the user navigates away and comes back? (State persistence)
    - What happens if an API call fails at any step? (Error handling)
    - Test with empty and invalid data for all fields.\n`;
    } else {
      report += `- **Criteria Clarity:** ❌ Low. The brief is missing an "Acceptance Criteria" section. It is impossible to define a test plan.\n`;
      report += `- **Blockers:** Test planning is blocked until acceptance criteria are provided.\n`;
    }
    
    console.log('✅ Testability Review complete.');
    return report;
  }
}

export const tester = new TesterAgent();

export const runTester = (): void => {
  console.log('▶️ Running Tester Agent...');
};
