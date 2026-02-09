/**
 * Filename: StudentInviteModal.tsx
 * Purpose: Modal for inviting students to create Guardian Link (Guardian Link v5.0)
 * Created: 2026-02-08
 * Pattern: Uses HubComplexModal for consistent design with other hub modals
 */

'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import styles from './StudentInviteModal.module.css';

interface StudentInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StudentInviteModal({
  isOpen,
  onClose,
  onSuccess,
}: StudentInviteModalProps) {
  const [studentEmail, setStudentEmail] = useState('');
  const [is13Plus, setIs13Plus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentEmail.trim()) {
      toast.error('Please enter student email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!is13Plus) {
      toast.error('You must confirm the student is 13 years or older');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/links/client-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_email: studentEmail,
          is_13_plus: is13Plus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          toast.error('Too many invitations sent. Please try again later.');
          return;
        }

        if (data.details?.message) {
          toast.error(data.details.message);
          return;
        }

        throw new Error(data.error || 'Failed to send invitation');
      }

      // Success cases
      if (data.student_existed) {
        toast.success('Student linked successfully!');
      } else {
        toast.success('Invitation sent! The student will receive an email.');
      }

      // Reset form and close modal
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('[invite-student] Error:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setStudentEmail('');
      setIs13Plus(false);
      onClose();
    }
  };

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Student"
      size="md"
      isLoading={isSubmitting}
      loadingText="Sending invitation..."
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !is13Plus || !studentEmail.trim()}
          >
            Send Invitation
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formContent}>
          <p className={styles.description}>
            Enter the email address of the student you want to add. They will receive an
            invitation to create their account and link it to yours.
          </p>

          <div className={styles.formGroup}>
            <label htmlFor="studentEmail" className={styles.label}>
              Student Email Address
            </label>
            <input
              type="email"
              id="studentEmail"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student@example.com"
              className={styles.input}
              disabled={isSubmitting}
              required
              autoFocus
            />
          </div>

          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="age13Plus"
              checked={is13Plus}
              onChange={(e) => setIs13Plus(e.target.checked)}
              className={styles.checkbox}
              disabled={isSubmitting}
              required
            />
            <label htmlFor="age13Plus" className={styles.checkboxLabel}>
              I confirm this student is 13 years of age or older
            </label>
          </div>

          <div className={styles.infoBox}>
            <div className={styles.infoIcon}>ℹ️</div>
            <div className={styles.infoContent}>
              <strong>Important Information:</strong>
              <ul className={styles.infoList}>
                <li>The student must be at least 13 years old</li>
                <li>They will create their own account with a password</li>
                <li>You will be able to view their learning progress</li>
                <li>You can book sessions on their behalf</li>
                <li>Maximum of 50 students per guardian</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </HubComplexModal>
  );
}
