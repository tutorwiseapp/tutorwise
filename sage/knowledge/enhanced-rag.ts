/**
 * Enhanced RAG (Retrieval-Augmented Generation) Architecture
 *
 * Multi-tier knowledge retrieval with quality scoring and topic-aware synthesis.
 * Inspired by Khanmigo's approach to integrating Khan Academy's content library.
 *
 * Key Features:
 * - Multi-tier retrieval (curriculum → user uploads → general knowledge)
 * - Quality scoring (relevance × recency × authority)
 * - Topic-aware chunking (align chunks to curriculum topics)
 * - Multi-source synthesis (combine knowledge from different sources)
 *
 * @module sage/knowledge/enhanced-rag
 */

import type { CurriculumTopic } from '../curriculum/types';

/**
 * Knowledge source tiers (priority order)
 */
export type KnowledgeTier = 'curriculum' | 'user-upload' | 'general' | 'web';

/**
 * Quality scoring factors
 */
export interface QualityScore {
  /** Semantic similarity to query (0-1) */
  relevance: number;

  /** Recency factor (0-1, newer = higher) */
  recency: number;

  /** Source authority (0-1, curated > user > web) */
  authority: number;

  /** Topic alignment (0-1, matches curriculum topic) */
  topicAlignment: number;

  /** Overall quality score (weighted combination) */
  overall: number;
}

/**
 * Enhanced knowledge chunk with metadata
 */
export interface EnhancedChunk {
  /** Chunk ID */
  id: string;

  /** Chunk content */
  content: string;

  /** Knowledge tier */
  tier: KnowledgeTier;

  /** Source metadata */
  source: {
    type: 'curriculum' | 'textbook' | 'user-notes' | 'web-article' | 'video-transcript' | 'practice-problem';
    name: string;
    url?: string;
    author?: string;
    createdAt: Date;
  };

  /** Curriculum topic this chunk relates to */
  curriculumTopic?: CurriculumTopic;

  /** Quality scores */
  quality: QualityScore;

  /** Semantic similarity to query */
  similarity: number;

  /** Chunk position in original document */
  position?: {
    /** Character offset */
    offset: number;
    /** Chunk index */
    index: number;
    /** Total chunks in document */
    total: number;
  };

  /** Related chunks (for context expansion) */
  relatedChunks?: string[];
}

/**
 * Multi-tier retrieval strategy
 */
export interface RetrievalStrategy {
  /** Tier to retrieve from */
  tier: KnowledgeTier;

  /** Maximum chunks to retrieve */
  maxChunks: number;

  /** Minimum similarity threshold */
  minSimilarity: number;

  /** Weight in final ranking (0-1) */
  weight: number;
}

/**
 * Retrieval result with multi-source synthesis
 */
export interface EnhancedRetrievalResult {
  /** Retrieved chunks across all tiers */
  chunks: EnhancedChunk[];

  /** Chunks grouped by tier */
  byTier: Record<KnowledgeTier, EnhancedChunk[]>;

  /** Chunks grouped by curriculum topic */
  byTopic: Record<string, EnhancedChunk[]>;

  /** Total search time (ms) */
  searchTime: number;

  /** Number of sources consulted */
  sourcesConsulted: number;

  /** Coverage score (how well query is covered, 0-1) */
  coverage: number;
}

/**
 * Default retrieval strategies for different tiers
 */
export const DEFAULT_STRATEGIES: RetrievalStrategy[] = [
  {
    tier: 'curriculum',
    maxChunks: 5,
    minSimilarity: 0.7,
    weight: 1.0, // Highest priority
  },
  {
    tier: 'user-upload',
    maxChunks: 3,
    minSimilarity: 0.65,
    weight: 0.8,
  },
  {
    tier: 'general',
    maxChunks: 3,
    minSimilarity: 0.6,
    weight: 0.6,
  },
  {
    tier: 'web',
    maxChunks: 2,
    minSimilarity: 0.7,
    weight: 0.4, // Lowest priority (use sparingly)
  },
];

