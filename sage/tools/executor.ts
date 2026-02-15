/**
 * Sage Tool Executor
 *
 * Executes Sage tool calls and returns results.
 *
 * @module sage/tools/executor
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ToolCall, ToolResult } from './types';
import { getToolByName } from './definitions';
import { knowledgeRetriever } from '../knowledge';
import { progressService } from '../services/progress';

// --- Tool Executor ---

export class SageToolExecutor {
  private supabase: SupabaseClient | null = null;
  private userId: string | null = null;

  /**
   * Initialize with Supabase client and user context
   */
  initialize(supabaseClient: SupabaseClient, userId: string): void {
    this.supabase = supabaseClient;
    this.userId = userId;
    knowledgeRetriever.initialize(supabaseClient);
  }

  /**
   * Execute a tool call
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const tool = getToolByName(toolCall.function.name);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolCall.function.name}`,
      };
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await this.executeFunction(toolCall.function.name, args);
      return { success: true, data: result };
    } catch (error) {
      console.error(`[SageToolExecutor] Error executing ${toolCall.function.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a specific function
   */
  private async executeFunction(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'solve_with_hints':
        return this.solveWithHints(args);

      case 'check_answer':
        return this.checkAnswer(args);

      case 'generate_practice_problems':
        return this.generatePracticeProblems(args);

      case 'create_quiz':
        return this.createQuiz(args);

      case 'explain_concept':
        return this.explainConcept(args);

      case 'explain_differently':
        return this.explainDifferently(args);

      case 'get_student_progress':
        return this.getStudentProgress(args);

      case 'suggest_next_topic':
        return this.suggestNextTopic(args);

      case 'upload_document':
        return this.uploadDocument(args);

      case 'search_knowledge':
        return this.searchKnowledge(args);

      case 'generate_progress_report':
        return this.generateProgressReport(args);

      case 'analyze_work':
        return this.analyzeWork(args);

      default:
        throw new Error(`Unimplemented tool: ${name}`);
    }
  }

  // --- Tool Implementations ---

  private async solveWithHints(args: Record<string, unknown>): Promise<unknown> {
    // Returns structured hints - the LLM will format the response
    return {
      problem: args.problem,
      subject: args.subject || 'general',
      hints: [
        'First, identify what the question is asking',
        'Break down the problem into smaller steps',
        'Apply the relevant formula or method',
      ],
      hintLevel: args.hintLevel || 'moderate',
    };
  }

  private async checkAnswer(args: Record<string, unknown>): Promise<unknown> {
    // Basic structure - the LLM will evaluate correctness
    return {
      question: args.question,
      studentAnswer: args.studentAnswer,
      showSolution: args.showSolution || 'hints_only',
      needsEvaluation: true,
    };
  }

  private async generatePracticeProblems(args: Record<string, unknown>): Promise<unknown> {
    // Returns parameters for problem generation - LLM will generate
    const count = Math.min(Math.max(Number(args.count) || 5, 1), 10);
    return {
      topic: args.topic,
      subject: args.subject || 'general',
      level: args.level || 'GCSE',
      count,
      difficulty: args.difficulty || 'medium',
      generateNow: true,
    };
  }

  private async createQuiz(args: Record<string, unknown>): Promise<unknown> {
    const count = Math.min(Math.max(Number(args.questionCount) || 10, 5), 20);
    return {
      topics: String(args.topics).split(',').map(t => t.trim()),
      subject: args.subject || 'general',
      level: args.level || 'GCSE',
      questionCount: count,
      includeMarkScheme: args.includeMarkScheme === 'yes',
      generateNow: true,
    };
  }

  private async explainConcept(args: Record<string, unknown>): Promise<unknown> {
    // Search knowledge base for relevant content
    const context = await this.searchKnowledge({
      query: String(args.concept),
      subject: args.subject,
      source: 'all',
    });

    return {
      concept: args.concept,
      subject: args.subject || 'general',
      level: args.level || 'GCSE',
      style: args.style || 'step_by_step',
      relatedContent: context,
    };
  }

  private async explainDifferently(args: Record<string, unknown>): Promise<unknown> {
    return {
      originalExplanation: args.originalExplanation,
      confusionPoint: args.confusionPoint,
      preferredStyle: args.preferredStyle || 'simpler',
      needsReexplanation: true,
    };
  }

  private async getStudentProgress(args: Record<string, unknown>): Promise<unknown> {
    if (!this.supabase || !this.userId) {
      return { error: 'Not authenticated' };
    }

    const studentId = String(args.studentId || this.userId);
    const subject = args.subject as string | undefined;

    try {
      const progress = await progressService.getProgress(this.supabase, studentId, subject);
      return {
        studentId,
        subject: subject || 'all',
        detail: args.detail || 'summary',
        progress,
      };
    } catch (error) {
      return { error: 'Failed to fetch progress' };
    }
  }

  private async suggestNextTopic(args: Record<string, unknown>): Promise<unknown> {
    if (!this.supabase || !this.userId) {
      return { error: 'Not authenticated' };
    }

    const subject = String(args.subject);
    const goal = String(args.goal || 'advance');

    try {
      const progress = await progressService.getProgress(this.supabase, this.userId, subject);
      const weakTopics = progress.topicMastery
        .filter((t: any) => t.mastery < 0.7)
        .sort((a: any, b: any) => a.mastery - b.mastery);

      return {
        subject,
        goal,
        suggestedTopics: weakTopics.slice(0, 3).map((t: any) => t.topic),
        reasoning: `Based on your ${goal} goal and current progress`,
      };
    } catch (error) {
      return { subject, goal, suggestedTopics: [], reasoning: 'Unable to analyze progress' };
    }
  }

  private async uploadDocument(args: Record<string, unknown>): Promise<unknown> {
    // Document upload is handled by the upload processor
    // This tool just returns confirmation
    return {
      documentId: args.documentId,
      subject: args.subject || 'general',
      level: args.level || 'GCSE',
      shareWith: args.shareWith || 'private',
      status: 'queued_for_processing',
    };
  }

  private async searchKnowledge(args: Record<string, unknown>): Promise<unknown> {
    const query = String(args.query);
    const subject = args.subject as string | undefined;
    const source = String(args.source || 'all');

    // Use knowledge retriever
    const sources = source === 'all' 
      ? [
          { type: 'user_upload' as const, namespace: `users/${this.userId}`, priority: 1 },
          { type: 'global' as const, namespace: 'global', priority: 3 },
        ]
      : [{ type: source as any, namespace: source, priority: 1 }];

    const results = await knowledgeRetriever.search(
      { query, subject, topK: 5 },
      sources
    );

    return {
      query,
      resultCount: results.chunks.length,
      results: results.chunks.map(c => ({
        content: c.content.substring(0, 200) + '...',
        source: c.document.filename,
        score: c.score,
      })),
    };
  }

  private async generateProgressReport(args: Record<string, unknown>): Promise<unknown> {
    if (!this.supabase) {
      return { error: 'Not authenticated' };
    }

    const studentId = String(args.studentId);
    const period = String(args.period || 'month');
    const format = String(args.format || 'summary');

    try {
      const progress = await progressService.getProgress(this.supabase, studentId);
      
      return {
        studentId,
        period,
        format,
        progress,
        generateNow: true,
      };
    } catch (error) {
      return { error: 'Failed to generate report' };
    }
  }

  private async analyzeWork(args: Record<string, unknown>): Promise<unknown> {
    return {
      workType: args.workType,
      subject: args.subject || 'general',
      content: args.content,
      needsAnalysis: true,
    };
  }
}

// --- Singleton Export ---

export const sageToolExecutor = new SageToolExecutor();

export default SageToolExecutor;
