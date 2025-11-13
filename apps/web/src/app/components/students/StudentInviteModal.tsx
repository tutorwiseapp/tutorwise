/**
 * Filename: apps/web/src/app/components/students/StudentInviteModal.tsx
 * Purpose: Modal for inviting students to create Guardian Link (SDD v5.0)
 * Created: 2025-11-12
 * Based on: ConnectionRequestModal.tsx (but simpler - no search, just email invite)
 */

'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { inviteStudent } from '@/lib/api/students';
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
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

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

    setIsLoading(true);
    try {
      const result = await inviteStudent(studentEmail, is13Plus);

      if (result.student_existed) {
        toast.success('Student linked successfully!');
      } else {
        toast.success('Invitation sent! The student will receive an email.');
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStudentEmail('');
    setIs13Plus(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={handleClose} />

      {/* Modal */}
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Student</h2>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.content}>
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
                disabled={isLoading}
                required
              />
            </div>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="age13Plus"
                checked={is13Plus}
                onChange={(e) => setIs13Plus(e.target.checked)}
                className={styles.checkbox}
                disabled={isLoading}
                required
              />
              <label htmlFor="age13Plus" className={styles.checkboxLabel}>
                I confirm this student is 13 years of age or older
              </label>
            </div>

            <div className={styles.infoBox}>
              <strong>Important:</strong>
              <ul className={styles.infoList}>
                <li>The student must be at least 13 years old</li>
                <li>They will create their own account with a password</li>
                <li>You will be able to view their learning progress</li>
                <li>You can assign bookings to them</li>
              </ul>
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || !is13Plus}
            >
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
