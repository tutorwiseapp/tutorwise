/*
 * Filename: ReferAndEarnView.tsx
 * Purpose: Main content view for "Refer & Earn" tab - displays referral assets in 3-column grid
 * Created: 2025-12-03
 * Specification: Referrals Hub refactor - move assets from sidebar to main content
 */

'use client';

import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import Button from '@/app/components/ui/actions/Button';
import styles from './ReferAndEarnView.module.css';

interface ReferAndEarnViewProps {
  referralCode: string;
}

export default function ReferAndEarnView({ referralCode }: ReferAndEarnViewProps) {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [showCopiedOverlay, setShowCopiedOverlay] = useState<string | null>(null);

  // Generate referral URL
  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/a/${referralCode}`
    : `https://tutorwise.io/a/${referralCode}`;

  // Generate shortened URL for display
  const shortUrl = `tutorwise.io/a/${referralCode}`;

  // Generate embed code
  const embedCode = `<a href="${referralUrl}" target="_blank" rel="noopener noreferrer">Join Tutorwise</a>`;

  // Copy text to clipboard with visual feedback
  const copyToClipboard = async (text: string, label: string, cardId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);

      // Show copied overlay
      setShowCopiedOverlay(cardId);

      // Reset after 1.5 seconds
      setTimeout(() => {
        setShowCopiedOverlay(null);
      }, 1500);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy. Please try again.');
    }
  };

  // Copy QR code as data URL to clipboard
  const copyQRCode = async () => {
    try {
      const canvas = document.getElementById('referral-qr-canvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('QR code canvas not found');
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Failed to generate QR code image');
        }

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);

        toast.success('QR code copied to clipboard!');

        // Show copied overlay
        setShowCopiedOverlay('qr-card');

        // Reset after 1.5 seconds
        setTimeout(() => {
          setShowCopiedOverlay(null);
        }, 1500);
      });
    } catch (error) {
      console.error('Failed to copy QR code:', error);
      // Fallback: copy the URL instead
      copyToClipboard(referralUrl, 'Referral link', 'qr-card');
    }
  };

  return (
    <div className={styles.container}>
      {/* Referral Code Display */}
      <div className={styles.codeDisplay}>
        <span className={styles.codeLabel}>Your Referral Code</span>
        <div className={styles.codeBox}>
          <span className={styles.code}>{referralCode}</span>
        </div>
      </div>

      {/* 3-Column Grid for Assets */}
      <div className={styles.grid}>
        {/* Column 1: Referral Link */}
        <div
          className={styles.card}
          onClick={() => copyToClipboard(referralUrl, 'Referral link', 'link-card')}
        >
          {showCopiedOverlay === 'link-card' && (
            <div className={styles.copiedOverlay}>
              <span className={styles.checkmark}>✓</span> Copied!
            </div>
          )}
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Copy Referral Link</h3>
            <p className={styles.cardDescription}>
              Share this link to start earning commission
            </p>
          </div>
          <div className={styles.cardContent}>
            <input
              type="text"
              value={shortUrl}
              readOnly
              className={styles.input}
              title={referralUrl}
            />
          </div>
        </div>

        {/* Column 2: QR Code */}
        <div
          className={styles.card}
          onClick={copyQRCode}
        >
          {showCopiedOverlay === 'qr-card' && (
            <div className={styles.copiedOverlay}>
              <span className={styles.checkmark}>✓</span> Copied!
            </div>
          )}
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Copy QR Code</h3>
            <p className={styles.cardDescription}>
              Share on social media or save for printing
            </p>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.qrContainer}>
              <QRCodeCanvas
                id="referral-qr-canvas"
                value={referralUrl}
                size={200}
                level="H"
                includeMargin={true}
                className={styles.qrCode}
              />
            </div>
          </div>
        </div>

        {/* Column 3: Embed Code */}
        <div
          className={styles.card}
          onClick={() => copyToClipboard(embedCode, 'Embed code', 'embed-card')}
        >
          {showCopiedOverlay === 'embed-card' && (
            <div className={styles.copiedOverlay}>
              <span className={styles.checkmark}>✓</span> Copied!
            </div>
          )}
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Copy Embed Code</h3>
            <p className={styles.cardDescription}>
              Add to your website, blog, or email signature
            </p>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.codeBlock}>
              <code className={styles.embedCode}>{embedCode}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <Button
          variant="secondary"
          size="md"
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join Tutorwise! ${referralUrl}`)}`, '_blank')}
        >
          Share on WhatsApp
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`, '_blank')}
        >
          Share on Facebook
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`, '_blank')}
        >
          Share on LinkedIn
        </Button>
      </div>
    </div>
  );
}
