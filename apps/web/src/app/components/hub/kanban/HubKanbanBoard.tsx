/**
 * HubKanbanBoard.tsx
 * Simple kanban board with left-aligned columns
 */

'use client';

import { ReactNode } from 'react';
import styles from './HubKanbanBoard.module.css';

export interface KanbanColumn {
  id: string;
  title: string;
  content: ReactNode;
  color?: string; // Optional color for top border
}

interface HubKanbanBoardProps {
  columns: KanbanColumn[];
}

export default function HubKanbanBoard({ columns }: HubKanbanBoardProps) {
  return (
    <div className={styles.board}>
      {columns.map((column) => (
        <div
          key={column.id}
          className={styles.column}
          style={column.color ? { borderTopColor: column.color } : undefined}
        >
          <div className={styles.columnHeader}>
            <h3 className={styles.columnTitle}>{column.title}</h3>
          </div>
          <div className={styles.columnContent}>{column.content}</div>
        </div>
      ))}
    </div>
  );
}
