'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  onUploadComplete: (urls: string[]) => void;
  existingImages?: string[];
}

export default function ImageUpload({ onUploadComplete, existingImages = [] }: ImageUploadProps) {
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

  const handleUpload = async () => {
    if (files.length === 0) {
      onUploadComplete(existingImages);
      return;
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
    onUploadComplete(uploadedUrls);
  };

  return (
    <div>
      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
        <input {...getInputProps()} />
        <p>Drag & drop some files here, or click to select files</p>
      </div>
      <div className={styles.previewGrid}>
        {previews.map((preview, index) => (
          <div key={index} className={styles.preview}>
            <img src={preview} alt={`preview ${index}`} />
          </div>
        ))}
      </div>
      <button onClick={handleUpload} disabled={isUploading} className={styles.uploadButton}>
        {isUploading ? 'Uploading...' : 'Upload Images'}
      </button>
    </div>
  );
}
