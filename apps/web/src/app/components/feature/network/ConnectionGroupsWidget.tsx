/**
 * Filename: apps/web/src/app/components/feature/network/ConnectionGroupsWidget.tsx
 * Purpose: Widget to manage connection groups (folders) in sidebar
 * Created: 2025-11-07
 */

'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import styles from './ConnectionGroupsWidget.module.css';

export interface ConnectionGroup {
  id: string;
  profile_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_favorite: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface ConnectionGroupsWidgetProps {
  onGroupSelect?: (groupId: string | null) => void;
  selectedGroupId?: string | null;
  onCreateGroup?: () => void;
}

export default function ConnectionGroupsWidget({
  onGroupSelect,
  selectedGroupId,
  onCreateGroup,
}: ConnectionGroupsWidgetProps) {
  const [groups, setGroups] = useState<ConnectionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/network/groups');
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('[ConnectionGroupsWidget] Fetch error:', error);
      toast.error('Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>Connection Groups</h3>
        <button
          onClick={onCreateGroup}
          className={styles.createButton}
          title="Create new group"
        >
          +
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>No groups yet</p>
          <button onClick={onCreateGroup} className={styles.emptyButton}>
            Create Group
          </button>
        </div>
      ) : (
        <div className={styles.groupsList}>
          <button
            onClick={() => onGroupSelect?.(null)}
            className={`${styles.groupItem} ${
              selectedGroupId === null ? styles.groupItemActive : ''
            }`}
          >
            <span className={styles.groupName}>All Connections</span>
            <span className={styles.groupCount}>
              {groups.reduce((sum, g) => sum + g.member_count, 0)}
            </span>
          </button>

          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => onGroupSelect?.(group.id)}
              className={`${styles.groupItem} ${
                selectedGroupId === group.id ? styles.groupItemActive : ''
              }`}
            >
              <span className={styles.groupName}>{group.name}</span>
              <span className={styles.groupCount}>{group.member_count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
