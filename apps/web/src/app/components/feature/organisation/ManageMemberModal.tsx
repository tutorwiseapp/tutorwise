/**
 * Filename: ManageMemberModal.tsx
 * Purpose: Modal for managing individual member settings (v6.3)
 * Created: 2025-11-26
 * Design: Simple form modal for agency owner to set member commission, notes, and verification
 *
 * Features:
 * - Commission Rate override (number input, 0-100%)
 * - Internal Notes (private textarea)
 * - Verification Toggle (checkbox)
 * - Auto-save on each field change
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OrganisationMember, updateMemberSettings } from '@/lib/api/organisation';
import toast from 'react-hot-toast';
import styles from './ManageMemberModal.module.css';

interface ManageMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: OrganisationMember;
  organisationId: string;
  defaultCommissionRate: number | null; // Organisation's default rate
}

export default function ManageMemberModal({
  isOpen,
  onClose,
  member,
  organisationId,
  defaultCommissionRate,
}: ManageMemberModalProps) {
  const queryClient = useQueryClient();

  const [commissionRate, setCommissionRate] = useState<string>(
    member.commission_rate?.toString() || ''
  );
  const [internalNotes, setInternalNotes] = useState<string>(member.internal_notes || '');
  const [isVerified, setIsVerified] = useState<boolean>(member.is_verified || false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when member changes
  useEffect(() => {
    if (isOpen) {
      setCommissionRate(member.commission_rate?.toString() || '');
      setInternalNotes(member.internal_notes || '');
      setIsVerified(member.is_verified || false);
    }
  }, [isOpen, member]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: {
      commission_rate?: number | null;
      internal_notes?: string | null;
      is_verified?: boolean;
    }) => {
      return updateMemberSettings(organisationId, member.connection_id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation-members', organisationId] });
      toast.success('Member settings updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update member settings');
    },
  });

  const handleCommissionRateChange = async (value: string) => {
    setCommissionRate(value);

    // Validate
    if (value && value.trim() !== '') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        toast.error('Commission rate must be between 0 and 100');
        return;
      }
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({ commission_rate: numValue });
      } finally {
        setIsSaving(false);
      }
    } else {
      // Clear commission rate (use organisation default)
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({ commission_rate: null });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleNotesBlur = async () => {
    const trimmedNotes = internalNotes.trim();
    if (trimmedNotes !== (member.internal_notes || '').trim()) {
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({
          internal_notes: trimmedNotes || null,
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleVerifiedToggle = async (checked: boolean) => {
    setIsVerified(checked);
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ is_verified: checked });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const effectiveRate = member.commission_rate ?? defaultCommissionRate;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Manage Member Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Member Info */}
        <div className={styles.memberInfo}>
          <div className={styles.memberAvatar}>
            {member.avatar_url ? (
              <Image
                src={member.avatar_url}
                alt={member.full_name || member.email}
                width={64}
                height={64}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {(member.full_name || member.email).substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.memberDetails}>
            <div className={styles.memberName}>{member.full_name || member.email}</div>
            <div className={styles.memberEmail}>{member.email}</div>
          </div>
        </div>

        {/* Form Content */}
        <div className={styles.content}>
          {/* Commission Rate */}
          <div className={styles.field}>
            <label className={styles.label}>
              Commission Rate (%)
              <span className={styles.hint}>
                {effectiveRate !== null
                  ? ` • Using ${member.commission_rate !== null ? 'custom' : 'default'} rate: ${effectiveRate}%`
                  : ' • No default rate set'}
              </span>
            </label>
            <input
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              onBlur={(e) => handleCommissionRateChange(e.target.value)}
              placeholder={
                defaultCommissionRate !== null
                  ? `Leave empty to use default (${defaultCommissionRate}%)`
                  : 'e.g., 15.50'
              }
              min="0"
              max="100"
              step="0.01"
              className={styles.input}
              disabled={isSaving}
            />
            <div className={styles.fieldHelp}>
              Leave empty to use organisation default. Set a value to override for this member.
            </div>
          </div>

          {/* Internal Notes */}
          <div className={styles.field}>
            <label className={styles.label}>
              Internal Notes
              <span className={styles.hint}> • Private (never visible to member)</span>
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add private notes about this member..."
              rows={4}
              className={styles.textarea}
              disabled={isSaving}
            />
          </div>

          {/* Verification Toggle */}
          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => handleVerifiedToggle(e.target.checked)}
                className={styles.checkbox}
                disabled={isSaving}
              />
              <span>Member is verified</span>
              <span className={styles.hint}> • Internal flag for agency tracking</span>
            </label>
          </div>

          {/* Saving Indicator */}
          {isSaving && (
            <div className={styles.savingIndicator}>Saving...</div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButtonFooter}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
