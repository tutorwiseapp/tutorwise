/**
 * Enhanced Knowledge Retriever
 *
 * Integrates enhanced RAG architecture with Sage's knowledge base.
 * Provides multi-tier retrieval with quality scoring and topic-aware synthesis.
 *
 * @module sage/knowledge/enhanced-retriever
 */

import type { CurriculumTopic } from '../curriculum/types';
import type {
  EnhancedChunk,
  EnhancedRetrievalResult,
  KnowledgeTier,
  RetrievalStrategy,
} from './enhanced-rag';
import {
  calculateQualityScore,
  rankChunks,
  synthesizeContext,
  calculateCoverage,
  expandContext,
  DEFAULT_STRATEGIES,
  formatRetrievalSummary,
} from './enhanced-rag';

/**
 * Search parameters for enhanced retrieval
 */
export interface EnhancedSearchParams {
  /** Search query */
  query: string;

  /** Curriculum context (if available) */
  curriculumTopic?: CurriculumTopic;

  /** Knowledge tiers to search (default: all) */
  tiers?: KnowledgeTier[];

  /** Maximum total chunks to return */
  maxChunks?: number;

  /** Minimum similarity threshold */
  minSimilarity?: number;

  /** Custom retrieval strategies */
  strategies?: RetrievalStrategy[];

  /** Whether to expand context with related chunks */
  expandContext?: boolean;

  /** User ID for personalized results (user uploads) */
  userId?: string;

  /** Subject filter */
  subject?: string;

  /** Level filter */
  level?: string;
}

/**
 * Mock knowledge base for demonstration
 * In production, this would query Supabase with pgvector
 */
const MOCK_KNOWLEDGE_BASE: Omit<EnhancedChunk, 'quality'>[] = [
  // Curriculum knowledge
  {
    id: 'curr-001',
    content: 'Order of operations (BIDMAS/BODMAS/PEMDAS) states that multiplication and division are performed before addition and subtraction. When evaluating 100 - 50 × 2, first multiply 50 × 2 = 100, then subtract: 100 - 100 = 0.',
    tier: 'curriculum',
    source: {
      type: 'curriculum',
      name: 'GCSE Maths: Number - Four Operations',
      createdAt: new Date('2024-01-01'),
    },
    curriculumTopic: {
      id: 'maths-number-four-operations',
      name: 'Four Operations',
    } as CurriculumTopic,
    similarity: 0.95,
    relatedChunks: ['curr-002', 'curr-003'],
  },
  {
    id: 'curr-002',
    content: 'Common misconceptions with order of operations: Students often evaluate expressions left-to-right without considering BIDMAS. For example, they might incorrectly calculate 100 - 50 × 2 as (100 - 50) × 2 = 100 instead of the correct answer 0.',
    tier: 'curriculum',
    source: {
      type: 'curriculum',
      name: 'GCSE Maths: Common Misconceptions',
      createdAt: new Date('2024-01-01'),
    },
    curriculumTopic: {
      id: 'maths-number-four-operations',
      name: 'Four Operations',
    } as CurriculumTopic,
    similarity: 0.88,
  },
  {
    id: 'curr-003',
    content: 'Brackets override the normal order of operations. In the expression (100 - 50) × 2, the brackets force you to subtract first: 100 - 50 = 50, then multiply: 50 × 2 = 100.',
    tier: 'curriculum',
    source: {
      type: 'curriculum',
      name: 'GCSE Maths: Number - Four Operations',
      createdAt: new Date('2024-01-01'),
    },
    curriculumTopic: {
      id: 'maths-number-four-operations',
      name: 'Four Operations',
    } as CurriculumTopic,
    similarity: 0.82,
  },

  // Textbook knowledge
  {
    id: 'text-001',
    content: 'When solving quadratic equations by factorising, first ensure the equation is in the form ax² + bx + c = 0. Then find two numbers that multiply to give ac and add to give b. For example, x² - 5x + 6 = 0 factors as (x - 2)(x - 3) = 0, giving solutions x = 2 or x = 3.',
    tier: 'general',
    source: {
      type: 'textbook',
      name: 'GCSE Maths Textbook: Algebra',
      author: 'Pearson Edexcel',
      createdAt: new Date('2023-06-01'),
    },
    curriculumTopic: {
      id: 'maths-algebra-quadratic-equations',
      name: 'Quadratic Equations',
    } as CurriculumTopic,
    similarity: 0.75,
  },

  // Practice problems
  {
    id: 'prac-001',
    content: 'Practice Problem: Calculate 24 ÷ 4 + 3 × 2. Solution: Following BIDMAS, first do division and multiplication left to right: 24 ÷ 4 = 6, and 3 × 2 = 6. Then add: 6 + 6 = 12.',
    tier: 'curriculum',
    source: {
      type: 'practice-problem',
      name: 'GCSE Maths Practice Problems',
      createdAt: new Date('2024-02-01'),
    },
    curriculumTopic: {
      id: 'maths-number-four-operations',
      name: 'Four Operations',
    } as CurriculumTopic,
    similarity: 0.85,
  },
];

