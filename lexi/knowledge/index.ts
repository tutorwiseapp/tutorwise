/**
 * Lexi Knowledge Module
 *
 * RAG knowledge layer for platform documentation.
 *
 * @module lexi/knowledge
 */

export { lexiKnowledgeRetriever, LexiKnowledgeRetriever } from './retriever';
export { lexiKnowledgeSeeder, LexiKnowledgeSeeder } from './seeder';
export type {
  LexiKnowledgeSearchRequest,
  LexiKnowledgeSearchResult,
  LexiScoredChunk,
  LexiKnowledgeArticle,
  LexiKnowledgeChunk,
} from './types';
