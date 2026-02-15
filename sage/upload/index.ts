/**
 * Sage Upload
 *
 * Document upload and processing pipeline.
 */

export {
  DocumentProcessor,
  documentProcessor,
  detectFileType,
  type ProcessedDocument,
  type ExtractedChunk,
  type ProcessorOptions,
} from './processor';

export {
  DocumentEmbedder,
  documentEmbedder,
  type EmbeddingResult,
  type EmbedderConfig,
} from './embedder';

export {
  ALLOWED_FILE_TYPES,
  isAllowedFileType,
  getFileTypeConfig,
  getMaxFileSize,
  getAllowedExtensions,
  getAllowedMimeTypes,
  type FileTypeConfig,
} from './config/allowed-types';
