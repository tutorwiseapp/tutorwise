/*
 * Filename: apps/web/src/app/components/referrals/ReferralAssetWidget.tsx
 * Purpose: Vinite-style referral asset widget (SDD v4.3, Section 2.2)
 * Created: 2025-11-06
 * Specification: SDD v4.3, Section 2.2 - Vinite-style UI
 *
 * This widget provides users with three core referral assets:
 * 1. Referral Link: tutorwise.com/a/[code] [Copy]
 * 2. Referral QR Code: [QR Image] [Download]
 * 3. Embed Snippet: <a href="...">...</a> [Copy]
 */

'use client';

import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import styles from './ReferralAssetWidget.module.css';

interface ReferralAssetWidgetProps {
  referralCode: string;
  variant?: 'onboarding' | 'dashboard'; // Different styling contexts
}

export default function ReferralAssetWidget({
  referralCode,
  variant = 'dashboard',
}: ReferralAssetWidgetProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'embed'>('link');

  // Generate referral URL
  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/a/${referralCode}`
    : `https://tutorwise.io/a/${referralCode}`;

  // Generate embed code
  const embedCode = `<a href="${referralUrl}" target="_blank" rel="noopener noreferrer">Join Tutorwise</a>`;

  // Copy text to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy. Please try again.');
    }
  };

  return (
    <div className={`${styles.widget} ${variant === 'onboarding' ? styles.onboarding : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Your Referral Assets</h3>
        <p className={styles.subtitle}>
          Share your unique code and earn 10% commission on first bookings
        </p>
      </div>

      {/* Referral Code Display */}
      <div className={styles.codeDisplay}>
        <span className={styles.codeLabel}>Your Referral Code</span>
        <div className={styles.codeBox}>
          <span className={styles.code}>{referralCode}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('link')}
          className={`${styles.tab} ${activeTab === 'link' ? styles.tabActive : ''}`}
        >
          🔗 Link
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`${styles.tab} ${activeTab === 'qr' ? styles.tabActive : ''}`}
        >
          📱 QR Code
        </button>
        <button
          onClick={() => setActiveTab('embed')}
          className={`${styles.tab} ${activeTab === 'embed' ? styles.tabActive : ''}`}
        >
          💻 Embed
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.content}>
        {/* Link Tab */}
        {activeTab === 'link' && (
          <div className={styles.assetSection}>
            <label className={styles.label}>Referral Link</label>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={referralUrl}
                readOnly
                className={styles.input}
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => copyToClipboard(referralUrl, 'Referral link')}
                className={styles.copyButton}
              >
                Copy Link
              </button>
            </div>
            <p className={styles.hint}>
              Share this link on social media, email, or messaging apps
            </p>
          </div>
        )}

        {/* QR Code Tab */}
        {activeTab === 'qr' && (
          <div className={styles.assetSection}>
            <label className={styles.label}>QR Code</label>
            <div className={styles.qrContainer}>
              <QRCodeCanvas
                id="referral-qr-code"
                value={referralUrl}
                size={200}
                level="H"
                includeMargin={true}
                className={styles.qrCode}
              />
            </div>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => copyToClipboard(referralUrl, 'QR code link')}
                className={styles.copyButton}
              >
                Copy QR Link
              </button>
            </div>
            <p className={styles.hint}>
              Share this QR code on social media or save it for printing
            </p>
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && (
          <div className={styles.assetSection}>
            <label className={styles.label}>Embed Code</label>
            <div className={styles.codeBlock}>
              <code className={styles.embedCode}>{embedCode}</code>
            </div>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => copyToClipboard(embedCode, 'Embed code')}
                className={styles.copyButton}
              >
                Copy Embed Code
              </button>
            </div>
            <p className={styles.hint}>
              Add this HTML snippet to your website, blog, or email signature
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
