/**
 * CreateReferralModal.tsx
 * Modal for manually creating referral cards for tracking prospects before signup
 * Created: 2026-01-06
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './CreateReferralModal.module.css';

interface CreateReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  organisationId: string;
  onCreate: () => void;
}

export function CreateReferralModal({
  isOpen,
  onClose,
  organisationId,
  onCreate,
}: CreateReferralModalProps) {
  const supabase = createClient();
  const [creating, setCreating] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [formData, setFormData] = useState({
    referredName: '',
    referredEmail: '',
    referredPhone: '',
    estimatedValue: '',
    notes: '',
    referrerMemberId: '',
  });

  // Fetch team members when modal opens
  useEffect(() => {
    if (isOpen && organisationId) {
      fetchTeamMembers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, organisationId]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        referredName: '',
        referredEmail: '',
        referredPhone: '',
        estimatedValue: '',
        notes: '',
        referrerMemberId: '',
      });
    }
  }, [isOpen]);

  const fetchTeamMembers = async () => {
    try {
      setLoadingMembers(true);

      // Get current user profile
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', currentUser.user.id)
        .single();

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

      // Add owner
      const ownerProfile = Array.isArray(orgData?.profiles)
        ? orgData.profiles[0]
        : orgData?.profiles;

      if (ownerProfile?.id) {
        members.set(ownerProfile.id, {
          id: ownerProfile.id,
          full_name: ownerProfile.full_name,
        });
      }

      // Add team members from graph
      membersData?.forEach((member: any) => {
        const graph = Array.isArray(member.profile_graph)
          ? member.profile_graph[0]
          : member.profile_graph;

        if (!graph) return;

        const sourceProfile = Array.isArray(graph.source_profile)
          ? graph.source_profile[0]
          : graph.source_profile;

        if (sourceProfile?.id && sourceProfile?.full_name) {
          members.set(sourceProfile.id, {
            id: sourceProfile.id,
            full_name: sourceProfile.full_name,
          });
        }

        const targetProfile = Array.isArray(graph.target_profile)
          ? graph.target_profile[0]
          : graph.target_profile;

        if (targetProfile?.id && targetProfile?.full_name) {
          members.set(targetProfile.id, {
            id: targetProfile.id,
            full_name: targetProfile.full_name,
          });
        }
      });

      const membersList = Array.from(members.values()).sort((a, b) =>
        a.full_name.localeCompare(b.full_name)
      );
      setTeamMembers(membersList);

      // Auto-select current user as referrer
      if (currentProfile?.id && members.has(currentProfile.id)) {
        setFormData((prev) => ({ ...prev, referrerMemberId: currentProfile.id }));
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.referredName.trim()) {
      toast.error('Please enter the referred person\'s name');
      return;
    }

    if (!formData.referredEmail.trim() && !formData.referredPhone.trim()) {
      toast.error('Please enter either an email or phone number');
      return;
    }

    // Basic email validation if provided
    if (formData.referredEmail.trim() && !formData.referredEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!formData.referrerMemberId) {
      toast.error('Please select who is making this referral');
      return;
    }

    setCreating(true);

    try {
      const estimatedValue = formData.estimatedValue ? parseFloat(formData.estimatedValue) : 0;

      const { data: _data, error } = await supabase.rpc('create_manual_referral', {
        p_organisation_id: organisationId,
        p_referrer_member_id: formData.referrerMemberId,
        p_referred_name: formData.referredName.trim(),
        p_referred_email: formData.referredEmail.trim() || null,
        p_referred_phone: formData.referredPhone.trim() || null,
        p_estimated_value: estimatedValue,
        p_notes: formData.notes.trim() || null,
      });

      if (error) throw error;

      toast.success(`Referral for ${formData.referredName} created successfully!`);
      onCreate();
      onClose();
    } catch (error: any) {
      console.error('Error creating referral:', error);
      toast.error(error.message || 'Failed to create referral');
    } finally {
      setCreating(false);
    }
  };

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Referral"
      size="md"
      footer={
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
            form="create-referral-form"
            className={styles.createButton}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Referral'}
          </button>
        </div>
      }
    >
      <form id="create-referral-form" onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.helpText}>
          Use this to track prospects before they sign up. Once they use your referral link and
          complete a booking, the card will automatically move to &quot;Won&quot; stage.
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={formData.referredName}
            onChange={(e) => setFormData({ ...formData, referredName: e.target.value })}
            className={styles.input}
            placeholder="Enter name..."
            disabled={creating}
            autoFocus
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={formData.referredEmail}
              onChange={(e) => setFormData({ ...formData, referredEmail: e.target.value })}
              className={styles.input}
              placeholder="email@example.com"
              disabled={creating}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Phone</label>
            <input
              type="tel"
              value={formData.referredPhone}
              onChange={(e) => setFormData({ ...formData, referredPhone: e.target.value })}
              className={styles.input}
              placeholder="+44 7XXX XXXXXX"
              disabled={creating}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              Referred By <span className={styles.required}>*</span>
            </label>
            <UnifiedSelect
              value={formData.referrerMemberId}
              onChange={(value) => setFormData({ ...formData, referrerMemberId: String(value) })}
              options={[
                { value: '', label: 'Select team member...' },
                ...teamMembers.map((member) => ({
                  value: member.id,
                  label: member.full_name
                }))
              ]}
              placeholder="Select team member..."
              disabled={creating || loadingMembers}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Estimated Value (£)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.estimatedValue}
              onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
              className={styles.input}
              placeholder="0.00"
              disabled={creating}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={styles.textarea}
            placeholder="Add context, where you met them, follow-up plan..."
            rows={4}
            disabled={creating}
          />
        </div>
      </form>
    </HubComplexModal>
  );
}
