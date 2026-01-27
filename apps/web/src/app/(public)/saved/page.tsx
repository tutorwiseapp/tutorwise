/**
 * Filename: page.tsx
 * Purpose: Public saved items page for unauthenticated users
 * Path: /saved
 * Created: 2025-12-10
 *
 * Features:
 * - Shows saved items from localStorage for unregistered users
 * - Displays empty state when no items are saved
 * - Prompts users to sign in to sync saves across devices
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from './page.module.css';

interface SavedItem {
  key: string; // e.g., "profile-123" or "listing-456"
  type: 'profile' | 'listing';
  id: string;
}

export default function SavedPage() {
  const router = useRouter();
  const { profile, isLoading } = useUserProfile();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    // If user is authenticated, redirect to /wiselists
    if (!isLoading && profile) {
      router.push('/wiselists');
      return;
    }

    // Load saved items from localStorage for unauthenticated users (existing system)
    if (!isLoading && !profile) {
      const saved = localStorage.getItem('temp_saves');
      if (saved) {
        try {
          const tempSaves = JSON.parse(saved) as string[];
          // Convert from ["profile-123", "listing-456"] to structured objects
          const items: SavedItem[] = tempSaves.map(itemKey => {
            const [type, id] = itemKey.split('-');
            return {
              key: itemKey,
              type: type as 'profile' | 'listing',
              id,
            };
          });
          setSavedItems(items);
        } catch (error) {
          console.error('Failed to parse saved items:', error);
          setSavedItems([]);
        }
      }
    }
  }, [profile, isLoading, router]);

  const handleSignIn = () => {
    router.push('/login?redirect=/wiselists');
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all saved items?')) {
      localStorage.removeItem('temp_saves');
      setSavedItems([]);
    }
  };

  const handleRemoveItem = (itemKey: string) => {
    const saved = localStorage.getItem('temp_saves');
    if (saved) {
      try {
        const tempSaves = JSON.parse(saved) as string[];
        const updated = tempSaves.filter(key => key !== itemKey);
        localStorage.setItem('temp_saves', JSON.stringify(updated));
        setSavedItems(savedItems.filter(item => item.key !== itemKey));
      } catch (error) {
        console.error('Failed to remove item:', error);
      }
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  // Empty state - no saved items
  if (savedItems.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className={styles.emptyTitle}>No saved items yet</h1>
          <p className={styles.emptyDescription}>
            Start exploring tutors and listings on the marketplace. When you find something you like, tap the heart icon to save it here.
          </p>
          <div className={styles.emptyActions}>
            <button
              onClick={() => router.push('/marketplace')}
              className={styles.primaryButton}
            >
              Browse Marketplace
            </button>
            <button
              onClick={handleSignIn}
              className={styles.secondaryButton}
            >
              Sign In to Sync Saves
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show saved items
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Saved Items</h1>
          <p className={styles.subtitle}>
            {savedItems.length} item{savedItems.length !== 1 ? 's' : ''} saved locally
          </p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleSignIn} className={styles.signInButton}>
            Sign In to Sync
          </button>
          {savedItems.length > 0 && (
            <button onClick={handleClearAll} className={styles.clearButton}>
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className={styles.notice}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>
          Your saves are stored locally on this device. Sign in to sync them across all your devices.
        </span>
      </div>

      <div className={styles.itemsList}>
        {savedItems.map((item) => (
          <div key={item.key} className={styles.savedItem}>
            <div className={styles.itemContent}>
              <div className={styles.itemType}>
                {item.type === 'profile' ? 'Tutor Profile' : 'Listing'}
              </div>
              <div className={styles.itemId}>ID: {item.id}</div>
              <div className={styles.itemMeta}>
                Saved locally • Tap to view details
              </div>
            </div>
            <button
              onClick={() => handleRemoveItem(item.key)}
              className={styles.removeButton}
              aria-label="Remove"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
