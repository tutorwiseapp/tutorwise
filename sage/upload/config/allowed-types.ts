/**
 * Sage Upload Configuration
 *
 * Allowed file types and upload limits.
 */

import type { DocumentType } from '../../knowledge/types';

// --- Allowed File Types ---

export interface FileTypeConfig {
  extension: string;
  mimeType: string;
  documentType: DocumentType;
  maxSize: number;  // bytes
  enabled: boolean;
}

export const ALLOWED_FILE_TYPES: FileTypeConfig[] = [
  // PowerPoint
  {
    extension: '.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    documentType: 'powerpoint',
    maxSize: 50 * 1024 * 1024,  // 50MB
    enabled: true,
  },
  {
    extension: '.ppt',
    mimeType: 'application/vnd.ms-powerpoint',
    documentType: 'powerpoint',
    maxSize: 50 * 1024 * 1024,
    enabled: true,
  },

  // PDF
  {
    extension: '.pdf',
    mimeType: 'application/pdf',
    documentType: 'pdf',
    maxSize: 25 * 1024 * 1024,  // 25MB
    enabled: true,
  },

  // Word
  {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    documentType: 'word',
    maxSize: 25 * 1024 * 1024,
    enabled: true,
  },
  {
    extension: '.doc',
    mimeType: 'application/msword',
    documentType: 'word',
    maxSize: 25 * 1024 * 1024,
    enabled: true,
  },

  // Text/Markdown
  {
    extension: '.md',
    mimeType: 'text/markdown',
    documentType: 'markdown',
    maxSize: 5 * 1024 * 1024,  // 5MB
    enabled: true,
  },
  {
    extension: '.txt',
    mimeType: 'text/plain',
    documentType: 'text',
    maxSize: 5 * 1024 * 1024,
    enabled: true,
  },

  // Images (for OCR)
  {
    extension: '.png',
    mimeType: 'image/png',
    documentType: 'image',
    maxSize: 10 * 1024 * 1024,  // 10MB
    enabled: false,  // Disabled until OCR implemented
  },
  {
    extension: '.jpg',
    mimeType: 'image/jpeg',
    documentType: 'image',
    maxSize: 10 * 1024 * 1024,
    enabled: false,
  },
];

// --- Validation Functions ---

export function isAllowedFileType(filename: string, mimeType: string): boolean {
  const ext = '.' + filename.toLowerCase().split('.').pop();

  return ALLOWED_FILE_TYPES.some(
    config =>
      config.enabled &&
      config.extension === ext &&
      config.mimeType === mimeType
  );
}

export function getFileTypeConfig(filename: string): FileTypeConfig | null {
  const ext = '.' + filename.toLowerCase().split('.').pop();

  return ALLOWED_FILE_TYPES.find(config => config.extension === ext) || null;
}

export function getMaxFileSize(filename: string): number {
  const config = getFileTypeConfig(filename);
  return config?.maxSize || 10 * 1024 * 1024;  // Default 10MB
}

export function getAllowedExtensions(): string[] {
  return ALLOWED_FILE_TYPES
    .filter(config => config.enabled)
    .map(config => config.extension);
}

export function getAllowedMimeTypes(): string[] {
  return ALLOWED_FILE_TYPES
    .filter(config => config.enabled)
    .map(config => config.mimeType);
}