/**
 * Enhanced knowledge retriever with multi-tier search
 */
export class EnhancedKnowledgeRetriever {
  /**
   * Search knowledge base with enhanced RAG
   */
  async search(params: EnhancedSearchParams): Promise<EnhancedRetrievalResult> {
    const startTime = Date.now();

    // 1. Retrieve chunks from all tiers
    const allChunks = await this.retrieveChunks(params);

    // 2. Calculate quality scores for each chunk
    const scoredChunks: EnhancedChunk[] = allChunks.map(chunk => ({
      ...chunk,
      quality: calculateQualityScore(chunk, params.query, params.curriculumTopic),
    }));

    // 3. Rank and filter using strategies
    const strategies = params.strategies || DEFAULT_STRATEGIES;
    const maxChunks = params.maxChunks || 10;
    let rankedChunks = rankChunks(scoredChunks, strategies, maxChunks);

    // 4. Optionally expand context with related chunks
    if (params.expandContext && rankedChunks.length > 0) {
      rankedChunks = expandContext(rankedChunks, scoredChunks, 3);
    }

    // 5. Group by tier and topic
    const byTier = rankedChunks.reduce((acc, chunk) => {
      if (!acc[chunk.tier]) acc[chunk.tier] = [];
      acc[chunk.tier].push(chunk);
      return acc;
    }, {} as Record<KnowledgeTier, EnhancedChunk[]>);

    const byTopic = rankedChunks.reduce((acc, chunk) => {
      if (!chunk.curriculumTopic) return acc;
      const topicId = chunk.curriculumTopic.id;
      if (!acc[topicId]) acc[topicId] = [];
      acc[topicId].push(chunk);
      return acc;
    }, {} as Record<string, EnhancedChunk[]>);

    // 6. Calculate coverage
    const coverage = calculateCoverage(rankedChunks, params.query);

    const searchTime = Date.now() - startTime;
    const sourcesConsulted = new Set(rankedChunks.map(c => c.source.name)).size;

    return {
      chunks: rankedChunks,
      byTier,
      byTopic,
      searchTime,
      sourcesConsulted,
      coverage,
    };
  }

  /**
   * Retrieve chunks from knowledge base
   * In production, this would use pgvector similarity search on Supabase
   */
  private async retrieveChunks(params: EnhancedSearchParams): Promise<Omit<EnhancedChunk, 'quality'>[]> {
    // For now, use mock data
    // Filter by tier if specified
    let chunks = MOCK_KNOWLEDGE_BASE;

    if (params.tiers) {
      chunks = chunks.filter(c => params.tiers!.includes(c.tier));
    }

    // Filter by minimum similarity
    if (params.minSimilarity) {
      chunks = chunks.filter(c => c.similarity >= params.minSimilarity!);
    }

    // Filter by subject/topic if specified
    if (params.curriculumTopic) {
      // Prioritize chunks matching the curriculum topic
      chunks = chunks.map(c => {
        if (c.curriculumTopic?.id === params.curriculumTopic!.id) {
          return { ...c, similarity: c.similarity * 1.2 }; // Boost matching topic
        }
        return c;
      });
    }

    return chunks;
  }

  /**
   * Format retrieved chunks as context for LLM
   */
  formatForContext(result: EnhancedRetrievalResult, maxTokens: number = 2000): string {
    return synthesizeContext(result.chunks, maxTokens);
  }

  /**
   * Get retrieval summary for logging
   */
  getRetrievalSummary(result: EnhancedRetrievalResult): string {
    return formatRetrievalSummary(result);
  }
}

/**
 * Singleton instance
 */
export const enhancedRetriever = new EnhancedKnowledgeRetriever();
