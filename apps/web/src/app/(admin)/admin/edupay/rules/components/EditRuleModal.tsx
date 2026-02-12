/**
 * Filename: EditRuleModal.tsx
 * Purpose: Admin modal for editing EduPay earning rules
 * Created: 2026-02-12
 * Pattern: Follows DeleteUserModal pattern with HubComplexModal
 */

'use client';

import React, { useState, useEffect } from 'react';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { AlertTriangle, Settings, Percent, Coins, Calendar } from 'lucide-react';
import styles from './EditRuleModal.module.css';

interface EduPayRule {
  id: string;
  event_type: string;
  description: string;
  ep_per_unit: number;
  unit_type: string;
  platform_fee_percent: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

interface EditRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: EduPayRule | null;
  onSuccess: () => void;
}

interface FormData {
  description: string;
  ep_per_unit: number;
  unit_type: string;
  platform_fee_percent: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
}

export default function EditRuleModal({
  isOpen,
  onClose,
  rule,
  onSuccess,
}: EditRuleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    description: '',
    ep_per_unit: 100,
    unit_type: 'pound',
    platform_fee_percent: 10,
    is_active: true,
    valid_from: '',
    valid_until: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when rule changes
  useEffect(() => {
    if (rule) {
      setFormData({
        description: rule.description || '',
        ep_per_unit: rule.ep_per_unit,
        unit_type: rule.unit_type,
        platform_fee_percent: rule.platform_fee_percent,
        is_active: rule.is_active,
        valid_from: rule.valid_from ? rule.valid_from.split('T')[0] : '',
        valid_until: rule.valid_until ? rule.valid_until.split('T')[0] : '',
      });
      setError('');
    }
  }, [rule]);

  // Handle close
  const handleClose = () => {
    setError('');
    onClose();
  };

  // Format event type for display
  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Validate form
  const validateForm = (): string | null => {
    if (formData.ep_per_unit < 1) {
      return 'EP per unit must be at least 1';
    }

    if (formData.ep_per_unit > 10000) {
      return 'EP per unit cannot exceed 10,000';
    }

    if (formData.platform_fee_percent < 0 || formData.platform_fee_percent > 100) {
      return 'Platform fee must be between 0% and 100%';
    }

    if (!formData.unit_type.trim()) {
      return 'Unit type is required';
    }

    if (!formData.valid_from) {
      return 'Valid from date is required';
    }

    if (formData.valid_until && formData.valid_until < formData.valid_from) {
      return 'Valid until date cannot be before valid from date';
    }

    return null;
  };

  // Handle save
  const handleSave = async () => {
    if (!rule) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/edupay/rules/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          description: formData.description.trim(),
          ep_per_unit: formData.ep_per_unit,
          unit_type: formData.unit_type.trim(),
          platform_fee_percent: formData.platform_fee_percent,
          is_active: formData.is_active,
          valid_from: formData.valid_from,
          valid_until: formData.valid_until || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update rule');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (!rule) return null;

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Earning Rule"
      subtitle={formatEventType(rule.event_type)}
      size="lg"
      isLoading={isSaving}
      loadingText="Saving changes..."
      footer={
        <div className={styles.footer}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        {/* Rule Info Section */}
        <div className={styles.ruleInfoSection}>
          <div className={styles.sectionHeader}>
            <Settings size={18} />
            <h3>Rule Configuration</h3>
          </div>
          <p className={styles.ruleEventType}>
            <strong>Event Type:</strong> {formatEventType(rule.event_type)}
          </p>
          <p className={styles.ruleNote}>
            The event type cannot be changed. Create a new rule if you need a different event type.
          </p>
        </div>

        {/* Form Fields */}
        <div className={styles.formSection}>
          {/* Description */}
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={styles.textarea}
              placeholder="Describe what this rule does"
              rows={2}
              disabled={isSaving}
            />
          </div>

          {/* EP per Unit & Unit Type Row */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="ep_per_unit" className={styles.label}>
                <Coins size={14} />
                EP per Unit <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                id="ep_per_unit"
                value={formData.ep_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, ep_per_unit: parseInt(e.target.value) || 0 }))}
                className={styles.input}
                min={1}
                max={10000}
                disabled={isSaving}
              />
              <span className={styles.helpText}>Standard rate: 100 EP = £1</span>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="unit_type" className={styles.label}>
                Unit Type <span className={styles.required}>*</span>
              </label>
              <select
                id="unit_type"
                value={formData.unit_type}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_type: e.target.value }))}
                className={styles.select}
                disabled={isSaving}
              >
                <option value="pound">Per Pound (£)</option>
                <option value="referral">Per Referral</option>
                <option value="booking">Per Booking</option>
                <option value="lesson">Per Lesson</option>
                <option value="signup">Per Signup</option>
                <option value="review">Per Review</option>
              </select>
            </div>
          </div>

          {/* Platform Fee */}
          <div className={styles.formGroup}>
            <label htmlFor="platform_fee_percent" className={styles.label}>
              <Percent size={14} />
              Platform Fee <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWithSuffix}>
              <input
                type="number"
                id="platform_fee_percent"
                value={formData.platform_fee_percent}
                onChange={(e) => setFormData(prev => ({ ...prev, platform_fee_percent: parseFloat(e.target.value) || 0 }))}
                className={styles.input}
                min={0}
                max={100}
                step={0.5}
                disabled={isSaving}
              />
              <span className={styles.inputSuffix}>%</span>
            </div>
            <span className={styles.helpText}>
              Tutorwise takes this % on conversions. Users receive the remaining {100 - formData.platform_fee_percent}%.
            </span>
          </div>

          {/* Date Range Row */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="valid_from" className={styles.label}>
                <Calendar size={14} />
                Valid From <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                id="valid_from"
                value={formData.valid_from}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                className={styles.input}
                disabled={isSaving}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="valid_until" className={styles.label}>
                <Calendar size={14} />
                Valid Until
              </label>
              <input
                type="date"
                id="valid_until"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className={styles.input}
                disabled={isSaving}
              />
              <span className={styles.helpText}>Leave empty for no expiry</span>
            </div>
          </div>

          {/* Active Status Toggle */}
          <div className={styles.toggleGroup}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className={styles.toggleInput}
                disabled={isSaving}
              />
              <span className={styles.toggleSwitch}></span>
              <span className={styles.toggleText}>
                {formData.is_active ? 'Rule is Active' : 'Rule is Inactive'}
              </span>
            </label>
            <span className={styles.toggleNote}>
              {formData.is_active
                ? 'This rule will be applied to new earnings.'
                : 'This rule will not be applied to new earnings.'}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Warning Notice */}
        <div className={styles.warningNotice}>
          <AlertTriangle size={16} />
          <span>
            Changes to earning rules affect all future EP earnings. Existing wallet balances are not affected.
          </span>
        </div>
      </div>
    </HubComplexModal>
  );
}
