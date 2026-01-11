'use client';

import { useState, useCallback } from 'react';
import { validateDocumentFile, uploadVerificationDocument } from '@/lib/api/storage';

interface UseDocumentUploadOptions {
  documentType: 'identity' | 'dbs' | 'address';
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
  maxRetries?: number; // Maximum retry attempts
  retryDelay?: number; // Delay between retries in ms
}

export function useDocumentUpload({
  documentType,
  onUploadSuccess,
  onUploadError,
  maxRetries = 3,
  retryDelay = 1000,
}: UseDocumentUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const uploadWithRetry = useCallback(
    async (file: File, userId: string, attempt = 0): Promise<string> => {
      try {
        const { url } = await uploadVerificationDocument(file, userId, documentType);
        return url;
      } catch (err) {
        // If we have retries left and error is retryable, try again
        if (attempt < maxRetries && isRetryableError(err)) {
          console.warn(
            `Upload attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`,
            err
          );

          // Wait before retrying (exponential backoff)
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));

          setRetryCount(attempt + 1);
          return uploadWithRetry(file, userId, attempt + 1);
        }

        // No more retries or non-retryable error
        throw err;
      }
    },
    [documentType, maxRetries, retryDelay]
  );

  const handleFileSelect = async (file: File, userId: string) => {
    setError(null);
    setRetryCount(0);

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
      // 2. Upload with retry logic
      const url = await uploadWithRetry(file, userId);

      // 3. Success
      onUploadSuccess?.(url);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      console.error('Document upload error after retries:', err);
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setRetryCount(0);
    }
  };

  return {
    isUploading,
    error,
    handleFileSelect,
    retryCount,
  };
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  // Network errors are retryable
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    message.includes('connection')
  ) {
    return true;
  }

  // 5xx server errors are retryable
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return true;
  }

  // 4xx client errors are NOT retryable (bad request, unauthorized, etc.)
  // File validation errors are NOT retryable
  return false;
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Upload failed. Please try again.';
}
