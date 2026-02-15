/**
 * Sage Knowledge Types
 *
 * Types for the Role-aware RAG system.
 */

import type { SageSubject, SageLevel } from '../types';

// --- Document Types ---

export interface KnowledgeDocument {
  id: string;
  namespace: string;
  ownerId: string;
  filename: string;
  originalFilename: string;
  fileType: DocumentType;
  subject?: SageSubject;
  level?: SageLevel;
  metadata: DocumentMetadata;
  chunks: DocumentChunk[];
  status: 'pending' | 'processing' | 'ready' | 'failed';
  visibility: 'private' | 'shared' | 'public';
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentType =
  | 'powerpoint'     // .pptx, .ppt
  | 'pdf'            // .pdf
  | 'word'           // .docx, .doc
  | 'markdown'       // .md
  | 'text'           // .txt
  | 'image'          // .png, .jpg (for OCR)
  | 'worksheet';     // Custom worksheet format

export interface DocumentMetadata {
  title?: string;
  author?: string;
  description?: string;
  tags?: string[];
  topics?: string[];
  pageCount?: number;
  wordCount?: number;
  language?: string;
  extractedAt?: Date;
  processingTime?: number;
}

// --- Chunk Types ---

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  metadata: ChunkMetadata;
  position: number;
  pageNumber?: number;
}

export interface ChunkMetadata {
  type: 'text' | 'heading' | 'bullet' | 'table' | 'formula' | 'image_caption';
  heading?: string;
  slideNumber?: number;
  isFormula?: boolean;
  topics?: string[];
}

// --- Search Types ---

export interface KnowledgeSearchRequest {
  query: string;
  namespaces: string[];
  subject?: SageSubject;
  level?: SageLevel;
  topK?: number;
  minScore?: number;
  filters?: SearchFilters;
}

export interface SearchFilters {
  documentTypes?: DocumentType[];
  topics?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  ownerIds?: string[];
}

export interface KnowledgeSearchResult {
  chunks: ScoredChunk[];
  totalResults: number;
  searchTime: number;
}

export interface ScoredChunk extends DocumentChunk {
  score: number;
  document: {
    id: string;
    filename: string;
    ownerId: string;
    subject?: SageSubject;
    level?: SageLevel;
  };
}

// --- Namespace Types ---

export type NamespaceType = 'global' | 'user' | 'shared';

export interface KnowledgeNamespace {
  type: NamespaceType;
  path: string;
  ownerId?: string;
  priority: number;
}

// --- Access Control ---

export interface KnowledgeAccess {
  userId: string;
  canRead: boolean;
  canWrite: boolean;
  canShare: boolean;
  canDelete: boolean;
}

export function getNamespaceAccess(
  userId: string,
  namespace: KnowledgeNamespace,
  userRole: string
): KnowledgeAccess {
  // Global: everyone can read, only admins can write
  if (namespace.type === 'global') {
    return {
      userId,
      canRead: true,
      canWrite: userRole === 'admin',
      canShare: false,
      canDelete: userRole === 'admin',
    };
  }

  // User's own namespace: full access
  if (namespace.type === 'user' && namespace.ownerId === userId) {
    return {
      userId,
      canRead: true,
      canWrite: true,
      canShare: userRole === 'tutor' || userRole === 'agent',
      canDelete: true,
    };
  }

  // Shared namespace: read only for recipients
  if (namespace.type === 'shared') {
    return {
      userId,
      canRead: true,
      canWrite: false,
      canShare: false,
      canDelete: namespace.ownerId === userId,
    };
  }

  // Default: no access
  return {
    userId,
    canRead: false,
    canWrite: false,
    canShare: false,
    canDelete: false,
  };
}
