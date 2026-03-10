/*
 * Filename: TutorVerificationCard.tsx
 * Purpose: Displays tutor verification status (email, phone, ID, DBS)
 */

'use client';

import { Mail, Smartphone, CreditCard, ShieldCheck, Check } from 'lucide-react';
import Card from '@/app/components/ui/data-display/Card';
import styles from './TutorVerificationCard.module.css';

interface TutorVerificationCardProps {
  profile: any;
}

export default function TutorVerificationCard({ profile }: TutorVerificationCardProps) {
  const verifications = [
    {
      label: 'Email',
      verified: profile.email_confirmed || false,
      icon: <Mail size={16} />,
    },
    {
      label: 'Phone',
      verified: profile.phone_verified || false,
      icon: <Smartphone size={16} />,
    },
    {
      label: 'ID Verified',
      verified: profile.id_verified || false,
      icon: <CreditCard size={16} />,
    },
    {
      label: 'DBS Check',
      verified: profile.dbs_status === 'approved',
      icon: <ShieldCheck size={16} />,
    },
  ];

  return (
    <Card className={styles.card}>
      <h4 className={styles.title}>Tutor Verification</h4>
      <div className={styles.verificationGrid}>
        {verifications.map((item, idx) => (
          <div key={idx} className={styles.verificationItem}>
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
            {item.verified ? (
              <Check size={13} className={styles.checkmark} />
            ) : (
              <span className={styles.notVerified}>—</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
