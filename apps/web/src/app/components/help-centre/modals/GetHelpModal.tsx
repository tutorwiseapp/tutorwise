/**
 * Filename: apps/web/src/app/components/help-centre/modals/GetHelpModal.tsx
 * Purpose: Get Help modal for general support requests (non-bug issues)
 * Created: 2026-01-18
 * Integration: Creates Jira SUPPORT tickets via API
 */

'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import styles from './GetHelpModal.module.css';

type SupportCategory =
  | 'account'
  | 'billing'
  | 'bookings'
  | 'technical'
  | 'features'
  | 'other';

interface GetHelpData {
  firstName: string;
  lastName: string;
  category: SupportCategory;
  summary: string;
  details: string;
  isUrgent: boolean;
}

interface GetHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext?: {
    url: string;
    title: string;
    userRole?: string;
  };
}

const SUPPORT_CATEGORIES = [
  { value: 'account' as const, label: 'Account & Profile Settings' },
  { value: 'billing' as const, label: 'Billing & Payments' },
  { value: 'bookings' as const, label: 'Bookings & Scheduling' },
  { value: 'technical' as const, label: 'Technical Issue' },
  { value: 'features' as const, label: 'How to Use a Feature' },
  { value: 'other' as const, label: 'Something Else' },
];

export default function GetHelpModal({ isOpen, onClose, pageContext }: GetHelpModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [category, setCategory] = useState<SupportCategory>('account');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !summary.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to API endpoint (creates Jira SUPPORT ticket)
      const response = await fetch('/api/help-centre/support/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          category,
          summary: summary.trim(),
          details: details.trim() || undefined,
          isUrgent,
          pageContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit support request');
      }

      const result = await response.json();
      console.log('Support request submitted successfully:', result);

      // Show success message
      alert(`Thank you! We've received your request and will respond within 24 hours.\n\nTicket Reference: ${result.ticketId || 'N/A'}`);

      // Close modal on success
      onClose();

      // Reset form
      setFirstName('');
      setLastName('');
      setCategory('account');
      setSummary('');
      setDetails('');
      setIsUrgent(false);
    } catch (error) {
      console.error('Failed to submit support request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit request. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [firstName, lastName, category, summary, details, isUrgent, pageContext, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Get Help</h2>
          <p className={styles.modalSubtitle}>Can&apos;t find what you need in our articles?</p>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {/* First Name | Last Name (Two columns) */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName" className={styles.label}>
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName" className={styles.label}>
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className={styles.input}
                required
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              I need help with...
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportCategory)}
              className={styles.select}
              required
            >
              {SUPPORT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div className={styles.formGroup}>
            <label htmlFor="summary" className={styles.label}>
              My question in one sentence
            </label>
            <input
              id="summary"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. How do I change my email address?"
              className={styles.input}
              required
            />
          </div>

          {/* Details */}
          <div className={styles.formGroup}>
            <label htmlFor="details" className={styles.label}>
              More details <span className={styles.optionalLabel}>(optional but helpful)</span>
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What have you already tried? Any error messages?"
              className={styles.textarea}
              rows={4}
            />
          </div>

          {/* Urgent Checkbox */}
          <div className={styles.urgentSection}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className={styles.checkbox}
              />
              <span>This is urgent (we&apos;ll prioritize your request)</span>
            </label>
          </div>

          {/* Form actions */}
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !summary.trim()}
            >
              {isSubmitting ? 'Sending Request...' : 'Get Help'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
