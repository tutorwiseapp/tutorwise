/**
 * Filename: apps/web/src/app/components/students/StudentCard.tsx
 * Purpose: Display individual student (Guardian Link) with actions (SDD v5.0)
 * Created: 2025-11-12
 * Based on: ConnectionCard.tsx (v4.4)
 */

'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from './StudentCard.module.css';

export interface StudentCardData {
  id: string; // profile_graph.id
  guardian_id: string;
  student_id: string;
  status: 'active';
  created_at: string;
  student?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    date_of_birth?: string;
  };
}

interface StudentCardProps {
  student: StudentCardData;
  currentUserId: string;
  onRemove?: (linkId: string) => Promise<void>;
  onViewProgress?: (studentId: string) => void;
}

export default function StudentCard({
  student,
  currentUserId,
  onRemove,
  onViewProgress,
}: StudentCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const studentProfile = student.student;

  if (!studentProfile) {
    return null;
  }

  // Calculate age from date_of_birth if available
  const getAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = getAge(studentProfile.date_of_birth);

  const handleRemove = async () => {
    if (!onRemove) return;
    const confirmed = window.confirm(
      `Are you sure you want to remove ${studentProfile.full_name} from your students? This will not delete their account, only unlink them from yours.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await onRemove(student.id);
      toast.success('Student removed');
    } catch (error) {
      toast.error('Failed to remove student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProgress = () => {
    if (!onViewProgress) return;
    onViewProgress(studentProfile.id);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {/* Avatar */}
        <Link
          href={`/public-profile/${studentProfile.id}/${studentProfile.full_name?.toLowerCase().replace(/\s+/g, '-') || 'profile'}`}
          className={styles.avatarLink}
        >
          <div className={styles.avatarWrapper}>
            {studentProfile.avatar_url ? (
              <Image
                src={studentProfile.avatar_url}
                alt={studentProfile.full_name}
                width={64}
                height={64}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {studentProfile.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* Profile Info */}
        <div className={styles.info}>
          <Link
            href={`/public-profile/${studentProfile.id}/${studentProfile.full_name?.toLowerCase().replace(/\s+/g, '-') || 'profile'}`}
            className={styles.nameLink}
          >
            <h3 className={styles.name}>{studentProfile.full_name}</h3>
          </Link>
          <p className={styles.email}>{studentProfile.email}</p>
          {age && (
            <p className={styles.age}>Age: {age} years</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={handleViewProgress}
          className={`${styles.button} ${styles.buttonPrimary}`}
          title="View learning progress"
        >
          View Progress
        </button>
        <button
          onClick={handleRemove}
          disabled={isLoading}
          className={`${styles.button} ${styles.buttonDanger}`}
        >
          {isLoading ? 'Removing...' : 'Remove'}
        </button>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.timestamp}>
          Linked {new Date(student.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}
