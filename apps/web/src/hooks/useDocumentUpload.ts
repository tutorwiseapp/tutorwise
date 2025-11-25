'use client';

import { useState } from 'react';
import { validateDocumentFile, uploadVerificationDocument } from '@/lib/api/storage';

interface UseDocumentUploadOptions {
  documentType: 'identity' | 'dbs' | 'address';
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
}

export function useDocumentUpload({
  documentType,
  onUploadSuccess,
  onUploadError,
}: UseDocumentUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File, userId: string) => {
    setError(null);

    // 1. Validate
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      const errorMessage = validation.error!;
      setError(errorMessage);
      onUploadError?.(errorMessage);
      return;
    }

    setIsUploading(true);

    try {
      // 2. Upload (no compression needed for documents/PDFs)
      const { url } = await uploadVerificationDocument(file, userId, documentType);

      // 3. Success
      onUploadSuccess?.(url);
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('Document upload error:', err);
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    error,
    handleFileSelect,
  };
}
