/**
 * Lexi Knowledge Types
 *
 * Types for Lexi's RAG knowledge layer.
 * Reuses sage_knowledge_chunks table with lexi/ namespace prefix.
 *
 * @module lexi/knowledge
 */

// --- Search Types ---

export interface LexiKnowledgeSearchRequest {
  query: string;
  category?: string;
  audience?: string;
  topK?: number;
  minScore?: number;
}

export interface LexiKnowledgeSearchResult {
  chunks: LexiScoredChunk[];
  totalResults: number;
  searchTime: number;
}

export interface LexiScoredChunk {
  id: string;
  content: string;
  score: number;
  source: {
    title: string;
    category: string;
    slug: string;
    audience?: string;
  };
}

// --- Seeder Types ---

export interface LexiKnowledgeArticle {
  title: string;
  slug: string;
  category: string;
  audience?: string;
  description: string;
  keywords?: string[];
  content: string;
}

export interface LexiKnowledgeChunk {
  content: string;
  metadata: {
    title: string;
    category: string;
    slug: string;
    audience?: string;
    section?: string;
    keywords?: string[];
  };
}
