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

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
  };
}

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string | null;
  storage_path: string;
  uploaded_at: string;
  uploader: {
    id: string;
    full_name: string;
  };
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

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
      fetchTeamMembers();
      loadComments();
      loadAttachments();
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

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('org_task_comments')
        .select(`
          id,
          comment_text,
          created_at,
          user:user_id(id, full_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform array relations to single objects
      const transformedComments = data?.map((comment: any) => ({
        ...comment,
        user: Array.isArray(comment.user) ? comment.user[0] : comment.user,
      })) || [];

      setComments(transformedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('org_task_comments')
        .insert({
          task_id: taskId,
          user_id: currentUser.user.id,
          comment_text: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      loadComments();
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const loadAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('org_task_attachments')
        .select(`
          id,
          file_name,
          file_size,
          file_type,
          storage_path,
          uploaded_at,
          uploader:uploaded_by(id, full_name)
        `)
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Transform array relations to single objects
      const transformedAttachments = data?.map((attachment: any) => ({
        ...attachment,
        uploader: Array.isArray(attachment.uploader) ? attachment.uploader[0] : attachment.uploader,
      })) || [];

      setAttachments(transformedAttachments);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB limit
    if (file.size > 10485760) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${organisationId}/${taskId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save attachment record
      const { error: dbError } = await supabase
        .from('org_task_attachments')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || null,
          storage_path: filePath,
          uploaded_by: currentUser.user.id,
        });

      if (dbError) throw dbError;

      loadAttachments();
      toast.success('File uploaded successfully');
      e.target.value = ''; // Reset input
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('org_task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      loadAttachments();
      toast.success('Attachment deleted');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const downloadAttachment = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .download(storagePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
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

            {/* Attachments Section */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Attachments ({attachments.length})</div>

              <div className={styles.attachmentsList}>
                {attachments.map((attachment) => (
                  <div key={attachment.id} className={styles.attachmentItem}>
                    <div className={styles.attachmentInfo}>
                      <div className={styles.attachmentName}>{attachment.file_name}</div>
                      <div className={styles.attachmentMeta}>
                        {formatFileSize(attachment.file_size)} • Uploaded by {attachment.uploader.full_name} • {formatDate(attachment.uploaded_at)}
                      </div>
                    </div>
                    <div className={styles.attachmentActions}>
                      <button
                        onClick={() => downloadAttachment(attachment.storage_path, attachment.file_name)}
                        className={styles.downloadButton}
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteAttachment(attachment.id, attachment.storage_path)}
                        className={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {attachments.length === 0 && (
                  <div className={styles.emptyState}>No attachments yet</div>
                )}
              </div>

              <div className={styles.uploadSection}>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className={styles.fileInput}
                  id="file-upload"
                />
                <label htmlFor="file-upload" className={styles.uploadButton}>
                  {uploading ? 'Uploading...' : 'Upload File (Max 10MB)'}
                </label>
              </div>
            </div>

            {/* Comments Section */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Comments ({comments.length})</div>

              <div className={styles.commentsList}>
                {comments.map((comment) => (
                  <div key={comment.id} className={styles.commentItem}>
                    <div className={styles.commentHeader}>
                      <span className={styles.commentAuthor}>{comment.user.full_name}</span>
                      <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
                    </div>
                    <div className={styles.commentText}>{comment.comment_text}</div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <div className={styles.emptyState}>No comments yet</div>
                )}
              </div>

              <form onSubmit={handleSubmitComment} className={styles.commentForm}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className={styles.commentInput}
                  rows={3}
                  disabled={submittingComment}
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className={styles.submitCommentButton}
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            </div>
        </div>
      ) : (
        <div className={styles.error}>Task not found</div>
      )}
    </HubComplexModal>
  );
}
