/**
 * Filename: ReferralLinkSection.tsx
 * Purpose: Referral link display with copy and QR code functionality
 * Created: 2025-12-17
 * Pattern: Extracted from ReferralDashboardWidget
 */

'use client';

import React, { useState, memo } from 'react';
import { Share2, QrCode, Copy, Check } from 'lucide-react';
import styles from './ReferralLinkSection.module.css';

interface ReferralLinkSectionProps {
  referralCode: string;
  className?: string;
}

const ReferralLinkSection = memo(function ReferralLinkSection({
  referralCode,
  className = '',
}: ReferralLinkSectionProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Generate referral link
  const referralLink = `${window.location.origin}/a/${referralCode}`;

  // Copy referral link to clipboard
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`${styles.linkSection} ${className}`}>
      <h3 className={styles.sectionTitle}>
        <Share2 size={18} />
        Your Referral Link
      </h3>
      <div className={styles.linkBox}>
        <input
          type="text"
          value={referralLink}
          readOnly
          className={styles.linkInput}
          onClick={(e) => e.currentTarget.select()}
        />
        <button onClick={handleCopyLink} className={styles.copyButton}>
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={() => setShowQR(!showQR)} className={styles.qrButton}>
          <QrCode size={18} />
          QR Code
        </button>
      </div>

      {showQR && (
        <div className={styles.qrCodeContainer}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`}
            alt="Referral QR Code"
            className={styles.qrCode}
          />
          <p className={styles.qrLabel}>Scan to refer</p>
        </div>
      )}
    </div>
  );
});

export default ReferralLinkSection;
