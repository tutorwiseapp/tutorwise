/**
 * TaskDetailModal.tsx
 * Modal for viewing and editing task details
 * Created: 2026-01-03
 * Updated: 2026-01-04 - Redesigned to match CreateTaskModal style with editable fields
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import toast from 'react-hot-toast';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import styles from './CreateTaskModal.module.css';
import detailStyles from './TaskDetailModal.module.css';

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
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Form data for editing
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'admin',
    status: 'todo',
    requiresApproval: false,
    assignedTo: '',
  });

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(true);

  // Comments collapse state
  const [commentsExpanded, setCommentsExpanded] = useState(true);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
      fetchTeamMembers();
      loadComments();
      loadAttachments();
    }
  }, [isOpen, taskId]);

  // Update form data when task loads
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        category: task.category,
        status: task.status,
        requiresApproval: task.requires_approval,
        assignedTo: task.assigned?.id || '',
      });
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
      setLoadingMembers(true);

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
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('org_tasks')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          category: formData.category,
          status: formData.status,
          requires_approval: formData.requiresApproval,
          assigned_to: formData.assignedTo || null,
        })
        .eq('id', taskId);

      if (error) {
        console.error('Task update error:', error);
        throw error;
      }

      toast.success('Task updated successfully');
      await loadTaskDetails();
      onUpdate();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error(error?.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (task) {
      // Reset form to original task data
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        category: task.category,
        status: task.status,
        requiresApproval: task.requires_approval,
        assignedTo: task.assigned?.id || '',
      });
    }
    onClose();
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

      if (error) {
        console.error('Comment insert error:', error);
        throw error;
      }

      setNewComment('');
      await loadComments();
      toast.success('Comment added');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error(error?.message || 'Failed to add comment');
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

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

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

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      await loadAttachments();
      toast.success('File uploaded successfully');
      e.target.value = ''; // Reset input
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error?.message || 'Failed to upload file');
      e.target.value = ''; // Reset input on error
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

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Edit Task"
      subtitle={task ? formatIdForDisplay(task.id) : ''}
      size="lg"
      footer={
        <div className={styles.footer}>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.cancelButton}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-task-form"
            className={styles.createButton}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className={detailStyles.loading}>Loading task details...</div>
      ) : task ? (
        <>
          <form id="edit-task-form" onSubmit={handleSave} className={styles.form}>
            {/* Title */}
            <div className={styles.field}>
              <label className={styles.label}>
                Title <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={styles.input}
                placeholder="Enter task title..."
                disabled={saving}
              />
            </div>

            {/* Description */}
            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={styles.textarea}
                placeholder="Enter task description..."
                rows={4}
                disabled={saving}
              />
            </div>

            {/* Priority & Category Row */}
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Priority</label>
                <UnifiedSelect
                  value={formData.priority}
                  onChange={(value) => setFormData({ ...formData, priority: String(value) })}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                  ]}
                  placeholder="Select priority"
                  disabled={saving}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Category</label>
                <UnifiedSelect
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: String(value) })}
                  options={[
                    { value: 'account', label: 'Account' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'agent_issue', label: 'Agent Issue' },
                    { value: 'booking_issue', label: 'Booking Issue' },
                    { value: 'client_issue', label: 'Client Issue' },
                    { value: 'developer', label: 'Developer' },
                    { value: 'disputes', label: 'Disputes' },
                    { value: 'financial', label: 'Financial' },
                    { value: 'help_centre', label: 'Help Centre' },
                    { value: 'listing', label: 'Listing' },
                    { value: 'marketplace', label: 'Marketplace' },
                    { value: 'messages', label: 'Messages' },
                    { value: 'network', label: 'Network' },
                    { value: 'organisation', label: 'Organisation' },
                    { value: 'other', label: 'Other' },
                    { value: 'payment_issue', label: 'Payment Issue' },
                    { value: 'payouts', label: 'Payouts' },
                    { value: 'profile', label: 'Profile' },
                    { value: 'public_listing', label: 'Public Listing' },
                    { value: 'public_organisation', label: 'Public Organisation' },
                    { value: 'public_profile', label: 'Public Profile' },
                    { value: 'referral', label: 'Referral' },
                    { value: 'reviews', label: 'Reviews' },
                    { value: 'safeguarding', label: 'Safeguarding' },
                    { value: 'transactions', label: 'Transactions' },
                    { value: 'tutor_issue', label: 'Tutor Issue' },
                    { value: 'wiselist', label: 'Wiselist' }
                  ]}
                  placeholder="Select category"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Assign To & Status Row */}
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Assign To</label>
                <UnifiedSelect
                  value={formData.assignedTo}
                  onChange={(value) => setFormData({ ...formData, assignedTo: String(value) })}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...teamMembers.map((member) => ({
                      value: member.id,
                      label: member.full_name
                    }))
                  ]}
                  placeholder="Unassigned"
                  disabled={saving || loadingMembers}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Status</label>
                <UnifiedSelect
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: String(value) })}
                  options={[
                    { value: 'backlog', label: 'Backlog' },
                    { value: 'todo', label: 'To Do' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'done', label: 'Done' }
                  ]}
                  placeholder="Select status"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Approval Checkbox */}
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.requiresApproval}
                  onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                  className={styles.checkbox}
                  disabled={saving}
                />
                <span>Requires approval</span>
              </label>
            </div>

            {/* Metadata Section */}
            <div className={detailStyles.metadataSection}>
              <div className={detailStyles.metadataRow}>
                {task.creator && (
                  <div className={detailStyles.metadataItem}>
                    <span className={detailStyles.metadataLabel}>Created by:</span>
                    <span className={detailStyles.metadataValue}>{task.creator.full_name}</span>
                  </div>
                )}
                <div className={detailStyles.metadataItem}>
                  <span className={detailStyles.metadataLabel}>Created:</span>
                  <span className={detailStyles.metadataValue}>{formatDate(task.created_at)}</span>
                </div>
                {task.completed_at && (
                  <div className={detailStyles.metadataItem}>
                    <span className={detailStyles.metadataLabel}>Completed:</span>
                    <span className={detailStyles.metadataValue}>{formatDate(task.completed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Attachments Section */}
          <div className={detailStyles.additionalSection}>
            <div
              className={detailStyles.sectionHeader}
              onClick={() => setAttachmentsExpanded(!attachmentsExpanded)}
              style={{ cursor: 'pointer' }}
            >
              <h3 className={detailStyles.sectionTitle}>
                <span className={detailStyles.chevron}>
                  {attachmentsExpanded ? '▼' : '▶'}
                </span>
                Attachments ({attachments.length})
              </h3>
            </div>

            {attachmentsExpanded && (
              <>
                <div className={detailStyles.attachmentsList}>
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className={detailStyles.attachmentItem}>
                      <div className={detailStyles.attachmentInfo}>
                        <div className={detailStyles.attachmentName}>{attachment.file_name}</div>
                        <div className={detailStyles.attachmentMeta}>
                          {formatFileSize(attachment.file_size)} • Uploaded by {attachment.uploader.full_name} • {formatDate(attachment.uploaded_at)}
                        </div>
                      </div>
                      <div className={detailStyles.attachmentActions}>
                        <button
                          onClick={() => downloadAttachment(attachment.storage_path, attachment.file_name)}
                          className={detailStyles.downloadButton}
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id, attachment.storage_path)}
                          className={detailStyles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {attachments.length === 0 && (
                    <div className={detailStyles.emptyState}>No attachments yet</div>
                  )}
                </div>

                <div className={detailStyles.uploadSection}>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className={detailStyles.fileInput}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className={detailStyles.uploadButton}>
                    {uploading ? 'Uploading...' : 'Upload File (Max 10MB)'}
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Comments Section */}
          <div className={detailStyles.additionalSection}>
            <div
              className={detailStyles.sectionHeader}
              onClick={() => setCommentsExpanded(!commentsExpanded)}
              style={{ cursor: 'pointer' }}
            >
              <h3 className={detailStyles.sectionTitle}>
                <span className={detailStyles.chevron}>
                  {commentsExpanded ? '▼' : '▶'}
                </span>
                Comments ({comments.length})
              </h3>
            </div>

            {commentsExpanded && (
              <>
                <div className={detailStyles.commentsList}>
                  {comments.map((comment) => (
                    <div key={comment.id} className={detailStyles.commentItem}>
                      <div className={detailStyles.commentHeader}>
                        <span className={detailStyles.commentAuthor}>{comment.user.full_name}</span>
                        <span className={detailStyles.commentDate}>{formatDate(comment.created_at)}</span>
                      </div>
                      <div className={detailStyles.commentText}>{comment.comment_text}</div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div className={detailStyles.emptyState}>No comments yet</div>
                  )}
                </div>

                <form onSubmit={handleSubmitComment} className={detailStyles.commentForm}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className={detailStyles.commentInput}
                    rows={3}
                    disabled={submittingComment}
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className={detailStyles.submitCommentButton}
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              </>
            )}
          </div>
        </>
      ) : (
        <div className={detailStyles.error}>Task not found</div>
      )}
    </HubComplexModal>
  );
}
