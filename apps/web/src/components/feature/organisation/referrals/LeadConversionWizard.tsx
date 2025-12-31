/**
 * Filename: LeadConversionWizard.tsx
 * Purpose: CRM-style wizard for moving referrals through conversion stages
 * Created: 2025-12-31
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Users,
  Phone,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MessageSquare,
  DollarSign,
  Clock,
  Briefcase,
} from 'lucide-react';
import styles from './LeadConversionWizard.module.css';

interface Referral {
  id: string;
  referred_profile_id: string;
  referrer_member_id: string;
  conversion_stage: string;
  created_at: string;
  contacted_at?: string;
  first_meeting_at?: string;
  proposal_sent_at?: string;
  estimated_value?: number;
  conversion_notes?: string;
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
  performed_by: string;
  notes?: string;
  metadata?: any;
}

interface LeadConversionWizardProps {
  organisationId: string;
  referralId?: string;
  onClose?: () => void;
}

const CONVERSION_STAGES = [
  { key: 'referred', label: 'Referred', icon: Users, color: '#94a3b8' },
  { key: 'contacted', label: 'Contacted', icon: Phone, color: '#3b82f6' },
  { key: 'meeting', label: 'Meeting', icon: Calendar, color: '#8b5cf6' },
  { key: 'proposal', label: 'Proposal', icon: FileText, color: '#f59e0b' },
  { key: 'negotiating', label: 'Negotiating', icon: Briefcase, color: '#ec4899' },
  { key: 'converted', label: 'Converted', icon: CheckCircle2, color: '#10b981' },
  { key: 'lost', label: 'Lost', icon: XCircle, color: '#ef4444' },
];

export function LeadConversionWizard({
  organisationId,
  referralId,
  onClose,
}: LeadConversionWizardProps) {
  const supabase = createClient();

  const [referral, setReferral] = useState<Referral | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form state
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<number>(0);
  const [meetingDate, setMeetingDate] = useState('');

  useEffect(() => {
    if (referralId) {
      loadReferral();
      loadActivities();
    }
  }, [referralId]);

  const loadReferral = async () => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          profile:referred_profile_id (
            full_name,
            email,
            phone
          ),
          referrer:referrer_member_id (
            full_name
          )
        `)
        .eq('id', referralId)
        .single();

      if (error) throw error;

      if (data) {
        setReferral(data);
        setSelectedStage(data.conversion_stage);
        setEstimatedValue(data.estimated_value || 0);
        setNotes(data.conversion_notes || '');
      }
    } catch (error) {
      console.error('Error loading referral:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_conversion_activities')
        .select('*')
        .eq('referral_id', referralId)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const handleUpdateStage = async () => {
    if (!referralId || !selectedStage) return;

    setUpdating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Call RPC function to update stage
      const { error } = await supabase.rpc('update_referral_conversion_stage', {
        p_referral_id: referralId,
        p_new_stage: selectedStage,
        p_performed_by: user.id,
        p_notes: notes,
        p_metadata: {
          estimated_value: estimatedValue,
          meeting_date: meetingDate || null,
        },
      });

      if (error) throw error;

      // Update local referral object
      await loadReferral();
      await loadActivities();

      // Clear form
      setNotes('');
      setMeetingDate('');

      if (onClose) onClose();
    } catch (error: any) {
      console.error('Error updating conversion stage:', error);
      alert(`Failed to update stage: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const getCurrentStageIndex = () => {
    return CONVERSION_STAGES.findIndex((s) => s.key === referral?.conversion_stage);
  };

  const getStageIcon = (stageKey: string) => {
    const stage = CONVERSION_STAGES.find((s) => s.key === stageKey);
    return stage ? stage.icon : Users;
  };

  const getStageColor = (stageKey: string) => {
    const stage = CONVERSION_STAGES.find((s) => s.key === stageKey);
    return stage ? stage.color : '#94a3b8';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.loading}>Loading referral details...</div>
        </div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.error}>Referral not found</div>
        </div>
      </div>
    );
  }

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Lead Conversion Pipeline</h2>
            <p className={styles.subtitle}>
              {referral.profile?.full_name} • Referred by {referral.referrer?.full_name}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className={styles.closeButton}>
              ✕
            </button>
          )}
        </div>

        {/* Stage Progress */}
        <div className={styles.stageProgress}>
          {CONVERSION_STAGES.filter((s) => s.key !== 'lost').map((stage, index) => {
            const StageIcon = stage.icon;
            const isActive = index <= currentStageIndex;
            const isCurrent = stage.key === referral.conversion_stage;

            return (
              <div key={stage.key} className={styles.stageItem}>
                <div
                  className={`${styles.stageIcon} ${isActive ? styles.active : ''} ${
                    isCurrent ? styles.current : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? `${stage.color}20` : '#f1f5f9',
                    color: isActive ? stage.color : '#94a3b8',
                    borderColor: isActive ? stage.color : '#e2e8f0',
                  }}
                >
                  <StageIcon size={20} />
                </div>
                <div className={styles.stageLabel}>{stage.label}</div>
                {index < CONVERSION_STAGES.length - 2 && (
                  <div
                    className={styles.stageLine}
                    style={{
                      backgroundColor: isActive ? stage.color : '#e2e8f0',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Lead Details */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Lead Information</h3>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Email:</span>
              <span className={styles.detailValue}>{referral.profile?.email}</span>
            </div>
            {referral.profile?.phone && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Phone:</span>
                <span className={styles.detailValue}>{referral.profile.phone}</span>
              </div>
            )}
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Referred:</span>
              <span className={styles.detailValue}>{formatDate(referral.created_at)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Estimated Value:</span>
              <span className={styles.detailValue}>
                {referral.estimated_value ? formatCurrency(referral.estimated_value) : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Update Stage */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Update Conversion Stage</h3>

          <div className={styles.formRow}>
            <label className={styles.label}>Next Stage</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className={styles.select}
            >
              {CONVERSION_STAGES.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Estimated Deal Value (£)</label>
            <input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(parseFloat(e.target.value) || 0)}
              className={styles.input}
              placeholder="0.00"
            />
          </div>

          {selectedStage === 'meeting' && (
            <div className={styles.formRow}>
              <label className={styles.label}>Meeting Date</label>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.formRow}>
            <label className={styles.label}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
              rows={4}
              placeholder="Add notes about this stage update..."
            />
          </div>

          <button
            onClick={handleUpdateStage}
            disabled={updating}
            className={styles.updateButton}
          >
            {updating ? (
              'Updating...'
            ) : (
              <>
                <ArrowRight size={20} />
                Update Stage
              </>
            )}
          </button>
        </div>

        {/* Activity Timeline */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity Timeline</h3>

          {activities.length > 0 ? (
            <div className={styles.timeline}>
              {activities.map((activity) => {
                const Icon = getStageIcon(activity.activity_type);
                const color = getStageColor(activity.activity_type);

                return (
                  <div key={activity.id} className={styles.timelineItem}>
                    <div
                      className={styles.timelineIcon}
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.timelineTitle}>
                          {CONVERSION_STAGES.find((s) => s.key === activity.activity_type)?.label ||
                            activity.activity_type}
                        </span>
                        <span className={styles.timelineDate}>
                          {formatDate(activity.activity_date)}
                        </span>
                      </div>
                      {activity.notes && (
                        <div className={styles.timelineNotes}>{activity.notes}</div>
                      )}
                      {activity.metadata?.estimated_value && (
                        <div className={styles.timelineMeta}>
                          <DollarSign size={14} />
                          {formatCurrency(activity.metadata.estimated_value)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyTimeline}>
              <Clock size={48} />
              <p>No activity recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
