/**
 * Filename: VideoModal.tsx
 * Purpose: Modal component for displaying embedded video (YouTube, Vimeo, Loom)
 * Created: 2025-11-15 (CaaS v5.5)
 */

'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './VideoModal.module.css';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

/**
 * Convert various video URLs to embeddable format
 * Supports: YouTube, Vimeo, Loom
 */
function getEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = '';
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else {
        videoId = urlObj.searchParams.get('v') || '';
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    // Vimeo
    if (urlObj.hostname.includes('vimeo.com')) {
      const videoId = urlObj.pathname.slice(1);
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    // Loom
    if (urlObj.hostname.includes('loom.com')) {
      const videoId = urlObj.pathname.split('/').pop();
      return videoId ? `https://www.loom.com/embed/${videoId}` : null;
    }

    return null;
  } catch (error) {
    console.error('Invalid video URL:', error);
    return null;
  }
}

export function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
  const embedUrl = getEmbedUrl(videoUrl);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (!embedUrl) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>{title || 'Video'}</h2>
            <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">
              <X size={24} />
            </button>
          </div>
          <div className={styles.errorMessage}>
            <p>Unable to load video. Please check the URL.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title || 'Video'}</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">
            <X size={24} />
          </button>
        </div>
        <div className={styles.videoContainer}>
          <iframe
            src={embedUrl}
            title={title || 'Video'}
            className={styles.videoFrame}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
