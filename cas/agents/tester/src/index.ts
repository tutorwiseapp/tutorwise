/**
 * Tester Agent - QA Engineer + Test Automation Engineer
 *
 * Responsibilities:
 * - Testability review of feature briefs
 * - Real test execution via Jest/Vitest
 * - Build verification
 * - Test scenario generation from acceptance criteria
 *
 * @agent Tester Agent
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { casGenerate } from '../../../packages/core/src/services/cas-ai';

const execAsync = promisify(exec);

const TESTER_SYSTEM_PROMPT = `You are the Tester Agent for TutorWise, acting as QA Engineer and Test Automation Engineer.
Your role is to assess testability of features, identify edge cases, and generate comprehensive test strategies.
You think in terms of: acceptance criteria → test scenarios → edge cases → regression risks.
Be specific, actionable, and thorough. Reference real testing patterns (unit, integration, E2E).`;

export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage: number;
  duration: number;
  failures?: Array<{ test: string; error: string }>;
  rawOutput?: string;
}

export interface BuildResult {
  success: boolean;
  output: string;
  duration: number;
  errors?: string[];
  warnings?: string[];
}

class TesterAgent {
  private projectRoot: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../../');
  }

  /**
   * Performs a Testability Review on a Feature Brief.
   * Uses LLM to assess testability and generate test scenarios from acceptance criteria.
   * Falls back to rules-based analysis if LLM is unavailable.
   */
  public async reviewFeatureBrief(featureBrief: string): Promise<string> {
    console.log('▶️ Tester Agent: Performing Testability Review...');

    // Try LLM-powered review
    const llmReview = await casGenerate({
      systemPrompt: TESTER_SYSTEM_PROMPT,
      userPrompt: `Review this feature brief for testability. Produce a Testability Report covering:
1. **Criteria Clarity** — Are the acceptance criteria clear enough to write tests? Rate High/Medium/Low.
2. **E2E Test Plan** — List the end-to-end test scenarios with numbered steps.
3. **Edge Cases** — What edge cases need testing? (error states, boundary conditions, concurrent access, etc.)
4. **Test Types Needed** — Which types apply? (unit, integration, E2E, accessibility, performance)
5. **Blockers** — What's missing that prevents writing tests?

Feature Brief:
${featureBrief}`,
      maxOutputTokens: 1500,
    });

    if (llmReview) {
      console.log('✅ Testability Review complete (AI-powered).');
      return `## Testability Report\n\n${llmReview}`;
    }

    // Fallback: rules-based review
    console.log('⚠️ LLM unavailable, using rules-based testability review.');
    const hasAcceptanceCriteria = featureBrief.includes('Acceptance Criteria');

    let report = `## Testability Report\n\n`;
    if (hasAcceptanceCriteria) {
      report += `- **Criteria Clarity:** ✅ High. The acceptance criteria are clear and can be translated into tests.\n`;
      report += `- **E2E Test Plan:**\n`;
      report += `  1. Verify the feature renders correctly.\n`;
      report += `  2. Test form validation for each input.\n`;
      report += `  3. Confirm data persistence across interactions.\n`;
      report += `  4. Verify error handling for API failures.\n`;
      report += `  5. Test the complete happy path end-to-end.\n`;
      report += `- **Edge Cases:**\n`;
      report += `  - Navigation away and return (state persistence)\n`;
      report += `  - API failure at each step (error handling)\n`;
      report += `  - Empty and invalid data for all fields\n`;
    } else {
      report += `- **Criteria Clarity:** ❌ Low. The brief is missing an "Acceptance Criteria" section.\n`;
      report += `- **Blockers:** Test planning is blocked until acceptance criteria are provided.\n`;
    }

    console.log('✅ Testability Review complete (rules-based).');
    return report;
  }

  /**
   * Runs the project's real test suite via Jest.
   * Returns structured results parsed from Jest's JSON output.
   */
  async runTests(featureName: string, options?: {
    testPath?: string;
    coverage?: boolean;
  }): Promise<TestResult> {
    console.log(`▶️ Tester Agent: Running tests for "${featureName}"...`);

    const webAppPath = path.join(this.projectRoot, 'apps/web');
    const testPath = options?.testPath || '';
    const coverageFlag = options?.coverage !== false ? '--coverage' : '';

    try {
      const cmd = `npx jest ${testPath} --json ${coverageFlag} --forceExit --passWithNoTests 2>&1`;
      const startTime = Date.now();

      const { stdout } = await execAsync(cmd, {
        cwd: webAppPath,
        timeout: 120000, // 2 minutes
        env: { ...process.env, CI: 'true' },
      });

      const duration = Date.now() - startTime;

      // Parse Jest JSON output
      try {
        // Jest JSON output may be preceded by other console output — find the JSON
        const jsonStart = stdout.indexOf('{');
        const jsonStr = jsonStart >= 0 ? stdout.substring(jsonStart) : stdout;
        const jestResult = JSON.parse(jsonStr);

        const totalTests = jestResult.numTotalTests || 0;
        const passedTests = jestResult.numPassedTests || 0;
        const failedTests = jestResult.numFailedTests || 0;

        // Extract coverage from Jest output
        const coveragePct = jestResult.coverageMap
          ? this.extractCoveragePercentage(jestResult)
          : 0;

        const failures = jestResult.testResults
          ?.flatMap((suite: any) =>
            (suite.testResults || [])
              .filter((t: any) => t.status === 'failed')
              .map((t: any) => ({
                test: `${suite.testFilePath}:${t.fullName}`,
                error: t.failureMessages?.join('\n') || 'Unknown error',
              }))
          )
          .slice(0, 20); // Limit failure output

        const result: TestResult = {
          passed: jestResult.success === true,
          totalTests,
          passedTests,
          failedTests,
          coverage: coveragePct,
          duration,
          failures: failures?.length > 0 ? failures : undefined,
        };

        console.log(`✅ Tests complete: ${passedTests}/${totalTests} passed, coverage: ${coveragePct}%`);
        return result;
      } catch {
        // JSON parse failed — return raw output
        return {
          passed: false,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          coverage: 0,
          duration: Date.now() - startTime,
          rawOutput: stdout.substring(0, 2000),
        };
      }
    } catch (error: any) {
      // Jest returns non-zero exit on test failures
      const duration = 0;
      const output = error.stdout || error.stderr || error.message;

      // Try to parse JSON from failed run
      try {
        const jsonStart = output.indexOf('{');
        if (jsonStart >= 0) {
          const jestResult = JSON.parse(output.substring(jsonStart));
          return {
            passed: false,
            totalTests: jestResult.numTotalTests || 0,
            passedTests: jestResult.numPassedTests || 0,
            failedTests: jestResult.numFailedTests || 0,
            coverage: 0,
            duration,
            rawOutput: output.substring(0, 2000),
          };
        }
      } catch {
        // Can't parse, return raw
      }

      console.warn(`⚠️ Test execution error: ${error.message}`);
      return {
        passed: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: 0,
        duration: 0,
        rawOutput: output?.substring(0, 2000) || error.message,
      };
    }
  }

  /**
   * Runs the project build to verify it succeeds.
   * Should be called before running tests — if build fails, no point testing.
   */
  async runBuild(): Promise<BuildResult> {
    console.log('▶️ Tester Agent: Running build verification...');

    const webAppPath = path.join(this.projectRoot, 'apps/web');
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: webAppPath,
        timeout: 180000, // 3 minutes
        env: { ...process.env },
      });

      const duration = Date.now() - startTime;
      const output = stdout + (stderr || '');

      // Extract warnings
      const warnings = output.match(/warning[:\s].*/gi) || [];

      console.log(`✅ Build succeeded in ${duration}ms`);
      return {
        success: true,
        output: output.substring(0, 3000),
        duration,
        warnings: warnings.length > 0 ? warnings.slice(0, 10) : undefined,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const output = (error.stdout || '') + (error.stderr || '') + (error.message || '');

      // Extract error lines
      const errors = output.match(/error[:\s].*/gi) || [];

      console.error(`❌ Build failed in ${duration}ms`);
      return {
        success: false,
        output: output.substring(0, 3000),
        duration,
        errors: errors.length > 0 ? errors.slice(0, 20) : ['Build failed — see output for details'],
      };
    }
  }

  private extractCoveragePercentage(jestResult: any): number {
    try {
      if (jestResult.coverageMap) {
        const summary = Object.values(jestResult.coverageMap);
        if (summary.length === 0) return 0;

        let totalStatements = 0;
        let coveredStatements = 0;
        for (const file of summary as any[]) {
          const s = file?.s || {};
          for (const count of Object.values(s) as number[]) {
            totalStatements++;
            if (count > 0) coveredStatements++;
          }
        }
        return totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0;
      }
    } catch {
      // Coverage parsing failed
    }
    return 0;
  }
}

export const tester = new TesterAgent();

export const runTester = (): void => {
  console.log('▶️ Running Tester Agent...');
};
