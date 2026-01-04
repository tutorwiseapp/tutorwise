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
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
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
  const [isEditing, setIsEditing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
      fetchTeamMembers();
    }
  }, [isOpen, taskId]);

  useEffect(() => {
    if (task) {
      setSelectedAssignee(task.assigned?.id || '');
    }
  }, [task]);

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

  const fetchTeamMembers = async () => {
    try {
      // Get organisation owner
      const { data: orgData } = await supabase
        .from('connection_groups')
        .select('profile_id, profiles!inner(id, full_name)')
        .eq('id', organisationId)
        .single();

      // Get team members
      const { data: membersData } = await supabase
        .from('group_members')
        .select(`
          connection_id,
          profile_graph!inner(
            source_profile_id,
            target_profile_id,
            source_profile:source_profile_id(id, full_name),
            target_profile:target_profile_id(id, full_name)
          )
        `)
        .eq('group_id', organisationId);

      const members = new Map<string, { id: string; full_name: string }>();

      // Add owner (transform array to object)
      const ownerProfile = Array.isArray(orgData?.profiles)
        ? orgData.profiles[0]
        : orgData?.profiles;

      if (ownerProfile?.id) {
        members.set(ownerProfile.id, {
          id: ownerProfile.id,
          full_name: ownerProfile.full_name,
        });
      }

      // Add team members from graph (transform arrays to objects)
      membersData?.forEach((member: any) => {
        const graph = Array.isArray(member.profile_graph)
          ? member.profile_graph[0]
          : member.profile_graph;

        if (!graph) return;

        // Transform source_profile from array to object
        const sourceProfile = Array.isArray(graph.source_profile)
          ? graph.source_profile[0]
          : graph.source_profile;

        if (sourceProfile?.id && sourceProfile?.full_name) {
          members.set(sourceProfile.id, {
            id: sourceProfile.id,
            full_name: sourceProfile.full_name
          });
        }

        // Transform target_profile from array to object
        const targetProfile = Array.isArray(graph.target_profile)
          ? graph.target_profile[0]
          : graph.target_profile;

        if (targetProfile?.id && targetProfile?.full_name) {
          members.set(targetProfile.id, {
            id: targetProfile.id,
            full_name: targetProfile.full_name
          });
        }
      });

      setTeamMembers(Array.from(members.values()).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleReassign = async () => {
    if (!task) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      const { error: rpcError } = await supabase.rpc('assign_task', {
        p_task_id: taskId,
        p_assigned_to: selectedAssignee || null,
        p_performed_by: currentUser.user.id,
        p_notes: null,
        p_metadata: {},
      });

      if (rpcError) throw rpcError;

      toast.success('Task reassigned successfully');
      setIsEditing(false);
      loadTaskDetails();
      onUpdate();
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast.error('Failed to reassign task');
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
    <HubComplexModal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      size="lg"
      footer={
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.closeButtonFooter}>
            Close
          </button>
        </div>
      }
    >
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
            <div className={styles.section}>
              <div className={styles.sectionLabel}>
                Assigned To
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={styles.editButton}
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className={styles.reassignContainer}>
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className={styles.reassignSelect}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                  <div className={styles.reassignActions}>
                    <button
                      onClick={handleReassign}
                      className={styles.saveButton}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedAssignee(task.assigned?.id || '');
                      }}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.value}>
                  {task.assigned ? task.assigned.full_name : 'Unassigned'}
                </div>
              )}
            </div>

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
    </HubComplexModal>
  );
}
