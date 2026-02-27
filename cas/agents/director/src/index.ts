import { StrategicReader } from './modules/strategic-reader';
import { StrategicDecisionMaker } from './modules/strategic-decision-maker';

/**
 * Director Agent
 *
 * The Director makes strategic decisions based on organizational vision,
 * values, goals, and business metrics. Reads from:
 * - .ai/0-tutorwise.md (vision, mission, values, strategic goals)
 * - .ai/1-roadmap.md (project status, metrics, roadmap)
 *
 * Responsibilities:
 * - Evaluate feature alignment with organizational vision and strategic goals
 * - Assess resource allocation priority based on roadmap status and timeline
 * - Make strategic decisions: PROCEED, ITERATE, or DEFER
 * - Provide high-level directives for the product development workflow
 *
 * The Director is the first agent in the top-down organizational workflow:
 * Director → Planner → Analyst → Developer → Tester → QA → Security → Engineer → Marketer
 */
class DirectorAgent {
  private strategicReader: StrategicReader;
  private decisionMaker: StrategicDecisionMaker;

  // Cached strategic context
  private vision?: ReturnType<StrategicReader['readOrganizationalVision']>;
  private roadmap?: ReturnType<StrategicReader['readStrategicRoadmap']>;

  constructor() {
    this.strategicReader = new StrategicReader();
    this.decisionMaker = new StrategicDecisionMaker();
  }

  /**
   * Load organizational strategic context from .ai/ documents
   */
  private loadStrategicContext(): void {
    if (!this.vision || !this.roadmap) {
      console.log('📖 Director: Loading organizational strategic context...');
      this.vision = this.strategicReader.readOrganizationalVision();
      this.roadmap = this.strategicReader.readStrategicRoadmap();
      console.log('✅ Strategic context loaded.');
    }
  }

  /**
   * Get organizational vision summary
   */
  public getOrganizationalVision(): string {
    this.loadStrategicContext();

    if (!this.vision) {
      throw new Error('Failed to load organizational vision');
    }

    let summary = `# TutorWise Organizational Vision\n\n`;
    summary += `## Vision\n${this.vision.vision}\n\n`;
    summary += `## Mission\n${this.vision.mission}\n\n`;
    summary += `## Core Values (7)\n`;
    this.vision.coreValues.forEach((value, idx) => {
      summary += `${idx + 1}. ${value}\n`;
    });
    summary += `\n## Strategic Goals (5)\n`;
    this.vision.strategicGoals.forEach((goal, idx) => {
      summary += `${idx + 1}. ${goal}\n`;
    });
    summary += `\n## Strategic Approaches\n`;
    this.vision.strategicApproaches.forEach((approach) => {
      summary += `- ${approach}\n`;
    });

    return summary;
  }

  /**
   * Get current roadmap status summary
   */
  public getRoadmapStatus(): string {
    this.loadStrategicContext();

    if (!this.roadmap) {
      throw new Error('Failed to load roadmap');
    }

    let summary = `# TutorWise Roadmap Status\n\n`;
    summary += `## Project Status\n`;
    summary += `- **Completion:** ${this.roadmap.projectStatus}\n`;
    summary += `- **Beta Release:** ${this.roadmap.betaReleaseDate}\n\n`;
    summary += `## Key Metrics\n`;
    summary += `- **Pages:** ${this.roadmap.keyMetrics.pages}\n`;
    summary += `- **Lines of Code:** ${this.roadmap.keyMetrics.linesOfCode}\n`;
    summary += `- **Migrations:** ${this.roadmap.keyMetrics.migrations}\n`;
    summary += `- **Components:** ${this.roadmap.keyMetrics.components}\n`;
    summary += `- **Features:** ${this.roadmap.keyMetrics.features}\n\n`;
    summary += `## Completed Systems (${this.roadmap.completedSystems.length})\n`;
    this.roadmap.completedSystems.slice(0, 10).forEach((system) => {
      summary += `- ✅ ${system}\n`;
    });
    if (this.roadmap.completedSystems.length > 10) {
      summary += `- ... and ${this.roadmap.completedSystems.length - 10} more\n`;
    }
    summary += `\n## In Progress (${this.roadmap.inProgress.length})\n`;
    this.roadmap.inProgress.forEach((item) => {
      summary += `- 🔄 ${item}\n`;
    });
    summary += `\n## Critical Path to Beta\n`;
    this.roadmap.criticalPath.forEach((item) => {
      summary += `- 🎯 ${item}\n`;
    });

    return summary;
  }

