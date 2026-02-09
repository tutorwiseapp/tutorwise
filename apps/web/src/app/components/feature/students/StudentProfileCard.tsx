/**
 * Filename: apps/web/src/app/components/feature/students/StudentProfileCard.tsx
 * Purpose: Student profile card for sidebar (Guardian Link v5.0)
 * Created: 2026-02-08
 */

import React from 'react';
import styles from './StudentProfileCard.module.css';

interface StudentProfileCardProps {
  studentName: string;
  studentEmail: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  linkedSince: string;
}

export default function StudentProfileCard({
  studentName,
  studentEmail,
  avatarUrl,
  dateOfBirth,
  linkedSince,
}: StudentProfileCardProps) {
  const calculateAge = (dob: string): number => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={studentName} className={styles.avatarImage} />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {studentName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{studentName}</h3>
        <p className={styles.email}>{studentEmail}</p>
        {dateOfBirth && (
          <p className={styles.age}>Age: {calculateAge(dateOfBirth)} years old</p>
        )}
        <p className={styles.linked}>
          Linked since {new Date(linkedSince).toLocaleDateString('en-GB', {
            month: 'short',
            year: 'numeric'
          })}
        </p>
      </div>

      <div className={styles.badge}>
        <span className={styles.badgeText}>Student</span>
      </div>
    </div>
  );
}
