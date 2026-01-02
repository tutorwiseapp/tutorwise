/**
 * HubKanbanBoard.tsx
 * Reusable kanban board with optional drag-and-drop support
 * Updated: 2026-01-02 - Added dnd-kit drag-and-drop functionality
 */

'use client';

import { ReactNode, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import styles from './HubKanbanBoard.module.css';

export interface KanbanColumn {
  id: string;
  title: string | ReactNode;
  content: ReactNode;
  color?: string; // Optional color for top border
}

export interface KanbanCard {
  id: string;
  content: ReactNode;
}

interface HubKanbanBoardProps {
  columns: KanbanColumn[];
  // Drag-and-drop props (optional)
  enableDragDrop?: boolean;
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void | Promise<void>;
  renderDragOverlay?: (cardId: string) => ReactNode;
}

// Droppable Column Wrapper
function DroppableColumn({
  columnId,
  children,
  isOver,
}: {
  columnId: string;
  children: ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: columnId,
  });

  return (
    <div
      ref={setNodeRef}
      className={styles.columnContent}
      style={{
        backgroundColor: isOver ? 'rgba(0, 108, 103, 0.05)' : undefined,
        transition: 'background-color 0.2s',
        minHeight: '400px',
      }}
    >
      {children}
    </div>
  );
}

export default function HubKanbanBoard({
  columns,
  enableDragDrop = false,
  onCardMove,
  renderDragOverlay,
}: HubKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay for touch devices
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over || !onCardMove) return;

    const cardId = active.id as string;
    const toColumnId = over.id as string;

    // Find which column the card came from
    // Note: This requires the parent to handle the actual move logic
    // The parent should track which cards belong to which columns

    // Call the callback
    await onCardMove(cardId, '', toColumnId);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  // Render without drag-and-drop
  if (!enableDragDrop) {
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

  // Render with drag-and-drop
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.board}>
        {columns.map((column) => {
          const isOver = overId === column.id;

          return (
            <div
              key={column.id}
              className={styles.column}
              style={column.color ? { borderTopColor: column.color } : undefined}
            >
              <div className={styles.columnHeader}>
                <h3 className={styles.columnTitle}>{column.title}</h3>
              </div>
              <DroppableColumn columnId={column.id} isOver={isOver}>
                {column.content}
              </DroppableColumn>
            </div>
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && renderDragOverlay ? renderDragOverlay(activeId) : null}
      </DragOverlay>
    </DndContext>
  );
}
