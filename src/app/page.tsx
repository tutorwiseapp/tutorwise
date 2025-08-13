/*
 * Filename: src/app/page.tsx
 * Purpose: Provides the primary UI for generating new Vinite referral links.
 * Change History:
 * C005 - 2025-08-08 : 23:00 - Refactored to read agentId from URL as the source of truth.
 * C004 - 2025-08-08 : 22:00 - Added logic to handle incoming agent ID from "Refer Me" button.
 * C003 - 2025-08-07 : 18:00 - Corrected broken sign-up link for guest reward claims.
 * Last Modified: 2025-08-08 : 23:00
 * Requirement ID: VIN-D-01.3
 * Change Summary: This is the definitive fix for the "Refer Me" flow. The component now uses the `useSearchParams` hook to read the `agentId` from the URL as the highest source of truth. This is a more robust and secure pattern than client-side storage, fulfilling the requirement for a verifiable data flow.
 * Impact Analysis: This makes the "Refer Me" user journey fully functional and reliable.
 * Dependencies: "react", "next/link", "qrcode", "@clerk/nextjs", and VDL UI components.
 */
'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import styles from './page.module.css';
import { useUser, SignedOut } from '@clerk/nextjs';
import Container from '@/app/components/layout/Container';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';

const validateUrl = (url: string): { valid: boolean; message?: string } => {
  if (!url) return { valid: false, message: "⚠️ Please enter a destination URL." };
  try { new URL(url); if (!url.startsWith('http://') && !url.startsWith('https://')) { return { valid: false, message: "⚠️ URL must start with https:// or http://." }; } return { valid: true }; } catch { return { valid: false, message: "⚠️ URL format is incorrect. Check for typos." }; }
};

