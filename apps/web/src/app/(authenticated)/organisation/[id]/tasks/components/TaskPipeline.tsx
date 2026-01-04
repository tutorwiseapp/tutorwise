/**
 * TaskPipeline.tsx
 * Task management pipeline using HubKanbanBoard with drag-and-drop
 * Created: 2026-01-03
 * Based on: ReferralPipeline.tsx - Adapted for task management
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import HubKanbanBoard from '@/app/components/hub/kanban/HubKanbanBoard';
import type { KanbanColumn } from '@/app/components/hub/kanban/HubKanbanBoard';
import { Inbox, ListTodo, PlayCircle, CheckCircle, CheckCircle2 } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import toast from 'react-hot-toast';
import styles from './TaskPipeline.module.css';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  due_date: string | null;
  created_at: string;
  client: {
    id: string;
    full_name: string;
  } | null;
  assigned: {
    id: string;
    full_name: string;
  } | null;
}

interface TaskPipelineProps {
  organisationId: string;
  priorityFilter?: string;
  categoryFilter?: string;
  assignedToFilter?: string;
  searchQuery?: string;
  onCardClick?: (taskId: string) => void;
}

const STAGE_CONFIG = [
  { key: 'backlog', label: 'Backlog', icon: Inbox, color: '#9CA3AF' },
  { key: 'todo', label: 'To Do', icon: ListTodo, color: '#6B7280' },
  { key: 'in_progress', label: 'In Progress', icon: PlayCircle, color: '#F59E0B' },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: '#3B82F6' },
  { key: 'done', label: 'Done', icon: CheckCircle2, color: '#10B981' },
];

// Priority badge colors
const PRIORITY_COLORS = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

// Draggable Card Component
function DraggableCard({
  task,
  onCardClick,
}: {
  task: Task;
  onCardClick?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={styles.card}
      onClick={(e) => {
        // Only trigger click if not dragging
        if (!isDragging && onCardClick) {
          onCardClick(task.id);
        }
      }}
    >
      <div className={styles.cardHeader}>
        <span
          className={styles.priorityBadge}
          style={{ backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium }}
        >
          {task.priority}
        </span>
        <span className={styles.categoryBadge}>
          {task.category.replace('_', ' ')}
        </span>
      </div>

      <div className={styles.cardTitle}>{task.title}</div>

      {task.description && (
        <div className={styles.cardDescription}>
          {task.description.length > 60
            ? `${task.description.substring(0, 60)}...`
            : task.description}
        </div>
      )}

      <div className={styles.cardMeta}>
        {task.client && (
          <div className={styles.cardClient}>
            <span className={styles.clientIcon}>👤</span>
            {task.client.full_name}
          </div>
        )}
        {task.assigned && (
          <div className={styles.cardAssigned}>
            <span className={styles.assignedIcon}>→</span>
            {task.assigned.full_name}
          </div>
        )}
      </div>

      {task.due_date && (
        <div className={`${styles.cardDueDate} ${isOverdue ? styles.overdue : ''}`}>
          📅 {formatDate(task.due_date)}
        </div>
      )}
    </div>
  );
}

export function TaskPipeline({
  organisationId,
  priorityFilter = 'all',
  categoryFilter = 'all',
  assignedToFilter = 'all',
  searchQuery = '',
  onCardClick,
}: TaskPipelineProps) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('org_tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          category,
          due_date,
          created_at,
          client:client_id(id, full_name),
          assigned:assigned_to(id, full_name)
        `)
        .eq('organisation_id', organisationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform array relations to single objects
      const transformedTasks: Task[] = (data || []).map((task: any) => ({
        ...task,
        client: Array.isArray(task.client) ? task.client[0] || null : task.client,
        assigned: Array.isArray(task.assigned) ? task.assigned[0] || null : task.assigned,
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId]);

  // Apply filters to tasks
  const applyFilters = (tasks: Task[]): Task[] => {
    const searchLower = searchQuery.toLowerCase().trim();

    return tasks.filter((task) => {
      // Search filter
      if (searchLower) {
        const title = task.title.toLowerCase();
        const description = (task.description || '').toLowerCase();
        const client = (task.client?.full_name || '').toLowerCase();
        const assigned = (task.assigned?.full_name || '').toLowerCase();

        if (
          !title.includes(searchLower) &&
          !description.includes(searchLower) &&
          !client.includes(searchLower) &&
          !assigned.includes(searchLower)
        ) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && task.category !== categoryFilter) {
        return false;
      }

      // Assignee filter
      if (assignedToFilter !== 'all') {
        if (assignedToFilter === 'unassigned' && task.assigned !== null) {
          return false;
        }
        if (assignedToFilter !== 'unassigned' && task.assigned?.id !== assignedToFilter) {
          return false;
        }
      }

      return true;
    });
  };

  // Handle card move (drag-and-drop)
  const handleCardMove = async (cardId: string, fromColumnId: string, toColumnId: string) => {
    // Get current task
    const task = tasks.find((t) => t.id === cardId);

    if (!task || task.status === toColumnId) {
      return; // No change needed
    }

    // Optimistic update
    const updatedTasks = tasks.map((t) =>
      t.id === cardId ? { ...t, status: toColumnId } : t
    );
    setTasks(updatedTasks);

    // Update backend
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      const { error: rpcError } = await supabase.rpc('update_task_status', {
        p_task_id: cardId,
        p_new_status: toColumnId,
        p_performed_by: currentUser.user.id,
        p_notes: null,
        p_metadata: {},
      });

      if (rpcError) throw rpcError;

      toast.success('Task updated');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');

      // Rollback optimistic update
      loadTasks();
    }
  };

  const filteredTasks = applyFilters(tasks);

  // Group tasks by status
  const tasksByStatus = STAGE_CONFIG.reduce((acc, stage) => {
    acc[stage.key] = filteredTasks.filter((task) => task.status === stage.key);
    return acc;
  }, {} as Record<string, Task[]>);

  // Build kanban columns
  const columns: KanbanColumn[] = STAGE_CONFIG.map((stage) => {
    const Icon = stage.icon;
    const stageTasks = tasksByStatus[stage.key] || [];

    return {
      id: stage.key,
      title: (
        <div className={styles.columnHeader}>
          <Icon className={styles.columnIcon} size={18} />
          <span>{stage.label}</span>
          <span className={styles.columnCount}>{stageTasks.length}</span>
        </div>
      ),
      content: (
        <div className={styles.cardList}>
          {stageTasks.length === 0 ? (
            <div className={styles.emptyColumn}>
              No tasks
            </div>
          ) : (
            stageTasks.map((task) => (
              <DraggableCard
                key={task.id}
                task={task}
                onCardClick={onCardClick}
              />
            ))
          )}
        </div>
      ),
      color: stage.color,
    };
  });

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <HubKanbanBoard
      columns={columns}
      enableDragDrop={true}
      onCardMove={handleCardMove}
      renderDragOverlay={(cardId) => {
        const task = tasks.find((t) => t.id === cardId);
        if (!task) return null;
        return <DraggableCard task={task} />;
      }}
    />
  );
}
