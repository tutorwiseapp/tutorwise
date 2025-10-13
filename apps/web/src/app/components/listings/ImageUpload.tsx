'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  onUpload: (files: File[]) => void; // This will eventually handle the upload to a server
  initialImageUrls?: string[];
}

export default function ImageUpload({ onUpload, initialImageUrls = [] }: ImageUploadProps) {
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialImageUrls);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Create previews for the dropped files
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);

    // Pass the files to the parent component to handle the upload
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif'] },
    multiple: true,
  });

  const removeImage = (index: number) => {
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
    // Here you would also need to inform the parent to delete the file from the server
  };

  return (
    <div className={styles.imageUploadContainer}>
      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
        <input {...getInputProps()} />
        <p>Drag & drop some files here, or click to select files</p>
        <em>(Up to 5 images, e.g., *.jpeg, *.png)</em>
      </div>
      <div className={styles.previewGrid}>
        {imagePreviews.map((preview, index) => (
          <div key={index} className={styles.previewItem}>
            <img src={preview} alt={`Preview ${index + 1}`} />
            <button onClick={() => removeImage(index)} className={styles.removeButton}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
