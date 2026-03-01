/**
 * Strategic Decision Maker Module
 * Makes high-level strategic decisions based on organizational vision,
 * values, business metrics, and roadmap status.
 *
 * AI-Native: Uses LLM for semantic alignment analysis.
 * Falls back to keyword-matching rules if LLM unavailable.
 */

import { casGenerateStructured } from '../../../../packages/core/src/services/cas-ai';

const DIRECTOR_SYSTEM_PROMPT = `You are the Director of TutorWise, acting as Product Manager, Strategist, CTO, and Cofounder.
You make strategic decisions about which features to build and when.
You evaluate features against organizational vision, core values, and strategic goals.
You balance innovation with execution discipline and timeline constraints.
Be decisive and provide clear reasoning for your decisions.`;

interface AlignmentResult {
  isAligned: boolean;
  alignmentScore: number;
  coreValueAlignment: string[];
  strategicGoalAlignment: string[];
  reasoning: string;
}

export class StrategicDecisionMaker {
  /**
   * Evaluate if a feature aligns with organizational vision and strategic goals.
   * Uses LLM for semantic reasoning. Falls back to keyword matching.
   */
  public async evaluateFeatureAlignment(
    featureDescription: string,
    vision: string,
    coreValues: string[],
    strategicGoals: string[]
  ): Promise<{
    isAligned: boolean;
    alignmentScore: number;
    recommendations: string[];
    coreValueAlignment: string[];
    strategicGoalAlignment: string[];
  }> {
    // Try LLM-powered alignment analysis
    const llmResult = await casGenerateStructured<AlignmentResult>({
      systemPrompt: DIRECTOR_SYSTEM_PROMPT,
      userPrompt: `Evaluate how well this feature aligns with our organizational vision and goals.

Feature: "${featureDescription}"

Vision: ${vision}

Core Values:
${coreValues.map((v, i) => `${i + 1}. ${v}`).join('\n')}

Strategic Goals:
${strategicGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Score alignment 0-100%. List which core values and strategic goals are supported.`,
      jsonSchema: `{
  "isAligned": true,
  "alignmentScore": 75,
  "coreValueAlignment": ["value names that are supported"],
  "strategicGoalAlignment": ["goal names that are supported"],
  "reasoning": "string explaining the alignment assessment"
}`,
      maxOutputTokens: 800,
    });

    if (llmResult) {
      const recommendations: string[] = [];
      if (!llmResult.isAligned) {
        recommendations.push('⚠️ Low strategic alignment. Consider revisiting feature scope.');
      }
      if (llmResult.coreValueAlignment.length === 0) {
        recommendations.push('💡 Strengthen connection to Tutorwise core values.');
      }
      if (llmResult.isAligned) {
        recommendations.push('✅ Strong strategic alignment. Proceed with confidence.');
      }

      return {
        isAligned: llmResult.isAligned,
        alignmentScore: llmResult.alignmentScore,
        recommendations,
        coreValueAlignment: llmResult.coreValueAlignment,
        strategicGoalAlignment: llmResult.strategicGoalAlignment,
      };
    }

    // Fallback: keyword-based alignment
    return this.keywordBasedAlignment(featureDescription, coreValues, strategicGoals);
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

    if (roadmapCompletion >= 90) {
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
          recommendation: 'Defer to post-beta roadmap.',
        };
      }
    } else if (roadmapCompletion >= 80) {
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
          recommendation: 'Schedule for polish phase.',
        };
      } else {
        return {
          priority: 'low',
          reasoning: 'Focus should remain on core system completion.',
          recommendation: 'Add to backlog. Address after core systems are complete.',
        };
      }
    } else {
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
   * Combines alignment evaluation with resource priority assessment.
   */
  public async makeStrategicDecision(
    featureDescription: string,
    featureType: 'core-system' | 'enhancement' | 'innovation' | 'polish',
    vision: string,
    coreValues: string[],
    strategicGoals: string[],
    roadmapCompletion: number,
    betaReleaseDate: string
  ): Promise<{
    decision: 'PROCEED' | 'ITERATE' | 'DEFER';
    reasoning: string;
    directives: string[];
    alignment: any;
    priority: any;
  }> {
    console.log('🎯 Director: Evaluating strategic alignment and resource priority...');

    const alignment = await this.evaluateFeatureAlignment(
      featureDescription,
      vision,
      coreValues,
      strategicGoals
    );

    const priority = this.assessResourcePriority(featureType, roadmapCompletion, betaReleaseDate);

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
      directives.push('✅ Align with Planner for task creation and WIP management.');
      directives.push(`📈 Ensure success metrics align with strategic goals: ${alignment.strategicGoalAlignment.join(', ')}`);
    } else {
      decision = 'PROCEED';
      reasoning = `Moderate alignment (${alignment.alignmentScore}%) and ${priority.priority} priority.`;
      directives.push(priority.recommendation);
      directives.push('⚖️ Balance this feature against other priorities in backlog.');
    }

    return { decision, reasoning, directives, alignment, priority };
  }

  /**
   * Fallback: keyword-based alignment (used when LLM unavailable)
   */
  private keywordBasedAlignment(
    featureDescription: string,
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

    const alignmentScore =
      (coreValueAlignment.length / coreValues.length) * 50 +
      (strategicGoalAlignment.length / strategicGoals.length) * 50;

    const isAligned = alignmentScore >= 30;

    const recommendations: string[] = [];
    if (!isAligned) {
      recommendations.push('⚠️ Low strategic alignment. Consider revisiting feature scope.');
    }
    if (coreValueAlignment.length === 0) {
      recommendations.push('💡 Strengthen connection to Tutorwise core values.');
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
}
