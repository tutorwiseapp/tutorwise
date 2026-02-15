/**
 * Sage Knowledge
 *
 * Role-aware RAG system for Sage.
 */

export type {
  KnowledgeDocument,
  DocumentType,
  DocumentMetadata,
  DocumentChunk,
  ChunkMetadata,
  KnowledgeSearchRequest,
  SearchFilters,
  KnowledgeSearchResult,
  ScoredChunk,
  NamespaceType,
  KnowledgeNamespace,
  KnowledgeAccess,
} from './types';

export { getNamespaceAccess } from './types';

export {
  KnowledgeRetriever,
  knowledgeRetriever,
} from './retriever';
