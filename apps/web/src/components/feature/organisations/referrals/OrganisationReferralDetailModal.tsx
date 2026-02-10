/**
 * Filename: OrganisationReferralDetailModal.tsx
 * Purpose: Hub detail modal for organisation referrals with conversion tracking
 * Created: 2025-12-31
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import styles from './OrganisationReferralDetailModal.module.css';

interface Referral {
  id: string;
  agent_id: string;
  referred_profile_id?: string;
  referrer_member_id?: string;
  status: string;
  conversion_stage: string;
  created_at: string;
  contacted_at?: string;
  first_meeting_at?: string;
  proposal_sent_at?: string;
  proposal_accepted_at?: string;
  converted_at?: string;
  estimated_value?: number;
  actual_value?: number;
  conversion_notes?: string;
  commission_amount?: number;
  organisation_commission?: number;
  member_commission?: number;
  profile?: {
    full_name: string;
    email: string;
    phone?: string;
  };
  referrer?: {
    full_name: string;
  };
}

interface Activity {
  id: string;
  activity_type: string;
  activity_date: string;
  performed_by?: string;
  notes?: string;
}

interface OrganisationReferralDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralId: string;
  organisationId: string;
  onUpdate?: () => void;
}

const STAGE_OPTIONS = [
  { value: 'referred', label: 'New Referral' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'meeting', label: 'Meeting Set' },
  { value: 'proposal', label: 'Proposal Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'converted', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export function OrganisationReferralDetailModal({
  isOpen,
  onClose,
  referralId,
  organisationId: _organisationId,
  onUpdate,
}: OrganisationReferralDetailModalProps) {
  const supabase = createClient();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');

  useEffect(() => {
    if (isOpen && referralId) {
      loadReferralDetails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, referralId]);

  const loadReferralDetails = async () => {
    try {
      setLoading(true);

      console.log('Loading referral details for ID:', referralId);

      // Load referral with profile joins
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select(`
          *,
          profile:referred_profile_id(full_name, email, phone),
          referrer:referrer_member_id(full_name)
        `)
        .eq('id', referralId)
        .single();

      console.log('Referral data:', referralData);
      console.log('Referral error:', referralError);

      if (referralError) throw referralError;
      setReferral(referralData);
      setNewStage(referralData.conversion_stage);
      setEstimatedValue(referralData.estimated_value?.toString() || '');

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('referral_conversion_activities')
        .select('*')
        .eq('referral_id', referralId)
        .order('activity_date', { ascending: false });

      if (!activitiesError && activitiesData) {
        setActivities(activitiesData);
      }
    } catch (error) {
      console.error('Error loading referral details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStage = async () => {
    if (!referral || updating) return;

    try {
      setUpdating(true);

      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      // Call RPC function to update stage
      const { error } = await supabase.rpc('update_referral_conversion_stage', {
        p_referral_id: referralId,
        p_new_stage: newStage,
        p_performed_by: currentUser.user.id,
        p_notes: notes || null,
        p_metadata: estimatedValue ? { estimated_value: parseFloat(estimatedValue) } : {},
      });

      if (error) throw error;

      // Update estimated value if changed
      if (estimatedValue && parseFloat(estimatedValue) !== referral.estimated_value) {
        await supabase
          .from('referrals')
          .update({ estimated_value: parseFloat(estimatedValue) })
          .eq('id', referralId);
      }

      // Reload data
      await loadReferralDetails();

      // Notify parent
      if (onUpdate) onUpdate();

      // Clear notes
      setNotes('');

      // Auto-close modal after successful update
      onClose();
    } catch (error: any) {
      console.error('Error updating stage:', error);
      alert(error.message || 'Failed to update stage');
    } finally {
      setUpdating(false);
    }
  };

  const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStage = e.target.value;
    setNewStage(selectedStage);

    // Auto-update when stage changes
    if (selectedStage !== referral?.conversion_stage) {
      await handleUpdateStage();
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <HubDetailModal
        isOpen={isOpen}
        onClose={onClose}
        title="Referral Details"
        size="xl"
        sections={[
          {
            title: 'Loading',
            fields: [{ label: 'Status', value: 'Loading referral details...' }],
          },
        ]}
      />
    );
  }

  if (!referral) {
    return (
      <HubDetailModal
        isOpen={isOpen}
        onClose={onClose}
        title="Referral Details"
        size="xl"
        sections={[
          {
            title: 'Error',
            fields: [{ label: 'Status', value: 'Failed to load referral details. Please try again.' }],
          },
        ]}
        actions={
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        }
      />
    );
  }

  const sections: DetailSection[] = [
    {
      title: 'Referral Information',
      fields: [
        { label: 'Contact Name', value: referral.profile?.full_name || 'Unknown' },
        { label: 'Email', value: referral.profile?.email || 'No email' },
        { label: 'Phone', value: referral.profile?.phone || 'No phone' },
        { label: 'Referred By', value: referral.referrer?.full_name || 'Unknown' },
        { label: 'Referral ID', value: formatIdForDisplay(referralId) },
        { label: 'Status', value: referral.status },
      ],
    },
    {
      title: 'Conversion Tracking',
      fields: [
        { label: 'Current Stage', value: STAGE_OPTIONS.find(s => s.value === referral.conversion_stage)?.label || referral.conversion_stage },
        {
          label: 'Estimated Value (GBP)',
          value: (
            <input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              className={styles.numberInput}
              placeholder="0.00"
              disabled={updating}
            />
          )
        },
        { label: 'Actual Value', value: formatCurrency(referral.actual_value) },
        { label: 'Created', value: formatDateTime(referral.created_at) },
        { label: 'Last Updated', value: referral.contacted_at ? formatDateTime(referral.contacted_at) : 'N/A' },
        {
          label: 'Notes',
          value: (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.notesTextarea}
              placeholder="Add notes about this referral..."
              rows={3}
              disabled={updating}
            />
          )
        },
      ],
    },
  ];

  if (referral.conversion_stage === 'converted' || referral.commission_amount) {
    sections.push({
      title: 'Commission',
      fields: [
        { label: 'Total Commission', value: formatCurrency(referral.commission_amount) },
        { label: 'Organisation Share', value: formatCurrency(referral.organisation_commission) },
        { label: 'Member Share', value: formatCurrency(referral.member_commission) },
        { label: 'Converted At', value: referral.converted_at ? formatDateTime(referral.converted_at) : 'N/A' },
      ],
    });
  }

  if (activities.length > 0) {
    sections.push({
      title: 'Activity Timeline',
      fields: activities.map(activity => ({
        label: formatDateTime(activity.activity_date),
        value: (
          <div>
            <strong>{activity.activity_type}</strong>
            {activity.notes && <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{activity.notes}</div>}
          </div>
        ),
      })),
    });
  }

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="Referral Details"
      subtitle={formatIdForDisplay(referral.id)}
      size="xl"
      sections={sections}
      actions={
        <div className={styles.stageDropdownWrapper}>
          <UnifiedSelect
            value={newStage}
            onChange={(value) => {
              const event = {
                target: { value: String(value) }
              } as React.ChangeEvent<HTMLSelectElement>;
              handleStageChange(event);
            }}
            options={STAGE_OPTIONS}
            placeholder="Select stage"
            disabled={updating}
          />
        </div>
      }
    />
  );
}