/**
 * Calculate quality score for a chunk
 */
export function calculateQualityScore(
  chunk: Omit<EnhancedChunk, 'quality'>,
  query: string,
  curriculumContext?: CurriculumTopic
): QualityScore {
  // 1. Relevance (semantic similarity)
  const relevance = chunk.similarity;

  // 2. Recency (exponential decay, half-life = 1 year)
  const ageInDays = (Date.now() - chunk.source.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const recency = Math.exp(-ageInDays / 365);

  // 3. Authority (based on source type)
  const authorityMap: Record<typeof chunk.source.type, number> = {
    'curriculum': 1.0,
    'textbook': 0.9,
    'practice-problem': 0.85,
    'user-notes': 0.7,
    'video-transcript': 0.6,
    'web-article': 0.5,
  };
  const authority = authorityMap[chunk.source.type] || 0.5;

  // 4. Topic alignment (does chunk match curriculum topic?)
  let topicAlignment = 0.5; // Default: neutral
  if (curriculumContext && chunk.curriculumTopic) {
    if (chunk.curriculumTopic.id === curriculumContext.id) {
      topicAlignment = 1.0; // Perfect match
    } else if (chunk.curriculumTopic.parentId === curriculumContext.id ||
               chunk.curriculumTopic.id === curriculumContext.parentId) {
      topicAlignment = 0.8; // Parent-child relationship
    } else if (curriculumContext.relatedTopics?.includes(chunk.curriculumTopic.id)) {
      topicAlignment = 0.7; // Related topic
    }
  }

  // 5. Overall score (weighted combination)
  const overall =
    relevance * 0.4 +        // 40% semantic similarity
    authority * 0.3 +        // 30% source authority
    topicAlignment * 0.2 +   // 20% topic alignment
    recency * 0.1;           // 10% recency

  return {
    relevance,
    recency,
    authority,
    topicAlignment,
    overall,
  };
}

/**
 * Rank and filter chunks across multiple tiers
 */
export function rankChunks(
  chunks: EnhancedChunk[],
  strategies: RetrievalStrategy[] = DEFAULT_STRATEGIES,
  maxTotal: number = 10
): EnhancedChunk[] {
  // Group chunks by tier
  const byTier = chunks.reduce((acc, chunk) => {
    if (!acc[chunk.tier]) acc[chunk.tier] = [];
    acc[chunk.tier].push(chunk);
    return acc;
  }, {} as Record<KnowledgeTier, EnhancedChunk[]>);

  // Sort each tier by quality score
  for (const tier in byTier) {
    byTier[tier as KnowledgeTier].sort((a, b) => b.quality.overall - a.quality.overall);
  }

  // Select top chunks from each tier according to strategy
  const selected: EnhancedChunk[] = [];

  for (const strategy of strategies) {
    const tierChunks = byTier[strategy.tier] || [];
    const filtered = tierChunks
      .filter(chunk => chunk.similarity >= strategy.minSimilarity)
      .slice(0, strategy.maxChunks);

    // Apply tier weight to quality scores
    filtered.forEach(chunk => {
      chunk.quality.overall *= strategy.weight;
    });

    selected.push(...filtered);
  }

  // Re-sort by weighted quality and limit to maxTotal
  selected.sort((a, b) => b.quality.overall - a.quality.overall);
  return selected.slice(0, maxTotal);
}

/**
 * Synthesize chunks from multiple sources into coherent context
 */
export function synthesizeContext(
  chunks: EnhancedChunk[],
  maxTokens: number = 2000
): string {
  if (chunks.length === 0) return '';

  const parts: string[] = [];
  let tokenCount = 0;

  // Group by tier for organized presentation
  const byTier = chunks.reduce((acc, chunk) => {
    if (!acc[chunk.tier]) acc[chunk.tier] = [];
    acc[chunk.tier].push(chunk);
    return acc;
  }, {} as Record<KnowledgeTier, EnhancedChunk[]>);

  // Format each tier
  for (const tier of ['curriculum', 'user-upload', 'general', 'web'] as KnowledgeTier[]) {
    const tierChunks = byTier[tier];
    if (!tierChunks || tierChunks.length === 0) continue;

    const tierLabel = {
      'curriculum': 'Curriculum Knowledge',
      'user-upload': 'Student Notes & Materials',
      'general': 'General Knowledge',
      'web': 'Web Resources',
    }[tier];

    parts.push(`\n### ${tierLabel}\n`);

    for (const chunk of tierChunks) {
      // Estimate tokens (rough: 1 token ≈ 4 characters)
      const chunkTokens = Math.ceil(chunk.content.length / 4);
      if (tokenCount + chunkTokens > maxTokens) break;

      // Add chunk with source attribution
      parts.push(`**Source:** ${chunk.source.name}`);
      if (chunk.curriculumTopic) {
        parts.push(`**Topic:** ${chunk.curriculumTopic.name}`);
      }
      parts.push(`\n${chunk.content}\n`);

      tokenCount += chunkTokens;
    }

    if (tokenCount >= maxTokens) break;
  }

  return parts.join('\n');
}

/**
 * Calculate coverage score (how well the retrieved chunks cover the query)
 */
export function calculateCoverage(chunks: EnhancedChunk[], query: string): number {
  if (chunks.length === 0) return 0;

  // Extract keywords from query
  const queryKeywords = new Set(
    query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .map(word => word.replace(/[^a-z0-9]/g, ''))
  );

  if (queryKeywords.size === 0) return 0;

  // Count how many keywords appear in chunks
  const coveredKeywords = new Set<string>();
  for (const chunk of chunks) {
    const chunkText = chunk.content.toLowerCase();
    for (const keyword of queryKeywords) {
      if (chunkText.includes(keyword)) {
        coveredKeywords.add(keyword);
      }
    }
  }

  return coveredKeywords.size / queryKeywords.size;
}

/**
 * Expand context by retrieving related chunks
 * (e.g., if chunk mentions "quadratic formula", also retrieve "completing the square")
 */
export function expandContext(
  primaryChunks: EnhancedChunk[],
  allChunks: EnhancedChunk[],
  maxExpansion: number = 3
): EnhancedChunk[] {
  const expanded = [...primaryChunks];
  const primaryIds = new Set(primaryChunks.map(c => c.id));

  for (const chunk of primaryChunks) {
    if (!chunk.relatedChunks) continue;

    for (const relatedId of chunk.relatedChunks) {
      if (primaryIds.has(relatedId)) continue; // Already included
      if (expanded.length - primaryChunks.length >= maxExpansion) break;

      const relatedChunk = allChunks.find(c => c.id === relatedId);
      if (relatedChunk) {
        expanded.push(relatedChunk);
        primaryIds.add(relatedId);
      }
    }

    if (expanded.length - primaryChunks.length >= maxExpansion) break;
  }

  return expanded;
}

/**
 * Format enhanced retrieval result for debugging/logging
 */
export function formatRetrievalSummary(result: EnhancedRetrievalResult): string {
  const lines = [
    `Enhanced RAG Retrieval Summary:`,
    `  Total chunks: ${result.chunks.length}`,
    `  Search time: ${result.searchTime}ms`,
    `  Sources consulted: ${result.sourcesConsulted}`,
    `  Coverage score: ${(result.coverage * 100).toFixed(1)}%`,
    ``,
    `  By tier:`,
  ];

  for (const [tier, chunks] of Object.entries(result.byTier)) {
    if (chunks.length > 0) {
      const avgQuality = chunks.reduce((sum, c) => sum + c.quality.overall, 0) / chunks.length;
      lines.push(`    ${tier}: ${chunks.length} chunks (avg quality: ${avgQuality.toFixed(2)})`);
    }
  }

  return lines.join('\n');
}
