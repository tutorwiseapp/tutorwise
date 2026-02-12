/**
 * Filename: AddRuleModal.tsx
 * Purpose: Admin modal for creating new EduPay earning rules
 * Created: 2026-02-12
 * Pattern: Follows EditRuleModal pattern with HubComplexModal
 */

'use client';

import React, { useState, useEffect } from 'react';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { AlertTriangle, Plus, Percent, Coins, Calendar, Tag } from 'lucide-react';
import styles from './AddRuleModal.module.css';

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingEventTypes: string[];
}

interface FormData {
  event_type: string;
  description: string;
  ep_per_unit: number;
  unit_type: string;
  platform_fee_percent: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
}

// Predefined event types for selection
const EVENT_TYPE_OPTIONS = [
  { value: 'tutoring_income', label: 'Tutoring Income', description: 'EP earned from tutoring session payments' },
  { value: 'referral_tutor', label: 'Referral (Tutor)', description: 'EP for referring a new tutor' },
  { value: 'referral_client', label: 'Referral (Client)', description: 'EP for referring a new client' },
  { value: 'cashback_affiliate', label: 'Cashback (Affiliate)', description: 'EP from affiliate cashback programs' },
  { value: 'signup_bonus', label: 'Signup Bonus', description: 'One-time EP bonus for new users' },
  { value: 'first_booking', label: 'First Booking', description: 'EP bonus for completing first booking' },
  { value: 'review_given', label: 'Review Given', description: 'EP for leaving a review' },
  { value: 'profile_complete', label: 'Profile Complete', description: 'EP for completing profile setup' },
  { value: 'verification_complete', label: 'Verification Complete', description: 'EP for completing verification' },
  { value: 'custom', label: 'Custom Event Type', description: 'Define a custom event type' },
];

export default function AddRuleModal({
  isOpen,
  onClose,
  onSuccess,
  existingEventTypes,
}: AddRuleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    event_type: '',
    description: '',
    ep_per_unit: 100,
    unit_type: 'pound',
    platform_fee_percent: 10,
    is_active: true,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
  });
  const [customEventType, setCustomEventType] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        event_type: '',
        description: '',
        ep_per_unit: 100,
        unit_type: 'pound',
        platform_fee_percent: 10,
        is_active: true,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
      });
      setCustomEventType('');
      setError('');
    }
  }, [isOpen]);

  // Handle close
  const handleClose = () => {
    setError('');
    onClose();
  };

  // Get available event types (exclude already existing ones)
  const availableEventTypes = EVENT_TYPE_OPTIONS.filter(
    option => option.value === 'custom' || !existingEventTypes.includes(option.value)
  );

  // Handle event type selection
  const handleEventTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, event_type: value }));

    // Auto-fill description based on selection
    const selectedOption = EVENT_TYPE_OPTIONS.find(opt => opt.value === value);
    if (selectedOption && value !== 'custom') {
      setFormData(prev => ({ ...prev, description: selectedOption.description }));
    }
  };

  // Validate form
  const validateForm = (): string | null => {
    const finalEventType = formData.event_type === 'custom' ? customEventType : formData.event_type;

    if (!finalEventType.trim()) {
      return 'Event type is required';
    }

    if (formData.event_type === 'custom' && !/^[a-z][a-z0-9_]*$/.test(customEventType)) {
      return 'Custom event type must be lowercase with underscores only (e.g., my_custom_event)';
    }

    if (existingEventTypes.includes(finalEventType)) {
      return 'A rule with this event type already exists';
    }

    if (formData.ep_per_unit < 1 || formData.ep_per_unit > 10000) {
      return 'EP per unit must be between 1 and 10,000';
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
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError('');

    const finalEventType = formData.event_type === 'custom' ? customEventType : formData.event_type;

    try {
      const response = await fetch('/api/admin/edupay/rules/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: finalEventType.trim(),
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
        throw new Error(errorData.error || 'Failed to create rule');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Earning Rule"
      subtitle="Create a new EduPay earning rule"
      size="lg"
      isLoading={isSaving}
      loadingText="Creating rule..."
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
            <Plus size={16} />
            Create Rule
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        {/* Form Fields */}
        <div className={styles.formSection}>
          {/* Event Type Selection */}
          <div className={styles.formGroup}>
            <label htmlFor="event_type" className={styles.label}>
              <Tag size={14} />
              Event Type <span className={styles.required}>*</span>
            </label>
            <select
              id="event_type"
              value={formData.event_type}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className={styles.select}
              disabled={isSaving}
            >
              <option value="">Select an event type...</option>
              {availableEventTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {formData.event_type && formData.event_type !== 'custom' && (
              <span className={styles.helpText}>
                {EVENT_TYPE_OPTIONS.find(opt => opt.value === formData.event_type)?.description}
              </span>
            )}
          </div>

          {/* Custom Event Type Input */}
          {formData.event_type === 'custom' && (
            <div className={styles.formGroup}>
              <label htmlFor="custom_event_type" className={styles.label}>
                Custom Event Type <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="custom_event_type"
                value={customEventType}
                onChange={(e) => setCustomEventType(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className={styles.input}
                placeholder="my_custom_event"
                disabled={isSaving}
              />
              <span className={styles.helpText}>
                Use lowercase letters, numbers, and underscores only (e.g., bonus_milestone)
              </span>
            </div>
          )}

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
                <option value="action">Per Action</option>
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
                {formData.is_active ? 'Rule will be Active' : 'Rule will be Inactive'}
              </span>
            </label>
            <span className={styles.toggleNote}>
              {formData.is_active
                ? 'This rule will be applied to new earnings immediately.'
                : 'This rule will be saved but not applied until activated.'}
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

        {/* Info Notice */}
        <div className={styles.infoNotice}>
          <AlertTriangle size={16} />
          <span>
            New earning rules will apply to future EP earnings only. Users with existing EP balances will not be affected.
          </span>
        </div>
      </div>
    </HubComplexModal>
  );
}
