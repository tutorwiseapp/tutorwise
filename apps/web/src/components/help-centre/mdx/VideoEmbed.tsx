/**
 * Filename: apps/web/src/app/components/help-centre/mdx/VideoEmbed.tsx
 * Purpose: Video embed component for YouTube/Vimeo/Loom
 * Created: 2025-01-19
 */

'use client';

import styles from './VideoEmbed.module.css';

interface VideoEmbedProps {
  src: string;
  title?: string;
  aspectRatio?: '16:9' | '4:3';
}

export default function VideoEmbed({
  src,
  title = 'Video tutorial',
  aspectRatio = '16:9'
}: VideoEmbedProps) {
  // Convert YouTube watch URLs to embed URLs
  const getEmbedUrl = (url: string) => {
    // YouTube
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Vimeo
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1].split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }

    // Loom
    if (url.includes('loom.com/share/')) {
      const videoId = url.split('loom.com/share/')[1].split('?')[0];
      return `https://www.loom.com/embed/${videoId}`;
    }

    // Already an embed URL
    return url;
  };

  const embedUrl = getEmbedUrl(src);
  const aspectClass = aspectRatio === '4:3' ? styles.aspect43 : styles.aspect169;

  return (
    <div className={styles.videoEmbed}>
      <div className={`${styles.wrapper} ${aspectClass}`}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.iframe}
        />
      </div>
      {title && <p className={styles.caption}>{title}</p>}
    </div>
  );
}
