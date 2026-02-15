/**
 * Sage Upload Processor
 *
 * Processes uploaded files (PowerPoint, PDF, etc.) and extracts
 * text content for embedding.
 *
 * @module sage/upload
 */

import type { SageSubject, SageLevel } from '../types';
import type {
  DocumentType,
  DocumentMetadata,
  DocumentChunk,
  ChunkMetadata,
} from '../knowledge/types';

// --- Processor Types ---

export interface ProcessedDocument {
  filename: string;
  originalFilename: string;
  fileType: DocumentType;
  metadata: DocumentMetadata;
  chunks: ExtractedChunk[];
  processingTime: number;
}

export interface ExtractedChunk {
  content: string;
  metadata: ChunkMetadata;
  position: number;
  pageNumber?: number;
}

export interface ProcessorOptions {
  chunkSize?: number;       // Max characters per chunk
  chunkOverlap?: number;    // Overlap between chunks
  extractFormulas?: boolean;
  extractTables?: boolean;
  preserveFormatting?: boolean;
}

const DEFAULT_OPTIONS: Required<ProcessorOptions> = {
  chunkSize: 1000,
  chunkOverlap: 100,
  extractFormulas: true,
  extractTables: true,
  preserveFormatting: false,
};

// --- File Type Detection ---

export function detectFileType(filename: string): DocumentType {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pptx':
    case 'ppt':
      return 'powerpoint';
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'word';
    case 'md':
      return 'markdown';
    case 'txt':
      return 'text';
    case 'png':
    case 'jpg':
    case 'jpeg':
      return 'image';
    default:
      return 'text';
  }
}

// --- Document Processor Class ---

export class DocumentProcessor {
  private options: Required<ProcessorOptions>;

  constructor(options?: ProcessorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Process a document buffer and extract chunks.
   */
  async process(
    buffer: Buffer,
    filename: string,
    options?: ProcessorOptions
  ): Promise<ProcessedDocument> {
    const startTime = Date.now();
    const opts = { ...this.options, ...options };
    const fileType = detectFileType(filename);

    let rawContent: string;
    let metadata: DocumentMetadata = {};

    // Extract content based on file type
    switch (fileType) {
      case 'powerpoint':
        const pptResult = await this.processPowerPoint(buffer);
        rawContent = pptResult.content;
        metadata = pptResult.metadata;
        break;

      case 'pdf':
        const pdfResult = await this.processPDF(buffer);
        rawContent = pdfResult.content;
        metadata = pdfResult.metadata;
        break;

      case 'word':
        const wordResult = await this.processWord(buffer);
        rawContent = wordResult.content;
        metadata = wordResult.metadata;
        break;

      case 'markdown':
      case 'text':
        rawContent = buffer.toString('utf-8');
        metadata = { wordCount: rawContent.split(/\s+/).length };
        break;

      default:
        rawContent = buffer.toString('utf-8');
    }

    // Chunk the content
    const chunks = this.chunkContent(rawContent, opts);

    return {
      filename,
      originalFilename: filename,
      fileType,
      metadata: {
        ...metadata,
        extractedAt: new Date(),
        processingTime: Date.now() - startTime,
      },
      chunks,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Process PowerPoint file.
   */
  private async processPowerPoint(buffer: Buffer): Promise<{
    content: string;
    metadata: DocumentMetadata;
  }> {
    // TODO: Implement actual PowerPoint processing with pptx library
    // For now, return placeholder

    console.warn('[DocumentProcessor] PowerPoint processing not implemented - using placeholder');

    return {
      content: '[PowerPoint content would be extracted here]',
      metadata: {
        pageCount: 1,
        wordCount: 0,
      },
    };
  }

  /**
   * Process PDF file.
   */
  private async processPDF(buffer: Buffer): Promise<{
    content: string;
    metadata: DocumentMetadata;
  }> {
    // TODO: Implement actual PDF processing with pdf-parse or similar
    console.warn('[DocumentProcessor] PDF processing not implemented - using placeholder');

    return {
      content: '[PDF content would be extracted here]',
      metadata: {
        pageCount: 1,
        wordCount: 0,
      },
    };
  }

  /**
   * Process Word document.
   */
  private async processWord(buffer: Buffer): Promise<{
    content: string;
    metadata: DocumentMetadata;
  }> {
    // TODO: Implement actual Word processing with mammoth or similar
    console.warn('[DocumentProcessor] Word processing not implemented - using placeholder');

    return {
      content: '[Word content would be extracted here]',
      metadata: {
        pageCount: 1,
        wordCount: 0,
      },
    };
  }

  /**
   * Chunk content into smaller pieces for embedding.
   */
  private chunkContent(
    content: string,
    options: Required<ProcessorOptions>
  ): ExtractedChunk[] {
    const chunks: ExtractedChunk[] = [];
    const { chunkSize, chunkOverlap } = options;

    // Split by paragraphs first
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';
    let position = 0;

    for (const paragraph of paragraphs) {
      // If adding this paragraph exceeds chunk size
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            type: this.detectChunkType(currentChunk),
          },
          position: position++,
        });

        // Start new chunk with overlap from end of previous
        const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
        currentChunk = currentChunk.slice(overlapStart) + '\n\n' + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          type: this.detectChunkType(currentChunk),
        },
        position: position,
      });
    }

    return chunks;
  }

  /**
   * Detect the type of content in a chunk.
   */
  private detectChunkType(content: string): ChunkMetadata['type'] {
    // Heading detection
    if (/^#+\s/.test(content) || /^[A-Z][A-Za-z\s]+:?\s*$/.test(content.split('\n')[0])) {
      return 'heading';
    }

    // Bullet list detection
    if (/^[\-\*\•]\s/.test(content) || /^\d+\.\s/.test(content)) {
      return 'bullet';
    }

    // Formula detection (LaTeX-style)
    if (/\$[^$]+\$/.test(content) || /\\[a-z]+\{/.test(content)) {
      return 'formula';
    }

    // Table detection (markdown or pipe-separated)
    if (/\|.*\|/.test(content) && content.includes('\n')) {
      return 'table';
    }

    return 'text';
  }
}

// --- Singleton Export ---

export const documentProcessor = new DocumentProcessor();

export default DocumentProcessor;
