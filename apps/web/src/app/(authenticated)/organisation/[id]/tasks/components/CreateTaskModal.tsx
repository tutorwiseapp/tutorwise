/**
 * CreateTaskModal.tsx
 * Modal for creating new organisation tasks
 * Created: 2026-01-03
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import styles from './CreateTaskModal.module.css';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  organisationId: string;
  onCreate: () => void;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  organisationId,
  onCreate,
}: CreateTaskModalProps) {
  const supabase = createClient();
  const [creating, setCreating] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'admin',
    status: 'todo',
    requiresApproval: false,
    assignedTo: '',
  });

  // Fetch team members when modal opens
  useEffect(() => {
    if (isOpen && organisationId) {
      fetchTeamMembers();
    }
  }, [isOpen, organisationId]);

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setCreating(true);

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('org_tasks')
        .insert({
          organisation_id: organisationId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          category: formData.category,
          status: formData.status,
          requires_approval: formData.requiresApproval,
          created_by: currentUser.user.id,
          assigned_to: formData.assignedTo || null,
        });

      if (error) throw error;

      onCreate();
      onClose();

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'admin',
        status: 'todo',
        requiresApproval: false,
        assignedTo: '',
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create New Task</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
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
              disabled={creating}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              placeholder="Enter task description..."
              rows={4}
              disabled={creating}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className={styles.select}
                disabled={creating}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={styles.select}
                disabled={creating}
              >
                <option value="admin">Admin</option>
                <option value="client_issue">Client Issue</option>
                <option value="tutor_issue">Tutor Issue</option>
                <option value="booking_issue">Booking Issue</option>
                <option value="payment_issue">Payment Issue</option>
                <option value="safeguarding">Safeguarding</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Assignment Row */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Assign To</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className={styles.select}
                disabled={creating || loadingMembers}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Initial Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={styles.select}
                disabled={creating}
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
              </select>
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
                disabled={creating}
              />
              <span>Requires approval</span>
            </label>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