// Core component logic is moved into its own component
const HomePageClient = () => {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [destinationUrl, setDestinationUrl] = useState('');
  const [agentId, setAgentId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const isUrlValid = useMemo(() => { if (!destinationUrl) return null; return validateUrl(destinationUrl).valid; }, [destinationUrl]);

  useEffect(() => {
    // --- THIS IS THE DEFINITIVE FIX ---
    const agentIdFromUrl = searchParams.get('agentId');
    
    // Priority 1: Use the Agent ID from the URL if it exists.
    if (agentIdFromUrl) {
      setAgentId(agentIdFromUrl);
      return;
    }

    // Priority 2: Fallback to the logged-in user's Agent ID.
    if (user && user.publicMetadata.agent_id) {
      setAgentId(user.publicMetadata.agent_id as string);
      return;
    }

    // Priority 3: Fallback to a guest ID for new, anonymous users.
    let guestId = sessionStorage.getItem('vinite_guest_id');
    if (!guestId) {
      guestId = `T1-GU${Math.floor(100000 + Math.random() * 900000)}`;
      sessionStorage.setItem('vinite_guest_id', guestId);
    }
    setAgentId(guestId);
  }, [user, searchParams]);

  // ... (All other functions: handleGenerateLink, handleShare, etc. remain exactly the same)
  useEffect(() => {
    if (generatedLink) { QRCode.toDataURL(generatedLink, { width: 136, margin: 1 }).then(url => setQrCodeDataUrl(url)).catch(err => console.error('QR Code generation failed:', err)); }
    else { setQrCodeDataUrl(''); }
  }, [generatedLink]);

  useEffect(() => { if (message) { const timer = setTimeout(() => setMessage(null), 3000); return () => clearTimeout(timer); } }, [message]);

  const showMessage = (msg: { text: string; type: 'success' | 'error' | 'warning' }) => { setMessage(msg); };

  const handleGenerateLink = useCallback(async () => {
    const urlValidation = validateUrl(destinationUrl);
    if (!urlValidation.valid) {
      showMessage({ text: urlValidation.message!, type: 'error' });
      return;
    }
    setIsGenerating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationUrl,
          channel: 'web-generator',
          agentId,
        }),
      });
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      const newLink = `https://vinite.com/a/${encodeURIComponent(agentId)}?u=${encodeURIComponent(destinationUrl)}`;
      setGeneratedLink(newLink);
      showMessage({ text: 'Your Vinite link is ready!', type: 'success' });
    } catch (err) {
      showMessage({ text: err instanceof Error ? err.message : 'An unknown error occurred.', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  }, [destinationUrl, agentId]);

  const handleClearUrl = () => { setDestinationUrl(''); setGeneratedLink(''); };

  const handleShare = (platform: 'whatsapp' | 'linkedin') => {
    if (!generatedLink) { showMessage({ text: "Please generate a link first.", type: 'warning' }); return; }
    let shareUrl = '';
    if (platform === 'whatsapp') { shareUrl = `https://wa.me/?text=${encodeURIComponent(`Check out this link: ${generatedLink}`)}`; }
    else if (platform === 'linkedin') { shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(generatedLink)}`; }
    window.open(shareUrl, '_blank');
  };

  const handleCopyToClipboard = (text: string, successMessage: string) => {
    if (!navigator.clipboard) {
      showMessage({ text: 'Clipboard API is not available in this context.', type: 'error' });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showMessage({ text: successMessage, type: 'success' });
    }).catch(err => {
      console.error('Clipboard error:', err);
      showMessage({ text: 'Failed to copy to clipboard.', type: 'error' });
    });
  };

  const snippetCode = `<a href="${generatedLink}" target="_blank">Referred via Vinite</a>`;


  return (
     <Container>
      {message && ( <div className={styles.messageContainer}><Message type={message.type}>{message.text}</Message></div> )}
      <div className={styles.mainContent}>
        <div className={styles.logo}>vinite</div>
        <p className={styles.tagline}>Create and share Vinite referral links, no sign up required.</p>
        <div className={`${styles.inputContainer} ${isUrlValid === true ? styles.valid : isUrlValid === false ? styles.invalid : ''}`}>
          <div className={`${styles.inputWrapper} ${styles.urlWrapper}`}>
            <input type="text" className={styles.urlInput} placeholder="https://example.com/product-page" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} />
            {destinationUrl && <button className={styles.clearBtn} onClick={handleClearUrl}>×</button>}
            <div className={`${styles.validationIndicator} ${isUrlValid === true ? styles.valid : isUrlValid === false ? styles.invalid : ''}`} />
          </div>
          <div className={styles.inputSeparator}></div>
          <div className={`${styles.inputWrapper} ${styles.agentWrapper}`}>
            <input type="text" className={styles.agentInput} value={agentId} readOnly />
          </div>
        </div>
        <div className={styles.buttonContainer}>
          <Button onClick={handleGenerateLink} variant="primary" disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Link'}
          </Button>
          <Button onClick={() => handleShare('whatsapp')} disabled={!generatedLink} variant="primary">Refer on WhatsApp</Button>
          <Button onClick={() => handleShare('linkedin')} disabled={!generatedLink} variant="primary">Refer on LinkedIn</Button>
        </div>
        {generatedLink && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsCard}>
              <div className={styles.outputGrid}>
                <div className={styles.outputColumn} onClick={() => handleCopyToClipboard(generatedLink, 'Link Copied!')}>
                  <h4>Copy Vinite Link</h4>
                  <div className={styles.outputBox}>{generatedLink}</div>
                </div>
                <div className={styles.outputColumn} onClick={() => handleCopyToClipboard(generatedLink, 'Link Copied!')}>
                  <h4>Copy QR Code</h4>
                  <div className={styles.outputBox}>{qrCodeDataUrl && <Image src={qrCodeDataUrl} alt="Vinite Referral QR Code" width={136} height={136} />}</div>
                </div>
                <div className={styles.outputColumn} onClick={() => handleCopyToClipboard(snippetCode, 'Snippet Copied!')}>
                  <h4>Copy Embed Code</h4>
                  <div className={styles.outputBox}><pre><code>{snippetCode}</code></pre></div>
                </div>
              </div>
            </div>
            <div className={styles.outputInstructions}>
              <p><strong>1. To Share Manually:</strong> Copy the link, QR code, or snippet and paste it in social media, an email, or a blog post.</p>
              <p><strong>2. To Share Directly:</strong> Use the one-click "Refer on WhatsApp" or "Refer on LinkedIn" buttons.</p>
              <SignedOut>
                {agentId.startsWith('T1-') && (
                  <p><strong>3. To Claim Rewards:</strong> Save this temporary Agent ID <strong>{agentId}</strong> to <Link href={`/sign-up?claimId=${agentId}`} className={styles.claimLink}>claim any rewards</Link> you earn, or <Link href="/sign-up" className={styles.claimLink}>Sign Up</Link> to track them automatically.</p>
                )}
              </SignedOut>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

// The new parent component that provides the Suspense boundary
export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageClient />
    </Suspense>
  );
}