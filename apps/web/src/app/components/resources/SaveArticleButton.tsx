/**
 * Filename: apps/web/src/app/components/blog/SaveArticleButton.tsx
 * Purpose: Button for saving blog articles to wiselists with event tracking
 * Created: 2026-01-16
 * Updated: 2026-01-16 - Added event tracking for dual-write pattern
 *
 * Features:
 * - One-click save to "My Saves" wiselist
 * - Toggle save/unsave state
 * - Support for anonymous users (localStorage → migrate on login)
 * - Multiple variants: icon, button, floating
 * - Event tracking for attribution (dual-write pattern)
 *
 * Dual-write implementation:
 * 1. Save article to wiselist (user intent)
 * 2. Track 'save' event (attribution signal)
 */

'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getOrCreateSessionId } from '@/lib/utils/sessionTracking';
import toast from 'react-hot-toast';
import styles from './SaveArticleButton.module.css';

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  featured_image_url?: string;
}

interface SaveArticleButtonProps {
  article: BlogArticle;
  variant?: 'icon' | 'button' | 'floating';
}

/**
 * SaveArticleButton Component
 *
 * Allows users to save blog articles to their "My Saves" wiselist.
 * Anonymous users save to localStorage; logged-in users save to database.
 */
export default function SaveArticleButton({ article, variant = 'button' }: SaveArticleButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { profile: currentUser } = useUserProfile();

  // Check if article is saved on mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        if (currentUser) {
          // Logged-in user: check database
          const response = await fetch(`/api/blog/saves/check?articleId=${article.id}`);
          const data = await response.json();
          setIsSaved(data.isSaved || false);
        } else {
          // Anonymous user: check localStorage
          const savedArticles = getLocalStorageSaves();
          setIsSaved(savedArticles.includes(article.id));
        }
      } catch (error) {
        console.error('[SaveArticleButton] Error checking saved status:', error);
      }
    };

    checkSavedStatus();
  }, [currentUser, article.id]);

  // Handle save/unsave toggle
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);

    try {
      if (currentUser) {
        // Logged-in user: save to database
        await handleDatabaseSave();
      } else {
        // Anonymous user: save to localStorage
        handleLocalStorageSave();
      }
    } catch (error) {
      console.error('[SaveArticleButton] Error saving article:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle database save for logged-in users (with event tracking)
  const handleDatabaseSave = async () => {
    if (isSaved) {
      // Unsave: DELETE
      const response = await fetch('/api/blog/saves', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id }),
      });

      if (response.ok) {
        setIsSaved(false);
        toast.success('Removed from My Saves');
      } else {
        throw new Error('Failed to unsave article');
      }
    } else {
      // Save: POST (with session and component tracking for dual-write)
      const sessionId = getOrCreateSessionId();
      const sourceComponent = variant === 'icon' ? 'article_header' : variant === 'floating' ? 'floating_save' : 'article_header';

      const response = await fetch('/api/blog/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          sessionId,
          sourceComponent,
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        toast.success('Saved to My Saves!');
      } else {
        throw new Error('Failed to save article');
      }
    }
  };

  // Handle localStorage save for anonymous users
  const handleLocalStorageSave = () => {
    const savedArticles = getLocalStorageSaves();

    if (isSaved) {
      // Unsave: remove from array
      const filtered = savedArticles.filter((id) => id !== article.id);
      localStorage.setItem('tutorwise_saved_articles', JSON.stringify(filtered));
      setIsSaved(false);
      toast.success('Removed from My Saves');
    } else {
      // Save: add to array
      savedArticles.push(article.id);
      localStorage.setItem('tutorwise_saved_articles', JSON.stringify(savedArticles));

      // Also store article metadata for offline access
      const articleData = {
        id: article.id,
        title: article.title,
        slug: article.slug,
        description: article.description,
        featured_image_url: article.featured_image_url,
        savedAt: new Date().toISOString(),
      };

      const savedData = getLocalStorageArticleData();
      savedData[article.id] = articleData;
      localStorage.setItem('tutorwise_saved_articles_data', JSON.stringify(savedData));

      setIsSaved(true);
      toast.success('Saved! Sign in to sync across devices.');
    }
  };

  // Render based on variant
  if (variant === 'icon') {
    return (
      <button
        className={`${styles.iconButton} ${isSaved ? styles.saved : ''}`}
        onClick={handleClick}
        disabled={isLoading}
        aria-label={isSaved ? 'Unsave article' : 'Save article'}
      >
        {isSaved ? '★' : '☆'}
      </button>
    );
  }

  if (variant === 'floating') {
    return (
      <button
        className={`${styles.floatingButton} ${isSaved ? styles.saved : ''}`}
        onClick={handleClick}
        disabled={isLoading}
        aria-label={isSaved ? 'Unsave article' : 'Save article'}
      >
        {isSaved ? '★' : '☆'}
        <span className={styles.floatingLabel}>{isSaved ? 'Saved' : 'Save'}</span>
      </button>
    );
  }

  // Default: button variant
  return (
    <button
      className={`${styles.button} ${isSaved ? styles.saved : ''}`}
      onClick={handleClick}
      disabled={isLoading}
    >
      <span className={styles.icon}>{isSaved ? '★' : '☆'}</span>
      <span className={styles.label}>{isSaved ? 'Saved' : 'Save Article'}</span>
    </button>
  );
}

// Helper: Get saved article IDs from localStorage
function getLocalStorageSaves(): string[] {
  try {
    const stored = localStorage.getItem('tutorwise_saved_articles');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper: Get saved article metadata from localStorage
function getLocalStorageArticleData(): Record<string, any> {
  try {
    const stored = localStorage.getItem('tutorwise_saved_articles_data');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}
