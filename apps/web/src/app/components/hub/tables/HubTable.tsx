/*
 * Filename: src/app/components/hub/tables/HubTable.tsx
 * Purpose: Reusable table component for Hub pages
 * Created: 2025-12-23
 */
'use client';

import React, { useState } from 'react';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import styles from './HubTable.module.css';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface HubTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export default function HubTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No data found',
  emptyDescription,
  emptyIcon,
  emptyActionLabel,
  onEmptyAction,
}: HubTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className={styles.loadingRow}></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <HubEmptyState
        title={emptyMessage}
        description={emptyDescription || ''}
        icon={emptyIcon}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr className={styles.tableHeadRow}>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => column.sortable && handleSort(column.key)}
                className={`${styles.tableHeader} ${column.sortable ? styles.tableHeaderSortable : ''}`}
              >
                <div className={styles.tableHeaderContent}>
                  {column.label}
                  {column.sortable && sortColumn === column.key && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tableBody}>
          {data.map((item) => (
            <tr key={item.id} className={styles.tableRow}>
              {columns.map((column) => (
                <td key={column.key} className={styles.tableCell}>
                  {column.render
                    ? column.render(item)
                    : String((item as any)[column.key] || '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
