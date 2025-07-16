'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import styles from './page.module.css';

// Component Imports
import Container from '@/app/components/layout/Container';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { useAuth } from '@/app/components/auth/AuthProvider';

// Helper Functions
const validateUrl = (url: string): { valid: boolean; message?: string } => {
  if (!url) return { valid: false, message: "⚠️ Please enter a destination URL." };
  try { new URL(url); if (!url.startsWith('http://') && !url.startsWith('https://')) { return { valid: false, message: "⚠️ URL must start with https:// or http://." }; } return { valid: true }; } catch { return { valid: false, message: "⚠️ URL format is incorrect. Check for typos." }; }
};

export default function HomePage() {
  const { user } = useAuth();
  const [destinationUrl, setDestinationUrl] = useState('');
  const [agentId, setAgentId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const isUrlValid = useMemo(() => { if (!destinationUrl) return null; return validateUrl(destinationUrl).valid; }, [destinationUrl]);

  useEffect(() => {
    if (user?.agentId) { setAgentId(user.agentId); } 
    else { let guestId = sessionStorage.getItem('vinite_guest_id'); if (!guestId) { guestId = `T1-GU${Math.floor(100000 + Math.random() * 900000)}`; sessionStorage.setItem('vinite_guest_id', guestId); } setAgentId(guestId); }
  }, [user]);

  useEffect(() => {
    if (generatedLink) { QRCode.toDataURL(generatedLink, { width: 136, margin: 1 }).then(url => setQrCodeDataUrl(url)).catch(err => console.error('QR Code generation failed:', err)); } 
    else { setQrCodeDataUrl(''); }
  }, [generatedLink]);

  useEffect(() => { if (message) { const timer = setTimeout(() => setMessage(null), 3000); return () => clearTimeout(timer); } }, [message]);

  const showMessage = (msg: { text: string; type: 'success' | 'error' | 'warning' }) => { setMessage(msg); };
  
  const handleGenerateLink = useCallback(() => {
    const urlValidation = validateUrl(destinationUrl);
    if (!urlValidation.valid) { showMessage({ text: urlValidation.message!, type: 'error' }); return; }
    const newLink = `https://vinite.com/a/${encodeURIComponent(agentId)}?u=${encodeURIComponent(destinationUrl)}`;
    setGeneratedLink(newLink);
    showMessage({ text: 'Your Vinite link is ready!', type: 'success' });
  }, [destinationUrl, agentId]);
  
  const handleClearUrl = () => { setDestinationUrl(''); setGeneratedLink(''); };
  
  const handleShare = (platform: 'whatsapp' | 'linkedin') => {
    if (!generatedLink) { showMessage({ text: "Please generate a link first.", type: 'warning' }); return; }
    let shareUrl = '';
    if (platform === 'whatsapp') { shareUrl = `https://wa.me/?text=${encodeURIComponent(`Check out this link: ${generatedLink}`)}`; }
    else if (platform === 'linkedin') { shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(generatedLink)}`; }
    window.open(shareUrl, '_blank');
  };
  
  // --- THIS IS THE ONLY CHANGE ---
  // The copy function is now more robust.
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
  const isLoggedIn = !!user;

  return (
    <Container className={styles.pageContainer}>
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
          <div className={`${styles.inputWrapper} ${styles.agentWrapper}`}><input type="text" className={styles.agentInput} value={agentId} readOnly /></div>
        </div>
        <div className={styles.buttonContainer}>
          <Button onClick={handleGenerateLink} variant="primary">Generate Link</Button>
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
              <p><strong>2. To Share Directly:</strong> Use the one-click &quot;Refer on WhatsApp&quot; or &quot;Refer on LinkedIn&quot; buttons.</p>
              {!isLoggedIn && agentId.startsWith('T1-') && (
                <p><strong>3. To Claim Rewards:</strong> Save this temporary Agent ID <strong>{agentId}</strong> to <Link href="/claim" className={styles.claimLink}>claim any rewards</Link> you earn, or <Link href="/signup" className={styles.claimLink}>Sign Up</Link> to track them automatically.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}