/**
 * TaskDetailModal.tsx
 * Modal for viewing and editing task details
 * Created: 2026-01-03
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import toast from 'react-hot-toast';
import styles from './TaskDetailModal.module.css';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  requires_approval: boolean;
  client: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  assigned: {
    id: string;
    full_name: string;
  } | null;
  creator: {
    id: string;
    full_name: string;
  } | null;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  organisationId: string;
  onUpdate: () => void;
}

export function TaskDetailModal({
  isOpen,
  onClose,
  taskId,
  organisationId,
  onUpdate,
}: TaskDetailModalProps) {
  const supabase = createClient();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
    }
  }, [isOpen, taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);

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
          completed_at,
          requires_approval,
          client:client_id(id, full_name, email),
          assigned:assigned_to(id, full_name),
          creator:created_by(id, full_name)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;

      // Transform array relations to single objects
      const transformedData: Task = {
        ...data,
        client: Array.isArray(data.client) ? data.client[0] || null : data.client,
        assigned: Array.isArray(data.assigned) ? data.assigned[0] || null : data.assigned,
        creator: Array.isArray(data.creator) ? data.creator[0] || null : data.creator,
      };

      setTask(transformedData);
    } catch (error) {
      console.error('Error loading task:', error);
      toast.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const statusClasses: Record<string, string> = {
      backlog: styles.statusBacklog,
      todo: styles.statusTodo,
      in_progress: styles.statusInProgress,
      approved: styles.statusApproved,
      done: styles.statusDone,
    };
    return statusClasses[status] || styles.statusDefault;
  };

  const getPriorityBadgeClass = (priority: string) => {
    const priorityClasses: Record<string, string> = {
      urgent: styles.priorityUrgent,
      high: styles.priorityHigh,
      medium: styles.priorityMedium,
      low: styles.priorityLow,
    };
    return priorityClasses[priority] || styles.priorityDefault;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Task Details</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading task details...</div>
        ) : task ? (
          <div className={styles.content}>
            {/* Task ID */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Task ID</div>
              <div className={styles.taskId}>{formatIdForDisplay(task.id)}</div>
            </div>

            {/* Title */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Title</div>
              <div className={styles.taskTitle}>{task.title}</div>
            </div>

            {/* Description */}
            {task.description && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Description</div>
                <div className={styles.taskDescription}>{task.description}</div>
              </div>
            )}

            {/* Status & Priority */}
            <div className={styles.row}>
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Status</div>
                <span className={`${styles.badge} ${getStatusBadgeClass(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Priority</div>
                <span className={`${styles.badge} ${getPriorityBadgeClass(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            </div>

            {/* Category */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Category</div>
              <div className={styles.value}>{task.category.replace('_', ' ')}</div>
            </div>

            {/* Client */}
            {task.client && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Client</div>
                <div className={styles.value}>
                  {task.client.full_name} ({task.client.email})
                </div>
              </div>
            )}

            {/* Assigned To */}
            {task.assigned && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Assigned To</div>
                <div className={styles.value}>{task.assigned.full_name}</div>
              </div>
            )}

            {/* Created By */}
            {task.creator && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Created By</div>
                <div className={styles.value}>{task.creator.full_name}</div>
              </div>
            )}

            {/* Dates */}
            <div className={styles.row}>
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Created</div>
                <div className={styles.value}>{formatDate(task.created_at)}</div>
              </div>
              {task.completed_at && (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>Completed</div>
                  <div className={styles.value}>{formatDate(task.completed_at)}</div>
                </div>
              )}
            </div>

            {/* Flags */}
            {task.requires_approval && (
              <div className={styles.section}>
                <div className={styles.approvalFlag}>⚠️ Requires approval before completion</div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.error}>Task not found</div>
        )}

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.closeButtonFooter}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
