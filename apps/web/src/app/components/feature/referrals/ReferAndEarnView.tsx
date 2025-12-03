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

        // Set copied state for visual feedback
        setCopiedStates(prev => ({ ...prev, 'qr-copy': true }));

        // Reset after 2 seconds
        setTimeout(() => {
          setCopiedStates(prev => ({ ...prev, 'qr-copy': false }));
        }, 2000);
      });
    } catch (error) {
      console.error('Failed to copy QR code:', error);
      // Fallback: copy the URL instead
      copyToClipboard(referralUrl, 'Referral link', 'qr-copy-fallback');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <h2 className={styles.title}>Refer & Earn 10% Commission</h2>
        <p className={styles.description}>
          Share your unique referral code and earn 10% commission on first bookings from new users
        </p>
      </div>

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
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Referral Link</h3>
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
              onClick={(e) => e.currentTarget.select()}
              title={referralUrl}
            />
            <Button
              variant="primary"
              size="md"
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
            </Button>
          </div>
        </div>

        {/* Column 2: QR Code */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>QR Code</h3>
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
            <Button
              variant="primary"
              size="md"
              onClick={copyQRCode}
              className={styles.copyButton}
            >
              {copiedStates['qr-copy'] ? (
                <>
                  <span className={styles.checkmark}>✓</span> Copied!
                </>
              ) : (
                'Copy QR Code'
              )}
            </Button>
          </div>
        </div>

        {/* Column 3: Embed Code */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Embed Code</h3>
            <p className={styles.cardDescription}>
              Add to your website, blog, or email signature
            </p>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.codeBlock}>
              <code className={styles.embedCode}>{embedCode}</code>
            </div>
            <Button
              variant="primary"
              size="md"
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
            </Button>
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
