/**
 * Sage Upload Processor
 *
 * Processes uploaded files (PowerPoint, PDF, etc.) and extracts
 * text content for embedding.
 *
 * Dependencies:
 *   npm install officeparser pdf-parse
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

// Dynamic imports for optional dependencies
let officeparser: any = null;
let pdfParse: any = null;

async function loadOfficeParser() {
  if (!officeparser) {
    try {
      officeparser = await import('officeparser');
    } catch {
      console.warn('[DocumentProcessor] officeparser not installed. Run: npm install officeparser');
    }
  }
  return officeparser;
}

async function loadPdfParse() {
  if (!pdfParse) {
    try {
      const module = await import('pdf-parse') as any;
      pdfParse = module.default || module;
    } catch {
      console.warn('[DocumentProcessor] pdf-parse not installed. Run: npm install pdf-parse');
    }
  }
  return pdfParse;
}

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
   * Extracts text from all slides including titles, body text, and notes.
   */
  private async processPowerPoint(buffer: Buffer): Promise<{
    content: string;
    metadata: DocumentMetadata;
  }> {
    const parser = await loadOfficeParser();

    if (!parser) {
      console.warn('[DocumentProcessor] officeparser not available');
      return {
        content: '',
        metadata: { pageCount: 0, wordCount: 0 },
      };
    }

    try {
      // officeparser.parseOfficeAsync returns extracted text
      const text = await parser.parseOfficeAsync(buffer);

      // Clean up the extracted text
      const cleanedText = this.cleanExtractedText(text);
      const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

      // Estimate slide count from content structure
      const slideMarkers = (cleanedText.match(/^(?:Slide|Page|\d+\.)\s/gm) || []).length;
      const estimatedSlides = Math.max(slideMarkers, Math.ceil(wordCount / 100));

      console.log(`[DocumentProcessor] PowerPoint extracted: ${wordCount} words, ~${estimatedSlides} slides`);

      return {
        content: cleanedText,
        metadata: {
          pageCount: estimatedSlides,
          wordCount,
        },
      };
    } catch (error) {
      console.error('[DocumentProcessor] PowerPoint extraction failed:', error);
      return {
        content: '',
        metadata: { pageCount: 0, wordCount: 0, error: (error as Error).message },
      };
    }
  }

  /**
   * Process PDF file.
   * Extracts text from all pages.
   */
  private async processPDF(buffer: Buffer): Promise<{
    content: string;
    metadata: DocumentMetadata;
  }> {
    const parse = await loadPdfParse();

    if (!parse) {
      console.warn('[DocumentProcessor] pdf-parse not available');
      return {
        content: '',
        metadata: { pageCount: 0, wordCount: 0 },
      };
    }

    try {
      const data = await parse(buffer);

      const cleanedText = this.cleanExtractedText(data.text);
      const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

      console.log(`[DocumentProcessor] PDF extracted: ${wordCount} words, ${data.numpages} pages`);

      return {
        content: cleanedText,
        metadata: {
          pageCount: data.numpages,
          wordCount,
          title: data.info?.Title,
          author: data.info?.Author,
        },
      };
    } catch (error) {
      console.error('[DocumentProcessor] PDF extraction failed:', error);
      return {
        content: '',
        metadata: { pageCount: 0, wordCount: 0, error: (error as Error).message },
      };
    }
  }

  /**
   * Process Word document.
   * Extracts text from .docx files.
   */
  private async processWord(buffer: Buffer): Promise<{
    content: string;
    metadata: DocumentMetadata;
  }> {
    const parser = await loadOfficeParser();

    if (!parser) {
      console.warn('[DocumentProcessor] officeparser not available');
      return {
        content: '',
        metadata: { pageCount: 0, wordCount: 0 },
      };
    }

    try {
      const text = await parser.parseOfficeAsync(buffer);

      const cleanedText = this.cleanExtractedText(text);
      const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

      // Estimate page count (avg ~500 words per page)
      const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));

      console.log(`[DocumentProcessor] Word extracted: ${wordCount} words, ~${estimatedPages} pages`);

      return {
        content: cleanedText,
        metadata: {
          pageCount: estimatedPages,
          wordCount,
        },
      };
    } catch (error) {
      console.error('[DocumentProcessor] Word extraction failed:', error);
      return {
        content: '',
        metadata: { pageCount: 0, wordCount: 0, error: (error as Error).message },
      };
    }
  }

  /**
   * Clean up extracted text.
   * Removes excessive whitespace, normalizes line breaks.
   */
  private cleanExtractedText(text: string): string {
    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive blank lines (more than 2)
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace from lines
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Remove leading/trailing whitespace from entire text
      .trim();
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
