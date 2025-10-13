'use client';

import { useState } from 'react';
import { validateImageFile, compressImage, uploadAvatar } from '@/lib/api/storage';

interface UseImageUploadOptions {
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
}

export function useImageUpload({ onUploadSuccess, onUploadError }: UseImageUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File, userId: string) => {
    setError(null);

    // 1. Validate
    const validation = validateImageFile(file);
    if (!validation.valid) {
      const errorMessage = validation.error!;
      setError(errorMessage);
      onUploadError?.(errorMessage);
      return;
    }

    setIsUploading(true);

    try {
      // 2. Compress
      const compressedFile = await compressImage(file, 1024, 0.85); // Using high-quality settings

      // 3. Upload
      const { url } = await uploadAvatar(compressedFile, userId);

      // 4. Success
      onUploadSuccess?.(url);
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('Image upload error:', err);
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
