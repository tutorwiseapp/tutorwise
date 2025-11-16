/**
 * Filename: SavedWiselistsWidget.tsx
 * Purpose: Dashboard widget showing recent wiselists (v5.7)
 * Path: /app/components/wiselists/SavedWiselistsWidget.tsx
 * Created: 2025-11-15
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { List, ArrowRight } from 'lucide-react';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import { Wiselist } from '@/types';
import styles from '@/app/components/layout/sidebars/ContextualSidebar.module.css';

export function SavedWiselistsWidget() {
  const [wiselists, setWiselists] = useState<Wiselist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWiselists();
  }, []);

  const fetchWiselists = async () => {
    try {
      const response = await fetch('/api/wiselists');
      if (!response.ok) throw new Error('Failed to fetch wiselists');

      const { wiselists } = await response.json();
      // Show max 3 most recent
      setWiselists(wiselists.slice(0, 3));
    } catch (error) {
      console.error('Fetch wiselists error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarWidget title="My Wiselists">
        <div className={styles.widgetContent}>
          <p className={styles.widgetText}>Loading...</p>
        </div>
      </SidebarWidget>
    );
  }

  if (wiselists.length === 0) {
    return (
      <SidebarWidget title="My Wiselists">
        <div className={styles.widgetContent}>
          <p className={styles.widgetText}>
            You haven&apos;t created any wiselists yet.
          </p>
          <Link href="/wiselists" className={styles.widgetLink}>
            Create your first wiselist
            <ArrowRight size={14} />
          </Link>
        </div>
      </SidebarWidget>
    );
  }

  return (
    <SidebarWidget title="My Wiselists">
      <div className={styles.widgetContent}>
        <div className={styles.itemList}>
          {wiselists.map((wiselist) => (
            <Link
              key={wiselist.id}
              href={`/wiselists/${wiselist.id}`}
              className={styles.listItem}
            >
              <div className={styles.listItemIcon}>
                <List size={18} />
              </div>
              <div className={styles.listItemContent}>
                <div className={styles.listItemTitle}>{wiselist.name}</div>
                <div className={styles.listItemMeta}>
                  {wiselist.item_count || 0} {wiselist.item_count === 1 ? 'item' : 'items'}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/wiselists" className={styles.widgetLink}>
          View all wiselists
          <ArrowRight size={14} />
        </Link>
      </div>
    </SidebarWidget>
  );
}
