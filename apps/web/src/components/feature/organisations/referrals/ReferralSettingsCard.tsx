/**
 * Filename: ReferralSettingsCard.tsx
 * Purpose: Organisation referral program configuration
 * Created: 2025-12-31
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { SkeletonLine, SkeletonRect } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './ReferralSettingsCard.module.css';

interface ReferralConfig {
  id?: string;
  organisation_id: string;
  enabled: boolean;
  referral_commission_percentage: number;
  organisation_split_percentage: number;
  member_split_percentage: number;
  minimum_booking_value: number;
  require_payment_completion: boolean;
  payout_threshold: number;
}

interface ReferralSettingsCardProps {
  organisationId: string;
  isOwner: boolean;
}

export function ReferralSettingsCard({ organisationId, isOwner }: ReferralSettingsCardProps) {
  const supabase = createClient();

  const [config, setConfig] = useState<ReferralConfig>({
    organisation_id: organisationId,
    enabled: false,
    referral_commission_percentage: 10,
    organisation_split_percentage: 50,
    member_split_percentage: 50,
    minimum_booking_value: 0,
    require_payment_completion: true,
    payout_threshold: 50,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing config
  useEffect(() => {
    loadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('organisation_referral_config')
        .select('*')
        .eq('organisation_id', organisationId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading referral config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isOwner) return;

    setSaving(true);

    try {
      // Validate splits total 100%
      if (config.organisation_split_percentage + config.member_split_percentage !== 100) {
        toast.error('Organisation and member splits must total 100%');
        return;
      }

      const { error } = await supabase
        .from('organisation_referral_config')
        .upsert({
          ...config,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organisation_id'
        });

      if (error) throw error;

      toast.success('Referral settings saved successfully!');

      // Reload config
      await loadConfig();
    } catch (error: any) {
      console.error('Error saving referral config:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof ReferralConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSplitChange = (field: 'organisation_split_percentage' | 'member_split_percentage', value: number) => {
    const otherField = field === 'organisation_split_percentage'
      ? 'member_split_percentage'
      : 'organisation_split_percentage';

    const otherValue = 100 - value;

    setConfig(prev => ({
      ...prev,
      [field]: value,
      [otherField]: otherValue,
    }));
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div style={{ width: '200px', height: '24px' }}><SkeletonLine /></div>
          <div style={{ width: '300px', height: '16px', marginTop: '8px' }}><SkeletonLine /></div>
        </div>
        <div className={styles.form}>
          <div className={styles.formRow}>
            <div style={{ width: '150px', height: '20px' }}><SkeletonLine /></div>
            <div style={{ width: '100%', height: '40px', marginTop: '8px' }}><SkeletonRect /></div>
          </div>
          <div className={styles.formRow}>
            <div style={{ width: '180px', height: '20px' }}><SkeletonLine /></div>
            <div style={{ width: '100%', height: '40px', marginTop: '8px' }}><SkeletonRect /></div>
          </div>
          <div className={styles.formRow}>
            <div style={{ width: '160px', height: '20px' }}><SkeletonLine /></div>
            <div style={{ width: '100%', height: '40px', marginTop: '8px' }}><SkeletonRect /></div>
          </div>
          <div className={styles.formRow}>
            <div style={{ width: '140px', height: '20px' }}><SkeletonLine /></div>
            <div style={{ width: '100%', height: '40px', marginTop: '8px' }}><SkeletonRect /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className={styles.card}>
        <div className={styles.noAccess}>
          <AlertCircle size={48} />
          <p>Only organisation owners can configure referral settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Team Referral Program</h2>
        <p className={styles.subtitle}>
          Enable your team to earn commissions by referring new clients
        </p>
      </div>

      <div className={styles.form}>
        {/* Enable Program */}
        <div className={styles.formRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => updateConfig('enabled', e.target.checked)}
              className={styles.toggle}
            />
            <span className={styles.toggleText}>
              {config.enabled ? 'Program Enabled' : 'Program Disabled'}
            </span>
          </label>
          <p className={styles.help}>
            When enabled, team members can earn commissions from referrals
          </p>
        </div>

        {/* Commission Percentage */}
        <div className={styles.formRow}>
          <label className={styles.label}>
            Total Referral Commission
            <span className={styles.value}>{config.referral_commission_percentage}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={config.referral_commission_percentage}
            onChange={(e) => updateConfig('referral_commission_percentage', parseFloat(e.target.value))}
            className={styles.slider}
          />
          <p className={styles.help}>
            Percentage of booking value paid as total referral commission
          </p>
        </div>

        {/* Commission Split */}
        <div className={styles.splitSection}>
          <h3 className={styles.sectionTitle}>Commission Split</h3>

          <div className={styles.formRow}>
            <label className={styles.label}>
              Organisation Share
              <span className={styles.value}>{config.organisation_split_percentage}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={config.organisation_split_percentage}
              onChange={(e) => handleSplitChange('organisation_split_percentage', parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>
              Team Member Share
              <span className={styles.value}>{config.member_split_percentage}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={config.member_split_percentage}
              onChange={(e) => handleSplitChange('member_split_percentage', parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.splitPreview}>
            <div className={styles.splitBar}>
              <div
                className={styles.orgSplit}
                style={{ width: `${config.organisation_split_percentage}%` }}
              >
                {config.organisation_split_percentage}%
              </div>
              <div
                className={styles.memberSplit}
                style={{ width: `${config.member_split_percentage}%` }}
              >
                {config.member_split_percentage}%
              </div>
            </div>
            <p className={styles.help}>
              Example: £100 booking = £{config.referral_commission_percentage} commission
              (£{(config.referral_commission_percentage * config.organisation_split_percentage / 100).toFixed(2)} org,
              £{(config.referral_commission_percentage * config.member_split_percentage / 100).toFixed(2)} member)
            </p>
          </div>
        </div>

        {/* Activation Rules */}
        <div className={styles.formRow}>
          <label className={styles.label}>
            Minimum Booking Value (£)
          </label>
          <input
            type="number"
            min="0"
            step="10"
            value={config.minimum_booking_value}
            onChange={(e) => updateConfig('minimum_booking_value', parseFloat(e.target.value) || 0)}
            className={styles.input}
          />
          <p className={styles.help}>
            Minimum booking amount to qualify for commission
          </p>
        </div>

        <div className={styles.formRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={config.require_payment_completion}
              onChange={(e) => updateConfig('require_payment_completion', e.target.checked)}
              className={styles.toggle}
            />
            <span className={styles.toggleText}>
              Require Payment Completion
            </span>
          </label>
          <p className={styles.help}>
            Only award commission after payment is received
          </p>
        </div>

        {/* Payout Settings */}
        <div className={styles.formRow}>
          <label className={styles.label}>
            Payout Threshold (£)
          </label>
          <input
            type="number"
            min="0"
            step="10"
            value={config.payout_threshold}
            onChange={(e) => updateConfig('payout_threshold', parseFloat(e.target.value) || 0)}
            className={styles.input}
          />
          <p className={styles.help}>
            Minimum amount before member can request payout
          </p>
        </div>

        {/* Save Button */}
        <div className={styles.actions}>
          <button
            onClick={handleSave}
            disabled={saving}
            className={styles.saveButton}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
