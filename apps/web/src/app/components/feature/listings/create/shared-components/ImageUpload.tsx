'use client';

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import toast from 'react-hot-toast';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  onUploadComplete: (urls: string[]) => void;
  existingImages?: string[];
}

export interface ImageUploadRef {
  uploadImages: () => Promise<string[]>;
  hasUnuploadedFiles: () => boolean;
}

const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({ onUploadComplete, existingImages = [] }, ref) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(existingImages);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);

    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif'] },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleUpload = async (): Promise<string[]> => {
    if (files.length === 0) {
      onUploadComplete(existingImages);
      return existingImages;
    }

    setIsUploading(true);
    const uploadedUrls = [...existingImages];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/avatar/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const { url } = await response.json();
        uploadedUrls.push(url);
      } catch (error) {
        console.error('Failed to upload file:', file.name, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    setFiles([]); // Clear files after upload
    onUploadComplete(uploadedUrls);
    return uploadedUrls;
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    uploadImages: handleUpload,
    hasUnuploadedFiles: () => files.length > 0,
  }));

  return (
    <div>
      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
        <input {...getInputProps()} />
        <p>Drag & drop some files here, or click to select files</p>
      </div>
      {previews.length > 0 && (
        <div className={styles.previewGrid}>
          {previews.map((preview, index) => (
            <div key={index} className={styles.preview}>
              <Image
                src={preview}
                alt={`preview ${index}`}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;
