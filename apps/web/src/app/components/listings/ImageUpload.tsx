'use client';

import { useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  onNewImage: (url: string) => void;
  imagePreviews: string[];
  setImagePreviews: (urls: string[]) => void;
}

export default function ImageUpload({ onNewImage, imagePreviews, setImagePreviews }: ImageUploadProps) {
  const { user } = useUserProfile();

  const { isUploading, error, handleFileSelect } = useImageUpload({
    onUploadSuccess: (url) => {
      onNewImage(url);
    },
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && user) {
      handleFileSelect(acceptedFiles[0], user.id);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    multiple: false,
  });

  const removeImage = (index: number) => {
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  return (
    <div className={styles.imageUploadContainer}>
      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
        <input {...getInputProps()} />
        {isUploading ? (
          <p>Uploading...</p>
        ) : (
          <p>Drag & drop an image here, or click to select one</p>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
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