  /**
   * Make strategic decision on a feature proposal
   */
  public makeStrategicDecision(
    featureDescription: string,
    featureType: 'core-system' | 'enhancement' | 'innovation' | 'polish'
  ): {
    decision: 'PROCEED' | 'ITERATE' | 'DEFER';
    reasoning: string;
    directives: string[];
    strategicContext: string;
  } {
    console.log('\n🎯 Director Agent: Making strategic decision...');
    console.log(`Feature: "${featureDescription}"`);
    console.log(`Type: ${featureType}`);

    this.loadStrategicContext();

    if (!this.vision || !this.roadmap) {
      throw new Error('Failed to load strategic context');
    }

    // Make decision using Strategic Decision Maker
    const result = this.decisionMaker.makeStrategicDecision(
      featureDescription,
      featureType,
      this.vision.vision,
      this.vision.coreValues,
      this.vision.strategicGoals,
      this.roadmap.completionPercentage,
      this.roadmap.betaReleaseDate
    );

    // Format strategic context summary
    let strategicContext = `## Strategic Context\n\n`;
    strategicContext += `**Vision Alignment:** ${result.alignment.alignmentScore}%\n`;
    if (result.alignment.coreValueAlignment.length > 0) {
      strategicContext += `\n**Core Values Aligned:**\n`;
      result.alignment.coreValueAlignment.forEach((value: string) => {
        strategicContext += `- ${value}\n`;
      });
    }
    if (result.alignment.strategicGoalAlignment.length > 0) {
      strategicContext += `\n**Strategic Goals Aligned:**\n`;
      result.alignment.strategicGoalAlignment.forEach((goal: string) => {
        strategicContext += `- ${goal}\n`;
      });
    }
    strategicContext += `\n**Resource Priority:** ${result.priority.priority.toUpperCase()}\n`;
    strategicContext += `**Roadmap Status:** ${this.roadmap.projectStatus} (Beta: ${this.roadmap.betaReleaseDate})\n`;

    // Log decision
    console.log(`\n🎯 Decision: ${result.decision}`);
    console.log(`📊 Reasoning: ${result.reasoning}`);
    console.log(`\n📋 Directives:`);
    result.directives.forEach((directive) => {
      console.log(`   ${directive}`);
    });
    console.log('\n✅ Strategic decision complete.\n');

    return {
      decision: result.decision,
      reasoning: result.reasoning,
      directives: result.directives,
      strategicContext,
    };
  }

  /**
   * Review production metrics and provide strategic guidance
   */
  public reviewProductionMetrics(
    featureName: string,
    productionMetrics: {
      adoptionRate?: number;
      errorRate?: number;
      userSatisfaction?: number;
      revenueImpact?: number;
    }
  ): {
    recommendation: 'CONTINUE' | 'ITERATE' | 'DEPRECATE';
    reasoning: string;
    nextSteps: string[];
  } {
    console.log('\n🎯 Director: Reviewing production metrics...');
    console.log(`Feature: "${featureName}"`);

    this.loadStrategicContext();

    const { adoptionRate = 0, errorRate = 0, userSatisfaction = 0, revenueImpact = 0 } = productionMetrics;

    // Decision criteria based on metrics
    let recommendation: 'CONTINUE' | 'ITERATE' | 'DEPRECATE';
    let reasoning: string;
    const nextSteps: string[] = [];

    if (adoptionRate >= 80 && errorRate < 1 && userSatisfaction >= 4.5) {
      recommendation = 'CONTINUE';
      reasoning = 'Feature exceeds success metrics. Strong performance across all dimensions.';
      nextSteps.push('✅ Archive learnings for future feature development.');
      nextSteps.push('📊 Monitor for regression. Set up automated alerts.');
      nextSteps.push('🎯 Consider feature expansion based on user feedback.');
    } else if (adoptionRate >= 50 && errorRate < 5) {
      recommendation = 'ITERATE';
      reasoning = 'Feature shows promise but has not reached optimal performance.';
      if (adoptionRate < 80) {
        nextSteps.push('🔄 Analyze user friction points to improve adoption.');
      }
      if (errorRate >= 1) {
        nextSteps.push('🐛 Investigate and fix root causes of errors.');
      }
      if (userSatisfaction < 4.5) {
        nextSteps.push('💡 Gather user feedback to identify UX improvements.');
      }
      nextSteps.push('📅 Plan iteration sprint. Target: 2 weeks.');
    } else {
      recommendation = 'DEPRECATE';
      reasoning = 'Feature is underperforming and not meeting minimum success criteria.';
      nextSteps.push('⚠️ Create deprecation plan with timeline.');
      nextSteps.push('🔍 Conduct post-mortem to extract learnings.');
      nextSteps.push('🗑️ Safely remove feature from codebase.');
      nextSteps.push('📢 Communicate deprecation to users (if applicable).');
    }

    console.log(`\n🎯 Recommendation: ${recommendation}`);
    console.log(`📊 Reasoning: ${reasoning}`);
    console.log(`\n📋 Next Steps:`);
    nextSteps.forEach((step) => {
      console.log(`   ${step}`);
    });
    console.log('\n✅ Production metrics review complete.\n');

    return {
      recommendation,
      reasoning,
      nextSteps,
    };
  }
}

export const director = new DirectorAgent();

export const runDirector = async (): Promise<void> => {
  console.log('▶️ Running Director Agent...');
  const director = new DirectorAgent();

  // Display organizational vision
  console.log('\n' + '='.repeat(80));
  console.log(director.getOrganizationalVision());
  console.log('='.repeat(80) + '\n');

  // Display roadmap status
  console.log('\n' + '='.repeat(80));
  console.log(director.getRoadmapStatus());
  console.log('='.repeat(80) + '\n');

  // Example 1: Evaluate a new innovation feature
  console.log('\n📌 Example 1: New AI-powered tutor matching feature');
  const decision1 = director.makeStrategicDecision(
    'AI-powered tutor matching using machine learning to recommend tutors based on student learning style, preferences, and past booking history',
    'innovation'
  );
  console.log(decision1.strategicContext);

  // Example 2: Evaluate a polish feature
  console.log('\n📌 Example 2: Mobile responsiveness polish');
  const decision2 = director.makeStrategicDecision(
    'Polish mobile responsiveness across all pages with touch-optimized interactions',
    'polish'
  );
  console.log(decision2.strategicContext);

  // Example 3: Review production metrics
  console.log('\n📌 Example 3: Review production metrics for a launched feature');
  const review = director.reviewProductionMetrics('Listing Wizard', {
    adoptionRate: 75,
    errorRate: 0.5,
    userSatisfaction: 4.3,
    revenueImpact: 15000,
  });
};
