import type { TestRunnerConfig } from '@storybook/test-runner';
import { checkA11y, injectAxe } from 'axe-playwright';

const config: TestRunnerConfig = {
  async preVisit(page) {
    // Inject Axe for accessibility testing
    await injectAxe(page);
  },
  async postVisit(page) {
    // Run accessibility checks on every story
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  },
  // Test timeout configuration
  testTimeout: 30000,
  // Configure tags to include/exclude
  tags: {
    include: [],
    exclude: ['skip-test'],
    skip: ['skip-test'],
  },
};

export default config;
