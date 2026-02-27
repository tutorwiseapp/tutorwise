/**
 * Filename: MaterialsTab.tsx
 * Purpose: AI Tutor Materials Management - Upload and manage PDF/DOCX/PPTX files
 * Created: 2026-02-23
 * Version: v1.0
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import styles from './MaterialsTab.module.css';

interface Material {
  id: string;
  file_name: string;
  file_type: string;
  file_size_mb: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  error_message?: string;
  page_count?: number;
  word_count?: number;
  chunk_count?: number;
  uploaded_at: string;
  processed_at?: string;
}

interface StorageQuota {
  used: number;
  quota: number;
  remaining: number;
  allowed: boolean;
}

interface MaterialsTabProps {
  aiTutorId: string;
  hasSubscription: boolean;
}

export default function MaterialsTab({ aiTutorId, hasSubscription }: MaterialsTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch materials
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['ai-tutor-materials', aiTutorId],
    queryFn: async () => {
      const response = await fetch(`/api/ai-agents/${aiTutorId}/materials`);
      if (!response.ok) throw new Error('Failed to fetch materials');
      return response.json();
    },
    refetchInterval: (query) => {
      // Poll every 5 seconds if any material is processing
      const hasProcessing = query.state.data?.some(
        (m: Material) => m.status === 'processing'
      );
      return hasProcessing ? 5000 : false;
    },
  });

  // Fetch storage quota
  const { data: quota } = useQuery<StorageQuota>({
    queryKey: ['ai-tutor-quota', aiTutorId],
    queryFn: async () => {
      const response = await fetch(`/api/ai-agents/${aiTutorId}/materials`);
      if (!response.ok) throw new Error('Failed to fetch quota');
      const data = await response.json();
      return data.quota || { used: 0, quota: 1024, remaining: 1024, allowed: true };
    },
  });

  // Upload material mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/ai-agents/${aiTutorId}/materials`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload material');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tutor-materials', aiTutorId] });
      queryClient.invalidateQueries({ queryKey: ['ai-tutor-quota', aiTutorId] });
      toast.success('Material uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete material mutation
  const deleteMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const response = await fetch(
        `/api/ai-agents/${aiTutorId}/materials/${materialId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete material');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tutor-materials', aiTutorId] });
      queryClient.invalidateQueries({ queryKey: ['ai-tutor-quota', aiTutorId] });
      toast.success('Material deleted');
    },
    onError: () => {
      toast.error('Failed to delete material');
    },
  });

  // Handle file upload
  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();

      // Validate file type
      if (!ext || !['pdf', 'docx', 'pptx'].includes(ext)) {
        toast.error('Only PDF, DOCX, and PPTX files are supported');
        return;
      }

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }

      uploadMutation.mutate(file);
    },
    [uploadMutation]
  );

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  // Calculate storage percentage
  const storagePercentage = quota
    ? Math.round((quota.used / quota.quota) * 100)
    : 0;

  const storageBarClass =
    storagePercentage >= 90
      ? styles.danger
      : storagePercentage >= 75
        ? styles.warning
        : '';

  // Get file icon
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      case 'pptx':
        return '📊';
      default:
        return '📁';
    }
  };

  // Format file size
  const formatSize = (mb: number) => {
    if (mb < 1) return `${Math.round(mb * 1024)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className={styles.container}>
      {/* Storage Quota */}
      {quota && (
        <div className={styles.storageSection}>
          <div className={styles.storageHeader}>
            <h3>Storage Usage</h3>
            <span className={styles.storageStats}>
              {quota.used} MB / {quota.quota} MB
            </span>
          </div>
          <div className={styles.storageBar}>
            <div
              className={`${styles.storageProgress} ${storageBarClass}`}
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <p className={styles.storageText}>
            {quota.remaining} MB remaining
            {storagePercentage >= 90 && ' - Storage almost full!'}
          </p>
        </div>
      )}

      {/* Upload Section */}
      <div className={styles.uploadSection}>
        <h3>Upload Materials</h3>
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''} ${
            !hasSubscription ? styles.disabled : ''
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => hasSubscription && fileInputRef.current?.click()}
        >
          <div className={styles.uploadIcon}>📤</div>
          <p>
            <strong>
              {hasSubscription
                ? 'Drag and drop files here, or click to browse'
                : 'Active subscription required to upload materials'}
            </strong>
          </p>
          {hasSubscription && (
            <>
              <p className={styles.fileTypes}>Supported: PDF, DOCX, PPTX (max 100MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                className={styles.fileInput}
                accept=".pdf,.docx,.pptx"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </>
          )}
        </div>
      </div>

      {/* Materials List */}
      <div className={styles.materialsSection}>
        <h3>Uploaded Materials ({materials.length})</h3>

        {isLoading ? (
          <div className={styles.emptyState}>
            <p>Loading materials...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No materials uploaded yet</p>
            <p>
              Upload PDFs, DOCX, or PPTX files to train your AI tutor on custom
              content
            </p>
          </div>
        ) : (
          <div className={styles.materialsList}>
            {materials.map((material) => (
              <div key={material.id} className={styles.materialItem}>
                <span className={styles.materialIcon}>
                  {getFileIcon(material.file_type)}
                </span>

                <div className={styles.materialInfo}>
                  <div className={styles.materialName}>{material.file_name}</div>
                  <div className={styles.materialMeta}>
                    <span>{formatSize(material.file_size_mb)}</span>
                    {material.page_count && <span>{material.page_count} pages</span>}
                    {material.chunk_count && (
                      <span>{material.chunk_count} chunks</span>
                    )}
                    <span>
                      {new Date(material.uploaded_at).toLocaleDateString()}
                    </span>
                  </div>
                  {material.status === 'failed' && material.error_message && (
                    <div className={styles.errorMessage}>
                      <p>{material.error_message}</p>
                    </div>
                  )}
                </div>

                <span
                  className={`${styles.statusBadge} ${styles[material.status]}`}
                >
                  {material.status === 'processing' && '⏳ '}
                  {material.status === 'ready' && '✓ '}
                  {material.status === 'failed' && '✗ '}
                  {material.status}
                </span>

                <button
                  className={styles.deleteButton}
                  onClick={() => {
                    if (
                      confirm(
                        `Delete "${material.file_name}"? This cannot be undone.`
                      )
                    ) {
                      deleteMutation.mutate(material.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  title="Delete material"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
