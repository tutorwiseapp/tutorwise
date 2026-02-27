/**
 * Strategic Decision Maker Module
 * Makes high-level strategic decisions based on organizational vision,
 * values, business metrics, and roadmap status
 */
export class StrategicDecisionMaker {
  /**
   * Evaluate if a feature aligns with organizational vision and strategic goals
   */
  public evaluateFeatureAlignment(
    featureDescription: string,
    vision: string,
    coreValues: string[],
    strategicGoals: string[]
  ): {
    isAligned: boolean;
    alignmentScore: number;
    recommendations: string[];
    coreValueAlignment: string[];
    strategicGoalAlignment: string[];
  } {
    const featureLower = featureDescription.toLowerCase();

    // Check alignment with core values
    const coreValueAlignment: string[] = [];
    if (featureLower.includes('user') || featureLower.includes('experience')) {
      coreValueAlignment.push('Focus on the User-centric Experience');
    }
    if (featureLower.includes('community') || featureLower.includes('network')) {
      coreValueAlignment.push('Build Thriving Communities');
    }
    if (featureLower.includes('quality') || featureLower.includes('excellence')) {
      coreValueAlignment.push('Commit to Excellence');
    }
    if (featureLower.includes('ai') || featureLower.includes('innovation') || featureLower.includes('automat')) {
      coreValueAlignment.push('Champion Innovation');
    }
    if (featureLower.includes('cost') || featureLower.includes('efficient') || featureLower.includes('optimize')) {
      coreValueAlignment.push('Embrace Frugality');
    }

    // Check alignment with strategic goals
    const strategicGoalAlignment: string[] = [];
    if (featureLower.includes('scale') || featureLower.includes('growth') || featureLower.includes('automat')) {
      strategicGoalAlignment.push('Scalability');
    }
    if (featureLower.includes('trust') || featureLower.includes('credibility') || featureLower.includes('verification')) {
      strategicGoalAlignment.push('Trust');
    }
    if (featureLower.includes('transparent') || featureLower.includes('visibility')) {
      strategicGoalAlignment.push('Transparency');
    }
    if (featureLower.includes('sustain') || featureLower.includes('revenue') || featureLower.includes('financial')) {
      strategicGoalAlignment.push('Sustainability');
    }
    if (featureLower.includes('ai') || featureLower.includes('innovation') || featureLower.includes('emerging')) {
      strategicGoalAlignment.push('Innovation');
    }

    // Calculate alignment score
    const alignmentScore =
      (coreValueAlignment.length / coreValues.length) * 50 +
      (strategicGoalAlignment.length / strategicGoals.length) * 50;

    const isAligned = alignmentScore >= 30; // At least 30% alignment

    // Generate recommendations
    const recommendations: string[] = [];
    if (!isAligned) {
      recommendations.push('⚠️ Low strategic alignment. Consider revisiting feature scope.');
    }
    if (coreValueAlignment.length === 0) {
      recommendations.push('💡 Strengthen connection to Tutorwise core values.');
    }
    if (strategicGoalAlignment.length === 0) {
      recommendations.push('💡 Clarify how this feature advances strategic goals.');
    }
    if (isAligned) {
      recommendations.push('✅ Strong strategic alignment. Proceed with confidence.');
    }

    return {
      isAligned,
      alignmentScore: Math.round(alignmentScore),
      recommendations,
      coreValueAlignment,
      strategicGoalAlignment,
    };
  }

