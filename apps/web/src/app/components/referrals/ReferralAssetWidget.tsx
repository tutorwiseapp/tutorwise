/*
 * Filename: apps/web/src/app/components/referrals/ReferralAssetWidget.tsx
 * Purpose: Tutorwise-style referral asset widget (SDD v4.3, Section 2.2)
 * Created: 2025-11-06
 * Specification: SDD v4.3, Section 2.2 - Tutorwise-style UI
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
import SidebarComplexWidget from '../layout/sidebars/components/SidebarComplexWidget';
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
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Generate referral URL
  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/a/${referralCode}`
    : `https://tutorwise.io/a/${referralCode}`;

  // Generate shortened URL for display
  const shortUrl = `tutorwise.io/a/${referralCode}`;

  // Generate embed code
  const embedCode = `<a href="${referralUrl}" target="_blank" rel="noopener noreferrer">Join Tutorwise</a>`;

  // Copy text to clipboard with visual feedback
  const copyToClipboard = async (text: string, label: string, buttonId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);

      // Set copied state for visual feedback
      setCopiedStates(prev => ({ ...prev, [buttonId]: true }));

      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [buttonId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy. Please try again.');
    }
  };

  // Share via social media
  const shareVia = (platform: 'whatsapp' | 'facebook' | 'linkedin') => {
    const text = `Join Tutorwise and discover amazing tutors! Use my referral code: ${referralCode}`;
    const encodedUrl = encodeURIComponent(referralUrl);
    const encodedText = encodeURIComponent(text);

    const urls = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <SidebarComplexWidget className={variant === 'onboarding' ? styles.onboarding : ''}>
      {/* Title - Teal header bar */}
      <h3 className={styles.title}>Your Referral Assets</h3>

      {/* Description - Below header */}
      <p className={styles.description}>
        Share your unique code and earn 10% commission on first bookings
      </p>

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
          Link
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`${styles.tab} ${activeTab === 'qr' ? styles.tabActive : ''}`}
        >
          QR Code
        </button>
        <button
          onClick={() => setActiveTab('embed')}
          className={`${styles.tab} ${activeTab === 'embed' ? styles.tabActive : ''}`}
        >
          Embed
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.content}>
        {/* Link Tab */}
        {activeTab === 'link' && (
          <div className={styles.assetSection}>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={shortUrl}
                readOnly
                className={styles.input}
                onClick={(e) => e.currentTarget.select()}
                title={referralUrl}
              />
            </div>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => copyToClipboard(referralUrl, 'Referral link', 'link-copy')}
                className={styles.copyButton}
              >
                {copiedStates['link-copy'] ? (
                  <>
                    <span className={styles.checkmark}>✓</span> Copied!
                  </>
                ) : (
                  'Copy Link'
                )}
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className={styles.shareButtons}>
              <p className={styles.shareLabel}>Quick Share:</p>
              <div className={styles.shareButtonGroup}>
                <button
                  onClick={() => shareVia('whatsapp')}
                  className={styles.shareButton}
                  aria-label="Share via WhatsApp"
                >
                  <svg viewBox="0 0 24 24" className={styles.shareIcon}>
                    <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </button>
                <button
                  onClick={() => shareVia('facebook')}
                  className={styles.shareButton}
                  aria-label="Share via Facebook"
                >
                  <svg viewBox="0 0 24 24" className={styles.shareIcon}>
                    <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button
                  onClick={() => shareVia('linkedin')}
                  className={styles.shareButton}
                  aria-label="Share via LinkedIn"
                >
                  <svg viewBox="0 0 24 24" className={styles.shareIcon}>
                    <path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </button>
              </div>
            </div>

            <p className={styles.hint}>
              Share this link to start earning 10% commission on bookings
            </p>
          </div>
        )}

        {/* QR Code Tab */}
        {activeTab === 'qr' && (
          <div className={styles.assetSection}>
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
                onClick={() => copyToClipboard(referralUrl, 'QR code link', 'qr-copy')}
                className={styles.copyButton}
              >
                {copiedStates['qr-copy'] ? (
                  <>
                    <span className={styles.checkmark}>✓</span> Copied!
                  </>
                ) : (
                  'Copy QR Link'
                )}
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
            <div className={styles.codeBlock}>
              <code className={styles.embedCode}>{embedCode}</code>
            </div>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => copyToClipboard(embedCode, 'Embed code', 'embed-copy')}
                className={styles.copyButton}
              >
                {copiedStates['embed-copy'] ? (
                  <>
                    <span className={styles.checkmark}>✓</span> Copied!
                  </>
                ) : (
                  'Copy Embed Code'
                )}
              </button>
            </div>
            <p className={styles.hint}>
              Add this HTML snippet to your website, blog, or email signature
            </p>
          </div>
        )}
      </div>
    </SidebarComplexWidget>
  );
}
