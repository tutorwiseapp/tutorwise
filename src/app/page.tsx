'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import styles from './page.module.css';
import type { User } from '@/types';

// Reusable Component Imports
import Container from '@/app/components/layout/Container';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import Card from '@/app/components/ui/Card';

// Helper Functions
const validateUrl = (url: string): { valid: boolean; message?: string } => {
  if (!url) return { valid: false, message: "⚠️ Please enter a destination URL." };
  try {
    new URL(url);
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { valid: false, message: "⚠️ URL must start with https:// or http://." };
    }
    return { valid: true };
  } catch {
    return { valid: false, message: "⚠️ URL format is incorrect. Check for typos." };
  }
};

const validateAgentId = (id: string): { valid: boolean; message?: string } => {
  if (!id) return { valid: true };
  if (id.length < 3) return { valid: false, message: "⚠️ Agent ID should be at least 3 characters long." };
  return { valid: true };
};

export default function HomePage() {
  const [destinationUrl, setDestinationUrl] = useState('');
  const [agentId, setAgentId] = useState('');
  
  const [generatedLink, setGeneratedLink] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [tempIdMessageContent, setTempIdMessageContent] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isUrlValid = useMemo(() => {
    if (!destinationUrl) return null;
    return validateUrl(destinationUrl).valid;
  }, [destinationUrl]);

  const isAgentIdValid = useMemo(() => {
    if (!agentId) return null;
    return validateAgentId(agentId).valid;
  }, [agentId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const loggedInUser: User | null = JSON.parse(localStorage.getItem('vinite_loggedin_user') || 'null');
      if (loggedInUser?.agentId) {
        setAgentId(loggedInUser.agentId);
        setIsLoggedIn(true);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    if (generatedLink) {
      // CORRECTED: The 'height' property is removed to match the type definition.
      QRCode.toDataURL(generatedLink, { width: 136, margin: 1 })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('QR Code generation failed:', err));
    } else {
      setGeneratedLink('');
      setQrCodeDataUrl('');
    }
  }, [generatedLink]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (msg: { text: string; type: 'success' | 'error' | 'warning' }) => {
    setMessage(msg);
  };
  
  const handleGenerateLink = useCallback(() => {
    const urlValidation = validateUrl(destinationUrl);
    if (!urlValidation.valid) {
      showMessage({ text: urlValidation.message!, type: 'error' });
      return;
    }
    
    let finalAgentId = agentId.trim();
    setTempIdMessageContent(''); 

    if (!isLoggedIn) {
      if (!finalAgentId) {
        finalAgentId = `T1-GU${Math.floor(100000 + Math.random() * 900000)}`;
        setTempIdMessageContent(finalAgentId);
      } else {
        const agentValidation = validateAgentId(finalAgentId);
        if (!agentValidation.valid) {
          showMessage({ text: agentValidation.message!, type: 'warning' });
          return;
        }
      }
    }
    
    const newLink = `https://vinite.com/a/${encodeURIComponent(finalAgentId)}?u=${encodeURIComponent(destinationUrl)}`;
    setGeneratedLink(newLink);
    showMessage({ text: 'Your Vinite link is ready!', type: 'success' });

  }, [destinationUrl, agentId, isLoggedIn]);
  
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (document.activeElement?.tagName.toLowerCase() === 'input')) {
        handleGenerateLink();
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [handleGenerateLink]);

  const handleClearUrl = () => {
    setDestinationUrl('');
    setGeneratedLink('');
  };

  const handleShare = (platform: 'whatsapp' | 'linkedin') => {
    if (!generatedLink) {
      showMessage({ text: "Please generate a link first.", type: 'warning' });
      return;
    }
    let shareUrl = '';
    if (platform === 'whatsapp') {
      const message = `Check out this link!\nReferred via Vinite\n\n${generatedLink}`;
      shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    } else if (platform === 'linkedin') {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(generatedLink)}`;
    }
    window.open(shareUrl, '_blank');
  };

  const handleCopyToClipboard = (text: string, successMessage: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showMessage({ text: successMessage, type: 'success' });
    }).catch(() => {
      showMessage({ text: 'Failed to copy to clipboard.', type: 'error' });
    });
  };

  const snippetCode = `<a href="${generatedLink}" target="_blank">Referred via Vinite</a>`;

  const containerValidationClass = useMemo(() => {
    const hasAgentId = agentId.length > 0;
    if (isUrlValid === false || (hasAgentId && isAgentIdValid === false)) {
      return styles.invalid;
    }
    if (isUrlValid && (!hasAgentId || isAgentIdValid)) {
      return destinationUrl ? styles.valid : '';
    }
    return '';
  }, [destinationUrl, agentId, isUrlValid, isAgentIdValid]);

  return (
    <Container className={styles.pageContainer}>
      {message && (
        <div className={styles.messageContainer}>
          <Message type={message.type}>{message.text}</Message>
        </div>
      )}
      <div className={styles.mainContent}>
        <div className={styles.logo}>vinite</div>
        <p className={styles.tagline}>
          Create and share Vinite referral links, no sign up required.
        </p>
        
        <div className={`${styles.inputContainer} ${containerValidationClass}`}>
          <div className={`${styles.inputWrapper} ${styles.urlWrapper}`}>
            <input type="text" className={styles.urlInput} placeholder="https://vinite.com" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} />
            {destinationUrl && <button className={styles.clearBtn} onClick={handleClearUrl}>×</button>}
            <div className={`${styles.validationIndicator} ${isUrlValid === true ? styles.valid : isUrlValid === false ? styles.invalid : ''}`} />
          </div>
          <div className={styles.inputSeparator}></div>
          <div className={`${styles.inputWrapper} ${styles.agentWrapper}`}>
            <input type="text" className={styles.agentInput} placeholder="A1-AS658265" value={agentId} onChange={(e) => setAgentId(e.target.value)} disabled={isLoggedIn}/>
            {agentId && <div className={`${styles.validationIndicator} ${isAgentIdValid ? styles.valid : styles.invalid}`} />}
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <Button onClick={handleGenerateLink} variant="primary">Generate Link</Button>
          <Button onClick={() => handleShare('whatsapp')} disabled={!generatedLink} variant="primary">Refer on WhatsApp</Button>
          <Button onClick={() => handleShare('linkedin')} disabled={!generatedLink} variant="primary">Refer on LinkedIn</Button>
        </div>

        {generatedLink && (
          <div className={styles.newOutputContainer}>
            <div className={styles.outputGrid}>
              <Card className={styles.outputCard} onClick={() => handleCopyToClipboard(generatedLink, 'Link Copied!')}>
                <h4>Copy Vinite Link</h4>
                <div className={styles.outputBox}>{generatedLink}</div>
              </Card>
              <Card className={styles.outputCard} onClick={() => qrCodeDataUrl && handleCopyToClipboard(generatedLink, 'Link Copied!')}>
                <h4>Copy QR Code</h4>
                <div className={styles.outputBox}>
                  {qrCodeDataUrl && <Image src={qrCodeDataUrl} alt="Vinite Referral QR Code" width={136} height={136} />}
                </div>
              </Card>
              <Card className={styles.outputCard} onClick={() => handleCopyToClipboard(snippetCode, 'Snippet Copied!')}>
                <h4>Copy Embed Code</h4>
                <div className={styles.outputBox}>
                  <pre><code>{snippetCode}</code></pre>
                </div>
              </Card>
            </div>

            <div className={styles.outputInstructions}>
              <p><strong>1. To Share Manually:</strong> Copy the link, QR code, or snippet and paste it in social media, an email, or a blog post.</p>
              <p><strong>2. To Share Directly:</strong> Use the one-click "Refer on WhatsApp" or "Refer on LinkedIn" buttons.</p>
              
              {tempIdMessageContent && (
                <p><strong>3. To Claim Rewards:</strong> Save this temporary Agent ID <strong>{tempIdMessageContent}</strong> to <Link href="/claim-rewards" className={styles.claimLink}>claim any rewards</Link> you earn, or <Link href="/signup" className={styles.claimLink}>Sign Up</Link> to track them automatically.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}