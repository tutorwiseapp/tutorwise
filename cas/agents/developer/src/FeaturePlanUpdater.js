"use strict";
/**
 * Feature Plan Updater - Auto-maintains cas-feature-dev-plan.md
 *
 * This class automatically updates the Developer Agent's feature development plan
 * based on:
 * - Claude Code's TodoWrite tool usage
 * - Implementation reports and summaries
 * - Tester agent feedback
 * - QA agent reviews
 * - Planner agent coordination
 *
 * @agent Developer Agent
 * @auto-maintains cas/agents/developer/planning/cas-feature-dev-plan.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturePlanUpdater = void 0;
const fs = require("fs");
const path = require("path");
class FeaturePlanUpdater {
    constructor(weekNumber = 2) {
        this.planFilePath = path.join(
              __dirname,
              '../planning',
              'cas-feature-dev-plan.md'
            );
        this.currentWeek = weekNumber;
    }
    /**
     * Update the plan based on current todos
     */
    async updateFromTodos(todos, featureName) {
        const plan = await this.readPlan();
        const updatedPlan = this.injectTodoUpdates(plan, todos, featureName);
        await this.writePlan(updatedPlan);
    }
    /**
     * Update test results section
     */
    async updateTestResults(featureName, testResults) {
        const plan = await this.readPlan();
        const updatedPlan = this.injectTestResults(plan, featureName, testResults);
        await this.writePlan(updatedPlan);
    }
    /**
     * Update QA review section
     */
    async updateQAReview(featureName, qaReview) {
        const plan = await this.readPlan();
        const updatedPlan = this.injectQAReview(plan, featureName, qaReview);
        await this.writePlan(updatedPlan);
    }
    /**
     * Add a new feature to the backlog
     */
    async addFeatureToBacklog(feature) {
        const plan = await this.readPlan();
        const updatedPlan = this.addFeature(plan, feature, 'backlog');
        await this.writePlan(updatedPlan);
    }
    /**
     * Move feature from backlog to current sprint
     */
    async moveToCurrentSprint(featureName) {
        const plan = await this.readPlan();
        const updatedPlan = this.moveFeature(plan, featureName, 'current');
        await this.writePlan(updatedPlan);
    }
    /**
     * Mark feature as complete and move to completed section
     */
    async markFeatureComplete(featureName, completedDate) {
        const plan = await this.readPlan();
        const updatedPlan = this.completeFeature(plan, featureName, completedDate);
        await this.writePlan(updatedPlan);
    }
    /**
     * Update the "Last Updated" timestamp
     */
    async updateTimestamp() {
        const plan = await this.readPlan();
        const now = new Date().toISOString().split('.')[0].replace('T', ' ');
        const updatedPlan = plan.replace(/\*\*Last Updated:\*\* \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/, `**Last Updated:** ${now}`);
        await this.writePlan(updatedPlan);
    }
    // Private helper methods
    async readPlan() {
        return fs.promises.readFile(this.planFilePath, 'utf-8');
    }
    async writePlan(content) {
        await fs.promises.writeFile(this.planFilePath, content, 'utf-8');
    }
    injectTodoUpdates(plan, todos, featureName) {
        // Find the feature section
        const featurePattern = new RegExp(`### Feature: ${featureName}[\\s\\S]*?#### Implementation Todos \\(Auto-tracked\\)([\\s\\S]*?)(?=####|###|---)`);
        const match = plan.match(featurePattern);
        if (!match) {
            console.warn(`Feature "${featureName}" not found in plan`);
            return plan;
        }
        // Generate todo markdown
        const todoMarkdown = todos
            .map(todo => {
            const checkbox = todo.status === 'completed' ? '[x]' : '[ ]';
            return `- ${checkbox} ${todo.content}`;
        })
            .join('\n');
        // Replace the todos section
        return plan.replace(featurePattern, (match, todosSection) => {
            return match.replace(todosSection, '\n' + todoMarkdown + '\n');
        });
    }
    injectTestResults(plan, featureName, testResults) {
        if (!testResults)
            return plan;
        const testMarkdown = `\`\`\`
${testResults.unitTests}
${testResults.coverage}
${testResults.e2eTests || ''}
Status: ${testResults.status}
\`\`\``;
        // Find and replace test results section
        const pattern = new RegExp(`(### Feature: ${featureName}[\\s\\S]*?#### Test Results \\(from Tester Agent\\))\\s*\`\`\`[\\s\\S]*?\`\`\``);
        if (plan.match(pattern)) {
            return plan.replace(pattern, `$1\n${testMarkdown}`);
        }
        // If no test results section exists, add it after Implementation Todos
        const insertPattern = new RegExp(`(### Feature: ${featureName}[\\s\\S]*?#### Implementation Todos[\\s\\S]*?)(?=####|###|---)`);
        return plan.replace(insertPattern, `$1\n#### Test Results (from Tester Agent)\n${testMarkdown}\n\n`);
    }
    injectQAReview(plan, featureName, qaReview) {
        if (!qaReview)
            return plan;
        const qaMarkdown = `\`\`\`
✅ Accessibility: ${qaReview.accessibility}
✅ Visual Regression: ${qaReview.visualRegression}
✅ Code Quality: ${qaReview.codeQuality}
\`\`\``;
        // Find and replace QA review section
        const pattern = new RegExp(`(### Feature: ${featureName}[\\s\\S]*?#### QA Review \\(from QA Agent\\))\\s*\`\`\`[\\s\\S]*?\`\`\``);
        if (plan.match(pattern)) {
            return plan.replace(pattern, `$1\n${qaMarkdown}`);
        }
        // If no QA section exists, add it after Test Results
        const insertPattern = new RegExp(`(### Feature: ${featureName}[\\s\\S]*?#### Test Results[\\s\\S]*?\`\`\`[\\s\\S]*?\`\`\`)(?=\\n\\n####|\\n\\n###|\\n\\n---)`);
        return plan.replace(insertPattern, `$1\n\n#### QA Review (from QA Agent)\n${qaMarkdown}\n`);
    }
    addFeature(plan, feature, section) {
        const featureMarkdown = this.generateFeatureMarkdown(feature);
        const sectionHeader = section === 'current'
            ? `## Current Sprint: Week ${this.currentWeek}`
            : `## Backlog: Week ${this.currentWeek + 1}`;
        // Find section and append feature
        const pattern = new RegExp(`(${sectionHeader}[\\s\\S]*?)(?=\\n## |$)`);
        return plan.replace(pattern, `$1\n${featureMarkdown}\n---\n\n`);
    }
    moveFeature(plan, featureName, destination) {
        // Extract feature from current location
        const featurePattern = new RegExp(`### Feature: ${featureName}[\\s\\S]*?(?=\\n### |\\n## |$)`);
        const featureMatch = plan.match(featurePattern);
        if (!featureMatch) {
            console.warn(`Feature "${featureName}" not found`);
            return plan;
        }
        const featureContent = featureMatch[0];
        // Remove from current location
        let updatedPlan = plan.replace(featurePattern, '');
        // Insert into destination
        if (destination === 'current') {
            const currentHeader = `## Current Sprint: Week ${this.currentWeek}`;
            updatedPlan = updatedPlan.replace(currentHeader, `${currentHeader}\n\n${featureContent}\n---\n`);
        }
        else {
            const completedHeader = `## Completed: Week ${this.currentWeek}`;
            updatedPlan = updatedPlan.replace(completedHeader, `${completedHeader}\n\n${featureContent}\n---\n`);
        }
        return updatedPlan;
    }
    completeFeature(plan, featureName, completedDate) {
        // Update status to ✅ Complete
        let updatedPlan = plan.replace(new RegExp(`(### Feature: ${featureName} )[🟡🔴]`), '$1✅');
        updatedPlan = updatedPlan.replace(new RegExp(`(### Feature: ${featureName}[\\s\\S]*?\\*\\*Status:\\*\\* )[^\\n]+`), '$1Complete');
        // Add completed date
        updatedPlan = updatedPlan.replace(new RegExp(`(### Feature: ${featureName}[\\s\\S]*?\\*\\*Started:\\*\\* [^\\n]+)`), `$1\n**Completed:** ${completedDate}`);
        // Move to completed section
        return this.moveFeature(updatedPlan, featureName, 'completed');
    }
    generateFeatureMarkdown(feature) {
        let markdown = `### Feature: ${feature.name} ${feature.status}\n`;
        markdown += `**Status:** ${feature.statusText}\n`;
        markdown += `**Developer:** ${feature.developer}\n`;
        if (feature.started) {
            markdown += `**Started:** ${feature.started}\n`;
        }
        if (feature.completed) {
            markdown += `**Completed:** ${feature.completed}\n`;
        }
        if (feature.blocked) {
            markdown += `**Blocked:** ${feature.blocked}\n`;
        }
        markdown += `\n#### Implementation Todos (Auto-tracked)\n`;
        feature.todos.forEach(todo => {
            const checkbox = todo.completed ? '[x]' : '[ ]';
            markdown += `- ${checkbox} ${todo.task}\n`;
        });
        if (feature.testResults) {
            markdown += `\n#### Test Results (from Tester Agent)\n\`\`\`\n`;
            markdown += `${feature.testResults.unitTests}\n`;
            markdown += `${feature.testResults.coverage}\n`;
            if (feature.testResults.e2eTests) {
                markdown += `${feature.testResults.e2eTests}\n`;
            }
            markdown += `Status: ${feature.testResults.status}\n\`\`\`\n`;
        }
        if (feature.qaReview) {
            markdown += `\n#### QA Review (from QA Agent)\n\`\`\`\n`;
            markdown += `✅ Accessibility: ${feature.qaReview.accessibility}\n`;
            markdown += `✅ Visual Regression: ${feature.qaReview.visualRegression}\n`;
            markdown += `✅ Code Quality: ${feature.qaReview.codeQuality}\n\`\`\`\n`;
        }
        if (feature.plannerNotes && feature.plannerNotes.length > 0) {
            markdown += `\n#### Planner Notes\n`;
            feature.plannerNotes.forEach(note => {
                markdown += `- ${note}\n`;
            });
        }
        return markdown;
    }
}
exports.FeaturePlanUpdater = FeaturePlanUpdater;
/**
 * Usage Example:
 *
 * ```typescript
 * const updater = new FeaturePlanUpdater(2); // Week 2
 *
 * // Update from todos
 * await updater.updateFromTodos([
 *   { content: 'Create component', status: 'completed', activeForm: 'Creating component' },
 *   { content: 'Write tests', status: 'in_progress', activeForm: 'Writing tests' },
 * ], 'ClientProfessionalInfoForm');
 *
 * // Update test results
 * await updater.updateTestResults('ClientProfessionalInfoForm', {
 *   unitTests: '✅ Unit Tests: 21/21 passing (100%)',
 *   coverage: '✅ Coverage: 94.66%',
 *   status: 'Excellent - Production ready',
 * });
 *
 * // Mark complete
 * await updater.markFeatureComplete('ClientProfessionalInfoForm', '2025-10-08');
 *
 * // Update timestamp
 * await updater.updateTimestamp();
 * ```
 */