  /**
   * Assess resource allocation priority based on roadmap status
   */
  public assessResourcePriority(
    featureType: 'core-system' | 'enhancement' | 'innovation' | 'polish',
    roadmapCompletion: number,
    betaReleaseDate: string
  ): {
    priority: 'critical' | 'high' | 'medium' | 'low' | 'deferred';
    reasoning: string;
    recommendation: string;
  } {
    const today = new Date();
    const betaDate = new Date(betaReleaseDate);
    const daysUntilBeta = Math.ceil((betaDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Decision logic based on roadmap completion and timeline
    if (roadmapCompletion >= 90) {
      // Final stretch before beta
      if (featureType === 'polish' || featureType === 'core-system') {
        return {
          priority: 'critical',
          reasoning: `Beta launch in ${daysUntilBeta} days. Focus on polish and critical fixes.`,
          recommendation: 'Fast-track this feature. Essential for beta quality.',
        };
      } else if (featureType === 'enhancement') {
        return {
          priority: 'medium',
          reasoning: `Platform is ${roadmapCompletion}% complete. Enhancements should not delay beta.`,
          recommendation: 'Add to post-beta backlog unless it addresses critical user feedback.',
        };
      } else {
        return {
          priority: 'deferred',
          reasoning: `Innovation features should wait until after beta launch (${betaReleaseDate}).`,
          recommendation: 'Defer to post-beta roadmap (Q2 2026).',
        };
      }
    } else if (roadmapCompletion >= 80) {
      // Late development phase
      if (featureType === 'core-system') {
        return {
          priority: 'critical',
          reasoning: 'Core system completion is essential for beta readiness.',
          recommendation: 'Prioritize immediately. Core systems must be complete.',
        };
      } else if (featureType === 'polish') {
        return {
          priority: 'high',
          reasoning: `Polish phase begins at 90% completion. Plan for ${betaReleaseDate}.`,
          recommendation: 'Schedule for polish phase (next 2 weeks).',
        };
      } else {
        return {
          priority: 'low',
          reasoning: 'Focus should remain on core system completion.',
          recommendation: 'Add to backlog. Address after core systems are complete.',
        };
      }
    } else {
      // Early/mid development phase
      if (featureType === 'core-system') {
        return {
          priority: 'high',
          reasoning: 'Core systems are the foundation for beta launch.',
          recommendation: 'Include in current sprint. Essential for roadmap progress.',
        };
      } else if (featureType === 'innovation') {
        return {
          priority: 'medium',
          reasoning: 'Innovation aligns with strategic goals, but core systems take precedence.',
          recommendation: 'Evaluate scope. Consider MVP approach to balance innovation with timeline.',
        };
      } else {
        return {
          priority: 'medium',
          reasoning: 'Enhancements add value but should not block core progress.',
          recommendation: 'Queue for next available sprint after core systems.',
        };
      }
    }
  }

  /**
   * Make strategic decision: PROCEED, ITERATE, or DEFER
   */
  public makeStrategicDecision(
    featureDescription: string,
    featureType: 'core-system' | 'enhancement' | 'innovation' | 'polish',
    vision: string,
    coreValues: string[],
    strategicGoals: string[],
    roadmapCompletion: number,
    betaReleaseDate: string
  ): {
    decision: 'PROCEED' | 'ITERATE' | 'DEFER';
    reasoning: string;
    directives: string[];
    alignment: any;
    priority: any;
  } {
    console.log('🎯 Director: Evaluating strategic alignment and resource priority...');

    // Evaluate alignment
    const alignment = this.evaluateFeatureAlignment(
      featureDescription,
      vision,
      coreValues,
      strategicGoals
    );

    // Assess priority
    const priority = this.assessResourcePriority(featureType, roadmapCompletion, betaReleaseDate);

    // Make decision
    let decision: 'PROCEED' | 'ITERATE' | 'DEFER';
    let reasoning: string;
    const directives: string[] = [];

    if (!alignment.isAligned) {
      decision = 'ITERATE';
      reasoning = 'Feature does not align sufficiently with organizational vision and strategic goals.';
      directives.push('🔄 Revise feature scope to strengthen alignment with core values and strategic goals.');
      directives.push('📊 Clarify how this feature advances Tutorwise mission.');
    } else if (priority.priority === 'deferred') {
      decision = 'DEFER';
      reasoning = priority.reasoning;
      directives.push(priority.recommendation);
      directives.push('📅 Add to post-beta roadmap with clear success metrics.');
    } else if (priority.priority === 'critical' || priority.priority === 'high') {
      decision = 'PROCEED';
      reasoning = `Strong alignment (${alignment.alignmentScore}%) and ${priority.priority} priority.`;
      directives.push(priority.recommendation);
      directives.push('✅ Align with Planner for sprint planning and resource allocation.');
      directives.push(`📈 Ensure success metrics align with strategic goals: ${alignment.strategicGoalAlignment.join(', ')}`);
    } else {
      decision = 'PROCEED';
      reasoning = `Moderate alignment (${alignment.alignmentScore}%) and ${priority.priority} priority.`;
      directives.push(priority.recommendation);
      directives.push('⚖️ Balance this feature against other priorities in sprint planning.');
    }

    return {
      decision,
      reasoning,
      directives,
      alignment,
      priority,
    };
  }
}
