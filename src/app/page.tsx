/*
 * Filename: src/app/page.tsx
 * Purpose: Provides the primary UI for generating new Vinite referral links.
 * Change History:
 * C009 - 2025-09-02 : 11:00 - Definitive fix for Suspense/hook conflict using an isolated child component.
 * Last Modified: 2025-09-02 : 11:00
 * Requirement ID: VIN-APP-01
 */

'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useSearchParams } from 'next/navigation';
import { nanoid } from 'nanoid'; // --- 1. IMPORT NANO ID ---
import styles from './page.module.css';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Container from '@/app/components/layout/Container';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';

const validateUrl = (url: string): { valid: boolean; message?: string } => {
  if (!url) return { valid: false, message: "⚠️ Please enter a destination URL." };
  try { new URL(url); if (!url.startsWith('http://') && !url.startsWith('https://')) { return { valid: false, message: "⚠️ URL must start with https:// or http://." }; } return { valid: true }; } catch { return { valid: false, message: "⚠️ URL format is incorrect. Check for typos." }; }
};

// This child component safely accesses the search params without causing build errors.
function AgentIdHandler({ setAgentIdFromUrl }: { setAgentIdFromUrl: (id: string) => void }) {
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agentId');

  useEffect(() => {
    if (agentId) {
      setAgentIdFromUrl(agentId);
    }
  }, [agentId, setAgentIdFromUrl]);

  return null; // This component does not render anything.
}

export default function HomePage() {
  const { profile, isLoading } = useUserProfile();
  const [agentId, setAgentId] = useState('');
  const [agentIdFromUrl, setAgentIdFromUrl] = useState<string | null>(null);

  const [destinationUrl, setDestinationUrl] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const isUrlValid = useMemo(() => { if (!destinationUrl) return null; return validateUrl(destinationUrl).valid; }, [destinationUrl]);

  useEffect(() => {
    if (agentIdFromUrl) {
      setAgentId(agentIdFromUrl);
      return;
    }

    if (!isLoading) {
      if (profile) {
        setAgentId(profile.agent_id);
      } else {
        let guestId = sessionStorage.getItem('vinite_guest_id');
        if (!guestId) {
          // --- 2. USE NANO ID (10 CHARACTERS) FOR GUEST IDS ---
          guestId = `T1-GU${nanoid(10)}`;
          sessionStorage.setItem('vinite_guest_id', guestId);
        }
        setAgentId(guestId);
      }
    }
  }, [profile, isLoading, agentIdFromUrl]);

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
    const newLink = `https://www.vinite.com/a/${encodeURIComponent(agentId)}?u=${encodeURIComponent(destinationUrl)}`;
    setGeneratedLink(newLink);
    showMessage({ text: 'Your Vinite link is ready!', type: 'success' });
    setIsGenerating(false);

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationUrl, channel: 'web-generator', agentId }),
      });
      if (!response.ok) {
        console.error('Failed to save the generated link to the database.');
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
      }
    } catch (err) {
      console.error('Error saving link:', err);
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
    navigator.clipboard.writeText(text).then(() => { showMessage({ text: successMessage, type: 'success' }); }).catch(() => { showMessage({ text: 'Failed to copy to clipboard.', type: 'error' }); });
  };
  const snippetCode = `<a href="${generatedLink}" target="_blank">Referred via Vinite</a>`;

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <AgentIdHandler setAgentIdFromUrl={setAgentIdFromUrl} />
      </Suspense>
      <Container>
        {message && ( <div className={styles.messageContainer}><Message type={message.type}>{message.text}</Message></div> )}
        <div className={styles.mainContent}>
          <div className={styles.logo}>Tutorwise</div>
          <p className={styles.tagline}>Professional tutoring platform connecting students with qualified tutors.</p>

          <div className={styles.buttonContainer}>
            <Link href="/monitoring/test-assured">
              <Button variant="primary">Access TestAssured</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary">Go to Dashboard</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">Login</Button>
            </Link>
          </div>

          <div className={styles.featureSection}>
            <h2>Coming Soon</h2>
            <p>Tutorwise is building the next generation tutoring platform with:</p>
            <ul>
              <li>Role-based dashboards for Students, Tutors, and Agents</li>
              <li>Professional tutor marketplace</li>
              <li>Service listings and booking system</li>
              <li>Comprehensive testing and monitoring tools</li>
            </ul>
          </div>
        </div>
      </Container>
    </>
  );
}