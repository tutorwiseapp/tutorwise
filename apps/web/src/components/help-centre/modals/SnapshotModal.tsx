/**
 * Filename: apps/web/src/app/components/help-centre/modals/SnapshotModal.tsx
 * Purpose: Snapshot Modal for reporting technical issues with context capture
 * Created: 2025-01-21
 * Phase: 3 - Context-driven bug reporting
 */

'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import styles from './SnapshotModal.module.css';

type CaptureLevel = 'minimal' | 'standard' | 'diagnostic';

type ImpactLevel = 'blocking' | 'degraded' | 'minor';

interface _SnapshotData {
  action: string;
  issue: string;
  impact: ImpactLevel;
  captureLevel: CaptureLevel;
  includeScreenshot: boolean;
  includeNetwork: boolean;
  includeConsole: boolean;
  screenshot?: string;
}

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext?: {
    url: string;
    title: string;
    userRole?: string;
  };
}

export default function SnapshotModal({ isOpen, onClose, pageContext }: SnapshotModalProps) {
  const [action, setAction] = useState('');
  const [issue, setIssue] = useState('');
  const [impact, setImpact] = useState<ImpactLevel>('blocking');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [includeNetwork, setIncludeNetwork] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  // Determine capture level based on user selections
  const captureLevel: CaptureLevel = includeNetwork ? 'diagnostic' : includeScreenshot ? 'standard' : 'minimal';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!action.trim() || !issue.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to API endpoint
      const response = await fetch('/api/help-centre/support/snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action.trim(),
          issue: issue.trim(),
          impact,
          captureLevel,
          includeScreenshot,
          includeNetwork,
          screenshot: screenshot || undefined,
          pageContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit report');
      }

      const result = await response.json();
      console.log('Report submitted successfully:', result);

      // Show success message
      alert('Bug report submitted successfully! Our team will review it shortly.');

      // Close modal on success
      onClose();

      // Reset form
      setAction('');
      setIssue('');
      setImpact('blocking');
      setIncludeScreenshot(true);
      setIncludeNetwork(false);
      setScreenshot(null);
    } catch (error) {
      console.error('Failed to submit snapshot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit report. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [action, issue, impact, captureLevel, includeScreenshot, includeNetwork, screenshot, pageContext, onClose]);

  const handleCaptureScreenshot = useCallback(async () => {
    try {
      // Temporarily hide the modal to capture the page behind it
      const modalElement = document.querySelector('[class*="modalOverlay"]') as HTMLElement;
      const previousDisplay = modalElement?.style.display || '';

      if (modalElement) {
        modalElement.style.display = 'none';
      }

      // Wait a brief moment for the modal to hide
      await new Promise(resolve => setTimeout(resolve, 100));

      // Dynamically import html2canvas (client-side only)
      const html2canvas = (await import('html2canvas')).default;

      // Capture the document body (now without the modal)
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        logging: false,
        scale: 0.5, // Reduce quality for smaller file size
        ignoreElements: (element) => {
          // Skip any remaining modal elements
          return element.classList?.contains('modalOverlay') ||
                 element.classList?.contains('modalContent');
        },
      });

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png', 0.8);
      setScreenshot(dataUrl);

      // Restore the modal
      if (modalElement) {
        modalElement.style.display = previousDisplay;
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);

      // Ensure modal is restored even on error
      const modalElement = document.querySelector('[class*="modalOverlay"]') as HTMLElement;
      if (modalElement) {
        modalElement.style.display = '';
      }

      alert('Failed to capture screenshot. Please try again.');
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Report a Problem</h2>
          <p className={styles.modalSubtitle}>We&apos;ll capture what went wrong</p>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {/* What were you trying to do? */}
          <div className={styles.formGroup}>
            <label htmlFor="action" className={styles.label}>
              What were you trying to do?
            </label>
            <input
              id="action"
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. Confirm a booking"
              className={styles.input}
              required
            />
          </div>

          {/* What went wrong? */}
          <div className={styles.formGroup}>
            <label htmlFor="issue" className={styles.label}>
              What went wrong? (1 sentence)
            </label>
            <input
              id="issue"
              type="text"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="e.g. Payment failed after clicking confirm"
              className={styles.input}
              required
            />
          </div>

          {/* Impact level */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Impact</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="impact"
                  value="blocking"
                  checked={impact === 'blocking'}
                  onChange={(e) => setImpact(e.target.value as ImpactLevel)}
                  className={styles.radio}
                />
                <span>I can&apos;t continue</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="impact"
                  value="degraded"
                  checked={impact === 'degraded'}
                  onChange={(e) => setImpact(e.target.value as ImpactLevel)}
                  className={styles.radio}
                />
                <span>Something isn&apos;t working properly</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="impact"
                  value="minor"
                  checked={impact === 'minor'}
                  onChange={(e) => setImpact(e.target.value as ImpactLevel)}
                  className={styles.radio}
                />
                <span>Minor issue</span>
              </label>
            </div>
          </div>

          {/* Capture options */}
          <div className={styles.captureSection}>
            <div className={styles.captureSectionHeader}>
              <span className={styles.label}>We&apos;ll include:</span>
              <span className={styles.captureLevel}>
                ({captureLevel === 'minimal' ? 'Minimal' : captureLevel === 'standard' ? 'Standard' : 'Diagnostic'})
              </span>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className={styles.checkbox}
                />
                <span>Page you&apos;re on</span>
                <span className={styles.checkboxRequired}>(Required)</span>
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={includeScreenshot}
                  onChange={(e) => setIncludeScreenshot(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>Screenshot</span>
                <span className={styles.checkboxOptional}>(Optional)</span>
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={includeNetwork}
                  onChange={(e) => setIncludeNetwork(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>Network logs</span>
                <span className={styles.checkboxAdvanced}>(Advanced)</span>
              </label>
            </div>
          </div>

          {/* Screenshot preview */}
          {includeScreenshot && (
            <div className={styles.screenshotSection}>
              {!screenshot ? (
                <button
                  type="button"
                  onClick={handleCaptureScreenshot}
                  className={styles.captureButton}
                >
                  Capture Screenshot
                </button>
              ) : (
                <div className={styles.screenshotPreview}>
                  <p className={styles.screenshotLabel}>Screenshot preview:</p>
                  <div className={styles.screenshotThumbnail}>
                    <img src={screenshot} alt="Screenshot preview" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    className={styles.retakeButton}
                  >
                    Retake Screenshot
                  </button>
                </div>
              )}
            </div>
          )}

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
              disabled={isSubmitting || !action.trim() || !issue.trim()}
            >
              {isSubmitting ? 'Sending Report...' : 'Send Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
