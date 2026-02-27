import JiraClient from '@cas/agent/src/integrations/jira-client';

class PlannerAgent {
  private jiraClient: JiraClient;

  constructor() {
    // In a real environment, credentials would be securely provided by the Engineer Agent.
    // For now, we assume they are in the environment.
    this.jiraClient = new JiraClient();
  }

  /**
   * Creates a new task in the task management system (Jira).
   * @param title The title of the task.
   * @param description A detailed description of the task.
   */
  private async createTask(title: string, description: string): Promise<void> {
    console.log(`📝 Creating new Jira task: "${title}"`);
    try {
      // This is a placeholder for the actual Jira API call.
      // await this.jiraClient.createIssue({
      //   project: 'TUTOR',
      //   summary: title,
      //   description: description,
      //   issuetype: { name: 'Task' },
      //   labels: ['cas-generated', 'iteration'],
      // });
      console.log('✅ Jira task created successfully (simulation).');
    } catch (error: any) {
      console.error('❌ Failed to create Jira task:', error.message);
    }
  }

  /**
   * Makes a strategic decision based on a Feature Impact Summary.
   * @param impactSummary The summary report from the Marketer Agent.
   */
  public async makeStrategicDecision(impactSummary: string): Promise<void> {
    console.log('\n▶️ Planner Agent: Making strategic decision...');

    if (impactSummary.includes('**ITERATE**')) {
      console.log('✅ Decision: ITERATE. Creating new tasks in Jira.');
      await this.createTask(
        'Investigate and fix 0.5% error rate in Listing Wizard',
        'The Production Metrics Review detected a new, non-critical error rate of 0.5% for the Listing Wizard. This task is to investigate the root cause and implement a fix.'
      );
      await this.createTask(
        'Analyze UI friction to improve Listing Wizard adoption',
        'The Production Metrics Review showed that the Listing Wizard adoption rate (75%) did not meet the success metric of 80%. This task is to analyze user behavior, identify points of friction, and propose UI/UX improvements.'
      );

    } else if (impactSummary.includes('**SUCCESS**')) {
      console.log('✅ Decision: SUCCESS. Archiving learnings.');

    } else if (impactSummary.includes('**REMOVE**')) {
      console.log('✅ Decision: REMOVE. Creating deprecation task in Jira.');
      await this.createTask(
        'Deprecate and remove Failed Feature X',
        'The Production Metrics Review determined that Feature X failed to meet its goals and is not being used. This task is to safely remove the feature from the codebase.'
      );
    }
    
    console.log('✅ Strategic decision complete. The development loop is now closed.');
  }
}

export const planner = new PlannerAgent();

export const runPlanner = async (): Promise<void> => {
  console.log('▶️ Running Planner Agent...');
  const planner = new PlannerAgent();
  
  const impactSummary = `## Feature Impact Summary... \n\n ### Recommendation\n\n**ITERATE**.`;
  await planner.makeStrategicDecision(impactSummary);
};
