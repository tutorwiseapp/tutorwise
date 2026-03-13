/**
 * Filename: apps/web/src/app/components/feature/students/StudentProfileCard.tsx
 * Purpose: Student profile card for sidebar (Guardian Link v5.0)
 * Created: 2026-02-08
 */

import React from 'react';
import Image from 'next/image';
import getProfileImageUrl from '@/lib/utils/image';
import { calculateAge } from '@/lib/utils/dateUtils';
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
  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        <Image
          src={getProfileImageUrl({ id: studentName, avatar_url: avatarUrl, full_name: studentName })}
          alt={studentName}
          width={64}
          height={64}
          className={styles.avatarImage}
        />
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
